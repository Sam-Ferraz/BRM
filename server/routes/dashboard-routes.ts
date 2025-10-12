import { Response, Router } from 'express'
import { DashboardService, AppointmentService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

export function createDashboardRoutes(
  dashboardService: DashboardService,
  appointmentService: AppointmentService
): Router {
  const router = Router()

  router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await dashboardService.getDashboardStats()
      res.json(stats)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}