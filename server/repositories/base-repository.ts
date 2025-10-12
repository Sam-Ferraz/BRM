import { Pool, PoolClient } from 'pg'
import pool from '../database.js'

export abstract class BaseRepository {
  protected pool: Pool

  constructor() {
    this.pool = pool
  }

  protected async getClient(): Promise<PoolClient> {
    return await this.pool.connect()
  }

  protected releaseClient(client: PoolClient): void {
    client.release()
  }

  protected async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      this.releaseClient(client)
    }
  }
}