import { BaseRepository } from './base-repository.js'
import { Appointment, AppointmentAnalytics, QueryFilters } from '../types/index.js'

export class AppointmentRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}): Promise<Appointment[]> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const { search, type, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM appointments WHERE 1=1'
      const params: any[] = []
      let paramCount = 1

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
        'INSERT INTO appointments (client, type, scheduled_datetime, description, answered) VALUES ($1, $2, $3::timestamp, $4, $5) RETURNING *',
        [appointment.client, appointment.type, appointment.scheduled_datetime, appointment.description, appointment.answered]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(id: number, appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'UPDATE appointments SET client = $1, type = $2, scheduled_datetime = $3::timestamp, description = $4, answered = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [appointment.client, appointment.type, appointment.scheduled_datetime, appointment.description, appointment.answered, id]
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

  async getCount(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM appointments')
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
