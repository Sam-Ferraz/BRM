import { BaseRepository } from './base-repository.js'
import { Deal, DealFunnelStage, QueryFilters } from '../types/index.js'

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

  /**
   * Update parcial de status apenas — usado pelo ContractService pra mover
   * o deal pra 'contract' ou 'sold' sem precisar do payload completo.
   */
  async updateStatus(id: number, status: string): Promise<Deal | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE deals SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      )
      return result.rows[0] || null
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

  /**
   * Focused setter used when an accepted proposal needs to push its value
   * into the deal's VGV (gsv). Returns true if a row was updated.
   */
  async updateGsv(id: number, gsv: string | number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE deals SET gsv = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
        [gsv, id]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Focused setter used when a proposal carries a different property than the
   * deal currently has — the latest write from the proposal form wins.
   */
  async updatePropertyName(id: number, propertyName: string | null): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE deals SET property_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
        [propertyName ?? null, id]
      )
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

  /**
   * Conta deals ATIVOS — todos exceto os descartados (4 variantes de discarded_*).
   * Vendidos entram (o negócio existe, tá finalizado com sucesso), só descartes
   * saem por serem terminal-negativo.
   */
  async getActiveCount(userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = `SELECT COUNT(*) as count FROM deals WHERE status NOT LIKE 'discarded_%'`
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

  /**
   * Counts deals grouped by status across ALL users (company-wide).
   * Returns one row per status that exists in the table — including
   * the discarded_* statuses. Frontend decides which go in the funnel
   * and which go in the "discarded" section.
   *
   * If `from` / `to` are provided, the count is restricted to deals
   * whose chosen `dateField` falls inside that inclusive range. `origin_date`
   * is a DATE column and is compared directly; `created_at` is a TIMESTAMP
   * and is interpreted in the requested timezone before comparison.
   */
  async getFunnelByStatus(params?: {
    from?: string
    to?: string
    timezone?: string
    dateField?: 'origin_date' | 'created_at'
  }): Promise<DealFunnelStage[]> {
    const client = await this.getClient()
    try {
      await client.query("SET TIMEZONE = 'UTC'")

      const conditions: string[] = ['status IS NOT NULL']
      const values: any[] = []
      let p = 1

      if (params?.from && params?.to) {
        const dateField = params.dateField === 'created_at' ? 'created_at' : 'origin_date'
        if (dateField === 'origin_date') {
          conditions.push(`origin_date BETWEEN $${p}::date AND $${p + 1}::date`)
          values.push(params.from, params.to)
          p += 2
        } else {
          const timezone = params.timezone || 'UTC'
          conditions.push(
            `timezone($${p + 2}, created_at AT TIME ZONE 'UTC')::date BETWEEN $${p}::date AND $${p + 1}::date`
          )
          values.push(params.from, params.to, timezone)
          p += 3
        }
      }

      const query = `
        SELECT status, COUNT(*)::int AS count
        FROM deals
        WHERE ${conditions.join(' AND ')}
        GROUP BY status
      `
      const result = await client.query(query, values)
      return result.rows.map(row => ({
        status: row.status,
        count: row.count
      }))
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Retorna os IDs dos Negócios que estão em "atraso de cadência".
   *
   * Regra (definida pelo produto):
   *   - Só se aplica a leads (client_origin='online_lead')
   *   - Só nos primeiros 8 dias desde origin_date (aceite na carteira)
   *   - Só se ainda não há nenhum atendimento RESPONDIDO (bilateral) — ou seja,
   *     o cliente ainda não retornou; ele continua "frio"
   *   - E se a quantidade de tentativas (atendimentos NÃO respondidos) for
   *     MENOR que a quantidade de dias em carteira. Ex: 4 dias na carteira,
   *     só 2 tentativas → precisa de cadência (deveria haver ≥4).
   *
   * Retorna array de deal_ids junto de attempts e days_in_wallet — útil pra
   * tooltip futura. Query única, agregação no banco, sem N+1.
   */
  async getDealsNeedingCadence(userId?: number): Promise<Array<{
    deal_id: number
    attempts: number
    days_in_wallet: number
  }>> {
    const client = await this.getClient()
    try {
      const conditions: string[] = [
        "d.client_origin = 'online_lead'",
        "d.origin_date IS NOT NULL",
        "(CURRENT_DATE - d.origin_date) BETWEEN 0 AND 8",
      ]
      const values: any[] = []
      let p = 1
      if (userId) {
        conditions.push(`d.user_id = $${p}`)
        values.push(userId)
        p++
      }

      const query = `
        SELECT
          d.id AS deal_id,
          (CURRENT_DATE - d.origin_date)::int AS days_in_wallet,
          COALESCE(SUM(CASE WHEN a.answered = false THEN 1 ELSE 0 END), 0)::int AS attempts,
          COALESCE(SUM(CASE WHEN a.answered = true  THEN 1 ELSE 0 END), 0)::int AS answered_count
        FROM deals d
        LEFT JOIN appointments a ON a.deal_id = d.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY d.id, d.origin_date
        HAVING COALESCE(SUM(CASE WHEN a.answered = true  THEN 1 ELSE 0 END), 0) = 0
           AND COALESCE(SUM(CASE WHEN a.answered = false THEN 1 ELSE 0 END), 0)
               < (CURRENT_DATE - d.origin_date)::int
      `
      const result = await client.query(query, values)
      return result.rows.map(row => ({
        deal_id: row.deal_id,
        attempts: row.attempts,
        days_in_wallet: row.days_in_wallet,
      }))
    } finally {
      this.releaseClient(client)
    }
  }
}
