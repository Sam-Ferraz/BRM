import { Request, Response, Router } from 'express'
import { PipelineService } from '../services/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

export function createPipelineRoutes(pipelineService: PipelineService): Router {
  const router = Router()

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await pipelineService.list(req.user!.accountId)
      res.json(result)
    } catch (err) {
      console.error('Error in list pipelines:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await pipelineService.create(req.user!.accountId, req.body)
      res.status(201).json({ data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error'
      const code = msg === 'name is required' || msg.startsWith('Ja existe') ? 400 : 500
      res.status(code).json({ error: msg })
    }
  })

  router.put('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const data = await pipelineService.update(req.user!.accountId, id, req.body)
      res.json({ data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error'
      const code = msg === 'Pipeline not found' ? 404 : msg.startsWith('Ja existe') ? 400 : 500
      res.status(code).json({ error: msg })
    }
  })

  router.delete('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await pipelineService.delete(req.user!.accountId, id)
      res.json(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error'
      const code = msg === 'Pipeline not found' ? 404 : msg.startsWith('Nao e possivel') ? 400 : 500
      res.status(code).json({ error: msg })
    }
  })

  return router
}
