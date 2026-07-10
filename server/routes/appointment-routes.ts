import { Request, Response, Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { AppointmentService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

export function createAppointmentRoutes(appointmentService: AppointmentService): Router {
  const router = Router()
  const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

  // Storage para áudios de atendimento.
  // Corretor grava, front-end faz upload (multipart), backend salva em disco
  // (dev/local) e devolve a URL relativa. A transcrição vai pro campo
  // description via Web Speech API do browser.
  const audioUploadsBase = path.resolve(
    process.env.LOCAL_STORAGE_PATH || './uploads',
    'appointments'
  )
  if (!fs.existsSync(audioUploadsBase)) fs.mkdirSync(audioUploadsBase, { recursive: true })

  const audioStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      // Agrupa por dia pra facilitar limpeza/backup
      const today = new Date().toISOString().slice(0, 10)
      const dir = path.join(audioUploadsBase, today)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (_req, file, cb) => {
      const timestamp = Date.now()
      const ext = path.extname(file.originalname) || '.webm'
      cb(null, `audio-${timestamp}${ext}`)
    },
  })
  const audioUpload = multer({
    storage: audioStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB — áudios longos
    fileFilter: (_req, file, cb) => {
      const ok =
        file.mimetype.startsWith('audio/') ||
        file.mimetype === 'application/octet-stream'
      if (!ok) return cb(new Error('Apenas arquivos de áudio são permitidos'))
      cb(null, true)
    },
  })

  // POST /api/appointments/upload-audio → devolve { url }
  // Endpoint separado para que o front-end possa fazer o upload em background
  // enquanto o corretor continua gravando/transcrevendo. Depois manda a URL
  // no create do appointment.
  router.post(
    '/upload-audio',
    authenticateToken,
    audioUpload.single('audio'),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const file = (req as any).file as Express.Multer.File | undefined
        if (!file) {
          res.status(400).json({ error: 'file (campo audio) é obrigatório' })
          return
        }
        const relPath = path.relative(
          path.resolve(process.env.LOCAL_STORAGE_PATH || './uploads'),
          file.path
        )
        const url = `/uploads/${relPath.replace(/\\/g, '/')}`
        res.status(201).json({ data: { url, filename: file.originalname, size: file.size, mime_type: file.mimetype } })
      } catch (err) {
        console.error('Error uploading appointment audio:', err)
        const msg = err instanceof Error ? err.message : 'Erro no upload'
        res.status(400).json({ error: msg })
      }
    }
  )

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
      const { client, type, scheduled_datetime, description, answered, property_name, audio_url } = req.body
      const normalizedPropertyName = type === 'visit' ? property_name : null
      const appointment = await appointmentService.createAppointment({
        client,
        type,
        scheduled_datetime,
        description,
        answered,
        property_name: normalizedPropertyName,
        user_id: userId,
        audio_url: audio_url ?? null
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
      const { client, type, scheduled_datetime, description, answered, property_name, audio_url } = req.body
      const normalizedPropertyName = type === 'visit' ? property_name : null
      const appointment = await appointmentService.updateAppointment(id, {
        client,
        type,
        scheduled_datetime,
        description,
        answered,
        property_name: normalizedPropertyName,
        user_id: userId,
        audio_url: audio_url ?? null
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

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
  const isValidDate = (v: unknown): v is string => typeof v === 'string' && ISO_DATE.test(v)

  const parseAppointmentDateField = (v: unknown): 'scheduled_datetime' | 'created_at' =>
    v === 'created_at' ? 'created_at' : 'scheduled_datetime'

  router.get('/analytics/by-date-range', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!isValidDate(req.query.from) || !isValidDate(req.query.to)) {
        res.status(400).json({ error: 'Invalid or missing "from" / "to" (expected YYYY-MM-DD)' })
        return
      }
      const timezone = isValidTimezone(req.query.timezone) ? req.query.timezone : DEFAULT_TIMEZONE
      const dateField = parseAppointmentDateField(req.query.dateField)
      const result = await appointmentService.getAnalyticsByDateRange({
        from: req.query.from,
        to: req.query.to,
        timezone,
        dateField
      })
      res.json(result)
    } catch (error) {
      console.error('Error in appointments analytics by-date-range route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/analytics/by-type/by-date-range', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!isValidDate(req.query.from) || !isValidDate(req.query.to)) {
        res.status(400).json({ error: 'Invalid or missing "from" / "to" (expected YYYY-MM-DD)' })
        return
      }
      const timezone = isValidTimezone(req.query.timezone) ? req.query.timezone : DEFAULT_TIMEZONE
      const dateField = parseAppointmentDateField(req.query.dateField)
      const result = await appointmentService.getAnalyticsByTypeByDateRange({
        from: req.query.from,
        to: req.query.to,
        timezone,
        dateField
      })
      res.json(result)
    } catch (error) {
      console.error('Error in appointments analytics by-type by-date-range route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
