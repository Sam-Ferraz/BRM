import { Router, Request, Response } from 'express'
import { CouponService } from '../services/coupon-service.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * Rotas de cupom:
 *   - Super-admin (autenticado, account #1 BRM Demo): CRUD completo
 *   - Público (sem auth): POST /validate — LP consulta antes do checkout
 */
export function createCouponRoutes(service: CouponService): Router {
  const router = Router()

  function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: () => void): void {
    if (req.user?.accountId !== 1 || req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Super-admin required' })
      return
    }
    next()
  }

  // --- Público — usado pela LP antes do checkout
  router.post('/validate', async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, plan } = req.body || {}
      const result = await service.validateForCheckout(String(code || ''), plan)
      res.json(result)
    } catch (err) {
      console.error('Error validating coupon:', err)
      res.status(500).json({ valid: false, error: 'Erro interno' })
    }
  })

  // --- Super-admin ---

  router.get('/', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const data = await service.list()
      res.json({ data })
    } catch (err) {
      console.error('Error listing coupons:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }))

  router.post('/', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const created = await service.create(req.body)
      res.status(201).json({ data: created })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar cupom'
      res.status(400).json({ error: msg })
    }
  }))

  router.patch('/:id', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const id = parseInt(req.params.id, 10)
      const updated = await service.update(id, req.body)
      if (!updated) {
        res.status(404).json({ error: 'Cupom não encontrado' })
        return
      }
      res.json({ data: updated })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar cupom'
      res.status(400).json({ error: msg })
    }
  }))

  router.delete('/:id', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const id = parseInt(req.params.id, 10)
      const ok = await service.delete(id)
      if (!ok) {
        res.status(404).json({ error: 'Cupom não encontrado' })
        return
      }
      res.json({ data: { success: true } })
    } catch (err) {
      console.error('Error deleting coupon:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }))

  return router
}
