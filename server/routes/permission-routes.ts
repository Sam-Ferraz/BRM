import { Response, Router } from 'express'
import { PermissionService } from '../services/permission-service.js'
import { UserRole } from '../types/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/permissions — matriz de permissoes por role.
 * Admin only — nenhum outro role pode editar (privilegio soberano).
 */
export function createPermissionRoutes(service: PermissionService): Router {
  const router = Router()

  const requireAdmin = (req: AuthenticatedRequest, res: Response): boolean => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' })
      return false
    }
    return true
  }

  /**
   * Retorna a matriz completa pra a UI renderizar a tela de edicao.
   */
  router.get('/matrix', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const matrix = await service.getMatrix()
      res.json({ data: matrix })
    } catch (error) {
      console.error('Error getting permissions matrix:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * Salva um lote de mudancas na matriz (upsert em role_permissions).
   * Body: { updates: [{ role, permission_id, allowed }, ...] }
   */
  router.put('/matrix', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!requireAdmin(req, res)) return
    try {
      const raw = Array.isArray(req.body?.updates) ? req.body.updates : []
      const updates: { role: UserRole; permissionId: number; allowed: boolean }[] = []
      for (const item of raw) {
        if (typeof item?.permission_id !== 'number') continue
        if (typeof item?.role !== 'string') continue
        if (typeof item?.allowed !== 'boolean') continue
        updates.push({
          role: item.role as UserRole,
          permissionId: item.permission_id,
          allowed: item.allowed,
        })
      }
      await service.saveMatrix(updates, req.user!.userId)
      res.json({ success: true, count: updates.length })
    } catch (error) {
      console.error('Error saving permissions matrix:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * Retorna as keys permitidas do role atual do usuario logado. Usado pelo
   * frontend pra decidir o que mostrar/esconder na UI.
   */
  router.get('/mine', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const keys = await service.listKeysForRole(req.user!.role as UserRole)
      res.json({ data: keys })
    } catch (error) {
      console.error('Error getting user permissions:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
