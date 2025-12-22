import { Request, Response, Router } from 'express'
import { DealService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

export function createDealRoutes(dealService: DealService): Router {
  const router = Router()

  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await dealService.getAllDeals(filters, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get deals route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/without-followups', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const result = await dealService.getDealsWithoutOpenFollowUps(userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get deals without follow-ups route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
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

      const deal = await dealService.createDeal(payload)
      res.json(deal)
    } catch (error) {
      console.error('Error in create deal route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
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

      const deal = await dealService.updateDeal(id, payload)
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

  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await dealService.deleteDeal(id)
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
