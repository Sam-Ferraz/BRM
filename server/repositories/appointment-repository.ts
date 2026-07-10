import { BaseRepository } from './base-repository.js'
import { Appointment, AppointmentAnalytics, QueryFilters } from '../types/index.js'

export class AppointmentRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}, userId?: number): Promise<Appointment[]> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')

      const { search, type, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM appointments WHERE 1=1'
      const params: any[] = []
      let paramCount = 1

      // Filter by user_id if provided
      if (userId) {
        query += ` AND user_id = $${paramCount}`
        params.push(userId)
        paramCount++
      }

      if (search) {
        query += ` AND (client ILIKE $${paramCount} OR type ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (type && type !== 'All') {
        query += ` AND type = $${paramCount}`
        params.push(type)
        paramCount++
      }

      if (sortBy) {
        const validColumns = ['client', 'type', 'scheduled_datetime']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY scheduled_datetime DESC'
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async create(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        `INSERT INTO appointments
          (client, type, scheduled_datetime, description, answered, property_name, user_id, origin, conversation_id, audio_url)
         VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          appointment.client,
          appointment.type,
          appointment.scheduled_datetime,
          appointment.description,
          appointment.answered,
          appointment.property_name ?? null,
          appointment.user_id,
          appointment.origin ?? 'manual',
          appointment.conversation_id ?? null,
          appointment.audio_url ?? null,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Dedupe da auto-criação de atendimentos de WhatsApp: devolve o atendimento
   * mais recente desta conversa criado nas últimas 24 horas (qualquer um),
   * ou null se não houver. Usado pelo ChatService antes de criar um novo
   * para garantir "1 conversa = 1 atendimento por janela de 24h".
   */
  async findRecentChatByConversation(conversationId: number, windowHours = 24): Promise<Appointment | null> {
    const c = await this.getClient()
    try {
      await c.query("SET TIMEZONE = 'UTC'")
      const result = await c.query(
        `SELECT * FROM appointments
           WHERE conversation_id = $1
             AND origin = 'whatsapp'
             AND created_at >= NOW() - ($2 || ' hours')::INTERVAL
           ORDER BY created_at DESC
           LIMIT 1`,
        [conversationId, String(windowHours)]
      )
      return result.rows[0] ?? null
    } finally {
      this.releaseClient(c)
    }
  }

  /**
   * Marca um atendimento como respondido. Usado quando o corretor envia a
   * primeira resposta numa conversa (interação bilateral completa).
   */
  async markAnswered(id: number): Promise<void> {
    const c = await this.getClient()
    try {
      await c.query(
        'UPDATE appointments SET answered = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      )
    } finally {
      this.releaseClient(c)
    }
  }

  async update(id: number, appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'UPDATE appointments SET client = $1, type = $2, scheduled_datetime = $3::timestamp, description = $4, answered = $5, property_name = $6, audio_url = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
        [
          appointment.client,
          appointment.type,
          appointment.scheduled_datetime,
          appointment.description,
          appointment.answered,
          appointment.property_name ?? null,
          appointment.audio_url ?? null,
          id
        ]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = 'SELECT COUNT(*) as count FROM appointments'
      const params: any[] = []

      if (userId) {
        query += ' WHERE user_id = $1'
        params.push(userId)
      }

      const result = await client.query(query, params)
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Conta ligações (type='call') que ficaram sem ser atendidas (answered=false).
   * Usado no card de Chat do dashboard, somado às conversas não respondidas.
   */
  async getCountUnansweredCalls(userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = "SELECT COUNT(*) as count FROM appointments WHERE type = 'call' AND answered = false"
      const params: any[] = []
      if (userId) {
        query += ' AND user_id = $1'
        params.push(userId)
      }
      const result = await client.query(query, params)
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }

  async getLast7DaysAnalytics(timezone: string): Promise<AppointmentAnalytics[]> {
    const client = await this.getClient()
    try {
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const query = `
        WITH timezone_params AS (
          SELECT COALESCE(
            (SELECT name FROM pg_timezone_names WHERE name = $1),
            'UTC'
          ) AS timezone
        ),
        local_bounds AS (
          SELECT 
            timezone(timezone, now())::date AS today_local,
            timezone
          FROM timezone_params
        ),
        date_series AS (
          SELECT 
            generate_series(
              (SELECT today_local FROM local_bounds) - INTERVAL '6 days',
              (SELECT today_local FROM local_bounds),
              INTERVAL '1 day'
            )::date AS date
        ),
        appointments_data AS (
          SELECT 
            timezone(lb.timezone, scheduled_datetime AT TIME ZONE 'UTC')::date AS appointment_date,
            answered,
            COUNT(*) AS count
          FROM appointments
          JOIN local_bounds lb ON TRUE
          WHERE timezone(lb.timezone, scheduled_datetime AT TIME ZONE 'UTC')::date BETWEEN 
            lb.today_local - INTERVAL '6 days' AND lb.today_local
          GROUP BY appointment_date, answered
        )
        SELECT 
          ds.date::text AS date,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) AS answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) AS not_answered
        FROM date_series ds
        LEFT JOIN appointments_data ad ON ds.date = ad.appointment_date
        GROUP BY ds.date
        ORDER BY ds.date;
      `
      
      const result = await client.query(query, [timezone])
      return result.rows.map(row => ({
        date: row.date,
        answered: parseInt(row.answered),
        not_answered: parseInt(row.not_answered)
      }))
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Analytics aggregated per day inside an arbitrary date range, for a chosen
   * date column. `from` / `to` are inclusive YYYY-MM-DD strings already
   * expressed in the requested timezone. Days with no data still appear with
   * zero counts so the chart keeps a continuous x-axis.
   */
  async getAnalyticsByDateRange(params: {
    from: string
    to: string
    timezone: string
    dateField: 'scheduled_datetime' | 'created_at'
  }): Promise<AppointmentAnalytics[]> {
    const { from, to, timezone, dateField } = params
    const safeDateField = dateField === 'created_at' ? 'created_at' : 'scheduled_datetime'

    const client = await this.getClient()
    try {
      await client.query("SET TIMEZONE = 'UTC'")

      const query = `
        WITH timezone_params AS (
          SELECT COALESCE(
            (SELECT name FROM pg_timezone_names WHERE name = $1),
            'UTC'
          ) AS timezone
        ),
        date_series AS (
          SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS date
        ),
        appointments_data AS (
          SELECT
            timezone((SELECT timezone FROM timezone_params), ${safeDateField} AT TIME ZONE 'UTC')::date AS event_date,
            answered,
            COUNT(*) AS count
          FROM appointments
          WHERE timezone((SELECT timezone FROM timezone_params), ${safeDateField} AT TIME ZONE 'UTC')::date
            BETWEEN $2::date AND $3::date
          GROUP BY event_date, answered
        )
        SELECT
          ds.date::text AS date,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) AS answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) AS not_answered
        FROM date_series ds
        LEFT JOIN appointments_data ad ON ds.date = ad.event_date
        GROUP BY ds.date
        ORDER BY ds.date;
      `

      const result = await client.query(query, [timezone, from, to])
      return result.rows.map(row => ({
        date: row.date,
        answered: parseInt(row.answered),
        not_answered: parseInt(row.not_answered)
      }))
    } finally {
      this.releaseClient(client)
    }
  }

  async getAnalyticsByTypeByDateRange(params: {
    from: string
    to: string
    timezone: string
    dateField: 'scheduled_datetime' | 'created_at'
  }): Promise<Record<string, AppointmentAnalytics[]>> {
    const { from, to, timezone, dateField } = params
    const safeDateField = dateField === 'created_at' ? 'created_at' : 'scheduled_datetime'

    const client = await this.getClient()
    try {
      await client.query("SET TIMEZONE = 'UTC'")

      const query = `
        WITH timezone_params AS (
          SELECT COALESCE(
            (SELECT name FROM pg_timezone_names WHERE name = $1),
            'UTC'
          ) AS timezone
        ),
        date_series AS (
          SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS date
        ),
        appointments_data AS (
          SELECT
            timezone((SELECT timezone FROM timezone_params), ${safeDateField} AT TIME ZONE 'UTC')::date AS event_date,
            answered,
            type,
            COUNT(*) AS count
          FROM appointments
          WHERE timezone((SELECT timezone FROM timezone_params), ${safeDateField} AT TIME ZONE 'UTC')::date
            BETWEEN $2::date AND $3::date
          GROUP BY event_date, answered, type
        )
        SELECT
          ds.date::text AS date,
          ad.type,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) AS answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) AS not_answered
        FROM date_series ds
        LEFT JOIN appointments_data ad ON ds.date = ad.event_date
        GROUP BY ds.date, ad.type
        ORDER BY ds.date;
      `

      const result = await client.query(query, [timezone, from, to])

      const groupedByType: Record<string, AppointmentAnalytics[]> = {}
      result.rows.forEach(row => {
        if (!row.type) return
        if (!groupedByType[row.type]) {
          groupedByType[row.type] = []
        }
        groupedByType[row.type].push({
          date: row.date,
          answered: parseInt(row.answered),
          not_answered: parseInt(row.not_answered)
        })
      })

      return groupedByType
    } finally {
      this.releaseClient(client)
    }
  }

  async getLast7DaysAnalyticsByType(timezone: string): Promise<Record<string, AppointmentAnalytics[]>> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const query = `
          WITH timezone_params AS (
          SELECT COALESCE(
            (SELECT name FROM pg_timezone_names WHERE name = $1),
            'UTC'
          ) AS timezone
        ),
        local_bounds AS (
          SELECT 
            timezone(timezone, now())::date AS today_local,
            timezone
          FROM timezone_params
        ),
        date_series AS (
          SELECT 
            generate_series(
              (SELECT today_local FROM local_bounds) - INTERVAL '6 days',
              (SELECT today_local FROM local_bounds),
              INTERVAL '1 day'
            )::date AS date
        ),
        appointments_data AS (
          SELECT 
            timezone(lb.timezone, scheduled_datetime AT TIME ZONE 'UTC')::date AS appointment_date,
            answered,
            type,
            COUNT(*) AS count
          FROM appointments
          JOIN local_bounds lb ON TRUE
          WHERE timezone(lb.timezone, scheduled_datetime AT TIME ZONE 'UTC')::date BETWEEN 
            lb.today_local - INTERVAL '6 days' AND lb.today_local
          GROUP BY appointment_date, answered, type
        )
        SELECT 
          ds.date::text AS date,
          ad.type,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) AS answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) AS not_answered
        FROM date_series ds
        LEFT JOIN appointments_data ad ON ds.date = ad.appointment_date
        GROUP BY ds.date, ad.type
        ORDER BY ds.date;
      `
      
      const result = await client.query(query, [timezone])
      
      // Group results by type
      const groupedByType: Record<string, AppointmentAnalytics[]> = {}
      result.rows.forEach(row => {
        if (!row.type) return
        if (!groupedByType[row.type]) {
          groupedByType[row.type] = []
        }
        groupedByType[row.type].push({
          date: row.date,
          answered: parseInt(row.answered),
          not_answered: parseInt(row.not_answered)
        })
      })
      
      return groupedByType
    } finally {
      this.releaseClient(client)
    }
  }
}
