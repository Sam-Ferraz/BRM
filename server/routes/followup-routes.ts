import { Request, Response, Router } from 'express'
import { FollowUpService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

export function createFollowUpRoutes(followUpService: FollowUpService): Router {
  const router = Router()

  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const filters = {
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await followUpService.getAllFollowUps(filters)
      res.json(result)
    } catch (error) {
      console.error('Error in get follow-ups route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await followUpService.getStatusCounts()
      res.json(result)
    } catch (error) {
      console.error('Error in get follow-up stats route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const followUp = await followUpService.getFollowUpById(id)
      res.json(followUp)
    } catch (error) {
      console.error('Error in get follow-up route:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        res.status(404).json({ error: 'Follow-up not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/appointment/:appointmentId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appointmentId = parseInt(req.params.appointmentId)
      const result = await followUpService.getFollowUpsByAppointmentId(appointmentId)
      res.json(result)
    } catch (error) {
      console.error('Error in get follow-ups by appointment route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { appointment_id, next_action, next_action_date, completed } = req.body
      const followUp = await followUpService.createFollowUp({
        appointment_id,
        next_action,
        next_action_date,
        completed: completed ?? false
      })
      res.json(followUp)
    } catch (error) {
      console.error('Error in create follow-up route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const { next_action, next_action_date, completed } = req.body
      const followUp = await followUpService.updateFollowUp(id, {
        next_action,
        next_action_date,
        completed
      })
      res.json(followUp)
    } catch (error) {
      console.error('Error in update follow-up route:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        res.status(404).json({ error: 'Follow-up not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.patch('/:id/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const followUp = await followUpService.markAsCompleted(id)
      res.json(followUp)
    } catch (error) {
      console.error('Error in mark follow-up as completed route:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        res.status(404).json({ error: 'Follow-up not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await followUpService.deleteFollowUp(id)
      res.json(result)
    } catch (error) {
      console.error('Error in delete follow-up route:', error)
      if (error instanceof Error && error.message === 'Follow-up not found') {
        res.status(404).json({ error: 'Follow-up not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
