import { BaseRepository } from './base-repository.js';
export class SalesAgendaRepository extends BaseRepository {
    async findAll(filters = {}) {
        const client = await this.getClient();
        try {
            const { search, status, sortBy, sortOrder } = filters;
            let query = 'SELECT * FROM sales_agenda WHERE 1=1';
            const params = [];
            let paramCount = 1;
            if (search) {
                query += ` AND (title ILIKE $${paramCount} OR product_name ILIKE $${paramCount})`;
                params.push(`%${search}%`);
                paramCount++;
            }
            if (status && status !== 'All') {
                query += ` AND status = $${paramCount}`;
                params.push(status);
                paramCount++;
            }
            if (sortBy) {
                const validColumns = ['title', 'client', 'product_name', 'value', 'date', 'status'];
                if (validColumns.includes(sortBy)) {
                    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
                    query += ` ORDER BY ${sortBy} ${order}`;
                }
            }
            else {
                query += ' ORDER BY date DESC';
            }
            const result = await client.query(query, params);
            return result.rows;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async create(salesAgenda) {
        const client = await this.getClient();
        try {
            // Set current date automatically
            const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const result = await client.query('INSERT INTO sales_agenda (title, product_name, product_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *', [salesAgenda.title, salesAgenda.product_name, salesAgenda.product_id || null, currentDate, salesAgenda.status]);
            return result.rows[0];
        }
        finally {
            this.releaseClient(client);
        }
    }
    async update(id, salesAgenda) {
        const client = await this.getClient();
        try {
            // Don't update the date - it remains as originally created
            const result = await client.query('UPDATE sales_agenda SET title = $1, product_name = $2, product_id = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *', [salesAgenda.title, salesAgenda.product_name, salesAgenda.product_id || null, salesAgenda.status, id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async delete(id) {
        const client = await this.getClient();
        try {
            const result = await client.query('DELETE FROM sales_agenda WHERE id = $1 RETURNING *', [id]);
            return result.rows.length > 0;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async getCount() {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT COUNT(*) as count FROM sales_agenda');
            return parseInt(result.rows[0].count);
        }
        finally {
            this.releaseClient(client);
        }
    }
}
