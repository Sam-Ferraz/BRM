import { BaseRepository } from './base-repository.js';
export class UserRepository extends BaseRepository {
    async findByEmail(email) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async findById(id) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async create(name, email, passwordHash, role = 'user') {
        const client = await this.getClient();
        try {
            const result = await client.query(`INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, email, role`, [name, email, passwordHash, role]);
            return result.rows[0];
        }
        finally {
            this.releaseClient(client);
        }
    }
}
