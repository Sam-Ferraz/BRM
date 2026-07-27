import { Router, Response } from 'express'
import { LeadPipelineService } from '../services/lead-pipeline-service.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * Rotas CRUD para a Esteira de Leads. Restritas via middleware de auth —
 * a validação de que só admin/gerente podem editar fica no frontend
 * (mesmo padrão dos outros módulos administrativos hoje). Endpoint de
 * escalação em tempo real vem em outra iteração.
 *
 * Multi-tenancy: todas as rotas passam por requireAccount e escopam as
 * queries pelo account_id do usuário logado.
 */
export function createLeadPipelineRoutes(service: LeadPipelineService): Router {
  const router = Router()

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const data = await service.list(accountId)
      res.json({ data })
    } catch (err) {
      console.error('Error listing lead pipelines:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id, 10)
      const pipeline = await service.get(accountId, id)
      if (!pipeline) {
        res.status(404).json({ error: 'Esteira não encontrada' })
        return
      }
      res.json({ data: pipeline })
    } catch (err) {
      console.error('Error fetching lead pipeline:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const created = await service.create(accountId, req.body)
      res.status(201).json({ data: created })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar esteira'
      console.error('Error creating lead pipeline:', err)
      res.status(400).json({ error: msg })
    }
  })

  router.put('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id, 10)
      const updated = await service.update(accountId, id, req.body)
      if (!updated) {
        res.status(404).json({ error: 'Esteira não encontrada' })
        return
      }
      res.json({ data: updated })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar esteira'
      console.error('Error updating lead pipeline:', err)
      res.status(400).json({ error: msg })
    }
  })

  router.delete('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id, 10)
      const ok = await service.delete(accountId, id)
      if (!ok) {
        res.status(404).json({ error: 'Esteira não encontrada' })
        return
      }
      res.json({ data: { success: true } })
    } catch (err) {
      console.error('Error deleting lead pipeline:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
