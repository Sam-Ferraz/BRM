import { BaseRepository } from './base-repository.js'
import { Deal, DealFunnelStage, QueryFilters } from '../types/index.js'

export class DealRepository extends BaseRepository {
  async findAll(accountId: number, filters: QueryFilters = {}, userId?: number): Promise<Deal[]> {
    const client = await this.getClient()
    try {
      const { search, status, sortBy, sortOrder } = filters
      let query = 'SELECT * FROM deals WHERE account_id = $1'
      const params: any[] = [accountId]
      let paramCount = 2

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
        const validColumns = ['client', 'gsv', 'status', 'origin_date', 'updated_at', 'created_at']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order} NULLS LAST`
        }
      } else {
        // Default: mais recentemente editado no topo (updated_at DESC).
        // Fallback pra origin_date quando updated_at é NULL (deals antigos).
        query += ' ORDER BY COALESCE(updated_at, origin_date::timestamp) DESC NULLS LAST'
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async create(accountId: number, deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO deals (
          account_id,
          client,
          origin_date,
          description,
          lead_data,
          client_phone,
          client_origin,
          purpose,
          deal_type,
          gsv,
          property_name,
          status,
          user_id
        ) VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          accountId,
          deal.client,
          deal.origin_date || null,
          deal.description || null,
          deal.lead_data || null,
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
  async updateStatus(accountId: number, id: number, status: string): Promise<Deal | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE deals SET status = $1, updated_at = NOW() WHERE id = $2 AND account_id = $3 RETURNING *`,
        [status, id, accountId]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async update(accountId: number, id: number, deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal | null> {
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
        WHERE id = $11 AND account_id = $12 RETURNING *`,
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
          accountId,
        ]
      )
      // Nota: lead_data NAO e sobrescrito no UPDATE — e read-only pelo
      // corretor. So o webhook/importacao inicial popula esse campo.
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Sincroniza o telefone de todos os deals de um cliente quando o
   * ClientService atualiza o cadastro. Como o vinculo hoje e por nome
   * (deal.client = client.name), fazemos UPDATE em cascata escopado por
   * account + nome. Se o nome mudou tambem, o caller deve passar o nome
   * ANTIGO em oldClientName.
   */
  async syncPhoneByClientName(
    accountId: number,
    clientName: string,
    newPhone: string | null
  ): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE deals
            SET client_phone = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $2 AND client = $3`,
        [newPhone, accountId, clientName]
      )
      return result.rowCount ?? 0
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'DELETE FROM deals WHERE id = $1 AND account_id = $2 RETURNING *',
        [id, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Focused setter used when an accepted proposal needs to push its value
   * into the deal's VGV (gsv). Returns true if a row was updated.
   */
  async updateGsv(accountId: number, id: number, gsv: string | number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE deals SET gsv = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND account_id = $3 RETURNING id',
        [gsv, id, accountId]
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
  async updatePropertyName(accountId: number, id: number, propertyName: string | null): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE deals SET property_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND account_id = $3 RETURNING id',
        [propertyName ?? null, id, accountId]
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(accountId: number, userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = 'SELECT COUNT(*) as count FROM deals WHERE account_id = $1'
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

  /**
   * Conta deals ATIVOS — todos exceto os descartados (4 variantes de discarded_*).
   * Vendidos entram (o negócio existe, tá finalizado com sucesso), só descartes
   * saem por serem terminal-negativo.
   */
  async getActiveCount(accountId: number, userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = `SELECT COUNT(*) as count FROM deals WHERE account_id = $1 AND status NOT LIKE 'discarded_%'`
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

  async findWithoutOpenFollowUps(accountId: number, userId?: number): Promise<Deal[]> {
    const client = await this.getClient()
    try {
      // Find deals that are active (not sold/discarded) and have no appointments with open follow-ups for the same client
      const query = `
        SELECT DISTINCT d.*
        FROM deals d
        WHERE d.account_id = $1
          AND d.status NOT IN ('sold', 'discarded')
          ${userId ? 'AND d.user_id = $2' : ''}
          AND NOT EXISTS (
            SELECT 1
            FROM appointments a
            INNER JOIN follow_ups f ON a.id = f.appointment_id
            WHERE a.client = d.client
              AND a.account_id = $1
              AND f.completed = false
              ${userId ? 'AND a.user_id = $2' : ''}
          )
        ORDER BY d.origin_date DESC NULLS LAST
      `
      const params: any[] = userId ? [accountId, userId] : [accountId]
      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Counts deals grouped by status across ALL users of the account (company-wide).
   * Returns one row per status that exists in the table — including
   * the discarded_* statuses. Frontend decides which go in the funnel
   * and which go in the "discarded" section.
   *
   * If `from` / `to` are provided, the count is restricted to deals
   * whose chosen `dateField` falls inside that inclusive range. `origin_date`
   * is a DATE column and is compared directly; `created_at` is a TIMESTAMP
   * and is interpreted in the requested timezone before comparison.
   */
  async getFunnelByStatus(accountId: number, params?: {
    from?: string
    to?: string
    timezone?: string
    dateField?: 'origin_date' | 'created_at'
  }): Promise<DealFunnelStage[]> {
    const client = await this.getClient()
    try {
      await client.query("SET TIMEZONE = 'UTC'")

      const conditions: string[] = ['status IS NOT NULL', 'account_id = $1']
      const values: any[] = [accountId]
      let p = 2

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
   * Performance dos Negócios agregados por origem do cliente (client_origin).
   *
   * Para cada origem devolve contagens em 4 estágios do funil:
   *   - service_count  → status IN (service_cold, service_mild, service_warm)
   *   - visit_count    → visit_done_* (Apresentação — visita já realizada)
   *   - proposal_count → proposal
   *   - sale_count     → sold
   *
   * O front usa isso pra montar um radar (eixos = origens, séries = estágios
   * selecionados). Sem filtro de período por enquanto — vai ler tudo do
   * account atual, o front só precisa dessa foto agregada.
   */
  async getPerformanceByOrigin(accountId: number): Promise<Array<{
    origin: string
    service_count: number
    visit_count: number
    proposal_count: number
    sale_count: number
  }>> {
    const client = await this.getClient()
    try {
      const query = `
        SELECT
          COALESCE(client_origin::text, 'unknown') AS origin,
          COUNT(*) FILTER (WHERE status IN ('service_cold','service_mild','service_warm'))::int AS service_count,
          COUNT(*) FILTER (WHERE status IN ('visit_done_cold','visit_done_mild','visit_done_warm'))::int AS visit_count,
          COUNT(*) FILTER (WHERE status = 'proposal')::int AS proposal_count,
          COUNT(*) FILTER (WHERE status = 'sold')::int AS sale_count
        FROM deals
        WHERE account_id = $1
        GROUP BY 1
        ORDER BY 1
      `
      const result = await client.query(query, [accountId])
      return result.rows
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
  async getDealsNeedingCadence(accountId: number, userId?: number): Promise<Array<{
    deal_id: number
    attempts: number
    days_in_wallet: number
  }>> {
    const client = await this.getClient()
    try {
      const conditions: string[] = [
        'd.account_id = $1',
        "d.client_origin = 'online_lead'",
        "d.origin_date IS NOT NULL",
        "(CURRENT_DATE - d.origin_date) BETWEEN 0 AND 8",
      ]
      const values: any[] = [accountId]
      let p = 2
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
