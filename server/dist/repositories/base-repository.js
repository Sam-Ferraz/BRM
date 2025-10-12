import pool from '../database.js';
export class BaseRepository {
    constructor() {
        this.pool = pool;
    }
    async getClient() {
        return await this.pool.connect();
    }
    releaseClient(client) {
        client.release();
    }
    async withTransaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            this.releaseClient(client);
        }
    }
}
