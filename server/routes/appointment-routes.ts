import { Request, Response, Router } from 'express'
import { AppointmentService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

export function createAppointmentRoutes(appointmentService: AppointmentService): Router {
  const router = Router()
  const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

  const isValidTimezone = (value: unknown): value is string => {
    if (typeof value !== 'string') return false
    try {
      Intl.DateTimeFormat('en-US', { timeZone: value })
      return true
    } catch {
      return false
    }
  }

  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const filters = {
        search: req.query.search as string,
        type: req.query.type as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await appointmentService.getAllAppointments(filters, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get appointments route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const { client, type, scheduled_datetime, description, answered, property_name } = req.body
      const normalizedPropertyName = type === 'visit' ? property_name : null
      const appointment = await appointmentService.createAppointment({
        client,
        type,
        scheduled_datetime,
        description,
        answered,
        property_name: normalizedPropertyName,
        user_id: userId
      })
      res.json(appointment)
    } catch (error) {
      console.error('Error in create appointment route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const id = parseInt(req.params.id)
      const { client, type, scheduled_datetime, description, answered, property_name } = req.body
      const normalizedPropertyName = type === 'visit' ? property_name : null
      const appointment = await appointmentService.updateAppointment(id, {
        client,
        type,
        scheduled_datetime,
        description,
        answered,
        property_name: normalizedPropertyName,
        user_id: userId
      })
      res.json(appointment)
    } catch (error) {
      console.error('Error in update appointment route:', error)
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({ error: 'Appointment not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await appointmentService.deleteAppointment(id)
      res.json(result)
    } catch (error) {
      console.error('Error in delete appointment route:', error)
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({ error: 'Appointment not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Analytics routes
  router.get('/analytics/last-7-days', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const timezone = isValidTimezone(req.query.timezone) ? req.query.timezone : DEFAULT_TIMEZONE
      const result = await appointmentService.getLast7DaysAnalytics(timezone)
      res.json(result)
    } catch (error) {
      console.error('Error in appointments analytics route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/analytics/by-type/last-7-days', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const timezone = isValidTimezone(req.query.timezone) ? req.query.timezone : DEFAULT_TIMEZONE
      const result = await appointmentService.getLast7DaysAnalyticsByType(timezone)
      res.json(result)
    } catch (error) {
      console.error('Error in appointments analytics by type route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
