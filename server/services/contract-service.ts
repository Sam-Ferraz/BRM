import { ContractRepository } from '../repositories/contract-repository.js'
import { DealRepository, ProposalRepository } from '../repositories/index.js'
import {
  Contract,
  ContractDocument,
  ContractDocumentType,
  ContractStatus,
  ContractWithDetails,
  ApiResponse,
} from '../types/index.js'
import { SaleService } from './sale-service.js'

/**
 * ContractService — regras da nova etapa "Contrato" entre Proposta e Venda.
 *
 * Fluxo de estados (state machine):
 *
 *   pending_docs
 *     ↳ corretor faz upload de docs → status ainda 'pending_docs'
 *     ↳ corretor chama submitToLegal() → 'awaiting_legal'
 *
 *   awaiting_legal
 *     ↳ jurídico chama legalReject(notes) → 'legal_rejected'
 *     ↳ jurídico chama legalApprove() (após anexar contrato) → 'awaiting_manager'
 *
 *   legal_rejected
 *     ↳ corretor revisa/atualiza docs → chama resubmitToLegal() → 'awaiting_legal'
 *
 *   awaiting_manager
 *     ↳ gestor chama managerReject(notes) → 'manager_rejected'
 *     ↳ gestor chama managerApprove() → 'approved' + dispara SaleService.createFromContract
 *
 *   manager_rejected
 *     ↳ gestor pode chamar managerApprove() depois de discutir com o corretor
 *
 *   approved
 *     ↳ terminal — Sale foi criada
 *
 * Além dos estados: Deal.status vai pra 'contract' quando o contrato nasce
 * (via updateDealStatusOnCreate) e só vai pra 'sold' quando managerApprove
 * dispara SaleService.
 */

const VALID_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  pending_docs:     ['awaiting_legal'],
  awaiting_legal:   ['legal_rejected', 'awaiting_manager'],
  legal_rejected:   ['awaiting_legal'],   // corretor reenvia
  awaiting_manager: ['manager_rejected', 'approved'],
  manager_rejected: ['approved'],
  approved:         [],                    // terminal
}

export class ContractService {
  private repo: ContractRepository
  private dealRepo: DealRepository
  private proposalRepo: ProposalRepository
  private saleService: SaleService | null

  constructor(
    repo: ContractRepository,
    dealRepo: DealRepository,
    proposalRepo: ProposalRepository,
    saleService?: SaleService
  ) {
    this.repo = repo
    this.dealRepo = dealRepo
    this.proposalRepo = proposalRepo
    this.saleService = saleService ?? null
  }

  setSaleService(saleService: SaleService): void {
    this.saleService = saleService
  }

  // ---------------------------------------------------------------------------
  // Listagem e leitura
  // ---------------------------------------------------------------------------

  async list(filters: {
    status?: ContractStatus | 'all'
    userId?: number
    search?: string
  }): Promise<ApiResponse<ContractWithDetails[]>> {
    const rows = await this.repo.findAll(filters)
    return { data: rows, total: rows.length }
  }

  async getById(id: number): Promise<ContractWithDetails> {
    const contract = await this.repo.findById(id)
    if (!contract) throw new Error('Contract not found')
    return contract
  }

  async listDocuments(contractId: number): Promise<ContractDocument[]> {
    return this.repo.listDocuments(contractId)
  }

  async getCounts(userId?: number) {
    return this.repo.getCountByStatus(userId)
  }

  // ---------------------------------------------------------------------------
  // Auto-criação a partir de proposta aceita
  // ---------------------------------------------------------------------------

