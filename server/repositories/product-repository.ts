import { BaseRepository } from './base-repository.js'
import { Product, ProductImage, QueryFilters } from '../types/index.js'

export class ProductRepository extends BaseRepository {
  async findAll(filters: QueryFilters = {}): Promise<Product[]> {
    const client = await this.getClient()
    try {
      const { search, type, sortBy, sortOrder } = filters
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
      `
      const params: any[] = []
      let paramCount = 1

      if (search) {
        query += ` AND (p.name ILIKE $${paramCount} OR p.type ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }

      if (type && type !== 'All') {
        query += ` AND p.type = $${paramCount}`
        params.push(type)
        paramCount++
      }

      if (sortBy) {
        const validColumns = ['name', 'price', 'type']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY p.${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY p.name ASC'
      }

      const result = await client.query(query, params)
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async findById(id: number): Promise<Product | null> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT * FROM products WHERE id = $1', [id])
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'has_thumbnail'>): Promise<Product> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'INSERT INTO products (name, price, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [product.name, product.price, product.type, product.description]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async update(id: number, product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'has_thumbnail'>): Promise<Product | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'UPDATE products SET name = $1, price = $2, type = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        [product.name, product.price, product.type, product.description, id]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async delete(id: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id])
      return result.rows.length > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async getCount(): Promise<number> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM products')
      return parseInt(result.rows[0].count)
    } finally {
      this.releaseClient(client)
    }
  }

  async getProductImages(productId: number): Promise<ProductImage[]> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order ASC, created_at ASC',
        [productId]
      )
      return result.rows
    } finally {
      this.releaseClient(client)
    }
  }

  async getProductImagePaths(productId: number): Promise<string[]> {
    const client = await this.getClient()
    try {
      const result = await client.query('SELECT image_url FROM product_images WHERE product_id = $1', [productId])
      return result.rows.map(row => row.image_url)
    } finally {
      this.releaseClient(client)
    }
  }

  async addProductImage(
    productId: number,
    imageUrl: string,
    displayOrder: number,
    isThumbnail: boolean,
    altText: string
  ): Promise<ProductImage> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'INSERT INTO product_images (product_id, image_url, display_order, is_thumbnail, alt_text) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [productId, imageUrl, displayOrder, isThumbnail, altText]
      )
      return result.rows[0]
    } finally {
      this.releaseClient(client)
    }
  }

  async updateProductImage(
    imageId: number,
    productId: number,
    updates: Partial<Pick<ProductImage, 'is_thumbnail' | 'display_order' | 'alt_text'>>
  ): Promise<ProductImage | null> {
    return await this.withTransaction(async (client) => {
      // If setting as thumbnail, remove thumbnail from other images
      if (updates.is_thumbnail === true) {
        await client.query(
          'UPDATE product_images SET is_thumbnail = FALSE WHERE product_id = $1 AND id != $2',
          [productId, imageId]
        )
      }

      // Build update query dynamically
      const updateFields: string[] = []
      const values: any[] = []
      let valueIndex = 1

      if (updates.is_thumbnail !== undefined) {
        updateFields.push(`is_thumbnail = $${valueIndex++}`)
        values.push(updates.is_thumbnail)
      }

      if (updates.display_order !== undefined) {
        updateFields.push(`display_order = $${valueIndex++}`)
        values.push(updates.display_order)
      }

      if (updates.alt_text !== undefined) {
        updateFields.push(`alt_text = $${valueIndex++}`)
        values.push(updates.alt_text)
      }

      if (updateFields.length === 0) {
        throw new Error('No updates provided')
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(imageId, productId)

      const updateQuery = `
        UPDATE product_images 
        SET ${updateFields.join(', ')} 
        WHERE id = $${valueIndex++} AND product_id = $${valueIndex++}
        RETURNING *
      `

      const result = await client.query(updateQuery, values)
      return result.rows.length > 0 ? result.rows[0] : null
    })
  }

  async deleteProductImage(imageId: number, productId: number): Promise<ProductImage | null> {
    return await this.withTransaction(async (client) => {
      // Get image record
      const imageResult = await client.query(
        'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
        [imageId, productId]
      )

      if (imageResult.rows.length === 0) {
        return null
      }

      const image = imageResult.rows[0]

      // Delete from database
      await client.query('DELETE FROM product_images WHERE id = $1', [imageId])

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
        `, [productId])
      }

      return image
    })
  }

  async getImageCountAndMaxOrder(productId: number): Promise<{ count: number, maxOrder: number }> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count, COALESCE(MAX(display_order), 0) as max_order FROM product_images WHERE product_id = $1',
        [productId]
      )
      return {
        count: parseInt(result.rows[0].count),
        maxOrder: parseInt(result.rows[0].max_order)
      }
    } finally {
      this.releaseClient(client)
    }
  }

  async hasThumbnail(productId: number): Promise<boolean> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1 AND is_thumbnail = TRUE',
        [productId]
      )
      return parseInt(result.rows[0].count) > 0
    } finally {
      this.releaseClient(client)
    }
  }

  async findImageById(imageId: number, productId: number): Promise<ProductImage | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
        [imageId, productId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }

  async getThumbnailImage(productId: number): Promise<ProductImage | null> {
    const client = await this.getClient()
    try {
      const result = await client.query(
        'SELECT * FROM product_images WHERE product_id = $1 AND is_thumbnail = TRUE',
        [productId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } finally {
      this.releaseClient(client)
    }
  }
}
