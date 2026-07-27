import { BaseRepository } from './base-repository.js'
import { LeadPipeline, LeadPipelinePayload, LeadPipelineMember } from '../types/index.js'

/**
 * Repositório da esteira de leads.
 *
 * Uma esteira agrega:
 *   - Config em lead_pipelines (nome, horário, timeout, gerente, ativa?)
 *   - Membros em lead_pipeline_members (ordem = posição na fila)
 *
 * Todas as leituras já trazem os membros e o nome do gerente via JOIN, para
 * evitar N+1 no consumidor.
 *
 * Multi-tenancy:
 *   - lead_pipelines.account_id isola cada esteira por conta.
 *   - lead_pipeline_members não tem account_id direto (herda via pipeline_id
 *     → pipelines.account_id e user_id → users.account_id) — a validação de
 *     que os corretores membros são da mesma conta acontece no service.
 */
export class LeadPipelineRepository extends BaseRepository {
  private async fetchMembers(pipelineIds: number[]): Promise<Map<number, LeadPipelineMember[]>> {
    const map = new Map<number, LeadPipelineMember[]>()
    if (pipelineIds.length === 0) return map
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT m.pipeline_id, m.user_id, m.position, u.name, u.email
           FROM lead_pipeline_members m
           JOIN users u ON u.id = m.user_id
           WHERE m.pipeline_id = ANY($1::int[])
           ORDER BY m.pipeline_id, m.position ASC`,
        [pipelineIds],
      )
      for (const row of result.rows) {
        const list = map.get(row.pipeline_id) ?? []
        list.push({
          user_id: row.user_id,
          name: row.name,
          email: row.email,
          position: row.position,
        })
        map.set(row.pipeline_id, list)
      }
      return map
    } finally {
      this.releaseClient(client)
    }
  }

  async findAll(accountId: number): Promise<LeadPipeline[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT p.*, u.name AS manager_name
           FROM lead_pipelines p
           LEFT JOIN users u ON u.id = p.manager_user_id
           WHERE p.account_id = $1
           ORDER BY p.is_active DESC, p.hour_start ASC, p.name ASC`,
        [accountId],
      )
      const rows = result.rows
      const membersMap = await this.fetchMembers(rows.map((r: any) => r.id))
      return rows.map((r: any) => ({
        ...r,
        members: membersMap.get(r.id) ?? [],
      }))
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(accountId: number, id: number): Promise<LeadPipeline | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `SELECT p.*, u.name AS manager_name
           FROM lead_pipelines p
           LEFT JOIN users u ON u.id = p.manager_user_id
           WHERE p.id = $1 AND p.account_id = $2`,
        [id, accountId],
      )
      if (result.rows.length === 0) return null
      const row = result.rows[0]
      const membersMap = await this.fetchMembers([id])
      return { ...row, members: membersMap.get(id) ?? [] }
    } finally {
      this.releaseClient(client)
    }
  }

  async create(accountId: number, payload: LeadPipelinePayload): Promise<LeadPipeline> {
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `INSERT INTO lead_pipelines
           (account_id, name, hour_start, hour_end, timeout_seconds, manager_user_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          accountId,
          payload.name,
          payload.hour_start,
          payload.hour_end,
          payload.timeout_seconds,
          payload.manager_user_id,
          payload.is_active,
        ],
      )
      const id = result.rows[0].id as number
      await this.replaceMembers(client, id, payload.member_user_ids)
      await client.query('COMMIT')
      const created = await this.findById(accountId, id)
      if (!created) throw new Error('Failed to load created pipeline')
      return created
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      this.releaseClient(client)
    }
  }

  async update(accountId: number, id: number, payload: LeadPipelinePayload): Promise<LeadPipeline | null> {
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `UPDATE lead_pipelines
           SET name             = $1,
               hour_start       = $2,
               hour_end         = $3,
               timeout_seconds  = $4,
               manager_user_id  = $5,
               is_active        = $6
         WHERE id = $7 AND account_id = $8
         RETURNING id`,
        [
          payload.name,
          payload.hour_start,
          payload.hour_end,
          payload.timeout_seconds,
          payload.manager_user_id,
          payload.is_active,
          id,
          accountId,
        ],
      )
      if (result.rows.length === 0) {
        await client.query('ROLLBACK')
        return null
      }
      await this.replaceMembers(client, id, payload.member_user_ids)
      await client.query('COMMIT')
      return this.findById(accountId, id)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(accountId: number, id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      // CASCADE cuida dos membros
      const result = await client.query(
        'DELETE FROM lead_pipelines WHERE id = $1 AND account_id = $2 RETURNING id',
        [id, accountId],
      )
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Retorna quais dos userIds passados pertencem à account indicada.
   * Usado pelo LeadPipelineService pra garantir que gerente e corretores
   * de uma esteira são todos da mesma conta antes de gravar.
   */
  async findUsersInAccount(accountId: number, userIds: number[]): Promise<number[]> {
    if (userIds.length === 0) return []
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id FROM users WHERE id = ANY($1::int[]) AND account_id = $2',
        [userIds, accountId],
      )
      return result.rows.map((r: any) => r.id as number)
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Apaga todos os membros da esteira e reinsere na ordem passada. Roda
   * dentro da transação já aberta pelo caller — recebe o client em vez de
   * pegar um novo do pool.
   */
  private async replaceMembers(client: any, pipelineId: number, userIds: number[]) {
    await client.query('DELETE FROM lead_pipeline_members WHERE pipeline_id = $1', [pipelineId])
    for (let i = 0; i < userIds.length; i++) {
      await client.query(
        `INSERT INTO lead_pipeline_members (pipeline_id, user_id, position)
         VALUES ($1, $2, $3)
         ON CONFLICT (pipeline_id, user_id) DO NOTHING`,
        [pipelineId, userIds[i], i],
      )
    }
  }
}
