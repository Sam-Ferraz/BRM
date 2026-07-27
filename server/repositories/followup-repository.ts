import { BaseRepository } from './base-repository.js'
import { FollowUp, FollowUpWithDetails, QueryFilters } from '../types/index.js'

export class FollowUpRepository extends BaseRepository {
  async findAll(accountId: number, filters: QueryFilters = {}, userId?: number): Promise<FollowUpWithDetails[]> {
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
          a.user_id as appointment_user_id,
          CASE
            WHEN f.completed = true THEN NULL
            WHEN f.next_action_date >= CURRENT_DATE THEN 'open'
            WHEN f.next_action_date < CURRENT_DATE AND f.next_action_date >= CURRENT_DATE - INTERVAL '2 days' THEN 'pending'
            ELSE 'overdue'
          END as followup_status
        FROM follow_ups f
        LEFT JOIN appointments a ON f.appointment_id = a.id
        WHERE f.account_id = $1
      `
      const params: any[] = [accountId]
      let paramCount = 2

      // Filter by user_id if provided
      if (userId) {
        query += ` AND f.user_id = $${paramCount}`
        params.push(userId)
        paramCount++
      }

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
        client_name: row.client_name,
        next_action: row.next_action,
        next_action_date: row.next_action_date,
        completed: row.completed,
        completed_at: row.completed_at,
        user_id: row.user_id,
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
          property_name: row.property_name,
          user_id: row.appointment_user_id
        } : undefined
      }))
    } finally {
      this.releaseClient(client)
    }
  }

  async findByAppointmentId(accountId: number, appointmentId: number): Promise<FollowUp[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM follow_ups WHERE appointment_id = $1 AND account_id = $2 ORDER BY next_action_date DESC',
        [appointmentId, accountId]
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(accountId: number, id: number): Promise<FollowUpWithDetails | null> {
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
          a.user_id as appointment_user_id,
          CASE
            WHEN f.completed = true THEN NULL
            WHEN f.next_action_date >= CURRENT_DATE THEN 'open'
            WHEN f.next_action_date < CURRENT_DATE AND f.next_action_date >= CURRENT_DATE - INTERVAL '2 days' THEN 'pending'
            ELSE 'overdue'
          END as followup_status
        FROM follow_ups f
        LEFT JOIN appointments a ON f.appointment_id = a.id
        WHERE f.id = $1 AND f.account_id = $2
      `

      const result = await client.query(query, [id, accountId])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        appointment_id: row.appointment_id,
        client_name: row.client_name,
        next_action: row.next_action,
        next_action_date: row.next_action_date,
        completed: row.completed,
        completed_at: row.completed_at,
        user_id: row.user_id,
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
          property_name: row.property_name,
          user_id: row.appointment_user_id
        } : undefined
      }
    } finally {
      this.releaseClient(client)
    }
  }

  async create(accountId: number, followUp: Omit<FollowUp, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<FollowUp> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'INSERT INTO follow_ups (account_id, appointment_id, client_name, next_action, next_action_date, completed, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [
          accountId,
          followUp.appointment_id ?? null,
          followUp.client_name,
          followUp.next_action,
          followUp.next_action_date,
          followUp.completed ?? false,
          followUp.user_id
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(accountId: number, id: number, followUp: Partial<Omit<FollowUp, 'id' | 'created_at' | 'updated_at'>>): Promise<FollowUp | null> {
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

      if (followUp.client_name !== undefined) {
        fields.push(`client_name = $${paramCount}`)
        values.push(followUp.client_name)
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
        return this.findById(accountId, id) as Promise<FollowUp | null>
      }

      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      values.push(accountId)

      const query = `UPDATE follow_ups SET ${fields.join(', ')} WHERE id = $${paramCount} AND account_id = $${paramCount + 1} RETURNING *`
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
        'DELETE FROM follow_ups WHERE id = $1 AND account_id = $2 RETURNING *',
        [id, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(accountId: number, userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = 'SELECT COUNT(*) as count FROM follow_ups WHERE completed = false AND account_id = $1'
      const params: any[] = [accountId]

      if (userId) {
        query += ' AND user_id = $2'
        params.push(userId)
      }

      const result = await client.query(query, params)
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }

  async getCountByStatus(accountId: number, userId?: number): Promise<{ open: number; pending: number; overdue: number }> {
    const client = await this.getClient()
    try {
      let query = `
        SELECT
          COUNT(*) FILTER (WHERE next_action_date >= CURRENT_DATE AND completed = false) as open,
          COUNT(*) FILTER (WHERE next_action_date < CURRENT_DATE
            AND next_action_date >= CURRENT_DATE - INTERVAL '2 days'
            AND completed = false) as pending,
          COUNT(*) FILTER (WHERE next_action_date < CURRENT_DATE - INTERVAL '2 days'
            AND completed = false) as overdue
        FROM follow_ups
        WHERE account_id = $1
      `
      const params: any[] = [accountId]

      if (userId) {
        query += ' AND user_id = $2'
        params.push(userId)
      }

      const result = await client.query(query, params)
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
