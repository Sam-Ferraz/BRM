import { Request, Response, Router } from 'express'
import crypto from 'crypto'
import { LeadService } from '../services/index.js'
import { LeadSourceRepository } from '../repositories/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'
import { LeadStatus } from '../types/index.js'

/**
 * /api/leads + /api/lead-sources + /api/leads/webhook/:token
 *
 * O endpoint de webhook é PÚBLICO (sem JWT) — autenticação é por token único
 * gerado na criação da fonte. O Meta/Zapier/etc. chamam essa URL e o BRM
 * identifica a fonte pelo token — e a partir dela, o account_id (via
 * source.account_id) usado pra criar os leads no tenant certo.
 */
export function createLeadRoutes(
  leadService: LeadService,
  leadSourceRepository: LeadSourceRepository
): Router {
  const router = Router()

  // =========================================================================
  // WEBHOOK PÚBLICO (sem JWT — autenticado pelo token da URL)
  // =========================================================================
  //
  // POST  /api/leads/webhook/:token  → ingere leads
  // GET   /api/leads/webhook/:token  → handshake da Meta (echo do hub.challenge)
  //
  // O GET é necessário porque a Meta valida a URL antes de começar a entregar
  // eventos: ela manda GET com query params hub.mode, hub.verify_token,
  // hub.challenge e espera receber o challenge de volta como texto puro.
  // =========================================================================

  /**
   * GET handshake da Meta.
   * Meta envia: ?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
   * Precisamos validar:
   *   1. token na URL bate com algum LeadSource cadastrado
   *   2. hub.verify_token bate com source.config.verify_token (Meta-specific)
   *   3. devolver o hub.challenge como texto puro
   * Sem a validação do (2), qualquer um que conhecesse o webhook token
   * conseguiria "verificar" um webhook que não é dele na Meta.
   */
  router.get('/webhook/:token', async (req: Request, res: Response): Promise<void> => {
    try {
      const source = await leadSourceRepository.findByWebhookToken(req.params.token)
      if (!source) {
        res.status(404).type('text/plain').send('Not found')
        return
      }
      const mode = req.query['hub.mode']
      const verifyToken = req.query['hub.verify_token']
      const challenge = req.query['hub.challenge']

      // Pra fontes 'meta' validamos verify_token. Pra outras (genérico/manual)
      // mantemos o comportamento permissivo (algumas ferramentas não fazem
      // handshake).
      if (source.type === 'meta') {
        const expected = (source.config as any)?.verify_token
        if (!expected) {
          console.warn(`[Leads] verify_token não configurado em source id=${source.id}`)
          res.status(500).type('text/plain').send('verify_token not configured')
          return
        }
        if (mode !== 'subscribe' || verifyToken !== expected) {
          console.warn(`[Leads] Handshake recusado em source id=${source.id} (verify_token mismatch)`)
          res.status(403).type('text/plain').send('Forbidden')
          return
        }
      }

      res.status(200).type('text/plain').send(typeof challenge === 'string' ? challenge : 'ok')
    } catch (error) {
      console.error('Error in webhook handshake:', error)
      res.status(500).type('text/plain').send('Internal error')
    }
  })

  /**
   * POST recebe os eventos. Para fontes 'meta' valida assinatura HMAC SHA-256
   * com app_secret (X-Hub-Signature-256). Sempre respondemos 200 (mesmo em
   * erro de processamento) pra evitar retries da Meta — erros ficam no log.
   */
  router.post('/webhook/:token', async (req: Request, res: Response): Promise<void> => {
    try {
      const source = await leadSourceRepository.findByWebhookToken(req.params.token)
      if (!source) {
        res.status(404).json({ error: 'Webhook not found' })
        return
      }

      // Valida assinatura HMAC pra fontes Meta
      if (source.type === 'meta') {
        const appSecret = (source.config as any)?.app_secret
        const signature = req.headers['x-hub-signature-256'] as string | undefined
        const rawBody = (req as any).rawBody as string | undefined

        if (appSecret && signature && rawBody) {
          const expected =
            'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
          if (signature !== expected) {
            console.warn(`[Leads] Assinatura inválida em source id=${source.id}`)
            res.status(403).json({ error: 'invalid signature' })
            return
          }
        } else if (appSecret && !signature) {
          // Tem app_secret configurado mas o request veio sem signature —
          // pode ser teste manual ou Zapier (que não assina). Permitimos
          // mas registramos.
          console.warn(`[Leads] Source meta id=${source.id} sem assinatura no payload`)
        }
      }

      // ingestPayload deriva o accountId de source.account_id — o webhook
      // público não tem usuário logado, então a source é a fonte de verdade
      // sobre em qual conta os leads devem entrar.
      const created = await leadService.ingestPayload(source, req.body)
      res.json({ received: created.length })
    } catch (error) {
      console.error('Error processing lead webhook:', error)
      // 200 mesmo em erro pra evitar retry da Meta (erro fica no log)
      res.status(200).json({ received: 0, error: 'processed with errors' })
    }
  })

  // =========================================================================
  // LEAD SOURCES (somente admin)
  // =========================================================================

  router.get('/sources', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const accountId = req.user!.accountId
      const sources = await leadService.listSources(accountId)
      res.json({ data: sources })
    } catch (error) {
      console.error('Error listing lead sources:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/sources', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const accountId = req.user!.accountId
      const { name, type, config } = req.body
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'name is required' })
        return
      }
      const safeType = type === 'meta' || type === 'webhook_generic' || type === 'manual' ? type : 'webhook_generic'
      const source = await leadService.createSource(accountId, { name, type: safeType, config: config ?? null })
      res.json({ data: source })
    } catch (error) {
      if (error instanceof Error && error.message === 'name is required') {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error creating lead source:', error)
      // Propaga a mensagem do serviço (ex.: erro de upgrade de token) pro cliente
      const msg = error instanceof Error ? error.message : 'Internal server error'
      res.status(400).json({ error: msg })
    }
  })

  router.put('/sources/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const { name, config, status } = req.body
      const safeStatus = status === 'paused' || status === 'active' ? status : undefined
      const updated = await leadService.updateSource(accountId, id, { name, config, status: safeStatus })
      res.json({ data: updated })
    } catch (error) {
      if (error instanceof Error && error.message === 'LeadSource not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error updating lead source:', error)
      const msg = error instanceof Error ? error.message : 'Internal server error'
      res.status(400).json({ error: msg })
    }
  })

  router.delete('/sources/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const result = await leadService.deleteSource(accountId, id)
      res.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === 'LeadSource not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error deleting lead source:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // =========================================================================
  // LEADS (listar, aceitar, descartar, criar manual)
  // =========================================================================

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const status = req.query.status as LeadStatus | undefined
      const validStatus = status === 'novo' || status === 'aceito' || status === 'descartado' ? status : undefined
      const result = await leadService.list(accountId, validStatus)
      res.json(result)
    } catch (error) {
      console.error('Error listing leads:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/counts', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const counts = await leadService.getCountByStatus(accountId)
      res.json({ data: counts })
    } catch (error) {
      console.error('Error fetching lead counts:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const lead = await leadService.getById(accountId, id)
      res.json({ data: lead })
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error fetching lead:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const { name, email, phone, notes } = req.body
      const lead = await leadService.createManual(accountId, { name, email, phone, notes })
      res.json({ data: lead })
    } catch (error) {
      console.error('Error creating manual lead:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/:id/accept', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const result = await leadService.acceptLead(accountId, id, req.user!.userId)
      res.json({ data: result })
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({ error: error.message })
        return
      }
      if (error instanceof Error && ['lead_already_accepted', 'lead_already_discarded'].includes(error.message)) {
        res.status(409).json({ error: error.message })
        return
      }
      console.error('Error accepting lead:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/:id/discard', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const { notes } = req.body
      const lead = await leadService.discardLead(accountId, id, notes ?? null)
      res.json({ data: lead })
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error discarding lead:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
