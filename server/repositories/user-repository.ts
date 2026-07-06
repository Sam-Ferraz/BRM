import { BaseRepository } from './base-repository.js'
import { User } from '../types/index.js'

export class UserRepository extends BaseRepository {
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
        [email]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async findAll(): Promise<User[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id, name, email, role FROM users ORDER BY name ASC'
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<User | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT id, name, email, role FROM users WHERE id = $1',
        [id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(name: string, email: string, passwordHash: string, role: string = 'user'): Promise<User> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, email, role`,
        [name, email, passwordHash, role]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }
}