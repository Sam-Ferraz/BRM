import { BaseRepository } from './base-repository.js'
import { Permission, PermissionsMatrix, ManagedUserRole } from '../types/index.js'

const MATRIX_ROLES: ManagedUserRole[] = ['manager', 'broker', 'sdr', 'administrative']

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

  async getMatrix(): Promise<PermissionsMatrix> {
    const permissions = await this.listAll()

    const client = await this.getClient()
    let rows: { permission_id: number; role: ManagedUserRole; allowed: boolean }[]
    try {
      const result = await client.query<{ permission_id: number; role: ManagedUserRole; allowed: boolean }>(
        `SELECT permission_id, role, allowed FROM role_permissions WHERE role <> 'admin'`
      )
      rows = result.rows
    } finally {
      this.releaseClient(client)
    }

    const byPerm = new Map<number, Partial<Record<ManagedUserRole, boolean>>>()
    for (const row of rows) {
      const existing = byPerm.get(row.permission_id) ?? {}
      existing[row.role] = row.allowed
      byPerm.set(row.permission_id, existing)
    }

    const byModule = new Map<string, Permission[]>()
    for (const p of permissions) {
      const bucket = byModule.get(p.module) ?? []
      bucket.push(p)
      byModule.set(p.module, bucket)
    }

    const orderedModules = Object.keys(MODULE_LABELS).filter((m) => byModule.has(m))
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
              admin: true,
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

  async setPermissionsBulk(
    updates: { role: ManagedUserRole; permissionId: number; allowed: boolean }[],
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
