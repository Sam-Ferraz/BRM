import jwt from 'jsonwebtoken'
import { GoogleCalendarRepository } from '../repositories/google-calendar-repository.js'
import { AgendaItem, GoogleCalendarStatus } from '../types/index.js'

/**
 * Integração unidirecional Google Calendar → BRM.
 *
 * Fluxo:
 *   1. Frontend chama /api/google-calendar/auth-url → devolve URL do OAuth Google
 *   2. Usuário autoriza, Google redireciona pra /api/google-calendar/callback?code=...
 *   3. Backend troca code por access_token+refresh_token, salva no DB (com
 *      accountId + userId embutidos no JWT state), redireciona pro frontend
 *      com ?connected=1
 *   4. AgendaPage puxa GET /api/calendar/agenda que agora inclui eventos do Google
 *
 * Credenciais do app são SaaS: 1 projeto no Google Cloud Console, credenciais no
 * .env (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI). Cada corretor
 * autoriza com a própria conta Google.
 *
 * Multi-tenancy: o accountId viaja dentro do JWT state pra sobreviver ao
 * redirect do Google (o callback é público — não tem req.user). Todos os
 * métodos que tocam o repositório exigem accountId.
 *
 * Puxa eventos de TODOS os calendários que o usuário deixou visíveis (`selected: true`)
 * no Google Calendar dele. Cada evento herda a cor do próprio calendário na exibição.
 * Se o usuário desmarcar um calendário direto no Google, o BRM automaticamente para
 * de puxar. Calendários de aniversário e feriados são ignorados por default (poluem).
 * Escopo: `calendar.readonly` — a plataforma NÃO cria/edita eventos no Google.
 */

const GOOGLE_AUTH_URL          = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL         = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL      = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
const GOOGLE_EVENTS_BASE_URL   = 'https://www.googleapis.com/calendar/v3/calendars'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
].join(' ')

export class GoogleCalendarService {
  constructor(private readonly repo: GoogleCalendarRepository) {}

  private getClientId(): string {
    const v = process.env.GOOGLE_CLIENT_ID
    if (!v) throw new Error('GOOGLE_CLIENT_ID não configurado no .env do backend')
    return v
  }

  private getClientSecret(): string {
    const v = process.env.GOOGLE_CLIENT_SECRET
    if (!v) throw new Error('GOOGLE_CLIENT_SECRET não configurado no .env do backend')
    return v
  }

  private getRedirectUri(): string {
    const v = process.env.GOOGLE_REDIRECT_URI
    if (!v) throw new Error('GOOGLE_REDIRECT_URI não configurado no .env do backend')
    return v
  }

