import { BaseRepository } from './base-repository.js'
import { CalendarEvent, CalendarEventWithDetails, CalendarEventStatus, AgendaItem } from '../types/index.js'

/**
 * Repositório de compromissos manuais da agenda (calendar_events).
 *
 * A agenda EXIBIDA no frontend é uma união de calendar_events + follow-ups
 * em aberto. O método `getAgenda()` faz essa união via UNION ALL e devolve
 * uma lista já ordenada por start_at. Filtragem obrigatória por accountId
 * em todas as queries (multi-tenancy).
 */
export class CalendarEventRepository extends BaseRepository {
  async findAll(
    accountId: number,
    filters: {
      userId?: number      // corretor: sempre passa próprio userId | gestor com "ver time": undefined
      from?: string        // ISO date (inclusivo)
      to?: string          // ISO date (inclusivo)
      status?: CalendarEventStatus | 'all'
    } = {}
  ): Promise<CalendarEventWithDetails[]> {
    const client = await this.getClient()
    try {
      let query = `
        SELECT
          e.*,
          u.name          AS user_name,
          c.name          AS client_name,
          d.client        AS deal_client,
          p.name          AS product_name
        FROM calendar_events e
        LEFT JOIN users u    ON e.user_id = u.id
        LEFT JOIN clients c  ON e.client_id = c.id
        LEFT JOIN deals d    ON e.deal_id = d.id
        LEFT JOIN products p ON e.product_id = p.id
        WHERE e.account_id = $1
      `
      const params: any[] = [accountId]
      let n = 2
      if (filters.userId !== undefined) {
        query += ` AND e.user_id = $${n}`
        params.push(filters.userId)
        n++
      }
      if (filters.from) {
        query += ` AND e.start_at >= $${n}::timestamp`
        params.push(filters.from)
        n++
      }
      if (filters.to) {
        query += ` AND e.start_at < ($${n}::timestamp + INTERVAL '1 day')`
        params.push(filters.to)
        n++
      }
      if (filters.status && filters.status !== 'all') {
        query += ` AND e.status = $${n}`
        params.push(filters.status)
        n++
      }
      query += ' ORDER BY e.start_at ASC, e.id ASC'

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(accountId: number, id: number): Promise<CalendarEventWithDetails | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT e.*, u.name AS user_name, c.name AS client_name,
                d.client AS deal_client, p.name AS product_name
           FROM calendar_events e
           LEFT JOIN users u    ON e.user_id = u.id
           LEFT JOIN clients c  ON e.client_id = c.id
           LEFT JOIN deals d    ON e.deal_id = d.id
           LEFT JOIN products p ON e.product_id = p.id
          WHERE e.id = $1 AND e.account_id = $2`,
        [id, accountId]
      )
      return result.rows[0] ?? null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(
    accountId: number,
    input: Omit<CalendarEvent, 'id' | 'account_id' | 'created_at' | 'updated_at'>
  ): Promise<CalendarEvent> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO calendar_events
           (account_id, user_id, title, description, location, start_at, end_at, all_day, color,
            client_id, deal_id, product_id, status)
         VALUES ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          accountId,
          input.user_id,
          input.title,
          input.description ?? null,
          input.location ?? null,
          input.start_at,
          input.end_at ?? null,
          input.all_day ?? false,
          input.color ?? null,
          input.client_id ?? null,
          input.deal_id ?? null,
          input.product_id ?? null,
          input.status ?? 'scheduled',
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(
    accountId: number,
    id: number,
    input: Partial<Omit<CalendarEvent, 'id' | 'account_id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<CalendarEvent | null> {
    const client = await this.getClient()
    try {
      const fields: string[] = []
      const values: any[] = []
      let n = 1
      const addField = (col: string, value: any, cast?: string) => {
        const placeholder = cast ? `$${n}::${cast}` : `$${n}`
        fields.push(`${col} = ${placeholder}`)
        values.push(value)
        n++
      }
      if (input.title !== undefined) addField('title', input.title)
      if (input.description !== undefined) addField('description', input.description ?? null)
      if (input.location !== undefined) addField('location', input.location ?? null)
      if (input.start_at !== undefined) addField('start_at', input.start_at, 'timestamp')
      if (input.end_at !== undefined) addField('end_at', input.end_at ?? null, 'timestamp')
      if (input.all_day !== undefined) addField('all_day', input.all_day)
      if (input.color !== undefined) addField('color', input.color ?? null)
      if (input.client_id !== undefined) addField('client_id', input.client_id ?? null)
      if (input.deal_id !== undefined) addField('deal_id', input.deal_id ?? null)
      if (input.product_id !== undefined) addField('product_id', input.product_id ?? null)
      if (input.status !== undefined) addField('status', input.status)

      if (fields.length === 0) return this.findById(accountId, id) as any
      values.push(id)
      const idPlaceholder = n
      n++
      values.push(accountId)
      const query = `UPDATE calendar_events SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idPlaceholder} AND account_id = $${n} RETURNING *`
      const result = await client.query(query, values)
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM calendar_events WHERE id = $1 AND account_id = $2 RETURNING id',
        [id, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Agenda agregada: união de calendar_events + follow-ups em aberto.
   * Filtra por range de datas e opcionalmente por user_id, sempre restrito
   * à account informada.
   *
   * Todos os itens são normalizados na forma AgendaItem — o frontend não
   * precisa saber a diferença entre event e followup (o campo `kind`
   * indica se quiser filtrar).
   */
  async getAgenda(
    accountId: number,
    filters: { userId?: number; from?: string; to?: string }
  ): Promise<AgendaItem[]> {
    const client = await this.getClient()
    try {
      // Params compartilhados entre as duas subqueries (UNION ALL). Ordem:
      //   $1 = accountId
      //   $2 = userId (se filters.userId)
      //   next = from (se filters.from)
      //   next = to (se filters.to)
      const params: any[] = [accountId]
      let n = 2
      let userIdParam: number | null = null
      if (filters.userId !== undefined) {
        userIdParam = n
        params.push(filters.userId)
        n++
      }
      let fromParam: number | null = null
      if (filters.from) {
        fromParam = n
        params.push(filters.from)
        n++
      }
      let toParam: number | null = null
      if (filters.to) {
        toParam = n
        params.push(filters.to)
        n++
      }

      // 1) calendar_events → normaliza pra AgendaItem shape
      const eventConds: string[] = [`e.account_id = $1`, `e.status != 'cancelled'`]
      if (userIdParam) eventConds.push(`e.user_id = $${userIdParam}`)
      if (fromParam) eventConds.push(`e.start_at >= $${fromParam}::timestamp`)
      if (toParam) eventConds.push(`e.start_at < ($${toParam}::timestamp + INTERVAL '1 day')`)
      const eventsQuery = `
        SELECT
          'event'::text        AS kind,
          e.id                 AS id,
          e.user_id            AS user_id,
          u.name               AS user_name,
          e.title              AS title,
          e.description        AS description,
          e.start_at::text     AS start_at,
          e.end_at::text       AS end_at,
          e.all_day            AS all_day,
          e.color              AS color,
          e.status             AS status,
          c.name               AS client_name,
          d.client             AS deal_client,
          p.name               AS product_name,
          NULL::text           AS followup_next_action
        FROM calendar_events e
        LEFT JOIN users u    ON e.user_id = u.id
        LEFT JOIN clients c  ON e.client_id = c.id
        LEFT JOIN deals d    ON e.deal_id = d.id
        LEFT JOIN products p ON e.product_id = p.id
        WHERE ${eventConds.join(' AND ')}
      `

      // 2) follow_ups em aberto (não completados) — normaliza pro shape
      const followupConds: string[] = [`f.account_id = $1`, `f.completed = false`]
      if (userIdParam) followupConds.push(`f.user_id = $${userIdParam}`)
      if (fromParam) followupConds.push(`f.next_action_date >= $${fromParam}::date`)
      if (toParam) followupConds.push(`f.next_action_date < ($${toParam}::date + INTERVAL '1 day')`)
      const followupsQuery = `
        SELECT
          'followup'::text     AS kind,
          f.id                 AS id,
          f.user_id            AS user_id,
          u.name               AS user_name,
          COALESCE(f.next_action, 'Follow-up') AS title,
          NULL::text           AS description,
          f.next_action_date::text  AS start_at,
          NULL::text           AS end_at,
          true                 AS all_day,
          '#0891b2'::text      AS color,
          'scheduled'::text    AS status,
          f.client_name        AS client_name,
          d.client             AS deal_client,
          NULL::text           AS product_name,
          f.next_action        AS followup_next_action
        FROM follow_ups f
        LEFT JOIN users u        ON f.user_id = u.id
        LEFT JOIN appointments a ON f.appointment_id = a.id
        LEFT JOIN deals d        ON a.user_id = d.user_id  -- vínculo indireto; não é exato
        WHERE ${followupConds.join(' AND ')}
      `

      const query = `
        ${eventsQuery}
        UNION ALL
        ${followupsQuery}
        ORDER BY start_at ASC
      `

      const result = await client.query(query, params)
      return result.rows as AgendaItem[]
    } finally {
      this.releaseClient(client)
    }
  }
}
