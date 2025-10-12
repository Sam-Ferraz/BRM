import { BaseRepository } from './base-repository.js';
export class ProductRepository extends BaseRepository {
    async findAll(filters = {}) {
        const client = await this.getClient();
        try {
            const { search, category, sortBy, sortOrder } = filters;
            let query = `
        SELECT 
          p.*,
          CASE 
            WHEN pi.id IS NOT NULL THEN true 
            ELSE false 
          END as has_thumbnail
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = TRUE
        WHERE 1=1
      `;
            const params = [];
            let paramCount = 1;
            if (search) {
                query += ` AND (p.name ILIKE $${paramCount} OR p.category ILIKE $${paramCount})`;
                params.push(`%${search}%`);
                paramCount++;
            }
            if (category && category !== 'All') {
                query += ` AND p.category = $${paramCount}`;
                params.push(category);
                paramCount++;
            }
            if (sortBy) {
                const validColumns = ['name', 'price', 'category'];
                if (validColumns.includes(sortBy)) {
                    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
                    query += ` ORDER BY p.${sortBy} ${order}`;
                }
            }
            else {
                query += ' ORDER BY p.name ASC';
            }
            const result = await client.query(query, params);
            return result.rows;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async findById(id) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT * FROM products WHERE id = $1', [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async create(product) {
        const client = await this.getClient();
        try {
            const result = await client.query('INSERT INTO products (name, price, category, description) VALUES ($1, $2, $3, $4) RETURNING *', [product.name, product.price, product.category, product.description]);
            return result.rows[0];
        }
        finally {
            this.releaseClient(client);
        }
    }
    async update(id, product) {
        const client = await this.getClient();
        try {
            const result = await client.query('UPDATE products SET name = $1, price = $2, category = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *', [product.name, product.price, product.category, product.description, id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async delete(id) {
        const client = await this.getClient();
        try {
            const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
            return result.rows.length > 0;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async getCount() {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT COUNT(*) as count FROM products');
            return parseInt(result.rows[0].count);
        }
        finally {
            this.releaseClient(client);
        }
    }
    async getProductImages(productId) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order ASC, created_at ASC', [productId]);
            return result.rows;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async getProductImagePaths(productId) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT image_url FROM product_images WHERE product_id = $1', [productId]);
            return result.rows.map(row => row.image_url);
        }
        finally {
            this.releaseClient(client);
        }
    }
    async addProductImage(productId, imageUrl, displayOrder, isThumbnail, altText) {
        const client = await this.getClient();
        try {
            const result = await client.query('INSERT INTO product_images (product_id, image_url, display_order, is_thumbnail, alt_text) VALUES ($1, $2, $3, $4, $5) RETURNING *', [productId, imageUrl, displayOrder, isThumbnail, altText]);
            return result.rows[0];
        }
        finally {
            this.releaseClient(client);
        }
    }
    async updateProductImage(imageId, productId, updates) {
        return await this.withTransaction(async (client) => {
            // If setting as thumbnail, remove thumbnail from other images
            if (updates.is_thumbnail === true) {
                await client.query('UPDATE product_images SET is_thumbnail = FALSE WHERE product_id = $1 AND id != $2', [productId, imageId]);
            }
            // Build update query dynamically
            const updateFields = [];
            const values = [];
            let valueIndex = 1;
            if (updates.is_thumbnail !== undefined) {
                updateFields.push(`is_thumbnail = $${valueIndex++}`);
                values.push(updates.is_thumbnail);
            }
            if (updates.display_order !== undefined) {
                updateFields.push(`display_order = $${valueIndex++}`);
                values.push(updates.display_order);
            }
            if (updates.alt_text !== undefined) {
                updateFields.push(`alt_text = $${valueIndex++}`);
                values.push(updates.alt_text);
            }
            if (updateFields.length === 0) {
                throw new Error('No updates provided');
            }
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(imageId, productId);
            const updateQuery = `
        UPDATE product_images 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex++} AND product_id = $${valueIndex++}
        RETURNING *
      `;
            const result = await client.query(updateQuery, values);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    async deleteProductImage(imageId, productId) {
        return await this.withTransaction(async (client) => {
            // Get image record
            const imageResult = await client.query('SELECT * FROM product_images WHERE id = $1 AND product_id = $2', [imageId, productId]);
            if (imageResult.rows.length === 0) {
                return null;
            }
            const image = imageResult.rows[0];
            // Delete from database
            await client.query('DELETE FROM product_images WHERE id = $1', [imageId]);
            // If this was the thumbnail, set the first remaining image as thumbnail
            if (image.is_thumbnail) {
                await client.query(`
          UPDATE product_images 
          SET is_thumbnail = TRUE 
          WHERE product_id = $1 
          AND id = (
            SELECT id FROM product_images 
            WHERE product_id = $1 
            ORDER BY display_order ASC, created_at ASC 
            LIMIT 1
          )
        `, [productId]);
            }
            return image;
        });
    }
    async getImageCountAndMaxOrder(productId) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT COUNT(*) as count, COALESCE(MAX(display_order), 0) as max_order FROM product_images WHERE product_id = $1', [productId]);
            return {
                count: parseInt(result.rows[0].count),
                maxOrder: parseInt(result.rows[0].max_order)
            };
        }
        finally {
            this.releaseClient(client);
        }
    }
    async hasThumbnail(productId) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT COUNT(*) as count FROM product_images WHERE product_id = $1 AND is_thumbnail = TRUE', [productId]);
            return parseInt(result.rows[0].count) > 0;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async findImageById(imageId, productId) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT * FROM product_images WHERE id = $1 AND product_id = $2', [imageId, productId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            this.releaseClient(client);
        }
    }
    async getThumbnailImage(productId) {
        const client = await this.getClient();
        try {
            const result = await client.query('SELECT * FROM product_images WHERE product_id = $1 AND is_thumbnail = TRUE', [productId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        finally {
            this.releaseClient(client);
        }
    }
}
