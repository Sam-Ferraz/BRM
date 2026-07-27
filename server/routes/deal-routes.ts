import { Request, Response, Router } from 'express'
import { DealService } from '../services/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

export function createDealRoutes(dealService: DealService): Router {
  const router = Router()

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await dealService.getAllDeals(accountId, filters, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get deals route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/without-followups', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const result = await dealService.getDealsWithoutOpenFollowUps(accountId, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get deals without follow-ups route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  const DEFAULT_TIMEZONE = 'America/Sao_Paulo'
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

  const isValidTimezone = (value: unknown): value is string => {
    if (typeof value !== 'string') return false
    try {
      Intl.DateTimeFormat('en-US', { timeZone: value })
      return true
    } catch {
      return false
    }
  }

  // Company-wide deal funnel grouped by status (optionally narrowed by date range)
  router.get('/analytics/funnel', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const from = typeof req.query.from === 'string' && ISO_DATE.test(req.query.from) ? req.query.from : undefined
      const to = typeof req.query.to === 'string' && ISO_DATE.test(req.query.to) ? req.query.to : undefined
      const timezone = isValidTimezone(req.query.timezone) ? req.query.timezone : DEFAULT_TIMEZONE
      const dateField: 'origin_date' | 'created_at' =
        req.query.dateField === 'created_at' ? 'created_at' : 'origin_date'

      if ((from && !to) || (to && !from)) {
        res.status(400).json({ error: 'Both "from" and "to" must be provided together (YYYY-MM-DD)' })
        return
      }

      const result = await dealService.getFunnel(
        accountId,
        from && to ? { from, to, timezone, dateField } : undefined
      )
      res.json(result)
    } catch (error) {
      console.error('Error in deal funnel analytics route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Performance por origem do cliente — usado pelo radar do BI.
  router.get('/analytics/by-origin', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const result = await dealService.getPerformanceByOrigin(accountId)
      res.json(result)
    } catch (error) {
      console.error('Error in deals by-origin analytics route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Cadência: deals que precisam de tag vermelha no Kanban.
  // Filtrado por user_id do requester — cada corretor vê seus próprios.
  router.get('/analytics/cadence', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const result = await dealService.getDealsNeedingCadence(accountId, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in deals cadence route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const {
        client,
        origin_date,
        description,
        client_phone,
        client_origin,
        purpose,
        deal_type,
        gsv,
        property_name,
        temperature,
        status,
      } = req.body

      const payload = {
        client,
        origin_date,
        description,
        client_phone,
        client_origin,
        purpose,
        deal_type,
        gsv,
        property_name,
        temperature,
        status: status || 'service',
        user_id: userId,
      }

      const deal = await dealService.createDeal(accountId, payload)
      res.json(deal)
    } catch (error) {
      console.error('Error in create deal route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const id = parseInt(req.params.id)
      const {
        client,
        origin_date,
        description,
        client_phone,
        client_origin,
        purpose,
        deal_type,
        gsv,
        property_name,
        temperature,
        status,
      } = req.body

      // Update parcial: quando o front manda só { status } (drag-and-drop do
      // Kanban), evitamos sobrescrever todo o registro com undefined nos outros
      // campos. Delegamos pro updateDealStatus, que faz um UPDATE só do status.
      const onlyStatus =
        status !== undefined &&
        client === undefined &&
        origin_date === undefined &&
        gsv === undefined
      if (onlyStatus) {
        const deal = await dealService.updateDealStatus(accountId, id, status)
        res.json(deal)
        return
      }

      const payload = {
        client,
        origin_date,
        description,
        client_phone,
        client_origin,
        purpose,
        deal_type,
        gsv,
        property_name,
        temperature,
        status: status || 'service',
        user_id: userId,
      }

      const deal = await dealService.updateDeal(accountId, id, payload)
      res.json(deal)
    } catch (error) {
      console.error('Error in update deal route:', error)
      if (error instanceof Error && error.message === 'Deal not found') {
        res.status(404).json({ error: 'Deal not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const result = await dealService.deleteDeal(accountId, id)
      res.json(result)
    } catch (error) {
      console.error('Error in delete deal route:', error)
      if (error instanceof Error && error.message === 'Deal not found') {
        res.status(404).json({ error: 'Deal not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
