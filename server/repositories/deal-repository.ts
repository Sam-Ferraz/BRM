import { BaseRepository } from './base-repository.js'
import { Deal, QueryFilters } from '../types/index.js'

export class DealRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}): Promise<Deal[]> {
    const client = await this.getClient()
    try {
      const { search, status, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM deals WHERE 1=1'
      const params: any[] = []
      let paramCount = 1

      if (search) {
        query += ` AND (client ILIKE $${paramCount} OR value ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (status && status !== 'Todos') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }

      if (sortBy) {
        const validColumns = ['client', 'value', 'status', 'date']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY created_at DESC'
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
        'INSERT INTO deals (client, value, status, date, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [deal.client, deal.value, deal.status, deal.date, deal.description]
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
        'UPDATE deals SET client = $1, value = $2, status = $3, date = $4, description = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [deal.client, deal.value, deal.status, deal.date, deal.description, id]
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

  async getCount(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM deals')
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }
}