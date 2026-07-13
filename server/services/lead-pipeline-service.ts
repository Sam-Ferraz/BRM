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
 */
export class LeadPipelineService {
  constructor(private repo: LeadPipelineRepository) {}

  async list(): Promise<LeadPipeline[]> {
    return this.repo.findAll()
  }

  async get(id: number): Promise<LeadPipeline | null> {
    return this.repo.findById(id)
  }

  async create(payload: LeadPipelinePayload): Promise<LeadPipeline> {
    this.validate(payload)
    return this.repo.create(payload)
  }

  async update(id: number, payload: LeadPipelinePayload): Promise<LeadPipeline | null> {
    this.validate(payload)
    return this.repo.update(id, payload)
  }

  async delete(id: number): Promise<boolean> {
    return this.repo.delete(id)
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
