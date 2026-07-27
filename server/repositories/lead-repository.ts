import { BaseRepository } from './base-repository.js'
import { Lead, LeadStatus, LeadWithDetails } from '../types/index.js'

export class LeadRepository extends BaseRepository {
  async findAll(accountId: number, filters: { status?: LeadStatus } = {}): Promise<LeadWithDetails[]> {
    const client = await this.getClient()
    try {
      const params: any[] = [accountId]
      let where = 'WHERE l.account_id = $1'
      if (filters.status) {
        where += ' AND l.status = $2'
        params.push(filters.status)
      }
      const query = `
        SELECT
          l.*,
          ls.name AS source_name,
          ls.type AS source_type,
          u.name  AS accepted_by_user_name,
          c.name  AS client_name
        FROM leads l
        LEFT JOIN lead_sources ls ON l.source_id = ls.id
        LEFT JOIN users u  ON l.accepted_by_user_id = u.id
        LEFT JOIN clients c ON l.client_id = c.id
        ${where}
        ORDER BY l.received_at DESC NULLS LAST, l.id DESC
      `
      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(accountId: number, id: number): Promise<LeadWithDetails | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT
           l.*,
           ls.name AS source_name,
           ls.type AS source_type,
           u.name  AS accepted_by_user_name,
           c.name  AS client_name
         FROM leads l
         LEFT JOIN lead_sources ls ON l.source_id = ls.id
         LEFT JOIN users u  ON l.accepted_by_user_id = u.id
         LEFT JOIN clients c ON l.client_id = c.id
         WHERE l.id = $1 AND l.account_id = $2`,
        [id, accountId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Insere lead novo. Se já existir um lead com mesmo (source_id, external_id),
   * retorna o existente em vez de duplicar — a Meta às vezes reenvia o mesmo
   * lead, e o índice UNIQUE garante a integridade no banco.
   *
   * O accountId aqui vem do source.account_id quando o payload é ingerido pelo
   * webhook público (via LeadService.ingestPayload) ou do usuário logado quando
   * é criação manual pela UI.
   */
  async insertOrIgnore(accountId: number, input: {
    source_id?: number | null
    external_id?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
    form_data?: Record<string, any> | null
  }): Promise<Lead> {
    const client = await this.getClient()
    try {
      // Tenta achar duplicata (mesma fonte + mesmo external_id) dentro da conta
      if (input.source_id && input.external_id) {
        const existing = await client.query(
          'SELECT * FROM leads WHERE source_id = $1 AND external_id = $2 AND account_id = $3',
          [input.source_id, input.external_id, accountId]
        )
        if (existing.rows.length > 0) {
          return existing.rows[0]
        }
      }
      const result = await client.query(
        `INSERT INTO leads (account_id, source_id, external_id, name, email, phone, form_data, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'novo') RETURNING *`,
        [
          accountId,
          input.source_id ?? null,
          input.external_id ?? null,
          input.name ?? null,
          input.email ?? null,
          input.phone ?? null,
          input.form_data ? JSON.stringify(input.form_data) : null,
        ]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async markAccepted(
    accountId: number,
    id: number,
    payload: { clientId: number; dealId: number; acceptedByUserId: number }
  ): Promise<Lead | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE leads
         SET status = 'aceito',
             client_id = $1,
             deal_id = $2,
             accepted_by_user_id = $3,
             accepted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND account_id = $5 RETURNING *`,
        [payload.clientId, payload.dealId, payload.acceptedByUserId, id, accountId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async markDiscarded(accountId: number, id: number, notes?: string | null): Promise<Lead | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE leads
         SET status = 'descartado',
             notes = COALESCE($1, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND account_id = $3 RETURNING *`,
        [notes ?? null, id, accountId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async getCountByStatus(accountId: number): Promise<Record<LeadStatus, number>> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT status, COUNT(*)::int AS count FROM leads WHERE account_id = $1 GROUP BY status`,
        [accountId]
      )
      const counts: Record<LeadStatus, number> = { novo: 0, aceito: 0, descartado: 0 }
      for (const row of result.rows) {
        counts[row.status as LeadStatus] = parseInt(row.count)
      }
      return counts
    } finally {
      this.releaseClient(client)
    }
  }
}
