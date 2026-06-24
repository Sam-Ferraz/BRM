import { SaleRepository, ProposalRepository, DealRepository, ProductRepository } from '../repositories/index.js'
import { Sale, SaleWithDetails, SaleStatus, ApiResponse } from '../types/index.js'

/**
 * SaleService — regras do módulo Vendas.
 *
 * Pontos chave:
 *   • Vendas só nascem de propostas aceitas. createFromAcceptedProposal é
 *     chamado pelo ProposalService quando ele detecta status 'accepted'.
 *   • Aprovar uma venda muda o status do imóvel pra 'sold' e tira ele da
 *     vitrine (available_for_sale=false). Isso acontece atomicamente.
 *   • Pra aprovar, sale_date e contract_url precisam estar preenchidos —
 *     o corretor sobe os dados antes de a venda virar aprovável.
 *
 * O service usa o ProductRepository.findByExactName + setStatus pra
 * encontrar o imóvel via deal.property_name. Se não houver match (ex:
 * imóvel deletado), a aprovação não falha — só não atualiza o produto.
 */
export class SaleService {
  private saleRepo: SaleRepository
  private proposalRepo: ProposalRepository
  private dealRepo: DealRepository
  private productRepo: ProductRepository

  constructor(
    saleRepo: SaleRepository,
    proposalRepo: ProposalRepository,
    dealRepo: DealRepository,
    productRepo: ProductRepository
  ) {
    this.saleRepo = saleRepo
    this.proposalRepo = proposalRepo
    this.dealRepo = dealRepo
    this.productRepo = productRepo
  }

  async listAll(filters: { status?: SaleStatus | 'all'; search?: string } = {}): Promise<ApiResponse<SaleWithDetails[]>> {
    const sales = await this.saleRepo.findAll(filters)
    return { data: sales, total: sales.length }
  }

  async findById(id: number): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findById(id)
    if (!sale) throw new Error('Sale not found')
    return sale
  }

  /**
   * Auto-criação chamada pelo ProposalService quando proposta vira accepted.
   * Idempotente: se já existe sale pra essa proposta, retorna a existente
   * sem criar duplicata.
   */
  async createFromAcceptedProposal(proposalId: number): Promise<Sale> {
    const existing = await this.saleRepo.findByProposal(proposalId)
    if (existing) return existing

    const proposal = await this.proposalRepo.findById(proposalId)
    if (!proposal) throw new Error('Proposal not found')
    if (proposal.status !== 'accepted') {
      throw new Error('Proposal must be accepted before creating a sale')
    }

    return this.saleRepo.create({
      proposal_id: proposal.id,
      deal_id: proposal.deal_id,
      seller_user_id: proposal.user_id, // corretor que solicitou a proposta
    })
  }

  async updateDetails(id: number, input: {
    sale_date?: string | null
    contract_url?: string | null
    contract_filename?: string | null
  }): Promise<Sale> {
    const sale = await this.saleRepo.findById(id)
    if (!sale) throw new Error('Sale not found')
    if (sale.status !== 'pending_approval') {
      throw new Error('Cannot edit sale that has already been approved/rejected')
    }
    const updated = await this.saleRepo.updateDetails(id, input)
    if (!updated) throw new Error('Sale not found')
    return updated
  }

  /**
   * Aprova a venda + marca o imóvel como vendido.
   * Requer: sale_date e contract_url preenchidos (regra de negócio).
   */
  async approve(id: number, approverUserId: number, notes?: string | null): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findById(id)
    if (!sale) throw new Error('Sale not found')
    if (sale.status === 'approved') {
      // Idempotente: re-aprovar já-aprovada é no-op
      return sale
    }
    if (sale.status === 'rejected') {
      throw new Error('Cannot approve a rejected sale')
    }
    if (!sale.sale_date) {
      throw new Error('Sale date is required before approval')
    }
    if (!sale.contract_url) {
      throw new Error('Contract is required before approval')
    }

    await this.saleRepo.approve(id, approverUserId, notes)

    // Marca o imóvel como vendido (best effort — não falha se não achar).
    if (sale.deal_property_name) {
      const product = await this.productRepo.findByExactName(sale.deal_property_name)
      if (product) {
        await this.productRepo.setStatus(product.id, 'sold')
      }
    }

    const refreshed = await this.saleRepo.findById(id)
    return refreshed!
  }

  async reject(id: number, approverUserId: number, notes?: string | null): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findById(id)
    if (!sale) throw new Error('Sale not found')
    if (sale.status === 'rejected') return sale
    if (sale.status === 'approved') {
      throw new Error('Cannot reject a sale already approved (the property is marked as sold)')
    }
    await this.saleRepo.reject(id, approverUserId, notes)
    const refreshed = await this.saleRepo.findById(id)
    return refreshed!
  }
}
