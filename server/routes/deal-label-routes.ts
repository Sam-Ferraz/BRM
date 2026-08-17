import { Response, Router } from 'express'
import { DealLabelRepository } from '../repositories/deal-label-repository.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/deal-labels/* — CRUD de etiquetas (labels) por account.
 * /api/deals/:id/labels/* — atribuicao/remocao de labels em deals.
 *
 * As duas rotas ficam no mesmo router e sao registradas em prefixos
 * diferentes no server/index.ts.
 */
export function createDealLabelRoutes(repo: DealLabelRepository): Router {
  const router = Router()

  // Lista etiquetas da account
  router.get(
    '/',
    authenticateToken,
    requireAccount,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const labels = await repo.findAll(accountId)
        res.json({ data: labels })
      } catch (err) {
        console.error('Error listing deal labels:', err)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
      }
    },
  )

  // Cria nova etiqueta
  router.post(
    '/',
    authenticateToken,
    requireAccount,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const { name, color } = req.body
        if (!name || typeof name !== 'string' || !name.trim()) {
          res.status(400).json({ error: 'name is required' })
          return
        }
        if (!color || typeof color !== 'string') {
          res.status(400).json({ error: 'color is required' })
          return
        }
        const label = await repo.create(accountId, name.trim(), color)
        res.json({ data: label })
      } catch (err) {
        // Erro de unique (nome duplicado por account)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('unique') || msg.includes('duplicate')) {
          res.status(409).json({ error: 'Ja existe uma etiqueta com esse nome' })
          return
        }
        console.error('Error creating deal label:', err)
        res.status(500).json({ error: msg })
      }
    },
  )

  // Atualiza etiqueta
  router.put(
    '/:id',
    authenticateToken,
    requireAccount,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const id = parseInt(req.params.id)
        const { name, color } = req.body
        const label = await repo.update(accountId, id, { name, color })
        if (!label) {
          res.status(404).json({ error: 'Etiqueta nao encontrada' })
          return
        }
        res.json({ data: label })
      } catch (err) {
        console.error('Error updating deal label:', err)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
      }
    },
  )

  // Apaga etiqueta (remove tambem todas as atribuicoes via ON DELETE CASCADE)
  router.delete(
    '/:id',
    authenticateToken,
    requireAccount,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const id = parseInt(req.params.id)
        const deleted = await repo.delete(accountId, id)
        res.json({ deleted })
      } catch (err) {
        console.error('Error deleting deal label:', err)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
      }
    },
  )

  return router
}

/**
 * Router para atribuicoes de labels em deals — montado em /api/deals.
 */
export function createDealLabelAssignmentRoutes(repo: DealLabelRepository): Router {
  const router = Router()

  // Labels de um deal
  router.get(
    '/:id/labels',
    authenticateToken,
    requireAccount,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const dealId = parseInt(req.params.id)
        const labels = await repo.findByDeal(accountId, dealId)
        res.json({ data: labels })
      } catch (err) {
        console.error('Error listing labels of deal:', err)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
      }
    },
  )

  // Atribui label a um deal
  router.post(
    '/:id/labels/:labelId',
    authenticateToken,
    requireAccount,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const dealId = parseInt(req.params.id)
        const labelId = parseInt(req.params.labelId)
        const ok = await repo.assignToDeal(accountId, dealId, labelId)
        if (!ok) {
          res.status(404).json({ error: 'Etiqueta nao encontrada' })
          return
        }
        res.json({ assigned: true })
      } catch (err) {
        console.error('Error assigning label to deal:', err)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
      }
    },
  )

  // Remove label de um deal
  router.delete(
    '/:id/labels/:labelId',
    authenticateToken,
    requireAccount,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const dealId = parseInt(req.params.id)
        const labelId = parseInt(req.params.labelId)
        const removed = await repo.unassignFromDeal(accountId, dealId, labelId)
        res.json({ removed })
      } catch (err) {
        console.error('Error removing label from deal:', err)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
      }
    },
  )

  return router
}
