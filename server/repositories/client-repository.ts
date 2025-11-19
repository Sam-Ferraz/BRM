import { BaseRepository } from './base-repository.js'
import { Client, QueryFilters } from '../types/index.js'

export class ClientRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}): Promise<Client[]> {
    const client = await this.getClient()
    try {
      const { search, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM clients WHERE 1=1'
      const params: any[] = []
      let paramCount = 1

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

  async create(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'INSERT INTO clients (name, email, phone, city, address, origin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [clientData.name, clientData.email, clientData.phone, clientData.city, clientData.address, clientData.origin]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(id: number, clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE clients SET name = $1, email = $2, phone = $3, city = $4, address = $5, origin = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
        [clientData.name, clientData.email, clientData.phone, clientData.city, clientData.address, clientData.origin, id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM clients')
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }
}
