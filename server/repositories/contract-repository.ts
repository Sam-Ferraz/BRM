import { BaseRepository } from './base-repository.js'
import {
  Contract,
  ContractDocument,
  ContractDocumentType,
  ContractStatus,
  ContractWithDetails,
} from '../types/index.js'

/**
 * Persistência do módulo Contrato — etapa entre Proposta aceita e Sale aprovada.
 * A tabela `contracts` tem UNIQUE(proposal_id), então createFromProposal é
 * idempotente: se já existe contrato pra essa proposta, retorna o existente.
 */
export class ContractRepository extends BaseRepository {
  // ---------------------------------------------------------------------------
  // Listagens
  // ---------------------------------------------------------------------------

  async findAll(accountId: number, filters: {
    status?: ContractStatus | 'all'
    userId?: number          // filtra por corretor (broker vê apenas próprios)
    search?: string
  } = {}): Promise<ContractWithDetails[]> {
    const client = await this.getClient()
    try {
      let query = `
        SELECT
          c.*,
          d.client               AS deal_client,
          d.property_name        AS deal_property_name,
          broker.name            AS broker_name,
          legal_r.name           AS legal_reviewer_name,
          mgr_r.name             AS manager_reviewer_name,
          p.proposal_value       AS proposal_value,
          (SELECT COUNT(*)::int FROM contract_documents cd WHERE cd.contract_id = c.id) AS documents_count,
          (SELECT COUNT(*)::int FROM contract_documents cd WHERE cd.contract_id = c.id AND cd.doc_type = 'contract') AS contract_files_count
        FROM contracts c
        JOIN deals d       ON c.deal_id = d.id
        JOIN proposals p   ON c.proposal_id = p.id
        LEFT JOIN users broker  ON c.user_id = broker.id
        LEFT JOIN users legal_r ON c.legal_reviewed_by = legal_r.id
        LEFT JOIN users mgr_r   ON c.manager_reviewed_by = mgr_r.id
        WHERE c.account_id = $1
      `
      const params: any[] = [accountId]
      let n = 2

      if (filters.status && filters.status !== 'all') {
        query += ` AND c.status = $${n}`
        params.push(filters.status)
        n++
      }

      if (filters.userId !== undefined) {
        query += ` AND c.user_id = $${n}`
        params.push(filters.userId)
        n++
      }

      if (filters.search && filters.search.trim()) {
        query += ` AND (d.client ILIKE $${n} OR d.property_name ILIKE $${n})`
        params.push(`%${filters.search.trim()}%`)
        n++
      }

      query += ' ORDER BY c.updated_at DESC'
      const result = await client.query<ContractWithDetails>(query, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  async findById(accountId: number, id: number): Promise<ContractWithDetails | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<ContractWithDetails>(
        `SELECT
           c.*,
           d.client               AS deal_client,
           d.property_name        AS deal_property_name,
           broker.name            AS broker_name,
           legal_r.name           AS legal_reviewer_name,
           mgr_r.name             AS manager_reviewer_name,
           p.proposal_value       AS proposal_value,
           (SELECT COUNT(*)::int FROM contract_documents cd WHERE cd.contract_id = c.id) AS documents_count,
           (SELECT COUNT(*)::int FROM contract_documents cd WHERE cd.contract_id = c.id AND cd.doc_type = 'contract') AS contract_files_count
         FROM contracts c
         JOIN deals d       ON c.deal_id = d.id
         JOIN proposals p   ON c.proposal_id = p.id
         LEFT JOIN users broker  ON c.user_id = broker.id
         LEFT JOIN users legal_r ON c.legal_reviewed_by = legal_r.id
         LEFT JOIN users mgr_r   ON c.manager_reviewed_by = mgr_r.id
         WHERE c.id = $1 AND c.account_id = $2`,
        [id, accountId]
      )
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  async findByProposalId(accountId: number, proposalId: number): Promise<Contract | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<Contract>(
        `SELECT * FROM contracts WHERE proposal_id = $1 AND account_id = $2`,
        [proposalId, accountId]
      )
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  /**
   * Cria um contrato a partir de uma proposta aceita. Idempotente por UNIQUE
   * constraint em proposal_id — se já existir, INSERT falha e retornamos o
   * existente sem erro.
   */
  async createFromProposal(accountId: number, input: {
    deal_id: number
    proposal_id: number
    user_id: number
    final_value?: string | number | null
  }): Promise<Contract> {
    const client = await this.getClient()
    try {
      // Tenta INSERT ON CONFLICT DO NOTHING pra ficar idempotente
      const insert = await client.query<Contract>(
        `INSERT INTO contracts
           (account_id, deal_id, proposal_id, user_id, status, final_value)
         VALUES ($1, $2, $3, $4, 'pending_docs', $5)
         ON CONFLICT (proposal_id) DO NOTHING
         RETURNING *`,
        [accountId, input.deal_id, input.proposal_id, input.user_id, input.final_value ?? null]
      )
      if (insert.rows[0]) return insert.rows[0]

      // Conflito → retorna o existente (ainda escopado por account_id pra
      // não vazar contrato de outro tenant em caso de proposal_id repetido).
      const existing = await client.query<Contract>(
        `SELECT * FROM contracts WHERE proposal_id = $1 AND account_id = $2`,
        [input.proposal_id, accountId]
      )
      if (!existing.rows[0]) throw new Error('Contract insert failed and no existing row')
      return existing.rows[0]
    } finally {
      client.release()
    }
  }

  async updateStatus(
    accountId: number,
    id: number,
    input: {
      status: ContractStatus
      legal_notes?: string | null
      manager_notes?: string | null
      legal_reviewed_by?: number | null
      manager_reviewed_by?: number | null
      final_value?: string | number | null
    }
  ): Promise<Contract | null> {
    const fields: string[] = ['status = $1']
    const values: any[] = [input.status]
    let n = 2

    if (input.legal_notes !== undefined) {
      fields.push(`legal_notes = $${n}`)
      values.push(input.legal_notes)
      n++
    }
    if (input.manager_notes !== undefined) {
      fields.push(`manager_notes = $${n}`)
      values.push(input.manager_notes)
      n++
    }
    if (input.legal_reviewed_by !== undefined) {
      fields.push(`legal_reviewed_by = $${n}`)
      fields.push(`legal_reviewed_at = NOW()`)
      values.push(input.legal_reviewed_by)
      n++
    }
    if (input.manager_reviewed_by !== undefined) {
      fields.push(`manager_reviewed_by = $${n}`)
      fields.push(`manager_reviewed_at = NOW()`)
      values.push(input.manager_reviewed_by)
      n++
    }
    if (input.final_value !== undefined) {
      fields.push(`final_value = $${n}`)
      values.push(input.final_value)
      n++
    }

    values.push(id)
    values.push(accountId)
    const client = await this.getClient()
    try {
      const result = await client.query<Contract>(
        `UPDATE contracts SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${n} AND account_id = $${n + 1}
         RETURNING *`,
        values
      )
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  async getCountByStatus(accountId: number, userId?: number): Promise<Record<ContractStatus, number>> {
    const client = await this.getClient()
    try {
      let query = `SELECT status, COUNT(*)::int AS n FROM contracts WHERE account_id = $1`
      const params: any[] = [accountId]
      if (userId !== undefined) {
        query += ` AND user_id = $2`
        params.push(userId)
      }
      query += ` GROUP BY status`
      const result = await client.query<{ status: ContractStatus; n: number }>(query, params)
      const map: Record<ContractStatus, number> = {
        pending_docs: 0,
        awaiting_legal: 0,
        legal_rejected: 0,
        awaiting_manager: 0,
        manager_rejected: 0,
        approved: 0,
      }
      for (const row of result.rows) map[row.status] = row.n
      return map
    } finally {
      client.release()
    }
  }

  // ---------------------------------------------------------------------------
  // Documentos anexados
  // ---------------------------------------------------------------------------

  async listDocuments(accountId: number, contractId: number): Promise<ContractDocument[]> {
    const client = await this.getClient()
    try {
      const result = await client.query<ContractDocument>(
        `SELECT cd.* FROM contract_documents cd
         JOIN contracts c ON cd.contract_id = c.id
         WHERE cd.contract_id = $1 AND c.account_id = $2
         ORDER BY cd.doc_type, cd.display_order, cd.created_at`,
        [contractId, accountId]
      )
      return result.rows
    } finally {
      client.release()
    }
  }

  async addDocument(accountId: number, input: {
    contract_id: number
    uploader_id: number
    doc_type: ContractDocumentType
    filename: string
    file_url: string
    file_size?: number
    mime_type?: string
    notes?: string
  }): Promise<ContractDocument> {
    const client = await this.getClient()
    try {
      // Confirma que o contrato pertence ao tenant antes de anexar
      const owner = await client.query(
        `SELECT id FROM contracts WHERE id = $1 AND account_id = $2`,
        [input.contract_id, accountId]
      )
      if (owner.rows.length === 0) {
        throw new Error('Contract not found')
      }

      // Pega próximo display_order pra esse tipo
      const order = await client.query<{ next_order: number }>(
        `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
         FROM contract_documents
         WHERE contract_id = $1 AND doc_type = $2`,
        [input.contract_id, input.doc_type]
      )
      const displayOrder = order.rows[0]?.next_order ?? 0

      const result = await client.query<ContractDocument>(
        `INSERT INTO contract_documents
           (contract_id, uploader_id, doc_type, filename, file_url, file_size, mime_type, display_order, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          input.contract_id,
          input.uploader_id,
          input.doc_type,
          input.filename,
          input.file_url,
          input.file_size ?? null,
          input.mime_type ?? null,
          displayOrder,
          input.notes ?? null,
        ]
      )
      return result.rows[0]
    } finally {
      client.release()
    }
  }

  async deleteDocument(accountId: number, documentId: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      // DELETE só quando o documento pertence a um contrato do tenant atual
      const result = await client.query(
        `DELETE FROM contract_documents
         WHERE id = $1
           AND contract_id IN (SELECT id FROM contracts WHERE account_id = $2)`,
        [documentId, accountId]
      )
      return (result.rowCount ?? 0) > 0
    } finally {
      client.release()
    }
  }

  async getDocumentById(accountId: number, documentId: number): Promise<ContractDocument | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<ContractDocument>(
        `SELECT cd.* FROM contract_documents cd
         JOIN contracts c ON cd.contract_id = c.id
         WHERE cd.id = $1 AND c.account_id = $2`,
        [documentId, accountId]
      )
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }
}
