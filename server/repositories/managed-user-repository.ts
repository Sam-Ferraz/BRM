import { BaseRepository } from './base-repository.js'
import { ManagedUser, ManagedUserRole } from '../types/index.js'

/**
 * Repository ISOLADO pro módulo de gestão de usuários.
 *
 * NÃO substituir o UserRepository — este só é usado pelos serviços novos
 * (/api/users e /api/permissions). Assim os endpoints existentes (auth,
 * outros modules) continuam usando UserRepository sem risco de regressão.
 */
export class ManagedUserRepository extends BaseRepository {
  async findAll(): Promise<ManagedUser[]> {
    const client = await this.getClient()
    try {
      const result = await client.query<ManagedUser>(
        `SELECT id, name, email, role, active, last_login_at, created_at, updated_at
         FROM users ORDER BY active DESC, name ASC`
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<ManagedUser | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<ManagedUser>(
        `SELECT id, name, email, role, active, last_login_at, created_at, updated_at
         FROM users WHERE id = $1`,
        [id]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async findByEmail(email: string): Promise<ManagedUser | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<ManagedUser>(
        `SELECT id, name, email, role, active, last_login_at, created_at, updated_at
         FROM users WHERE email = $1`,
        [email]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(input: {
    name: string
    email: string
    passwordHash: string
    role: ManagedUserRole
  }): Promise<ManagedUser> {
    const client = await this.getClient()
    try {
      const result = await client.query<ManagedUser>(
        `INSERT INTO users (name, email, password_hash, role, active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, name, email, role, active, last_login_at, created_at, updated_at`,
        [input.name, input.email, input.passwordHash, input.role]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(
    id: number,
    input: Partial<{ name: string; email: string; role: ManagedUserRole; active: boolean }>
  ): Promise<ManagedUser | null> {
    const fields: string[] = []
    const values: any[] = []
    let idx = 1
    if (input.name !== undefined)   { fields.push(`name = $${idx++}`);   values.push(input.name) }
    if (input.email !== undefined)  { fields.push(`email = $${idx++}`);  values.push(input.email) }
    if (input.role !== undefined)   { fields.push(`role = $${idx++}`);   values.push(input.role) }
    if (input.active !== undefined) { fields.push(`active = $${idx++}`); values.push(input.active) }
    if (fields.length === 0) return this.findById(id)

    values.push(id)
    const client = await this.getClient()
    try {
      const result = await client.query<ManagedUser>(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING id, name, email, role, active, last_login_at, created_at, updated_at`,
        values
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async updatePassword(id: number, passwordHash: string): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [passwordHash, id]
      )
      return (result.rowCount ?? 0) > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async countActiveAdmins(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND active = TRUE`
      )
      return result.rows[0]?.n ?? 0
    } finally {
      this.releaseClient(client)
    }
  }
}
