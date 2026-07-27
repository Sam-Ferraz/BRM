import { Request, Response, Router } from 'express'
import { ClientService } from '../services/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

export function createClientRoutes(clientService: ClientService): Router {
  const router = Router()

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const filters = {
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await clientService.getAllClients(accountId, filters)
      res.json(result)
    } catch (error) {
      console.error('Error in get clients route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const { name, email, phone, city, address, origin } = req.body
      const client = await clientService.createClient(accountId, { name, email, phone, city, address, origin })
      res.json(client)
    } catch (error) {
      console.error('Error in create client route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const { name, email, phone, city, address, origin } = req.body
      const client = await clientService.updateClient(accountId, id, { name, email, phone, city, address, origin })
      res.json(client)
    } catch (error) {
      console.error('Error in update client route:', error)
      if (error instanceof Error && error.message === 'Client not found') {
        res.status(404).json({ error: 'Client not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const result = await clientService.deleteClient(accountId, id)
      res.json(result)
    } catch (error) {
      console.error('Error in delete client route:', error)
      if (error instanceof Error && error.message === 'Client not found') {
        res.status(404).json({ error: 'Client not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