  /**
   * Chamado pelo ProposalService quando uma proposta é aceita. Cria o
   * contrato (idempotente por UNIQUE em proposal_id) e move o Deal pra
   * status 'contract' pra que apareça na nova coluna do Kanban.
   */
  async createFromAcceptedProposal(proposalId: number): Promise<Contract> {
    const proposal = await this.proposalRepo.findById(proposalId)
    if (!proposal) throw new Error('Proposal not found')
    if (proposal.status !== 'accepted') {
      throw new Error('Proposal not accepted — cannot create contract')
    }

    // user_id do contrato = user_id da proposta (corretor que cadastrou o negócio).
    // Se por algum motivo a proposta não tem user_id (dados antigos), usa 0 e
    // corrigimos depois — mas a coluna do banco é NOT NULL, então isso lança erro
    // e o auto-create fica marcado no log (best-effort).
    const brokerId = proposal.user_id ?? 0
    const contract = await this.repo.createFromProposal({
      deal_id: proposal.deal_id,
      proposal_id: proposal.id,
      user_id: brokerId,
      final_value: proposal.proposal_value,
    })

    // Move o Deal pra status 'contract' (best-effort, não derruba se falhar)
    try {
      await this.dealRepo.updateStatus(proposal.deal_id, 'contract' as any)
    } catch (err) {
      console.error('[ContractService] Falha ao atualizar deal.status=contract:', err)
    }

    return contract
  }

  // ---------------------------------------------------------------------------
  // Transições de status
  // ---------------------------------------------------------------------------

  private assertTransition(from: ContractStatus, to: ContractStatus): void {
    const allowed = VALID_TRANSITIONS[from] || []
    if (!allowed.includes(to)) {
      throw new Error(`invalid transition: ${from} → ${to}`)
    }
  }

  /**
   * Corretor termina de anexar documentos e envia pro jurídico revisar.
   */
  async submitToLegal(contractId: number): Promise<Contract> {
    const contract = await this.repo.findById(contractId)
    if (!contract) throw new Error('Contract not found')

    // Exige pelo menos 1 documento antes de enviar
    const docs = await this.repo.listDocuments(contractId)
    const clientDocsCount = docs.filter((d) => d.doc_type === 'client_doc').length
    if (clientDocsCount === 0) {
      throw new Error('Anexe pelo menos 1 documento antes de enviar pro jurídico')
    }

    this.assertTransition(contract.status, 'awaiting_legal')
    const updated = await this.repo.updateStatus(contractId, { status: 'awaiting_legal' })
    if (!updated) throw new Error('Failed to update contract status')
    return updated
  }

  /**
   * Jurídico aprova. Antes de chamar isso, o próprio jurídico deve ter feito
   * upload de pelo menos 1 arquivo com doc_type='contract'.
   */
  async legalApprove(input: {
    contractId: number
    reviewerId: number
    notes?: string | null
  }): Promise<Contract> {
    const contract = await this.repo.findById(input.contractId)
    if (!contract) throw new Error('Contract not found')

    // Exige que o contrato final tenha sido anexado antes de aprovar
    const docs = await this.repo.listDocuments(input.contractId)
    const hasContract = docs.some((d) => d.doc_type === 'contract')
    if (!hasContract) {
      throw new Error('Anexe o contrato final antes de aprovar')
    }

    this.assertTransition(contract.status, 'awaiting_manager')
    const updated = await this.repo.updateStatus(input.contractId, {
      status: 'awaiting_manager',
      legal_notes: input.notes ?? null,
      legal_reviewed_by: input.reviewerId,
    })
    if (!updated) throw new Error('Failed to update contract status')
    return updated
  }

  async legalReject(input: {
    contractId: number
    reviewerId: number
    notes: string
  }): Promise<Contract> {
    if (!input.notes?.trim()) {
      throw new Error('Justificativa é obrigatória ao rejeitar')
    }
    const contract = await this.repo.findById(input.contractId)
    if (!contract) throw new Error('Contract not found')

    this.assertTransition(contract.status, 'legal_rejected')
    const updated = await this.repo.updateStatus(input.contractId, {
      status: 'legal_rejected',
      legal_notes: input.notes.trim(),
      legal_reviewed_by: input.reviewerId,
    })
    if (!updated) throw new Error('Failed to update contract status')
    return updated
  }

