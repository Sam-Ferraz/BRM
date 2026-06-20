import { Response, Router } from 'express'
import { ProposalService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'
import { ProposalStatus } from '../types/index.js'

export function createProposalRoutes(proposalService: ProposalService): Router {
  const router = Router()

  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      }
      const result = await proposalService.getAllProposals(filters, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get proposals route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const proposal = await proposalService.getProposalById(id)
      res.json(proposal)
    } catch (error) {
      if (error instanceof Error && error.message === 'Proposal not found') {
        res.status(404).json({ error: 'Proposal not found' })
        return
      }
      console.error('Error in get proposal route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const {
        deal_id,
        proposal_value,
        payment_condition,
        proposal_date,
        validity_date,
        status,
        notes,
        property_name,
      } = req.body

      const proposal = await proposalService.createProposal(
        {
          deal_id,
          proposal_value,
          payment_condition,
          proposal_date,
          validity_date,
          status: (status || 'pending') as ProposalStatus,
          notes,
          user_id: userId,
        },
        property_name
      )
      res.json(proposal)
    } catch (error) {
      if (error instanceof Error && [
        'deal_id is required',
        'proposal_value must be greater than zero',
        'proposal_date is required',
        'invalid status',
      ].includes(error.message)) {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error in create proposal route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const {
        deal_id,
        proposal_value,
        payment_condition,
        proposal_date,
        validity_date,
        status,
        notes,
        property_name,
      } = req.body

      const proposal = await proposalService.updateProposal(
        id,
        {
          deal_id,
          proposal_value,
          payment_condition,
          proposal_date,
          validity_date,
          status,
          notes,
        },
        property_name
      )
      res.json(proposal)
    } catch (error) {
      if (error instanceof Error && error.message === 'Proposal not found') {
        res.status(404).json({ error: 'Proposal not found' })
        return
      }
      if (error instanceof Error && ['invalid status', 'proposal_value must be greater than zero'].includes(error.message)) {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error in update proposal route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await proposalService.deleteProposal(id)
      res.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === 'Proposal not found') {
        res.status(404).json({ error: 'Proposal not found' })
        return
      }
      console.error('Error in delete proposal route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
