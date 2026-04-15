import { BaseRepository } from './base-repository.js'
import { Deal, QueryFilters } from '../types/index.js'

export class DealRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}, userId?: number): Promise<Deal[]> {
    const client = await this.getClient()
    try {
      const { search, status, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM deals WHERE 1=1'
      const params: any[] = []
      let paramCount = 1

      // Filter by user_id if provided
      if (userId) {
        query += ` AND user_id = $${paramCount}`
        params.push(userId)
        paramCount++
      }

      if (search) {
        // Search by client name or gsv (cast to text for partial match)
        query += ` AND (client ILIKE $${paramCount} OR gsv::text ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (status && status !== 'Todos') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }

      if (sortBy) {
        const validColumns = ['client', 'gsv', 'status', 'origin_date']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY origin_date DESC NULLS LAST'
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async create(deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO deals (
          client,
          origin_date,
          description,
          client_phone,
          client_origin,
          purpose,
          deal_type,
          gsv,
          property_name,
          status,
          user_id
        ) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          deal.client,
          deal.origin_date || null,
          deal.description || null,
          deal.client_phone || null,
          deal.client_origin || null,
          deal.purpose || null,
          deal.deal_type || null,
          deal.gsv,
          deal.property_name || null,
          deal.status,
          deal.user_id,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(id: number, deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE deals SET
          client = $1,
          origin_date = $2::date,
          description = $3,
          client_phone = $4,
          client_origin = $5,
          purpose = $6,
          deal_type = $7,
          gsv = $8,
          property_name = $9,
          status = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11 RETURNING *`,
        [
          deal.client,
          deal.origin_date || null,
          deal.description || null,
          deal.client_phone || null,
          deal.client_origin || null,
          deal.purpose || null,
          deal.deal_type || null,
          deal.gsv,
          deal.property_name || null,
          deal.status,
          id,
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
      const result = await client.query('DELETE FROM deals WHERE id = $1 RETURNING *', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = 'SELECT COUNT(*) as count FROM deals'
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

  async findWithoutOpenFollowUps(userId?: number): Promise<Deal[]> {
    const client = await this.getClient()
    try {
      // Find deals that are active (not sold/discarded) and have no appointments with open follow-ups for the same client
      const query = `
        SELECT DISTINCT d.*
        FROM deals d
        WHERE d.status NOT IN ('sold', 'discarded')
          ${userId ? 'AND d.user_id = $1' : ''}
          AND NOT EXISTS (
            SELECT 1
            FROM appointments a
            INNER JOIN follow_ups f ON a.id = f.appointment_id
            WHERE a.client = d.client
              AND f.completed = false
              ${userId ? 'AND a.user_id = $1' : ''}
          )
        ORDER BY d.origin_date DESC NULLS LAST
      `
      const params = userId ? [userId] : []
      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }
}