  /**
   * Depois do jurídico rejeitar, o corretor arruma os documentos e reenvia
   * pro jurídico revisar de novo.
   */
  async resubmitToLegal(contractId: number): Promise<Contract> {
    const contract = await this.repo.findById(contractId)
    if (!contract) throw new Error('Contract not found')

    this.assertTransition(contract.status, 'awaiting_legal')
    const updated = await this.repo.updateStatus(contractId, { status: 'awaiting_legal' })
    if (!updated) throw new Error('Failed to update contract status')
    return updated
  }

  /**
   * Gestor aprova o contrato inteiro. Dispara criação da Sale (que por sua
   * vez marca o Deal como 'sold' via SaleService).
   */
  async managerApprove(input: {
    contractId: number
    reviewerId: number
    notes?: string | null
    finalValue?: string | number | null
  }): Promise<Contract> {
    const contract = await this.repo.findById(input.contractId)
    if (!contract) throw new Error('Contract not found')

    this.assertTransition(contract.status, 'approved')
    const updated = await this.repo.updateStatus(input.contractId, {
      status: 'approved',
      manager_notes: input.notes ?? null,
      manager_reviewed_by: input.reviewerId,
      final_value: input.finalValue ?? undefined,
    })
    if (!updated) throw new Error('Failed to update contract status')

    // Dispara criação da Sale — best-effort
    if (this.saleService) {
      try {
        await this.saleService.createFromAcceptedProposal(contract.proposal_id)
      } catch (err) {
        console.error('[ContractService] Falha ao criar Sale após approval:', err)
      }
    }

    return updated
  }

  async managerReject(input: {
    contractId: number
    reviewerId: number
    notes: string
  }): Promise<Contract> {
    if (!input.notes?.trim()) {
      throw new Error('Justificativa é obrigatória ao rejeitar')
    }
    const contract = await this.repo.findById(input.contractId)
    if (!contract) throw new Error('Contract not found')

    this.assertTransition(contract.status, 'manager_rejected')
    const updated = await this.repo.updateStatus(input.contractId, {
      status: 'manager_rejected',
      manager_notes: input.notes.trim(),
      manager_reviewed_by: input.reviewerId,
    })
    if (!updated) throw new Error('Failed to update contract status')
    return updated
  }

  // ---------------------------------------------------------------------------
  // Documentos
  // ---------------------------------------------------------------------------

  async addDocument(input: {
    contract_id: number
    uploader_id: number
    doc_type: ContractDocumentType
    filename: string
    file_url: string
    file_size?: number
    mime_type?: string
    notes?: string
  }): Promise<ContractDocument> {
    const contract = await this.repo.findById(input.contract_id)
    if (!contract) throw new Error('Contract not found')

    // Regra: docs de tipo 'contract' só podem ser adicionados quando jurídico
    // está revisando. Docs de tipo 'client_doc' só antes de enviar pro jurídico
    // ou quando o jurídico rejeita (pra corretor reenviar).
    if (input.doc_type === 'contract') {
      if (contract.status !== 'awaiting_legal') {
        throw new Error('Contrato final só pode ser anexado enquanto jurídico está revisando')
      }
    } else {
      if (contract.status === 'approved' || contract.status === 'awaiting_manager') {
        throw new Error('Documentos do cliente não podem ser alterados após revisão do jurídico')
      }
    }

    return this.repo.addDocument(input)
  }

  async removeDocument(documentId: number): Promise<boolean> {
    const doc = await this.repo.getDocumentById(documentId)
    if (!doc) throw new Error('Document not found')
    const contract = await this.repo.findById(doc.contract_id)
    if (!contract) throw new Error('Contract not found')
    // Se contrato já foi aprovado, ninguém apaga anexo — imutável pra auditoria
    if (contract.status === 'approved') {
      throw new Error('Contrato já aprovado — anexos não podem ser removidos')
    }
    return this.repo.deleteDocument(documentId)
  }
}
