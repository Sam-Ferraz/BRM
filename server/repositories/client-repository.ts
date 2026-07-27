import { BaseRepository } from './base-repository.js'
import { Client, QueryFilters } from '../types/index.js'

export class ClientRepository extends BaseRepository {
  async findAll(accountId: number, filters: QueryFilters = {}): Promise<Client[]> {
    const client = await this.getClient()
    try {
      const { search, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM clients WHERE account_id = $1'
      const params: any[] = [accountId]
      let paramCount = 2

      if (search) {
        query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR city ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (sortBy) {
        const validColumns = ['name', 'email', 'phone', 'city']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY name ASC'
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async create(accountId: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'INSERT INTO clients (account_id, name, email, phone, city, address, origin) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [accountId, clientData.name, clientData.email, clientData.phone, clientData.city, clientData.address, clientData.origin]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(accountId: number, id: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE clients SET name = $1, email = $2, phone = $3, city = $4, address = $5, origin = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 AND account_id = $8 RETURNING *',
        [clientData.name, clientData.email, clientData.phone, clientData.city, clientData.address, clientData.origin, id, accountId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM clients WHERE id = $1 AND account_id = $2 RETURNING *',
        [id, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(accountId: number): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM clients WHERE account_id = $1',
        [accountId]
      )
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }
}
