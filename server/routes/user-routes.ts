import { Response, Router } from 'express'
import { UserManagementService } from '../services/user-management-service.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/users — CRUD de usuários (admin-only).
 * Deixamos a checagem role='admin' explicita aqui em vez de via matriz de
 * permissoes porque a gestao de usuarios/permissoes eh privilegio soberano
 * do admin — nao deve ser delegavel via matriz.
 */
export function createUserRoutes(service: UserManagementService): Router {
  const router = Router()

  const requireAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' })
      return false
    }
    return true
  }

  const errorStatus = (msg: string): number => {
    if (msg === 'User not found') return 404
    if (msg === 'email already registered') return 409
    return 400
  }

  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const users = await service.list()
      res.json({ data: users })
    } catch (error) {
      console.error('Error listing users:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const user = await service.getById(parseInt(req.params.id))
      res.json({ data: user })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Internal error'
      res.status(errorStatus(msg)).json({ error: msg })
    }
  })

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const { name, email, password, role } = req.body
      const user = await service.create({ name, email, password, role })
      res.status(201).json({ data: user })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Internal error'
      res.status(errorStatus(msg)).json({ error: msg })
    }
  })

  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const { name, email, role, active } = req.body
      const user = await service.update(req.user!.userId, parseInt(req.params.id), {
        name, email, role, active,
      })
      res.json({ data: user })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Internal error'
      res.status(errorStatus(msg)).json({ error: msg })
    }
  })

  router.post('/:id/reset-password', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const { new_password } = req.body
      await service.resetPassword(req.user!.userId, parseInt(req.params.id), new_password)
      res.json({ success: true })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Internal error'
      res.status(errorStatus(msg)).json({ error: msg })
    }
  })

  return router
}
