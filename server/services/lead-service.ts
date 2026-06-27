import {
  LeadRepository,
  LeadSourceRepository,
  ClientRepository,
  DealRepository,
} from '../repositories/index.js'
import {
  Lead,
  LeadWithDetails,
  LeadSource,
  LeadStatus,
  ApiResponse,
} from '../types/index.js'
import { getProviderForType, NormalizedLead } from './lead-provider.js'

/**
 * LeadService — orquestra a captação e o ciclo de vida do Lead.
 *
 * Fluxo principal:
 *   1. Webhook recebe payload → ingestPayload() converte em N leads "novo"
 *   2. Triagem na UI mostra leads novos
 *   3. Corretor aceita → acceptLead() cria Cliente + Negócio e marca lead como aceito
 *   4. Corretor descarta → discardLead()
 */
export class LeadService {
  private leadRepository: LeadRepository
  private leadSourceRepository: LeadSourceRepository
  private clientRepository: ClientRepository
  private dealRepository: DealRepository

  constructor(
    leadRepository: LeadRepository,
    leadSourceRepository: LeadSourceRepository,
    clientRepository: ClientRepository,
    dealRepository: DealRepository
  ) {
    this.leadRepository = leadRepository
    this.leadSourceRepository = leadSourceRepository
    this.clientRepository = clientRepository
    this.dealRepository = dealRepository
  }

  // -------------------------------------------------------------------------
  // Listagem
  // -------------------------------------------------------------------------

  async list(status?: LeadStatus): Promise<ApiResponse<LeadWithDetails[]>> {
    const leads = await this.leadRepository.findAll({ status })
    return { data: leads, total: leads.length }
  }

  async getById(id: number): Promise<LeadWithDetails> {
    const lead = await this.leadRepository.findById(id)
    if (!lead) throw new Error('Lead not found')
    return lead
  }

  async getCountByStatus() {
    return this.leadRepository.getCountByStatus()
  }

  // -------------------------------------------------------------------------
  // Ingestão via webhook
  // -------------------------------------------------------------------------

  /**
   * Processa um payload bruto recebido no webhook autenticado pelo token.
   * Usa o provider correto baseado no tipo da fonte. Pode resultar em 0..N
   * leads inseridos (a Meta pode mandar batch).
   */
  async ingestPayload(source: LeadSource, payload: any): Promise<Lead[]> {
    if (source.status !== 'active') {
      // Fonte pausada — registra mas não persiste
      console.warn(`[Leads] Payload recebido em fonte pausada (id=${source.id})`)
      return []
    }

    const provider = getProviderForType(source.type)
    // parsePayload é async porque o Meta pode precisar fazer fetch via Graph API
    // pra completar dados do lead (quando recebe só o leadgen_id).
    const normalized: NormalizedLead[] = await provider.parsePayload(payload, source.config)

    const created: Lead[] = []
    for (const lead of normalized) {
      const inserted = await this.leadRepository.insertOrIgnore({
        source_id: source.id,
        external_id: lead.external_id ?? null,
        name: lead.name ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        form_data: lead.form_data ?? null,
      })
      created.push(inserted)
    }

    if (created.length > 0) {
      await this.leadSourceRepository.touchLastLead(source.id).catch(() => undefined)
    }
    return created
  }

  /**
   * Permite criar um lead manualmente pela UI (admin / corretor cadastrando
   * pessoa que veio por outro canal). Vai direto para o status 'novo'.
   */
  async createManual(input: {
    name?: string | null
    email?: string | null
    phone?: string | null
    notes?: string | null
  }): Promise<Lead> {
    return this.leadRepository.insertOrIgnore({
      source_id: null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      form_data: input.notes ? { notes: input.notes } : null,
    })
  }

  // -------------------------------------------------------------------------
  // Aceitar / Descartar
  // -------------------------------------------------------------------------

