import { BaseRepository } from './base-repository.js'
import { SalesAgenda, QueryFilters } from '../types/index.js'

export class SalesAgendaRepository extends BaseRepository {
  async findAll(accountId: number, filters: QueryFilters = {}, userId?: number): Promise<SalesAgenda[]> {
    const client = await this.getClient()
    try {
      const { search, status, sortBy, sortOrder } = filters
      // LEFT JOIN com products para trazer o snapshot do imóvel (preço, tipo,
      // cômodos, área, bairro) usado na vitrine — evita uma chamada extra por
      // card. Outro LEFT JOIN com product_images apenas para marcar a flag
      // has_thumbnail; a imagem em si é servida pelo endpoint /thumbnail.
      let query = `
        SELECT
          sa.*,
          p.price          AS product_price,
          p.type           AS product_type,
          p.category       AS product_category,
          p.bedrooms       AS product_bedrooms,
          p.suites         AS product_suites,
          p.parking_spots  AS product_parking_spots,
          p.bathrooms      AS product_bathrooms,
          p.total_area     AS product_total_area,
          p.private_area   AS product_private_area,
          p.neighborhood   AS product_neighborhood,
          p.city           AS product_city,
          p.state          AS product_state,
          p.description    AS product_description,
          (pi.id IS NOT NULL) AS has_thumbnail
        FROM sales_agenda sa
        LEFT JOIN products p ON sa.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = TRUE
        WHERE sa.account_id = $1
      `
      const params: any[] = [accountId]
      let paramCount = 2

      // Filtro secundário por corretor (não por tenant)
      if (userId) {
        query += ` AND sa.user_id = $${paramCount}`
        params.push(userId)
        paramCount++
      }

      if (search) {
        query += ` AND (sa.title ILIKE $${paramCount} OR sa.product_name ILIKE $${paramCount} OR p.neighborhood ILIKE $${paramCount} OR p.city ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (status && status !== 'All') {
        query += ` AND sa.status = $${paramCount}`
        params.push(status)
        paramCount++
      }

      const validSortColumns: Record<string, string> = {
        title: 'sa.title',
        product_name: 'sa.product_name',
        date: 'sa.date',
        status: 'sa.status',
        price: 'p.price',
      }
      if (sortBy && validSortColumns[sortBy]) {
        const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
        query += ` ORDER BY ${validSortColumns[sortBy]} ${order} NULLS LAST`
      } else {
        query += ' ORDER BY sa.date DESC'
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async create(accountId: number, salesAgenda: Omit<SalesAgenda, 'id' | 'account_id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda> {
    const client = await this.getClient()
    try {
      // Set current date automatically
      const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

      const result = await client.query(
        'INSERT INTO sales_agenda (account_id, title, product_name, product_id, date, status, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [accountId, salesAgenda.title, salesAgenda.product_name, salesAgenda.product_id || null, currentDate, salesAgenda.status, salesAgenda.user_id]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(accountId: number, id: number, salesAgenda: Omit<SalesAgenda, 'id' | 'account_id' | 'created_at' | 'updated_at' | 'date'>): Promise<SalesAgenda | null> {
    const client = await this.getClient()
    try {
      // Don't update the date - it remains as originally created
      const result = await client.query(
        'UPDATE sales_agenda SET title = $1, product_name = $2, product_id = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND account_id = $6 RETURNING *',
        [salesAgenda.title, salesAgenda.product_name, salesAgenda.product_id || null, salesAgenda.status, id, accountId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM sales_agenda WHERE id = $1 AND account_id = $2 RETURNING *', [id, accountId])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(accountId: number, userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = 'SELECT COUNT(*) as count FROM sales_agenda WHERE account_id = $1'
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
}
