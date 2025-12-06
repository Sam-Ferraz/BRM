import { Request, Response, Router } from 'express'
import { SalesAgendaService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

export function createSalesAgendaRoutes(salesAgendaService: SalesAgendaService): Router {
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

      const result = await salesAgendaService.getAllSalesAgenda(filters, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get sales agenda route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const { title, product_name, product_id, status } = req.body
      const salesAgenda = await salesAgendaService.createSalesAgenda({
        title,
        product_name,
        product_id,
        status,
        user_id: userId
      })
      res.json(salesAgenda)
    } catch (error) {
      console.error('Error in create sales agenda route:', error)
      if (error instanceof Error && error.message === 'Product name is required') {
        res.status(400).json({ error: 'Product name is required' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const id = parseInt(req.params.id)
      const { title, product_name, product_id, status } = req.body
      const salesAgenda = await salesAgendaService.updateSalesAgenda(id, {
        title,
        product_name,
        product_id,
        status,
        user_id: userId
      })
      res.json(salesAgenda)
    } catch (error) {
      console.error('Error in update sales agenda route:', error)
      if (error instanceof Error && error.message === 'Sales agenda not found') {
        res.status(404).json({ error: 'Sales agenda not found' })
        return
      }
      if (error instanceof Error && error.message === 'Product name is required') {
        res.status(400).json({ error: 'Product name is required' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await salesAgendaService.deleteSalesAgenda(id)
      res.json(result)
    } catch (error) {
      console.error('Error in delete sales agenda route:', error)
      if (error instanceof Error && error.message === 'Sales agenda not found') {
        res.status(404).json({ error: 'Sales agenda not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}