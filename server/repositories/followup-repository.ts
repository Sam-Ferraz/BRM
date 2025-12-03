import { BaseRepository } from './base-repository.js'
import { FollowUp, FollowUpWithDetails, QueryFilters } from '../types/index.js'

export class FollowUpRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}): Promise<FollowUpWithDetails[]> {
    const client = await this.getClient()
    try {
      await client.query('SET TIMEZONE = \'UTC\'')

      const { search, sortBy, sortOrder } = filters
      let query = `
        SELECT
          f.*,
          a.client,
          a.type,
          a.scheduled_datetime,
          a.description,
          a.answered,
          a.property_name,
          CASE
            WHEN f.completed = true THEN NULL
            WHEN f.next_action_date >= CURRENT_DATE THEN 'open'
            WHEN f.next_action_date < CURRENT_DATE AND f.next_action_date >= CURRENT_DATE - INTERVAL '2 days' THEN 'pending'
            ELSE 'overdue'
          END as followup_status
        FROM follow_ups f
        LEFT JOIN appointments a ON f.appointment_id = a.id
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 1

      if (search) {
        query += ` AND (f.next_action ILIKE $${paramCount} OR a.client ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (sortBy) {
        const validColumns = ['next_action_date', 'next_action', 'completed']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY f.${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY f.next_action_date ASC, f.created_at DESC'
      }

      const result = await client.query(query, params)
      return result.rows.map(row => ({
        id: row.id,
        appointment_id: row.appointment_id,
        next_action: row.next_action,
        next_action_date: row.next_action_date,
        completed: row.completed,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        followup_status: row.followup_status,
        appointment: row.client ? {
          id: row.appointment_id,
          client: row.client,
          type: row.type,
          scheduled_datetime: row.scheduled_datetime,
          description: row.description,
          answered: row.answered,
          property_name: row.property_name
        } : undefined
      }))
    } finally {
      this.releaseClient(client)
    }
  }

  async findByAppointmentId(appointmentId: number): Promise<FollowUp[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM follow_ups WHERE appointment_id = $1 ORDER BY next_action_date DESC',
        [appointmentId]
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<FollowUpWithDetails | null> {
    const client = await this.getClient()
    try {
      await client.query('SET TIMEZONE = \'UTC\'')

      const query = `
        SELECT
          f.*,
          a.client,
          a.type,
          a.scheduled_datetime,
          a.description,
          a.answered,
          a.property_name,
          CASE
            WHEN f.completed = true THEN NULL
            WHEN f.next_action_date >= CURRENT_DATE THEN 'open'
            WHEN f.next_action_date < CURRENT_DATE AND f.next_action_date >= CURRENT_DATE - INTERVAL '2 days' THEN 'pending'
            ELSE 'overdue'
          END as followup_status
        FROM follow_ups f
        LEFT JOIN appointments a ON f.appointment_id = a.id
        WHERE f.id = $1
      `

      const result = await client.query(query, [id])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        appointment_id: row.appointment_id,
        next_action: row.next_action,
        next_action_date: row.next_action_date,
        completed: row.completed,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        followup_status: row.followup_status,
        appointment: row.client ? {
          id: row.appointment_id,
          client: row.client,
          type: row.type,
          scheduled_datetime: row.scheduled_datetime,
          description: row.description,
          answered: row.answered,
          property_name: row.property_name
        } : undefined
      }
    } finally {
      this.releaseClient(client)
    }
  }

  async create(followUp: Omit<FollowUp, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<FollowUp> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'INSERT INTO follow_ups (appointment_id, next_action, next_action_date, completed) VALUES ($1, $2, $3, $4) RETURNING *',
        [
          followUp.appointment_id,
          followUp.next_action,
          followUp.next_action_date,
          followUp.completed ?? false
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(id: number, followUp: Partial<Omit<FollowUp, 'id' | 'created_at' | 'updated_at'>>): Promise<FollowUp | null> {
    const client = await this.getClient()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (followUp.next_action !== undefined) {
        fields.push(`next_action = $${paramCount}`)
        values.push(followUp.next_action)
        paramCount++
      }

      if (followUp.next_action_date !== undefined) {
        fields.push(`next_action_date = $${paramCount}`)
        values.push(followUp.next_action_date)
        paramCount++
      }

      if (followUp.completed !== undefined) {
        fields.push(`completed = $${paramCount}`)
        values.push(followUp.completed)
        paramCount++

        if (followUp.completed) {
          fields.push(`completed_at = CURRENT_TIMESTAMP`)
        }
      }

      if (fields.length === 0) {
        return this.findById(id) as Promise<FollowUp | null>
      }

      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      const query = `UPDATE follow_ups SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`
      const result = await client.query(query, values)
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM follow_ups WHERE id = $1 RETURNING *', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM follow_ups WHERE completed = false')
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }

  async getCountByStatus(): Promise<{ open: number; pending: number; overdue: number }> {
    const client = await this.getClient()
    try {
      const query = `
        SELECT
          COUNT(*) FILTER (WHERE next_action_date >= CURRENT_DATE AND completed = false) as open,
          COUNT(*) FILTER (WHERE next_action_date < CURRENT_DATE
            AND next_action_date >= CURRENT_DATE - INTERVAL '2 days'
            AND completed = false) as pending,
          COUNT(*) FILTER (WHERE next_action_date < CURRENT_DATE - INTERVAL '2 days'
            AND completed = false) as overdue
        FROM follow_ups
      `
      const result = await client.query(query)
      return {
        open: parseInt(result.rows[0].open),
        pending: parseInt(result.rows[0].pending),
        overdue: parseInt(result.rows[0].overdue)
      }
    } finally {
      this.releaseClient(client)
    }
  }
}
