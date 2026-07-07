import { BaseRepository } from './base-repository.js'
import { User, UserRole } from '../types/index.js'

export class UserRepository extends BaseRepository {
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<User>(
        `SELECT id, name, email, password_hash, role, active, last_login_at, created_at, updated_at
         FROM users WHERE email = $1`,
        [email]
      )
      return result.rows[0] || null
    } finally {
      this.releaseClient(client)
    }
  }

  async findAll(): Promise<User[]> {
    const client = await this.getClient()
    try {
      const result = await client.query<User>(
        `SELECT id, name, email, role, active, last_login_at, created_at, updated_at
         FROM users ORDER BY active DESC, name ASC`
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<User | null> {
    const client = await this.getClient()
    try {
      const result = await client.query<User>(
        `SELECT id, name, email, role, active, last_login_at, created_at, updated_at
         FROM users WHERE id = $1`,
        [id]
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
    role: UserRole
    active?: boolean
  }): Promise<User> {
    const client = await this.getClient()
    try {
      const result = await client.query<User>(
        `INSERT INTO users (name, email, password_hash, role, active)
         VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
         RETURNING id, name, email, role, active, last_login_at, created_at, updated_at`,
        [input.name, input.email, input.passwordHash, input.role, input.active]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(
    id: number,
    input: Partial<{ name: string; email: string; role: UserRole; active: boolean }>
  ): Promise<User | null> {
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
      const result = await client.query<User>(
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

  async touchLastLogin(id: number): Promise<void> {
    const client = await this.getClient()
    try {
      await client.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [id]
      )
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
