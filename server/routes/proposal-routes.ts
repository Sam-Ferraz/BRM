import { Response, Router } from 'express'
import { ProposalService } from '../services/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'
import { ProposalStatus } from '../types/index.js'

export function createProposalRoutes(proposalService: ProposalService): Router {
  const router = Router()

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        createdFrom: req.query.createdFrom as string | undefined,
        createdTo: req.query.createdTo as string | undefined,
      }
      const result = await proposalService.getAllProposals(accountId, filters, userId)
      res.json(result)
    } catch (error) {
      console.error('Error in get proposals route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const proposal = await proposalService.getProposalById(accountId, id)
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

  router.post('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
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
        accountId,
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

  router.put('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
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
        accountId,
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

  router.delete('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const id = parseInt(req.params.id)
      const result = await proposalService.deleteProposal(accountId, id)
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
