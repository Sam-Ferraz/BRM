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
 *   • Multi-tenancy: todo método recebe accountId como primeiro parâmetro
 *     e repassa pros repositórios (Sale, Proposal, Deal, Product) pra
 *     garantir isolamento entre contas.
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

  async listAll(accountId: number, filters: {
    status?: SaleStatus | 'all'
    search?: string
    createdFrom?: string
    createdTo?: string
  } = {}): Promise<ApiResponse<SaleWithDetails[]>> {
    const sales = await this.saleRepo.findAll(accountId, filters)
    return { data: sales, total: sales.length }
  }

  async findById(accountId: number, id: number): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findById(accountId, id)
    if (!sale) throw new Error('Sale not found')
    return sale
  }

  /**
   * Auto-criação chamada pelo ProposalService/ContractService quando proposta
   * vira accepted / contrato é aprovado. Idempotente: se já existe sale pra
   * essa proposta, retorna a existente sem criar duplicata.
   */
  async createFromAcceptedProposal(accountId: number, proposalId: number): Promise<Sale> {
    const existing = await this.saleRepo.findByProposal(accountId, proposalId)
    if (existing) return existing

    const proposal = await this.proposalRepo.findById(accountId, proposalId)
    if (!proposal) throw new Error('Proposal not found')
    if (proposal.status !== 'accepted') {
      throw new Error('Proposal must be accepted before creating a sale')
    }

    return this.saleRepo.create(accountId, {
      proposal_id: proposal.id,
      deal_id: proposal.deal_id,
      seller_user_id: proposal.user_id, // corretor que solicitou a proposta
    })
  }

  /**
   * Atualiza dados editáveis. Permitido em qualquer status — incluindo
   * approved/rejected — para o caso de corrigir contrato ou data depois.
   * Sempre passa o usuário que fez a alteração pra registrar no tracking.
   */
  async updateDetails(accountId: number, id: number, modifiedByUserId: number, input: {
    sale_date?: string | null
    contract_url?: string | null
    contract_filename?: string | null
  }): Promise<Sale> {
    const sale = await this.saleRepo.findById(accountId, id)
    if (!sale) throw new Error('Sale not found')
    const updated = await this.saleRepo.updateDetails(accountId, id, modifiedByUserId, input)
    if (!updated) throw new Error('Sale not found')
    return updated
  }

  /**
   * Aprova a venda + marca o imóvel como vendido.
   * Requer: sale_date e contract_url preenchidos (regra de negócio).
   */
  async approve(accountId: number, id: number, approverUserId: number, notes?: string | null): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findById(accountId, id)
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

    await this.saleRepo.approve(accountId, id, approverUserId, notes)

    // Marca o imóvel como vendido (best effort — não falha se não achar).
    if (sale.deal_property_name) {
      const product = await this.productRepo.findByExactName(accountId, sale.deal_property_name)
      if (product) {
        await this.productRepo.setStatus(accountId, product.id, 'sold')
      }
    }

    const refreshed = await this.saleRepo.findById(accountId, id)
    return refreshed!
  }

  /**
   * Exclui uma venda permanentemente. NÃO reverte o status do imóvel
   * (se a venda estava aprovada e o produto está como 'sold', ele continua
   * sold). Se o usuário quiser liberar o imóvel pra Vitrine, deve fazer
   * manualmente no formulário do imóvel — evita efeito colateral inesperado.
   */
  async deleteSale(accountId: number, id: number): Promise<{ success: boolean }> {
    const sale = await this.saleRepo.findById(accountId, id)
    if (!sale) throw new Error('Sale not found')
    const deleted = await this.saleRepo.delete(accountId, id)
    if (!deleted) throw new Error('Sale not found')
    return { success: true }
  }

  async reject(accountId: number, id: number, approverUserId: number, notes?: string | null): Promise<SaleWithDetails> {
    const sale = await this.saleRepo.findById(accountId, id)
    if (!sale) throw new Error('Sale not found')
    if (sale.status === 'rejected') return sale
    if (sale.status === 'approved') {
      throw new Error('Cannot reject a sale already approved (the property is marked as sold)')
    }
    await this.saleRepo.reject(accountId, id, approverUserId, notes)
    const refreshed = await this.saleRepo.findById(accountId, id)
    return refreshed!
  }
}
