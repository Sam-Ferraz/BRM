import { BaseRepository } from './base-repository.js'
import { Sale, SaleWithDetails, SaleStatus } from '../types/index.js'

/**
 * Repositório do módulo Vendas (sales).
 *
 * Convenções:
 *   • findAll/findById retornam SaleWithDetails — sempre vêm com JOIN em
 *     deals, products, users e proposals pra evitar N+1 nas listagens.
 *   • create é chamado pelo SaleService apenas quando uma proposta vira
 *     'accepted' (auto-criação). Não há endpoint público que crie venda
 *     do zero — sempre nasce de uma proposta.
 */
export class SaleRepository extends BaseRepository {
  /**
   * Lista todas as vendas com detalhes do deal/produto/seller/proposta.
   * Filtros suportados: status, search (cliente / imóvel / corretor).
   */
  async findAll(filters: {
    status?: SaleStatus | 'all'
    search?: string
    createdFrom?: string  // YYYY-MM-DD (inclusivo)
    createdTo?: string    // YYYY-MM-DD (inclusivo)
  } = {}): Promise<SaleWithDetails[]> {
    const client = await this.getClient()
    try {
      let query = `
        SELECT
          s.*,
          d.client                  AS deal_client,
          d.property_name           AS deal_property_name,
          prod.price                AS deal_property_price,
          seller.name               AS seller_name,
          approver.name             AS approver_name,
          modifier.name             AS last_modifier_name,
          p.proposal_value          AS proposal_value,
          p.proposal_date           AS proposal_date,
          p.validity_date           AS proposal_validity_date,
          p.payment_condition       AS proposal_payment_condition,
          p.vgv                     AS proposal_vgv,
          p.vgc                     AS proposal_vgc,
          p.intermediation_rate     AS proposal_intermediation_rate
        FROM sales s
        LEFT JOIN deals d        ON s.deal_id = d.id
        LEFT JOIN products prod  ON LOWER(prod.name) = LOWER(d.property_name)
        LEFT JOIN users seller   ON s.seller_user_id = seller.id
        LEFT JOIN users approver ON s.approved_by_user_id = approver.id
        LEFT JOIN users modifier ON s.last_modified_by_user_id = modifier.id
        LEFT JOIN proposals p    ON s.proposal_id = p.id
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 1

      if (filters.status && filters.status !== 'all') {
        query += ` AND s.status = $${paramCount}`
        params.push(filters.status)
        paramCount++
      }

      if (filters.search) {
        query += ` AND (
          d.client ILIKE $${paramCount} OR
          d.property_name ILIKE $${paramCount} OR
          seller.name ILIKE $${paramCount}
        )`
        params.push(`%${filters.search}%`)
        paramCount++
      }

      // Filtro por data de criação (inclusivo nos dois extremos)
      if (filters.createdFrom) {
        query += ` AND s.created_at >= $${paramCount}::date`
        params.push(filters.createdFrom)
        paramCount++
      }
      if (filters.createdTo) {
        query += ` AND s.created_at < ($${paramCount}::date + INTERVAL '1 day')`
        params.push(filters.createdTo)
        paramCount++
      }

      query += ' ORDER BY s.created_at DESC, s.id DESC'

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<SaleWithDetails | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT
          s.*,
          d.client                  AS deal_client,
          d.property_name           AS deal_property_name,
          prod.price                AS deal_property_price,
          seller.name               AS seller_name,
          approver.name             AS approver_name,
          modifier.name             AS last_modifier_name,
          p.proposal_value          AS proposal_value,
          p.proposal_date           AS proposal_date,
          p.validity_date           AS proposal_validity_date,
          p.payment_condition       AS proposal_payment_condition,
          p.vgv                     AS proposal_vgv,
          p.vgc                     AS proposal_vgc,
          p.intermediation_rate     AS proposal_intermediation_rate
        FROM sales s
        LEFT JOIN deals d        ON s.deal_id = d.id
        LEFT JOIN products prod  ON LOWER(prod.name) = LOWER(d.property_name)
        LEFT JOIN users seller   ON s.seller_user_id = seller.id
        LEFT JOIN users approver ON s.approved_by_user_id = approver.id
        LEFT JOIN users modifier ON s.last_modified_by_user_id = modifier.id
        LEFT JOIN proposals p    ON s.proposal_id = p.id
        WHERE s.id = $1`,
        [id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async findByProposal(proposalId: number): Promise<Sale | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM sales WHERE proposal_id = $1 LIMIT 1',
        [proposalId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Cria venda inicial (nasce de proposta aceita).
   * Status sempre começa em 'pending_approval'.
   */
  async create(input: {
    proposal_id: number
    deal_id: number
    seller_user_id: number
  }): Promise<Sale> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO sales (proposal_id, deal_id, seller_user_id, status)
         VALUES ($1, $2, $3, 'pending_approval') RETURNING *`,
        [input.proposal_id, input.deal_id, input.seller_user_id]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Atualiza dados editáveis (data da venda, contrato). Agora permitido até
   * mesmo após approval/rejection — é o caso de "subir novo contrato" ou
   * corrigir dado. Sempre grava last_modified_by_user_id + last_modified_at
   * pra rastreabilidade.
   */
  async updateDetails(id: number, modifiedByUserId: number, input: {
    sale_date?: string | null
    contract_url?: string | null
    contract_filename?: string | null
  }): Promise<Sale | null> {
    const client = await this.getClient()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (input.sale_date !== undefined) {
        fields.push(`sale_date = $${paramCount}::date`)
        values.push(input.sale_date)
        paramCount++
      }
      if (input.contract_url !== undefined) {
        fields.push(`contract_url = $${paramCount}`)
        values.push(input.contract_url)
        paramCount++
      }
      if (input.contract_filename !== undefined) {
        fields.push(`contract_filename = $${paramCount}`)
        values.push(input.contract_filename)
        paramCount++
      }
      if (fields.length === 0) return this.findById(id) as any

      // Tracking de alteração — sempre atualizado quando algo muda.
      fields.push(`last_modified_by_user_id = $${paramCount}`)
      values.push(modifiedByUserId)
      paramCount++
      fields.push('last_modified_at = CURRENT_TIMESTAMP')
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      const query = `UPDATE sales SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`
      const result = await client.query(query, values)
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Aprova a venda: muda status='approved', registra approver e timestamp.
   * Idempotente — chamar duas vezes seguidas só atualiza approved_at.
   */
  async approve(id: number, approverUserId: number, notes?: string | null): Promise<Sale | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE sales
            SET status = 'approved',
                approved_by_user_id = $1,
                approved_at = CURRENT_TIMESTAMP,
                approval_notes = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3 RETURNING *`,
        [approverUserId, notes ?? null, id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async reject(id: number, approverUserId: number, notes?: string | null): Promise<Sale | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE sales
            SET status = 'rejected',
                approved_by_user_id = $1,
                approved_at = CURRENT_TIMESTAMP,
                approval_notes = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3 RETURNING *`,
        [approverUserId, notes ?? null, id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT COUNT(*) AS count FROM sales')
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }

  async getPendingApprovalCount(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        "SELECT COUNT(*) AS count FROM sales WHERE status = 'pending_approval'"
      )
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }
}
