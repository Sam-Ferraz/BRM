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
import { MetaTokenService } from './meta-token-service.js'

/**
 * LeadService — orquestra a captação e o ciclo de vida do Lead.
 *
 * Fluxo principal:
 *   1. Webhook recebe payload → ingestPayload() converte em N leads "novo"
 *   2. Triagem na UI mostra leads novos
 *   3. Corretor aceita → acceptLead() cria Cliente + Negócio e marca lead como aceito
 *   4. Corretor descarta → discardLead()
 *
 * Multi-tenancy:
 *   - Rotas autenticadas passam accountId vindo de req.user!.accountId.
 *   - O webhook público NÃO tem usuário logado, então ingestPayload deriva o
 *     accountId de source.account_id (o webhook_token identifica a source, e
 *     a source pertence a uma conta).
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

  async list(accountId: number, status?: LeadStatus): Promise<ApiResponse<LeadWithDetails[]>> {
    const leads = await this.leadRepository.findAll(accountId, { status })
    return { data: leads, total: leads.length }
  }

  async getById(accountId: number, id: number): Promise<LeadWithDetails> {
    const lead = await this.leadRepository.findById(accountId, id)
    if (!lead) throw new Error('Lead not found')
    return lead
  }

  async getCountByStatus(accountId: number) {
    return this.leadRepository.getCountByStatus(accountId)
  }

  // -------------------------------------------------------------------------
  // Ingestão via webhook
  // -------------------------------------------------------------------------

  /**
   * Processa um payload bruto recebido no webhook autenticado pelo token.
   * Usa o provider correto baseado no tipo da fonte. Pode resultar em 0..N
   * leads inseridos (a Meta pode mandar batch).
   *
   * O accountId é derivado de source.account_id — o webhook público não tem
   * usuário autenticado, então a source (identificada pelo webhook_token da
   * URL) é a fonte de verdade sobre a qual conta recebe esses leads.
   */
  async ingestPayload(source: LeadSource, payload: any): Promise<Lead[]> {
    if (source.status !== 'active') {
      // Fonte pausada — registra mas não persiste
      console.warn(`[Leads] Payload recebido em fonte pausada (id=${source.id})`)
      return []
    }

    const accountId = source.account_id
    if (!accountId) {
      console.error(`[Leads] Source id=${source.id} sem account_id — payload descartado`)
      return []
    }

    const provider = getProviderForType(source.type)
    // parsePayload é async porque o Meta pode precisar fazer fetch via Graph API
    // pra completar dados do lead (quando recebe só o leadgen_id).
    const normalized: NormalizedLead[] = await provider.parsePayload(payload, source.config)

    const created: Lead[] = []
    for (const lead of normalized) {
      const inserted = await this.leadRepository.insertOrIgnore(accountId, {
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
      await this.leadSourceRepository.touchLastLead(accountId, source.id).catch(() => undefined)
    }
    return created
  }

  /**
   * Permite criar um lead manualmente pela UI (admin / corretor cadastrando
   * pessoa que veio por outro canal). Vai direto para o status 'novo'.
   */
  async createManual(accountId: number, input: {
    name?: string | null
    email?: string | null
    phone?: string | null
    notes?: string | null
  }): Promise<Lead> {
    return this.leadRepository.insertOrIgnore(accountId, {
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
    accountId: number,
    leadId: number,
    userId: number
  ): Promise<{ lead: Lead; client_id: number; deal_id: number }> {
    const lead = await this.leadRepository.findById(accountId, leadId)
    if (!lead) throw new Error('Lead not found')
    if (lead.status === 'aceito') throw new Error('lead_already_accepted')
    if (lead.status === 'descartado') throw new Error('lead_already_discarded')

    // 1. Cliente — reaproveita por e-mail / telefone se possível
    const client = await this.findOrCreateClient(accountId, {
      name: lead.name?.trim() || lead.email?.trim() || lead.phone?.trim() || 'Lead sem nome',
      email: lead.email?.trim() || '',
      phone: lead.phone?.trim() || '',
    })

    // 2. Negócio — sempre novo, em fase inicial de atendimento
    const deal = await this.dealRepository.create(accountId, {
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
    const updated = await this.leadRepository.markAccepted(accountId, leadId, {
      clientId: client.id,
      dealId: deal.id,
      acceptedByUserId: userId,
    })
    if (!updated) throw new Error('Lead not found')

    return { lead: updated, client_id: client.id, deal_id: deal.id }
  }

  async discardLead(accountId: number, leadId: number, notes?: string | null): Promise<Lead> {
    const lead = await this.leadRepository.findById(accountId, leadId)
    if (!lead) throw new Error('Lead not found')
    if (lead.status === 'descartado') return lead
    const updated = await this.leadRepository.markDiscarded(accountId, leadId, notes ?? null)
    if (!updated) throw new Error('Lead not found')
    return updated
  }

  // -------------------------------------------------------------------------
  // Lead sources (CRUD admin)
  // -------------------------------------------------------------------------

  async listSources(accountId: number): Promise<LeadSource[]> {
    return this.leadSourceRepository.findAll(accountId)
  }

  async createSource(accountId: number, input: {
    name: string
    type: 'meta' | 'webhook_generic' | 'manual'
    config?: Record<string, any> | null
  }): Promise<LeadSource> {
    if (!input.name?.trim()) throw new Error('name is required')
    const finalConfig = await this.maybeUpgradeMetaToken(input.type, input.config ?? null)
    return this.leadSourceRepository.create(accountId, {
      name: input.name.trim(),
      type: input.type,
      config: finalConfig,
    })
  }

  async updateSource(
    accountId: number,
    id: number,
    input: Partial<{ name: string; config: Record<string, any> | null; status: 'active' | 'paused' }>
  ): Promise<LeadSource> {
    // Faz upgrade do token Meta antes de gravar (só quando config foi enviada)
    if (input.config !== undefined) {
      const existing = await this.leadSourceRepository.findById(accountId, id)
      const type = existing?.type
      if (type === 'meta') {
        input = { ...input, config: await this.maybeUpgradeMetaToken(type, input.config ?? null) }
      }
    }
    const updated = await this.leadSourceRepository.update(accountId, id, input)
    if (!updated) throw new Error('LeadSource not found')
    return updated
  }

  /**
   * Se a source é Meta e a config traz um page_access_token, tenta transformar
   * em Page Token permanente (que não expira). Faz nada se:
   *   - não é Meta
   *   - não veio token
   *   - já é token permanente (upgrade detecta e devolve como está)
   * Em caso de erro (token inválido, page_id ausente, etc.), joga exceção
   * com mensagem clara pra UI mostrar pro usuário.
   */
  private async maybeUpgradeMetaToken(
    type: string,
    config: Record<string, any> | null
  ): Promise<Record<string, any> | null> {
    if (type !== 'meta' || !config) return config
    const inputToken = (config.page_access_token as string) || (config.access_token as string)
    if (!inputToken) return config

    const pageId = (config.page_id as string) || ''
    const appId = process.env.META_APP_ID || (config.app_id as string) || ''
    const appSecret = (config.app_secret as string) || process.env.META_APP_SECRET || ''

    if (!appId) {
      throw new Error(
        'Pra transformar o token em permanente preciso do App ID. Preenche o campo "App ID" na integração.'
      )
    }
    if (!appSecret) {
      throw new Error(
        'Pra transformar o token em permanente preciso do App Secret. Preenche o campo "App Secret" na integração.'
      )
    }
    if (!pageId) {
      throw new Error(
        'Pra transformar o token em permanente preciso do Page ID. Preenche o campo "Page ID" na integração (é o ID numérico da Página do Facebook).'
      )
    }

    const svc = new MetaTokenService()
    const result = await svc.upgradeToPermanentPageToken({
      inputToken,
      pageId,
      appId,
      appSecret,
    })

    return {
      ...config,
      page_access_token: result.token,
      // Marca metadata pra UI mostrar status
      _token_meta: {
        upgraded: result.upgraded,
        page_name: result.page_name,
        upgraded_at: new Date().toISOString(),
      },
    }
  }

  async deleteSource(accountId: number, id: number): Promise<{ success: boolean }> {
    const ok = await this.leadSourceRepository.delete(accountId, id)
    if (!ok) throw new Error('LeadSource not found')
    return { success: true }
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  private async findOrCreateClient(accountId: number, input: {
    name: string
    email: string
    phone: string
  }) {
    // Match por e-mail é mais confiável; phone usado como fallback.
    const existing = await this.findExistingClient(accountId, input.email, input.phone)
    if (existing) return existing

    return this.clientRepository.create(accountId, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      city: '',
      origin: 'online_lead',
    } as any)
  }

  private async findExistingClient(accountId: number, email: string, phone: string) {
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedEmail && !trimmedPhone) return null
    const all = await this.clientRepository.findAll(accountId, { search: trimmedEmail || trimmedPhone })
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
