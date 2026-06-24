import { ProposalRepository, DealRepository } from '../repositories/index.js'
import { Proposal, ProposalWithDetails, QueryFilters, ApiResponse, ProposalStatus } from '../types/index.js'
import { SaleService } from './sale-service.js'

const VALID_STATUSES: ProposalStatus[] = ['pending', 'accepted', 'rejected', 'counter_proposal', 'expired']

export class ProposalService {
  private proposalRepository: ProposalRepository
  private dealRepository: DealRepository
  // Opcional pra evitar dependência circular durante construção em testes.
  // Quando setado (via server/index.ts), proposta aceita auto-cria Sale.
  private saleService: SaleService | null

  constructor(
    proposalRepository: ProposalRepository,
    dealRepository: DealRepository,
    saleService?: SaleService
  ) {
    this.proposalRepository = proposalRepository
    this.dealRepository = dealRepository
    this.saleService = saleService ?? null
  }

  setSaleService(saleService: SaleService): void {
    this.saleService = saleService
  }

  /**
   * When a proposal lands on the 'accepted' status, push its value into the
   * related Deal's gsv (VGV). One-way sync: changes to other statuses or
   * deletions do not revert the deal's gsv, to avoid destroying data the
   * salesperson may have edited manually since.
   */
  private async syncDealGsvIfAccepted(proposal: Proposal): Promise<void> {
    if (proposal.status !== 'accepted') return
    try {
      await this.dealRepository.updateGsv(proposal.deal_id, proposal.proposal_value)
    } catch (error) {
      console.error('Error syncing deal gsv from accepted proposal:', error)
      // Don't fail the proposal write because of the side-effect sync — log and continue.
    }
  }

  /**
   * Quando proposta vira 'accepted', cria automaticamente uma Sale com status
   * 'pending_approval'. Idempotente — SaleService.createFromAcceptedProposal
   * já retorna a venda existente se já tiver sido criada.
   *
   * Best-effort: erro aqui só é logado, não derruba o write da proposta.
   */
  private async autoCreateSaleIfAccepted(proposal: Proposal): Promise<void> {
    if (proposal.status !== 'accepted') return
    if (!this.saleService) return
    try {
      await this.saleService.createFromAcceptedProposal(proposal.id)
    } catch (error) {
      console.error('Error auto-creating sale from accepted proposal:', error)
    }
  }

  /**
   * The proposal form lets the user override the deal's property; the last
   * write from the form wins. Only fires when the caller actually supplied a
   * propertyName (undefined = "form did not touch this field"). An explicit
   * empty string is honored and clears the deal's property.
   */
  private async syncDealPropertyIfProvided(dealId: number, propertyName?: string | null): Promise<void> {
    if (propertyName === undefined) return
    try {
      await this.dealRepository.updatePropertyName(dealId, propertyName)
    } catch (error) {
      console.error('Error syncing deal property_name from proposal:', error)
    }
  }

  async getAllProposals(filters: QueryFilters, userId: number): Promise<ApiResponse<ProposalWithDetails[]>> {
    try {
      const proposals = await this.proposalRepository.findAll(filters, userId)
      return { data: proposals, total: proposals.length }
    } catch (error) {
      console.error('Error fetching proposals:', error)
      throw new Error('Internal server error')
    }
  }

  async getProposalById(id: number): Promise<ProposalWithDetails> {
    try {
      const proposal = await this.proposalRepository.findById(id)
      if (!proposal) throw new Error('Proposal not found')
      return proposal
    } catch (error) {
      if (error instanceof Error && error.message === 'Proposal not found') throw error
      console.error('Error fetching proposal:', error)
      throw new Error('Internal server error')
    }
  }

  async createProposal(
    data: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>,
    propertyName?: string | null
  ): Promise<Proposal> {
    if (!data.deal_id) throw new Error('deal_id is required')
    if (data.proposal_value === undefined || data.proposal_value === null || Number(data.proposal_value) <= 0) {
      throw new Error('proposal_value must be greater than zero')
    }
    if (!data.proposal_date) throw new Error('proposal_date is required')
    if (!VALID_STATUSES.includes(data.status)) throw new Error('invalid status')

    try {
      const created = await this.proposalRepository.create(data)
      await this.syncDealGsvIfAccepted(created)
      await this.syncDealPropertyIfProvided(created.deal_id, propertyName)
      await this.autoCreateSaleIfAccepted(created)
      return created
    } catch (error) {
      console.error('Error creating proposal:', error)
      throw new Error('Internal server error')
    }
  }

  async updateProposal(
    id: number,
    data: Partial<Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'user_id'>>,
    propertyName?: string | null
  ): Promise<Proposal> {
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
      throw new Error('invalid status')
    }
    if (data.proposal_value !== undefined && Number(data.proposal_value) <= 0) {
      throw new Error('proposal_value must be greater than zero')
    }
    try {
      const updated = await this.proposalRepository.update(id, data)
      if (!updated) throw new Error('Proposal not found')
      await this.syncDealGsvIfAccepted(updated)
      await this.syncDealPropertyIfProvided(updated.deal_id, propertyName)
      await this.autoCreateSaleIfAccepted(updated)
      return updated
    } catch (error) {
      if (error instanceof Error && (error.message === 'Proposal not found' || error.message === 'invalid status' || error.message === 'proposal_value must be greater than zero')) {
        throw error
      }
      console.error('Error updating proposal:', error)
      throw new Error('Internal server error')
    }
  }

  async deleteProposal(id: number): Promise<{ success: boolean }> {
    try {
      const deleted = await this.proposalRepository.delete(id)
      if (!deleted) throw new Error('Proposal not found')
      return { success: true }
    } catch (error) {
      if (error instanceof Error && error.message === 'Proposal not found') throw error
      console.error('Error deleting proposal:', error)
      throw new Error('Internal server error')
    }
  }
}
