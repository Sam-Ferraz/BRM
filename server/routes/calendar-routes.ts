import { Response, Router } from 'express'
import { CalendarEventService } from '../services/calendar-event-service.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/calendar/* — CRUD de compromissos manuais + endpoint agregado da agenda.
 *
 * Endpoints:
 *   GET    /events                → lista eventos manuais do usuário
 *   POST   /events                → cria evento
 *   GET    /events/:id            → detalhe
 *   PUT    /events/:id            → atualiza
 *   DELETE /events/:id            → remove
 *
 *   GET    /agenda                → agenda unificada (events + follow-ups em aberto)
 *                                    query: from=YYYY-MM-DD&to=YYYY-MM-DD&viewAll=1
 *                                    viewAll=1 só funciona pra role=admin
 */
export function createCalendarRoutes(service: CalendarEventService): Router {
  const router = Router()

  // ------------- Agenda unificada (o principal) -------------
  router.get('/agenda', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const role = req.user!.role
      const from = req.query.from as string | undefined
      const to = req.query.to as string | undefined
      const viewAll = req.query.viewAll === '1'

      // Regra de acesso: só admin pode viewAll
      const filters = {
        userId: role === 'admin' && viewAll ? undefined : userId,
        from,
        to,
      }
      const result = await service.getAgenda(filters)
      res.json(result)
    } catch (error) {
      console.error('Error in get agenda:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ------------- CRUD de calendar_events -------------
  router.get('/events', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const role = req.user!.role
      const from = req.query.from as string | undefined
      const to = req.query.to as string | undefined
      const status = req.query.status as any

      const filters = {
        userId: role === 'admin' && req.query.viewAll === '1' ? undefined : userId,
        from,
        to,
        status,
      }
      const result = await service.list(filters)
      res.json(result)
    } catch (error) {
      console.error('Error listing calendar events:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/events/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const event = await service.getById(parseInt(req.params.id))
      res.json({ data: event })
    } catch (error) {
      if (error instanceof Error && error.message === 'CalendarEvent not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error getting calendar event:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/events', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const event = await service.create({ ...req.body, user_id: userId })
      res.json({ data: event })
    } catch (error) {
      if (error instanceof Error && (error.message === 'title is required' || error.message === 'start_at is required')) {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error creating calendar event:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/events/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const event = await service.update(parseInt(req.params.id), req.body)
      res.json({ data: event })
    } catch (error) {
      if (error instanceof Error && error.message === 'CalendarEvent not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error updating calendar event:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/events/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await service.delete(parseInt(req.params.id))
      res.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === 'CalendarEvent not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error deleting calendar event:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
