import { Response, Router } from 'express'
import { DashboardService, AppointmentService } from '../services/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

export function createDashboardRoutes(
  dashboardService: DashboardService,
  appointmentService: AppointmentService
): Router {
  const router = Router()

  router.get('/stats', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const stats = await dashboardService.getDashboardStats(accountId, userId)
      res.json(stats)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}