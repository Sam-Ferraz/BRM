import { Request, Response, Router } from 'express'
import { FollowUpService } from '../services/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

export function createFollowUpRoutes(followUpService: FollowUpService): Router {
  const router = Router()

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const filters = {
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await followUpService.getAllFollowUps(accountId, filters, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get follow-ups route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/stats', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const result = await followUpService.getStatusCounts(accountId, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get follow-up stats route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const followUp = await followUpService.getFollowUpById(accountId, id)
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

  router.get('/appointment/:appointmentId', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const appointmentId = parseInt(req.params.appointmentId)
      const result = await followUpService.getFollowUpsByAppointmentId(accountId, appointmentId)
      res.json(result)
    } catch (error) {
      console.error('Error in get follow-ups by appointment route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const { appointment_id, client_name, next_action, next_action_date, completed } = req.body
      if (typeof client_name !== 'string' || client_name.trim() === '') {
        res.status(400).json({ error: 'client_name is required' })
        return
      }
      const followUp = await followUpService.createFollowUp(accountId, {
        appointment_id: appointment_id ?? null,
        client_name: client_name.trim(),
        next_action,
        next_action_date,
        completed: completed ?? false,
        user_id: userId
      })
      res.json(followUp)
    } catch (error) {
      console.error('Error in create follow-up route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const { client_name, next_action, next_action_date, completed } = req.body
      const followUp = await followUpService.updateFollowUp(accountId, id, {
        client_name,
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

  router.patch('/:id/complete', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const followUp = await followUpService.markAsCompleted(accountId, id)
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

  router.delete('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const result = await followUpService.deleteFollowUp(accountId, id)
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
