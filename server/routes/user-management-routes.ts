import { Response, Router } from 'express'
import { UserManagementService } from '../services/user-management-service.js'
import { PermissionService } from '../services/permission-service.js'
import { ManagedUserRole } from '../types/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * Rotas do módulo Usuários. Todas admin-only.
 * Prefixadas com /api/user-mgmt pra não conflitar com nada existente.
 */
export function createUserManagementRoutes(
  userService: UserManagementService,
  permService: PermissionService
): Router {
  const router = Router()

  const requireAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' })
      return false
    }
    return true
  }

  const errStatus = (msg: string): number => {
    if (msg === 'User not found') return 404
    if (msg === 'email already registered') return 409
    return 400
  }

  // ---------- Usuários ----------

  router.get('/users', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const users = await userService.list()
      res.json({ data: users })
    } catch (err) {
      console.error('list users error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/users', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const { name, email, password, role } = req.body
      const user = await userService.create({ name, email, password, role })
      res.status(201).json({ data: user })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'error'
      res.status(errStatus(msg)).json({ error: msg })
    }
  })

  router.put('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const { name, email, role, active } = req.body
      const user = await userService.update(req.user!.userId, parseInt(req.params.id), {
        name, email, role, active,
      })
      res.json({ data: user })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'error'
      res.status(errStatus(msg)).json({ error: msg })
    }
  })

  router.post('/users/:id/reset-password', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const { new_password } = req.body
      await userService.resetPassword(req.user!.userId, parseInt(req.params.id), new_password)
      res.json({ success: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'error'
      res.status(errStatus(msg)).json({ error: msg })
    }
  })

  // ---------- Permissões ----------

  router.get('/permissions/matrix', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const matrix = await permService.getMatrix()
      res.json({ data: matrix })
    } catch (err) {
      console.error('get matrix error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/permissions/matrix', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const raw = Array.isArray(req.body?.updates) ? req.body.updates : []
      const updates: { role: ManagedUserRole; permissionId: number; allowed: boolean }[] = []
      for (const item of raw) {
        if (typeof item?.permission_id !== 'number') continue
        if (typeof item?.role !== 'string') continue
        if (typeof item?.allowed !== 'boolean') continue
        updates.push({
          role: item.role as ManagedUserRole,
          permissionId: item.permission_id,
          allowed: item.allowed,
        })
      }
      await permService.saveMatrix(updates, req.user!.userId)
      res.json({ success: true, count: updates.length })
    } catch (err) {
      console.error('save matrix error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
