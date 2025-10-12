import { BaseRepository } from './base-repository.js'
import { Appointment, AppointmentAnalytics, QueryFilters } from '../types/index.js'

export class AppointmentRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}): Promise<Appointment[]> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const { search, status, type, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM appointments WHERE 1=1'
      const params: any[] = []
      let paramCount = 1

      if (search) {
        query += ` AND (client ILIKE $${paramCount} OR type ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (status && status !== 'All') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }

      if (type && type !== 'All') {
        query += ` AND type = $${paramCount}`
        params.push(type)
        paramCount++
      }

      if (sortBy) {
        const validColumns = ['client', 'type', 'status', 'scheduled_datetime']
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
        'INSERT INTO appointments (client, type, status, scheduled_datetime, description, answered) VALUES ($1, $2, $3, $4::timestamp, $5, $6) RETURNING *',
        [appointment.client, appointment.type, appointment.status, appointment.scheduled_datetime, appointment.description, appointment.answered]
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
        'UPDATE appointments SET client = $1, type = $2, status = $3, scheduled_datetime = $4::timestamp, description = $5, answered = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
        [appointment.client, appointment.type, appointment.status, appointment.scheduled_datetime, appointment.description, appointment.answered, id]
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

  async getLast7DaysAnalytics(): Promise<AppointmentAnalytics[]> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        appointments_data AS (
          SELECT 
            DATE(scheduled_datetime) as appointment_date,
            answered,
            COUNT(*) as count
          FROM appointments 
          WHERE DATE(scheduled_datetime) >= CURRENT_DATE - INTERVAL '6 days'
            AND DATE(scheduled_datetime) <= CURRENT_DATE
          GROUP BY DATE(scheduled_datetime), answered
        )
        SELECT 
          ds.date::text as date,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) as answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) as not_answered
        FROM date_series ds
        LEFT JOIN appointments_data ad ON ds.date = ad.appointment_date
        GROUP BY ds.date
        ORDER BY ds.date
      `
      
      const result = await client.query(query)
      return result.rows.map(row => ({
        date: row.date,
        answered: parseInt(row.answered),
        not_answered: parseInt(row.not_answered)
      }))
    } finally {
      this.releaseClient(client)
    }
  }

  async getLast7DaysAnalyticsByType(): Promise<Record<string, AppointmentAnalytics[]>> {
    const client = await this.getClient()
    try {
      // Ensure UTC timezone
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        appointment_types AS (
          SELECT DISTINCT type FROM appointments
        ),
        appointments_data AS (
          SELECT 
            DATE(scheduled_datetime) as appointment_date,
            type,
            answered,
            COUNT(*) as count
          FROM appointments 
          WHERE DATE(scheduled_datetime) >= CURRENT_DATE - INTERVAL '6 days'
            AND DATE(scheduled_datetime) <= CURRENT_DATE
          GROUP BY DATE(scheduled_datetime), type, answered
        )
        SELECT 
          ds.date::text as date,
          at.type,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) as answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) as not_answered
        FROM date_series ds
        CROSS JOIN appointment_types at
        LEFT JOIN appointments_data ad ON ds.date = ad.appointment_date AND at.type = ad.type
        GROUP BY ds.date, at.type
        ORDER BY at.type, ds.date
      `
      
      const result = await client.query(query)
      
      // Group results by type
      const groupedByType: Record<string, AppointmentAnalytics[]> = {}
      result.rows.forEach(row => {
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