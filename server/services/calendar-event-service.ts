import { CalendarEventRepository } from '../repositories/index.js'
import { CalendarEvent, CalendarEventWithDetails, CalendarEventStatus, AgendaItem, ApiResponse } from '../types/index.js'

/**
 * CalendarEventService — regras do módulo Agenda.
 *
 * Regras chave:
 *   • Usuário comum só vê seus próprios compromissos.
 *   • Admin (role=admin) pode ver de qualquer usuário (querystring viewAll=1
 *     ou userId=X). Endpoint recebe o role e decide.
 *   • Compromissos vinculados a cliente/deal/produto ajudam a dar contexto
 *     (ex: "Reunião de proposta com cliente X").
 */
export class CalendarEventService {
  private repo: CalendarEventRepository

  constructor(repo: CalendarEventRepository) {
    this.repo = repo
  }

  async list(filters: {
    userId?: number
    from?: string
    to?: string
    status?: CalendarEventStatus | 'all'
  }): Promise<ApiResponse<CalendarEventWithDetails[]>> {
    const events = await this.repo.findAll(filters)
    return { data: events, total: events.length }
  }

  async getById(id: number): Promise<CalendarEventWithDetails> {
    const event = await this.repo.findById(id)
    if (!event) throw new Error('CalendarEvent not found')
    return event
  }

  async create(input: {
    user_id: number
    title: string
    description?: string | null
    location?: string | null
    start_at: string
    end_at?: string | null
    all_day?: boolean
    color?: string | null
    client_id?: number | null
    deal_id?: number | null
    product_id?: number | null
  }): Promise<CalendarEvent> {
    if (!input.title || !input.title.trim()) throw new Error('title is required')
    if (!input.start_at) throw new Error('start_at is required')
    return this.repo.create({
      user_id: input.user_id,
      title: input.title.trim(),
      description: input.description ?? null,
      location: input.location ?? null,
      start_at: input.start_at,
      end_at: input.end_at ?? null,
      all_day: input.all_day ?? false,
      color: input.color ?? null,
      client_id: input.client_id ?? null,
      deal_id: input.deal_id ?? null,
      product_id: input.product_id ?? null,
      status: 'scheduled',
    })
  }

  async update(id: number, input: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error('CalendarEvent not found')
    const updated = await this.repo.update(id, input)
    if (!updated) throw new Error('CalendarEvent not found')
    return updated
  }

  async delete(id: number): Promise<{ success: boolean }> {
    const ok = await this.repo.delete(id)
    if (!ok) throw new Error('CalendarEvent not found')
    return { success: true }
  }

  /**
   * Agenda unificada: eventos + follow-ups em aberto, ambos com status
   * agendado, dentro do range de datas.
   */
  async getAgenda(filters: { userId?: number; from?: string; to?: string }): Promise<ApiResponse<AgendaItem[]>> {
    const items = await this.repo.getAgenda(filters)
    return { data: items, total: items.length }
  }
}
