import { LeadPipeline, LeadPipelinePayload } from '../types/index.js'
import { LeadPipelineRepository } from '../repositories/lead-pipeline-repository.js'

/**
 * Valida payload e delega o CRUD ao repositório. O fluxo de escalação
 * (distribuir lead pro próximo, timeout, gerente) vem em outra iteração.
 *
 * REGRA DE ESCOPO (importante pra iteração 2):
 *   A esteira SÓ se aplica a leads recebidos POR INTEGRAÇÃO — quem chega
 *   via webhook do Meta (source_id preenchido) ou qualquer outra fonte
 *   externa configurada em lead_sources.
 *
 *   Cadastros MANUAIS de leads/clientes/deals feitos direto no BRM (por
 *   corretores, gerentes ou administrativos) NÃO passam por esteira —
 *   ficam automaticamente vinculados ao user_id do usuário logado.
 *
 *   Concretamente, na iteração 2 o gate deve ser algo como:
 *     if (lead.source_id === null) { skipPipelineEscalation(); return }
 *
 * Multi-tenancy:
 *   - Cada esteira pertence a uma account (lead_pipelines.account_id).
 *   - Gerente e todos os corretores membros DEVEM ser da mesma account.
 *     Se algum user_id enviado for de outra conta, o create/update rejeita.
 */
export class LeadPipelineService {
  constructor(private repo: LeadPipelineRepository) {}

  async list(accountId: number): Promise<LeadPipeline[]> {
    return this.repo.findAll(accountId)
  }

  async get(accountId: number, id: number): Promise<LeadPipeline | null> {
    return this.repo.findById(accountId, id)
  }

  async create(accountId: number, payload: LeadPipelinePayload): Promise<LeadPipeline> {
    this.validate(payload)
    await this.assertUsersInAccount(accountId, payload)
    return this.repo.create(accountId, payload)
  }

  async update(accountId: number, id: number, payload: LeadPipelinePayload): Promise<LeadPipeline | null> {
    this.validate(payload)
    await this.assertUsersInAccount(accountId, payload)
    return this.repo.update(accountId, id, payload)
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    return this.repo.delete(accountId, id)
  }

  /**
   * Garante que o gerente + todos os corretores membros pertencem à mesma
   * account em que a esteira vive. Sem essa checagem, um admin de uma conta
   * conseguiria "sequestrar" corretores de outra conta pra dentro da esteira
   * — quebrando o isolamento multi-tenant.
   */
  private async assertUsersInAccount(accountId: number, payload: LeadPipelinePayload) {
    const ids = Array.from(new Set([payload.manager_user_id, ...payload.member_user_ids]))
    const found = await this.repo.findUsersInAccount(accountId, ids)
    if (found.length !== ids.length) {
      const missing = ids.filter((id) => !found.includes(id))
      throw new Error(
        `Usuários não pertencem a esta conta: ${missing.join(', ')} — só é possível adicionar corretores/gerentes da mesma empresa.`
      )
    }
  }

  private validate(payload: LeadPipelinePayload) {
    if (!payload.name || !payload.name.trim()) {
      throw new Error('Nome da esteira é obrigatório')
    }
    if (payload.hour_start < 0 || payload.hour_start > 23) {
      throw new Error('Horário inicial inválido (0..23)')
    }
    if (payload.hour_end < 0 || payload.hour_end > 23) {
      throw new Error('Horário final inválido (0..23)')
    }
    if (payload.hour_end < payload.hour_start) {
      throw new Error('Horário final não pode ser menor que o inicial')
    }
    if (!Number.isFinite(payload.timeout_seconds) || payload.timeout_seconds <= 0) {
      throw new Error('Tempo limite deve ser um número positivo em segundos')
    }
    if (!payload.manager_user_id) {
      throw new Error('Gerente supervisor é obrigatório')
    }
    if (!Array.isArray(payload.member_user_ids) || payload.member_user_ids.length === 0) {
      throw new Error('A esteira precisa de pelo menos um corretor')
    }
    // Sem duplicatas na lista de corretores
    const set = new Set(payload.member_user_ids)
    if (set.size !== payload.member_user_ids.length) {
      throw new Error('Um mesmo corretor não pode aparecer duas vezes na lista')
    }
    // Gerente não deve estar na lista de corretores (papel diferente na esteira)
    if (set.has(payload.manager_user_id)) {
      throw new Error('O gerente não deve estar também na lista de corretores')
    }
  }
}
