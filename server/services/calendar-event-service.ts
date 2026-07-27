import { CalendarEventRepository } from '../repositories/index.js'
import { GoogleCalendarService } from './google-calendar-service.js'
import { CalendarEvent, CalendarEventWithDetails, CalendarEventStatus, AgendaItem, ApiResponse } from '../types/index.js'

/**
 * CalendarEventService — regras do módulo Agenda.
 *
 * Regras chave:
 *   • Usuário comum só vê seus próprios compromissos.
 *   • Admin (role=admin) pode ver de qualquer usuário DA MESMA account
 *     (querystring viewAll=1 ou userId=X). Endpoint recebe o role e decide.
 *   • Compromissos vinculados a cliente/deal/produto ajudam a dar contexto
 *     (ex: "Reunião de proposta com cliente X").
 *   • Multi-tenancy: accountId obrigatório em todos os métodos — nunca vaza
 *     dado entre accounts.
 */
export class CalendarEventService {
  private repo: CalendarEventRepository
  private googleService?: GoogleCalendarService

  constructor(repo: CalendarEventRepository, googleService?: GoogleCalendarService) {
    this.repo = repo
    this.googleService = googleService
  }

  async list(
    accountId: number,
    filters: {
      userId?: number
      from?: string
      to?: string
      status?: CalendarEventStatus | 'all'
    }
  ): Promise<ApiResponse<CalendarEventWithDetails[]>> {
    const events = await this.repo.findAll(accountId, filters)
    return { data: events, total: events.length }
  }

  async getById(accountId: number, id: number): Promise<CalendarEventWithDetails> {
    const event = await this.repo.findById(accountId, id)
    if (!event) throw new Error('CalendarEvent not found')
    return event
  }

  async create(
    accountId: number,
    input: {
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
    }
  ): Promise<CalendarEvent> {
    if (!input.title || !input.title.trim()) throw new Error('title is required')
    if (!input.start_at) throw new Error('start_at is required')
    return this.repo.create(accountId, {
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

  async update(
    accountId: number,
    id: number,
    input: Partial<Omit<CalendarEvent, 'id' | 'account_id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<CalendarEvent> {
    const existing = await this.repo.findById(accountId, id)
    if (!existing) throw new Error('CalendarEvent not found')
    const updated = await this.repo.update(accountId, id, input)
    if (!updated) throw new Error('CalendarEvent not found')
    return updated
  }

  async delete(accountId: number, id: number): Promise<{ success: boolean }> {
    const ok = await this.repo.delete(accountId, id)
    if (!ok) throw new Error('CalendarEvent not found')
    return { success: true }
  }

  /**
   * Agenda unificada: eventos + follow-ups em aberto + eventos do Google
   * Calendar (se o usuário estiver conectado), tudo dentro do range de datas
   * e restrito à account do request.
   *
   * Google Calendar só é consultado quando `filters.userId` é definido
   * (usuário individual). Modo "ver time" (userId=undefined) NÃO agrega
   * Google — cada corretor tem sua própria conta Google conectada e não faz
   * sentido misturar tudo num agregado do gestor.
   */
  async getAgenda(
    accountId: number,
    filters: { userId?: number; from?: string; to?: string }
  ): Promise<ApiResponse<AgendaItem[]>> {
    const items = await this.repo.getAgenda(accountId, filters)

    if (this.googleService && filters.userId && filters.from && filters.to) {
      try {
        const from = new Date(filters.from)
        const to = new Date(filters.to)
        // Estende o `to` pra incluir o dia inteiro (endOfDay do último dia)
        to.setHours(23, 59, 59, 999)
        const googleItems = await this.googleService.listEventsAsAgendaItems(
          accountId,
          filters.userId,
          from,
          to
        )
        items.push(...googleItems)
        // Reordena por start_at pra manter a lista cronológica
        items.sort((a, b) => a.start_at.localeCompare(b.start_at))
      } catch (err) {
        // Falha na integração Google não deve derrubar a agenda — loga e segue
        console.error('[getAgenda] Falha ao buscar eventos do Google:', err)
      }
    }

    return { data: items, total: items.length }
  }
}
