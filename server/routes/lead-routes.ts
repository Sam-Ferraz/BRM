import { Request, Response, Router } from 'express'
import { LeadService } from '../services/index.js'
import { LeadSourceRepository } from '../repositories/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'
import { LeadStatus } from '../types/index.js'

/**
 * /api/leads + /api/lead-sources + /api/leads/webhook/:token
 *
 * O endpoint de webhook é PÚBLICO (sem JWT) — autenticação é por token único
 * gerado na criação da fonte. O Meta/Zapier/etc. chamam essa URL e o BRM
 * identifica a fonte pelo token.
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

  router.get('/webhook/:token', async (req: Request, res: Response): Promise<void> => {
    try {
      const source = await leadSourceRepository.findByWebhookToken(req.params.token)
      if (!source) {
        res.status(404).type('text/plain').send('Not found')
        return
      }
      const challenge = req.query['hub.challenge']
      // Devolve o challenge como texto puro (formato esperado pela Meta)
      res.status(200).type('text/plain').send(typeof challenge === 'string' ? challenge : 'ok')
    } catch (error) {
      console.error('Error in webhook handshake:', error)
      res.status(500).type('text/plain').send('Internal error')
    }
  })

  router.post('/webhook/:token', async (req: Request, res: Response): Promise<void> => {
    try {
      const source = await leadSourceRepository.findByWebhookToken(req.params.token)
      if (!source) {
        res.status(404).json({ error: 'Webhook not found' })
        return
      }
      const created = await leadService.ingestPayload(source, req.body)
      res.json({ received: created.length })
    } catch (error) {
      console.error('Error processing lead webhook:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // =========================================================================
  // LEAD SOURCES (somente admin)
  // =========================================================================

  router.get('/sources', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const sources = await leadService.listSources()
      res.json({ data: sources })
    } catch (error) {
      console.error('Error listing lead sources:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/sources', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const { name, type, config } = req.body
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'name is required' })
        return
      }
      const safeType = type === 'meta' || type === 'webhook_generic' || type === 'manual' ? type : 'webhook_generic'
      const source = await leadService.createSource({ name, type: safeType, config: config ?? null })
      res.json({ data: source })
    } catch (error) {
      if (error instanceof Error && error.message === 'name is required') {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error creating lead source:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/sources/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const id = parseInt(req.params.id)
      const { name, config, status } = req.body
      const safeStatus = status === 'paused' || status === 'active' ? status : undefined
      const updated = await leadService.updateSource(id, { name, config, status: safeStatus })
      res.json({ data: updated })
    } catch (error) {
      if (error instanceof Error && error.message === 'LeadSource not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error updating lead source:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/sources/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const id = parseInt(req.params.id)
      const result = await leadService.deleteSource(id)
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

  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const status = req.query.status as LeadStatus | undefined
      const validStatus = status === 'novo' || status === 'aceito' || status === 'descartado' ? status : undefined
      const result = await leadService.list(validStatus)
      res.json(result)
    } catch (error) {
      console.error('Error listing leads:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/counts', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const counts = await leadService.getCountByStatus()
      res.json({ data: counts })
    } catch (error) {
      console.error('Error fetching lead counts:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const lead = await leadService.getById(id)
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

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, email, phone, notes } = req.body
      const lead = await leadService.createManual({ name, email, phone, notes })
      res.json({ data: lead })
    } catch (error) {
      console.error('Error creating manual lead:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/:id/accept', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await leadService.acceptLead(id, req.user!.userId)
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

  router.post('/:id/discard', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const { notes } = req.body
      const lead = await leadService.discardLead(id, notes ?? null)
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
