import { BaseRepository } from './base-repository.js'
import { Proposal, ProposalWithDetails, QueryFilters } from '../types/index.js'

const VALID_STATUSES = new Set([
  'pending',
  'accepted',
  'rejected',
  'counter_proposal',
  'expired',
])

export class ProposalRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}, userId?: number): Promise<ProposalWithDetails[]> {
    const client = await this.getClient()
    try {
      const { search, status, sortBy, sortOrder } = filters
      let query = `
        SELECT
          p.*,
          d.client AS deal_client,
          d.property_name AS deal_property_name
        FROM proposals p
        LEFT JOIN deals d ON p.deal_id = d.id
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 1

      if (userId) {
        query += ` AND p.user_id = $${paramCount}`
        params.push(userId)
        paramCount++
      }

      if (search) {
        query += ` AND (d.client ILIKE $${paramCount} OR d.property_name ILIKE $${paramCount} OR p.payment_condition ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (status && status !== 'all' && VALID_STATUSES.has(status)) {
        query += ` AND p.status = $${paramCount}`
        params.push(status)
        paramCount++
      }

      const validSortColumns: Record<string, string> = {
        proposal_date: 'p.proposal_date',
        validity_date: 'p.validity_date',
        proposal_value: 'p.proposal_value',
        status: 'p.status',
        client: 'd.client',
        property_name: 'd.property_name',
      }
      if (sortBy && validSortColumns[sortBy]) {
        const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
        query += ` ORDER BY ${validSortColumns[sortBy]} ${order} NULLS LAST`
      } else {
        query += ' ORDER BY p.proposal_date DESC NULLS LAST, p.id DESC'
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<ProposalWithDetails | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT
          p.*,
          d.client AS deal_client,
          d.property_name AS deal_property_name
        FROM proposals p
        LEFT JOIN deals d ON p.deal_id = d.id
        WHERE p.id = $1`,
        [id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(
    proposal: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Proposal> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO proposals (
          deal_id, proposal_value, payment_condition, proposal_date,
          validity_date, status, notes, vgv, vgc, intermediation_rate, user_id
        ) VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          proposal.deal_id,
          proposal.proposal_value,
          proposal.payment_condition ?? null,
          proposal.proposal_date,
          proposal.validity_date ?? null,
          proposal.status,
          proposal.notes ?? null,
          proposal.vgv ?? null,
          proposal.vgc ?? null,
          proposal.intermediation_rate ?? null,
          proposal.user_id,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(
    id: number,
    proposal: Partial<Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'user_id'>>
  ): Promise<Proposal | null> {
    const client = await this.getClient()
    try {
      const fields: string[] = []
      const values: any[] = []
      let paramCount = 1

      const addField = (column: string, value: any, cast?: string) => {
        const placeholder = cast ? `$${paramCount}::${cast}` : `$${paramCount}`
        fields.push(`${column} = ${placeholder}`)
        values.push(value)
        paramCount++
      }

      if (proposal.deal_id !== undefined) addField('deal_id', proposal.deal_id)
      if (proposal.proposal_value !== undefined) addField('proposal_value', proposal.proposal_value)
      if (proposal.payment_condition !== undefined) addField('payment_condition', proposal.payment_condition ?? null)
      if (proposal.proposal_date !== undefined) addField('proposal_date', proposal.proposal_date, 'date')
      if (proposal.validity_date !== undefined) addField('validity_date', proposal.validity_date ?? null, 'date')
      if (proposal.status !== undefined) addField('status', proposal.status)
      if (proposal.notes !== undefined) addField('notes', proposal.notes ?? null)
      if (proposal.vgv !== undefined) addField('vgv', proposal.vgv ?? null)
      if (proposal.vgc !== undefined) addField('vgc', proposal.vgc ?? null)
      if (proposal.intermediation_rate !== undefined) addField('intermediation_rate', proposal.intermediation_rate ?? null)

      if (fields.length === 0) {
        const existing = await this.findById(id)
        return existing
      }

      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      const query = `UPDATE proposals SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`
      const result = await client.query(query, values)
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM proposals WHERE id = $1 RETURNING id', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = 'SELECT COUNT(*) AS count FROM proposals'
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
   * Counts only "in-flight" proposals — those still requiring follow-through.
   * Excludes 'rejected' and 'expired' since those are terminal states that do
   * not need salesperson attention.
   */
  async getActiveCount(userId?: number): Promise<number> {
    const client = await this.getClient()
    try {
      let query = `SELECT COUNT(*) AS count FROM proposals WHERE status IN ('pending', 'accepted', 'counter_proposal')`
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
}