  /**
   * Monta URL de autorização. State é um JWT assinado com JWT_SECRET (mesmo
   * segredo da AuthService) contendo o userId + accountId + expiração curta
   * de 10min. Isso protege contra CSRF: quem forjar um `?code=...&state=...`
   * precisaria do JWT_SECRET pra montar um state válido. accountId no state
   * garante tenancy no callback público.
   */
  buildAuthUrl(accountId: number, userId: number): string {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET não configurado')
    const state = jwt.sign({ userId, accountId, purpose: 'google_oauth' }, secret, { expiresIn: '10m' })
    const params = new URLSearchParams({
      client_id: this.getClientId(),
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',   // pra receber refresh_token
      prompt: 'consent',        // força reconsent p/ garantir refresh_token toda vez
      state,
    })
    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  /**
   * Valida assinatura + expiração do state e devolve { userId, accountId }.
   * Retorna null se inválido/expirado.
   */
  parseState(state: string): { userId: number; accountId: number } | null {
    const secret = process.env.JWT_SECRET
    if (!secret) return null
    try {
      const decoded = jwt.verify(state, secret) as { userId?: number; accountId?: number; purpose?: string }
      if (decoded.purpose !== 'google_oauth') return null
      if (typeof decoded.userId !== 'number') return null
      if (typeof decoded.accountId !== 'number') return null
      return { userId: decoded.userId, accountId: decoded.accountId }
    } catch {
      return null
    }
  }

  /**
   * Troca o `code` do redirect por tokens e persiste na account informada.
   */
  async handleOAuthCallback(code: string, accountId: number, userId: number): Promise<void> {
    const form = new URLSearchParams({
      code,
      client_id: this.getClientId(),
      client_secret: this.getClientSecret(),
      redirect_uri: this.getRedirectUri(),
      grant_type: 'authorization_code',
    })

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      throw new Error(`Google OAuth token exchange falhou: ${tokenRes.status} ${text}`)
    }
    const tokenData = (await tokenRes.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
      scope: string
      token_type: string
      id_token?: string
    }

    if (!tokenData.refresh_token) {
      // Se o Google não devolveu refresh_token (usuário já tinha autorizado antes
      // sem prompt=consent) — reautorização vai resolver, mas avisamos.
      throw new Error(
        'Google não devolveu refresh_token. Revogue o acesso em myaccount.google.com/permissions e tente conectar de novo.'
      )
    }

    // Descobre o email da conta conectada via userinfo
    const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!userInfoRes.ok) {
      throw new Error(`Falha ao obter userinfo Google: ${userInfoRes.status}`)
    }
    const userInfo = (await userInfoRes.json()) as { email?: string }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    await this.repo.upsert({
      account_id: accountId,
      user_id: userId,
      connected_email: userInfo.email || 'desconhecido',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      scope: tokenData.scope,
    })
  }

  async getStatus(accountId: number, userId: number): Promise<GoogleCalendarStatus> {
    const conn = await this.repo.findByUserId(accountId, userId)
    if (!conn) return { connected: false }
    return {
      connected: true,
      email: conn.connected_email,
      last_sync_at: conn.last_sync_at,
    }
  }

  async disconnect(accountId: number, userId: number): Promise<boolean> {
    return this.repo.deleteByUserId(accountId, userId)
  }

  /**
   * Garante um access_token válido — se está pra expirar, faz refresh.
   * Margem de 60s pra evitar race com expiração no meio de um request.
   */
  private async getValidAccessToken(accountId: number, userId: number): Promise<string | null> {
    const conn = await this.repo.findByUserId(accountId, userId)
    if (!conn) return null

    const expiresAt = new Date(conn.token_expires_at).getTime()
    if (expiresAt - Date.now() > 60_000) {
      return conn.access_token
    }

    const form = new URLSearchParams({
      client_id: this.getClientId(),
      client_secret: this.getClientSecret(),
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    })
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    if (!res.ok) {
      const text = await res.text()
      // Se refresh_token foi revogado, o Google devolve 400 invalid_grant.
      // Neste caso apagamos a conexão pra forçar reautorização.
      if (res.status === 400 && text.includes('invalid_grant')) {
        await this.repo.deleteByUserId(accountId, userId)
      }
      throw new Error(`Google token refresh falhou: ${res.status} ${text}`)
    }
    const data = (await res.json()) as { access_token: string; expires_in: number }
    const newExpiresAt = new Date(Date.now() + (data.expires_in * 1000))
    await this.repo.updateAccessToken(accountId, userId, data.access_token, newExpiresAt)
    return data.access_token
  }

  /**
   * Busca calendarList do usuário — todos os calendários aos quais ele tem acesso.
   * Filtra pra manter só os "úteis": visíveis (selected=true), não deletados,
   * excluindo aniversários/feriados que geralmente só poluem a agenda de trabalho.
   */
  private async listVisibleCalendars(token: string): Promise<GoogleCalendarListEntry[]> {
    const res = await fetch(GOOGLE_CALENDAR_LIST_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Google calendarList falhou: ${res.status} ${text}`)
    }
    const data = (await res.json()) as { items?: GoogleCalendarListEntry[] }
    return (data.items || []).filter((cal) => {
      if (cal.deleted) return false
      if (cal.selected === false) return false                   // usuário escondeu no Google
      if (cal.id?.endsWith('#holiday@group.v.calendar.google.com')) return false // feriados
      if (cal.id?.includes('addressbook#contacts@group')) return false           // aniversários
      return true
    })
  }

  /**
   * Lista eventos de TODOS os calendários visíveis do usuário dentro do range.
   * Faz um fetch por calendário em paralelo (Promise.all). Se um calendário
   * falhar, os outros ainda retornam (falha isolada por calendário, não derruba tudo).
   *
   * Devolve no formato AgendaItem pra unificar com follow-ups + calendar_events.
   * Retorna [] se o usuário não estiver conectado.
   */
  async listEventsAsAgendaItems(
    accountId: number,
    userId: number,
    from: Date,
    to: Date
  ): Promise<AgendaItem[]> {
    const token = await this.getValidAccessToken(accountId, userId)
    if (!token) return []

    let calendars: GoogleCalendarListEntry[]
    try {
      calendars = await this.listVisibleCalendars(token)
    } catch (err) {
      console.error('[Google] Falha ao listar calendários:', err)
      return []
    }

    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',    // expande recorrentes em instâncias
      orderBy: 'startTime',
      maxResults: '250',
    })

    // Busca em paralelo — 1 request por calendário
    const results = await Promise.all(
      calendars.map(async (cal) => {
        const calendarId = encodeURIComponent(cal.id)
        const url = `${GOOGLE_EVENTS_BASE_URL}/${calendarId}/events?${params.toString()}`
        try {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
          if (!res.ok) {
            // 401 desconecta (refresh_token pifou); outros erros só logam e seguem
            if (res.status === 401) await this.repo.deleteByUserId(accountId, userId)
            console.error(`[Google] events.list falhou pro calendário "${cal.summary}": ${res.status}`)
            return [] as AgendaItem[]
          }
          const data = (await res.json()) as { items?: GoogleApiEvent[] }
          return this.mapEventsToAgendaItems(data.items || [], userId, cal)
        } catch (err) {
          console.error(`[Google] Erro ao buscar eventos de "${cal.summary}":`, err)
          return [] as AgendaItem[]
        }
      })
    )

    await this.repo.markSynced(accountId, userId)
    return results.flat()
  }

  private mapEventsToAgendaItems(
    events: GoogleApiEvent[],
    userId: number,
    calendar: GoogleCalendarListEntry
  ): AgendaItem[] {
    const items: AgendaItem[] = []
    // Prefere a cor que o usuário escolheu (backgroundColor); se não tiver, usa azul Google.
    const calendarColor = calendar.backgroundColor || '#4285F4'
    const calendarLabel = calendar.summaryOverride || calendar.summary || 'Google'

    for (const ev of events) {
      if (ev.status === 'cancelled') continue

      const isAllDay = !!ev.start?.date && !ev.start?.dateTime
      const startAt = ev.start?.dateTime || ev.start?.date
      const endAt = ev.end?.dateTime || ev.end?.date
      if (!startAt) continue

      items.push({
        kind: 'google',
        // Prefixa com calendarId pra não colidir entre calendários diferentes
        id: `${calendar.id}::${ev.id}`,
        user_id: userId,
        title: ev.summary || '(sem título)',
        description: ev.description || null,
        start_at: startAt,
        end_at: endAt || null,
        all_day: isAllDay,
        color: calendarColor,
        status: 'scheduled',
        // Sobe o nome do calendário como user_name pra aparecer discretamente no card
        user_name: calendarLabel,
        location: ev.location || null,
        html_link: ev.htmlLink || null,
      })
    }
    return items
  }
}

// ---------------------------------------------------------------------------
// Tipos internos da resposta do Google Calendar API v3 (só o que usamos)
// ---------------------------------------------------------------------------
interface GoogleApiEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?:   { dateTime?: string; date?: string; timeZone?: string }
}

interface GoogleCalendarListEntry {
  id: string
  summary?: string
  summaryOverride?: string
  description?: string
  backgroundColor?: string
  foregroundColor?: string
  selected?: boolean
  deleted?: boolean
  accessRole?: string
  primary?: boolean
}
