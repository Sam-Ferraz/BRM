import { BaseRepository } from './base-repository.js'
import { Permission, PermissionsMatrix, UserRole } from '../types/index.js'

const MATRIX_ROLES: UserRole[] = ['manager', 'broker', 'sdr', 'administrative']

// Labels amigáveis dos módulos (a ordem aqui define a ordem no UI)
const MODULE_LABELS: Record<string, string> = {
  users: 'Usuários',
  integrations: 'Integrações',
  leads: 'Leads',
  deals: 'Negócios',
  clients: 'Clientes',
  products: 'Imóveis',
  appointments: 'Atendimentos',
  followups: 'Follow-ups',
  proposals: 'Propostas',
  contracts: 'Contratos',
  sales: 'Vendas',
  chat: 'Chat',
  agenda: 'Agenda',
  analytics: 'Analytics',
}

export class PermissionRepository extends BaseRepository {
  async listAll(): Promise<Permission[]> {
    const client = await this.getClient()
    try {
      const result = await client.query<Permission>(
        `SELECT * FROM permissions ORDER BY module, display_order, key`
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Verifica se um role tem determinada permission_key.
   * ADMIN sempre retorna true (bypass — decidido no service, mas aqui também
   * pra ficar seguro caso a checagem seja chamada direto).
   */
  async isAllowed(role: UserRole, key: string): Promise<boolean> {
    if (role === 'admin') return true
    const client = await this.getClient()
    try {
      const result = await client.query<{ allowed: boolean }>(
        `SELECT rp.allowed
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role = $1 AND p.key = $2`,
        [role, key]
      )
      return !!result.rows[0]?.allowed
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Retorna set de keys permitidas por role — usado pra alimentar o objeto
   * de permissões no login e evitar N queries por request.
   */
  async listKeysForRole(role: UserRole): Promise<string[]> {
    if (role === 'admin') {
      // Admin tem tudo — retorna todas as keys registradas
      const all = await this.listAll()
      return all.map((p) => p.key)
    }
    const client = await this.getClient()
    try {
      const result = await client.query<{ key: string }>(
        `SELECT p.key
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role = $1 AND rp.allowed = TRUE`,
        [role]
      )
      return result.rows.map((r) => r.key)
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Constrói a matriz permissions × roles pra tela de edição. Retorna todas
   * as permissões agrupadas por módulo, cada uma com o mapa de allowed por
   * role (exceto admin — sempre true implicitamente).
   */
  async getMatrix(): Promise<PermissionsMatrix> {
    const permissions = await this.listAll()

    const client = await this.getClient()
    let rows: { permission_id: number; role: UserRole; allowed: boolean }[]
    try {
      const result = await client.query<{ permission_id: number; role: UserRole; allowed: boolean }>(
        `SELECT permission_id, role, allowed FROM role_permissions WHERE role <> 'admin'`
      )
      rows = result.rows
    } finally {
      this.releaseClient(client)
    }

    // Índice: permission_id -> role -> allowed
    const byPerm = new Map<number, Partial<Record<UserRole, boolean>>>()
    for (const row of rows) {
      const existing = byPerm.get(row.permission_id) ?? {}
      existing[row.role] = row.allowed
      byPerm.set(row.permission_id, existing)
    }

    // Agrupa por módulo
    const byModule = new Map<string, Permission[]>()
    for (const p of permissions) {
      const bucket = byModule.get(p.module) ?? []
      bucket.push(p)
      byModule.set(p.module, bucket)
    }

    // Preserva a ordem definida em MODULE_LABELS pra visual consistente
    const orderedModules = Object.keys(MODULE_LABELS).filter((m) => byModule.has(m))
    // Se aparecer módulo novo que não está no dicionário, adiciona no fim
    for (const m of byModule.keys()) {
      if (!orderedModules.includes(m)) orderedModules.push(m)
    }

    return {
      modules: orderedModules.map((module) => ({
        module,
        label: MODULE_LABELS[module] ?? module,
        permissions: (byModule.get(module) ?? []).map((p) => {
          const map = byPerm.get(p.id) ?? {}
          return {
            id: p.id,
            key: p.key,
            label: p.label,
            description: p.description,
            allowed: {
              admin: true,                          // implicit
              manager: !!map.manager,
              broker: !!map.broker,
              sdr: !!map.sdr,
              administrative: !!map.administrative,
            },
          }
        }),
      })),
    }
  }

  /**
   * Atualiza (upsert) uma flag da matriz. Idempotente.
   */
  async setPermission(input: {
    role: UserRole
    permissionId: number
    allowed: boolean
    updatedBy?: number
  }): Promise<void> {
    if (input.role === 'admin') return // admin não entra na matriz
    if (!MATRIX_ROLES.includes(input.role)) throw new Error('invalid role')

    const client = await this.getClient()
    try {
      await client.query(
        `INSERT INTO role_permissions (role, permission_id, allowed, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (role, permission_id)
         DO UPDATE SET allowed = EXCLUDED.allowed,
                       updated_by = EXCLUDED.updated_by,
                       updated_at = NOW()`,
        [input.role, input.permissionId, input.allowed, input.updatedBy ?? null]
      )
    } finally {
      this.releaseClient(client)
    }
  }

  /**
   * Atualiza várias flags de uma vez (bulk). Usado quando o admin salva
   * o formulário inteiro da matriz.
   */
  async setPermissionsBulk(
    updates: { role: UserRole; permissionId: number; allowed: boolean }[],
    updatedBy?: number
  ): Promise<void> {
    if (updates.length === 0) return
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      for (const u of updates) {
        if (u.role === 'admin' || !MATRIX_ROLES.includes(u.role)) continue
        await client.query(
          `INSERT INTO role_permissions (role, permission_id, allowed, updated_by, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (role, permission_id)
           DO UPDATE SET allowed = EXCLUDED.allowed,
                         updated_by = EXCLUDED.updated_by,
                         updated_at = NOW()`,
          [u.role, u.permissionId, u.allowed, updatedBy ?? null]
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      this.releaseClient(client)
    }
  }
}