  /**
   * Aceita um lead: cria Cliente + Negócio no CRM e marca o lead como aceito.
   *
   * Política de cadastro do Cliente: se já existir cliente com mesmo email
   * (ou mesmo phone, quando email vazio), reaproveita. Senão, cria novo.
   * Idem para o Deal — sempre cria um novo, vinculado ao Cliente, com gsv=0
   * (corretor depois preenche).
   */
  async acceptLead(
    leadId: number,
    userId: number
  ): Promise<{ lead: Lead; client_id: number; deal_id: number }> {
    const lead = await this.leadRepository.findById(leadId)
    if (!lead) throw new Error('Lead not found')
    if (lead.status === 'aceito') throw new Error('lead_already_accepted')
    if (lead.status === 'descartado') throw new Error('lead_already_discarded')

    // 1. Cliente — reaproveita por e-mail / telefone se possível
    const client = await this.findOrCreateClient({
      name: lead.name?.trim() || lead.email?.trim() || lead.phone?.trim() || 'Lead sem nome',
      email: lead.email?.trim() || '',
      phone: lead.phone?.trim() || '',
    })

    // 2. Negócio — sempre novo, em fase inicial de atendimento
    const deal = await this.dealRepository.create({
      client: client.name,
      origin_date: new Date().toISOString().slice(0, 10),
      description: this.buildDealDescription(lead),
      client_phone: client.phone || null,
      client_origin: 'online_lead',
      purpose: null,
      deal_type: null,
      gsv: '0',
      property_name: null,
      status: 'service_warm',
      user_id: userId,
    } as any)

    // 3. Atualiza lead com vínculos
    const updated = await this.leadRepository.markAccepted(leadId, {
      clientId: client.id,
      dealId: deal.id,
      acceptedByUserId: userId,
    })
    if (!updated) throw new Error('Lead not found')

    return { lead: updated, client_id: client.id, deal_id: deal.id }
  }

  async discardLead(leadId: number, notes?: string | null): Promise<Lead> {
    const lead = await this.leadRepository.findById(leadId)
    if (!lead) throw new Error('Lead not found')
    if (lead.status === 'descartado') return lead
    const updated = await this.leadRepository.markDiscarded(leadId, notes ?? null)
    if (!updated) throw new Error('Lead not found')
    return updated
  }

  // -------------------------------------------------------------------------
  // Lead sources (CRUD admin)
  // -------------------------------------------------------------------------

  async listSources(): Promise<LeadSource[]> {
    return this.leadSourceRepository.findAll()
  }

  async createSource(input: {
    name: string
    type: 'meta' | 'webhook_generic' | 'manual'
    config?: Record<string, any> | null
  }): Promise<LeadSource> {
    if (!input.name?.trim()) throw new Error('name is required')
    return this.leadSourceRepository.create({
      name: input.name.trim(),
      type: input.type,
      config: input.config ?? null,
    })
  }

  async updateSource(
    id: number,
    input: Partial<{ name: string; config: Record<string, any> | null; status: 'active' | 'paused' }>
  ): Promise<LeadSource> {
    const updated = await this.leadSourceRepository.update(id, input)
    if (!updated) throw new Error('LeadSource not found')
    return updated
  }

  async deleteSource(id: number): Promise<{ success: boolean }> {
    const ok = await this.leadSourceRepository.delete(id)
    if (!ok) throw new Error('LeadSource not found')
    return { success: true }
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  private async findOrCreateClient(input: {
    name: string
    email: string
    phone: string
  }) {
    // Match por e-mail é mais confiável; phone usado como fallback.
    const existing = await this.findExistingClient(input.email, input.phone)
    if (existing) return existing

    return this.clientRepository.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      city: '',
      origin: 'online_lead',
    } as any)
  }

  private async findExistingClient(email: string, phone: string) {
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedEmail && !trimmedPhone) return null
    const all = await this.clientRepository.findAll({ search: trimmedEmail || trimmedPhone })
    return (
      all.find((c) => {
        if (trimmedEmail && c.email?.toLowerCase() === trimmedEmail.toLowerCase()) return true
        if (trimmedPhone && normalizePhone(c.phone) === normalizePhone(trimmedPhone)) return true
        return false
      }) ?? null
    )
  }

  private buildDealDescription(lead: Lead): string {
    const parts = ['Negócio gerado a partir de Lead.']
    if (lead.source_id) parts.push(`Origem: fonte #${lead.source_id}`)
    if (lead.email) parts.push(`Email: ${lead.email}`)
    if (lead.phone) parts.push(`Telefone: ${lead.phone}`)
    if (lead.form_data && Object.keys(lead.form_data).length > 0) {
      parts.push('Dados do formulário:')
      for (const [k, v] of Object.entries(lead.form_data).slice(0, 8)) {
        parts.push(`  • ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      }
    }
    return parts.join('\n')
  }
}

function normalizePhone(phone?: string | null): string {
  return (phone || '').replace(/\D/g, '')
}
