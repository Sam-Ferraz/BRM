import { Request, Response, Router, NextFunction } from 'express'
import { AccountRepository } from '../repositories/account-repository.js'
import { ProductRepository } from '../repositories/product-repository.js'

/**
 * Rotas /api/public/* — API pública pro site institucional da imobiliária
 * puxar dados do BRM (imóveis com fotos). Autenticação via header
 * X-BRM-API-Key gerada pelo dono da account em Configurações.
 *
 * Diferente das rotas /api/*, aqui NÃO exigimos JWT — a chave sozinha
 * já identifica a account. Só expomos dados que fazem sentido públicos
 * (imóveis disponíveis pra venda), NUNCA clientes/negócios/etc.
 */

interface AuthenticatedPublicRequest extends Request {
  accountId?: number
}

export function createPublicApiRoutes(
  accountRepository: AccountRepository,
  productRepository: ProductRepository,
): Router {
  const router = Router()

  /**
   * Middleware: valida X-BRM-API-Key e resolve accountId.
   * A key fica em accounts.custom_config.site_api.api_key.
   */
  const authenticateApiKey = async (
    req: AuthenticatedPublicRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = req.headers['x-brm-api-key'] as string | undefined
    if (!key || key.length < 20) {
      res.status(401).json({ error: 'X-BRM-API-Key header ausente ou inválida' })
      return
    }
    // Busca a account que tem essa key no custom_config. Como não é
    // frequente (site puxa a cada N minutos), o SELECT full-scan é aceitável.
    const accounts = await accountRepository.findAll()
    const match = accounts.find((a) => {
      const cfg = a.custom_config as any
      return cfg?.site_api?.api_key === key
    })
    if (!match) {
      res.status(401).json({ error: 'API key inválida' })
      return
    }
    if (!match.is_active) {
      res.status(403).json({ error: 'Conta suspensa' })
      return
    }
    req.accountId = match.id
    next()
  }

  /**
   * GET /api/public/products
   * Lista imóveis disponíveis pra venda da account (available_for_sale=true).
   * Query params opcionais:
   *   - type: 'apartment' | 'house' | 'terrain' | ...
   *   - min_price, max_price
   *   - city, state
   *   - limit (default 50, max 200), offset (default 0)
   *
   * Retorna array de imóveis com fotos, endereço, preço.
   */
  router.get('/products', authenticateApiKey, async (req: AuthenticatedPublicRequest, res: Response): Promise<void> => {
    try {
      const filters: any = {}
      if (req.query.type) filters.type = String(req.query.type)
      if (req.query.city) filters.city = String(req.query.city)
      if (req.query.state) filters.state = String(req.query.state)
      if (req.query.min_price) filters.min_price = parseFloat(String(req.query.min_price))
      if (req.query.max_price) filters.max_price = parseFloat(String(req.query.max_price))
      // Sempre filtra apenas disponíveis
      filters.available_for_sale = true

      const limit = Math.min(200, parseInt(String(req.query.limit || '50'), 10) || 50)
      const offset = parseInt(String(req.query.offset || '0'), 10) || 0

      const all = await productRepository.findAll(req.accountId!, filters)
      const paged = all.slice(offset, offset + limit)

      // Enxuga o payload — não vaza campos internos (user_id, created_by, etc)
      const items = paged.map((p) => sanitizeProduct(p))
      res.json({
        data: items,
        pagination: {
          total: all.length,
          limit,
          offset,
          returned: items.length,
        },
      })
    } catch (err) {
      console.error('[PublicAPI] erro em GET /products:', err)
      res.status(500).json({ error: 'Erro interno' })
    }
  })

  /**
   * GET /api/public/products/:id
   * Retorna um imóvel específico (deve pertencer à account autenticada
   * e estar disponível pra venda).
   */
  router.get('/products/:id', authenticateApiKey, async (req: AuthenticatedPublicRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10)
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'ID inválido' })
        return
      }
      const all = await productRepository.findAll(req.accountId!, { available_for_sale: true } as any)
      const product = all.find((p) => p.id === id)
      if (!product) {
        res.status(404).json({ error: 'Imóvel não encontrado ou indisponível' })
        return
      }
      res.json({ data: sanitizeProduct(product) })
    } catch (err) {
      console.error('[PublicAPI] erro em GET /products/:id:', err)
      res.status(500).json({ error: 'Erro interno' })
    }
  })

  /**
   * GET /api/public/ping — endpoint sem auth pra o site confirmar
   * que o BRM tá online (usado no botão "Testar conexão" da UI).
   */
  router.get('/ping', (_req: Request, res: Response): void => {
    res.json({ ok: true, service: 'BRM Public API', time: new Date().toISOString() })
  })

  return router
}

/**
 * Remove campos internos e formata pra consumo público. Site consome
 * este payload direto.
 */
function sanitizeProduct(p: any): any {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    category: p.category,
    price: p.price,
    condominium: p.condominium,
    description: p.description,
    accepts_car_swap: p.accepts_car_swap,
    accepts_property_swap: p.accepts_property_swap,
    rooms: p.rooms,
    suites: p.suites,
    parking_spaces: p.parking_spaces,
    bathrooms: p.bathrooms,
    total_area: p.total_area,
    private_area: p.private_area,
    address: p.address,
    neighborhood: p.neighborhood,
    city: p.city,
    state: p.state,
    country: p.country,
    available_for_sale: p.available_for_sale,
    images: Array.isArray(p.images)
      ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
      : [],
    updated_at: p.updated_at,
    created_at: p.created_at,
  }
}
