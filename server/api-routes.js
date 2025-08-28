import pool from './database.js'
import { authenticateToken } from './auth.js'
import s3Service from './services/s3-service.js'
import { uploadSingle, uploadMultiple, handleUploadErrors } from './middleware/upload.js'

// Generic CRUD operations for database entities
export function createApiRoutes(app) {
  
  // Dashboard stats route
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      // Get counts for all entities
      const dealsQuery = 'SELECT COUNT(*) as count FROM deals'
      const clientsQuery = 'SELECT COUNT(*) as count FROM clients'
      const productsQuery = 'SELECT COUNT(*) as count FROM products'
      const appointmentsQuery = 'SELECT COUNT(*) as count FROM appointments'
      const salesAgendaQuery = 'SELECT COUNT(*) as count FROM sales_agenda'
      
      const [dealsResult, clientsResult, productsResult, appointmentsResult, salesAgendaResult] = await Promise.all([
        client.query(dealsQuery),
        client.query(clientsQuery),
        client.query(productsQuery),
        client.query(appointmentsQuery),
        client.query(salesAgendaQuery)
      ])
      
      res.json({
        totalDeals: parseInt(dealsResult.rows[0].count),
        totalClients: parseInt(clientsResult.rows[0].count),
        totalProducts: parseInt(productsResult.rows[0].count),
        totalAppointments: parseInt(appointmentsResult.rows[0].count),
        totalSalesAgenda: parseInt(salesAgendaResult.rows[0].count)
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })

  // Appointments analytics route - last 7 days answered vs not answered
  app.get('/api/appointments/analytics/last-7-days', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        appointments_data AS (
          SELECT 
            DATE(scheduled_datetime) as appointment_date,
            answered,
            COUNT(*) as count
          FROM appointments 
          WHERE DATE(scheduled_datetime) >= CURRENT_DATE - INTERVAL '6 days'
            AND DATE(scheduled_datetime) <= CURRENT_DATE
          GROUP BY DATE(scheduled_datetime), answered
        )
        SELECT 
          ds.date::text as date,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) as answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) as not_answered
        FROM date_series ds
        LEFT JOIN appointments_data ad ON ds.date = ad.appointment_date
        GROUP BY ds.date
        ORDER BY ds.date
      `
      
      const result = await client.query(query)
      res.json({ data: result.rows })
    } catch (error) {
      console.error('Error fetching appointments analytics:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })

  // Appointments analytics by type - last 7 days
  app.get('/api/appointments/analytics/by-type/last-7-days', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        appointment_types AS (
          SELECT DISTINCT type FROM appointments
        ),
        appointments_data AS (
          SELECT 
            DATE(scheduled_datetime) as appointment_date,
            type,
            answered,
            COUNT(*) as count
          FROM appointments 
          WHERE DATE(scheduled_datetime) >= CURRENT_DATE - INTERVAL '6 days'
            AND DATE(scheduled_datetime) <= CURRENT_DATE
          GROUP BY DATE(scheduled_datetime), type, answered
        )
        SELECT 
          ds.date::text as date,
          at.type,
          COALESCE(SUM(CASE WHEN ad.answered = true THEN ad.count ELSE 0 END), 0) as answered,
          COALESCE(SUM(CASE WHEN ad.answered = false THEN ad.count ELSE 0 END), 0) as not_answered
        FROM date_series ds
        CROSS JOIN appointment_types at
        LEFT JOIN appointments_data ad ON ds.date = ad.appointment_date AND at.type = ad.type
        GROUP BY ds.date, at.type
        ORDER BY at.type, ds.date
      `
      
      const result = await client.query(query)
      
      // Group results by type
      const groupedByType = {}
      result.rows.forEach(row => {
        if (!groupedByType[row.type]) {
          groupedByType[row.type] = []
        }
        groupedByType[row.type].push({
          date: row.date,
          answered: parseInt(row.answered),
          not_answered: parseInt(row.not_answered)
        })
      })
      
      res.json({ data: groupedByType })
    } catch (error) {
      console.error('Error fetching appointments analytics by type:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Deals routes
  app.get('/api/deals', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, status, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM deals WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (client ILIKE $${paramCount} OR value ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (status && status !== 'Todos') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['client', 'value', 'status', 'date']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY created_at DESC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching deals:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/deals', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { client: clientName, value, status, date, description } = req.body
      const result = await client.query(
        'INSERT INTO deals (client, value, status, date, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [clientName, value, status, date, description]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating deal:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/deals/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { client: clientName, value, status, date, description } = req.body
      const result = await client.query(
        'UPDATE deals SET client = $1, value = $2, status = $3, date = $4, description = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [clientName, value, status, date, description, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deal not found' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating deal:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/deals/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM deals WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deal not found' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting deal:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Clients routes
  app.get('/api/clients', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM clients WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR city ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['name', 'email', 'phone', 'city']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY name ASC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching clients:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/clients', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { name, email, phone, city, address, company, origin } = req.body
      const result = await client.query(
        'INSERT INTO clients (name, email, phone, city, address, company, origin) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, email, phone, city, address, company, origin]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating client:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/clients/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { name, email, phone, city, address, company, origin } = req.body
      const result = await client.query(
        'UPDATE clients SET name = $1, email = $2, phone = $3, city = $4, address = $5, company = $6, origin = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
        [name, email, phone, city, address, company, origin, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating client:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting client:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Products routes
  app.get('/api/products', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, category, stock, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM products WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (name ILIKE $${paramCount} OR category ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (category && category !== 'All') {
        query += ` AND category = $${paramCount}`
        params.push(category)
        paramCount++
      }
      
      if (stock) {
        switch (stock) {
          case 'In Stock':
            query += ` AND stock > 10`
            break
          case 'Low Stock':
            query += ` AND stock > 0 AND stock <= 10`
            break
          case 'Out of Stock':
            query += ` AND stock = 0`
            break
        }
      }
      
      if (sortBy) {
        const validColumns = ['name', 'price', 'category', 'stock']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY name ASC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching products:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/products', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { name, price, category, stock, description } = req.body
      const result = await client.query(
        'INSERT INTO products (name, price, category, stock, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, price, category, stock, description]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating product:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/products/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { name, price, category, stock, description } = req.body
      const result = await client.query(
        'UPDATE products SET name = $1, price = $2, category = $3, stock = $4, description = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [name, price, category, stock, description, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating product:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      
      // Check if product exists
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [id])
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' })
      }
      
      // Get all product images before deletion
      const imagesResult = await client.query('SELECT image_url FROM product_images WHERE product_id = $1', [id])
      const imagePaths = imagesResult.rows.map(row => row.image_url)
      
      // Delete from database (CASCADE will handle product_images)
      const deleteResult = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id])
      
      // Clean up S3 images if they exist
      if (imagePaths.length > 0) {
        try {
          await s3Service.deleteProductFiles(imagePaths)
        } catch (s3Error) {
          console.error('Error deleting images from S3:', s3Error)
          // Don't fail the product deletion if image cleanup fails
        }
      }
      
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting product:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })

  // Product Images routes (Multiple images support)
  
  // Get all images for a product
  app.get('/api/products/:id/images', async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      
      // Check if product exists
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [id])
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' })
      }
      
      // Get all images for the product
      const imagesResult = await client.query(
        'SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order ASC, created_at ASC',
        [id]
      )
      
      res.json({ images: imagesResult.rows })
    } catch (error) {
      console.error('Error getting product images:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Upload new image(s) for a product
  app.post('/api/products/:id/images', authenticateToken, uploadSingle, handleUploadErrors, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { alt_text } = req.body
      
      // Check if product exists
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [id])
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' })
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' })
      }
      
      // Get current image count and check if there's a thumbnail
      const imageCountResult = await client.query(
        'SELECT COUNT(*) as count, COALESCE(MAX(display_order), 0) as max_order FROM product_images WHERE product_id = $1',
        [id]
      )
      const thumbnailResult = await client.query(
        'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1 AND is_thumbnail = TRUE',
        [id]
      )
      
      const currentCount = parseInt(imageCountResult.rows[0].count)
      const maxOrder = parseInt(imageCountResult.rows[0].max_order)
      const hasThumbnail = parseInt(thumbnailResult.rows[0].count) > 0
      
      // Upload new image to S3
      const filePath = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        parseInt(id)
      )
      
      // Insert new image record
      // Set as thumbnail if it's the first image
      const isFirstImage = !hasThumbnail
      const displayOrder = maxOrder + 1
      
      const insertResult = await client.query(
        'INSERT INTO product_images (product_id, image_url, display_order, is_thumbnail, alt_text) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, filePath, displayOrder, isFirstImage, alt_text || req.file.originalname]
      )
      
      res.json({ 
        success: true,
        image: insertResult.rows[0],
        message: 'Image uploaded successfully'
      })
    } catch (error) {
      console.error('Error uploading product image:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Upload multiple images for a product
  app.post('/api/products/:id/images/bulk', authenticateToken, uploadMultiple, handleUploadErrors, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      
      // Check if product exists
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [id])
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' })
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No image files provided' })
      }
      
      // Get current image count and max order
      const imageCountResult = await client.query(
        'SELECT COUNT(*) as count, COALESCE(MAX(display_order), 0) as max_order FROM product_images WHERE product_id = $1',
        [id]
      )
      const thumbnailResult = await client.query(
        'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1 AND is_thumbnail = TRUE',
        [id]
      )
      
      const currentCount = parseInt(imageCountResult.rows[0].count)
      let maxOrder = parseInt(imageCountResult.rows[0].max_order)
      const hasThumbnail = parseInt(thumbnailResult.rows[0].count) > 0
      
      const uploadedImages = []
      const errors = []
      
      // Process each file
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        try {
          // Upload to S3
          const filePath = await s3Service.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            parseInt(id)
          )
          
          // Insert into database
          const isFirstImage = !hasThumbnail && uploadedImages.length === 0
          const displayOrder = maxOrder + i + 1
          
          const insertResult = await client.query(
            'INSERT INTO product_images (product_id, image_url, display_order, is_thumbnail, alt_text) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, filePath, displayOrder, isFirstImage, file.originalname]
          )
          
          uploadedImages.push(insertResult.rows[0])
        } catch (error) {
          console.error(`Error uploading file ${file.originalname}:`, error)
          errors.push({
            filename: file.originalname,
            error: error.message
          })
        }
      }
      
      res.json({
        success: true,
        uploaded: uploadedImages.length,
        total: req.files.length,
        images: uploadedImages,
        errors: errors,
        message: `Successfully uploaded ${uploadedImages.length} out of ${req.files.length} images`
      })
    } catch (error) {
      console.error('Error uploading product images:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Get individual image file
  app.get('/api/products/:id/images/:imageId', async (req, res) => {
    const client = await pool.connect()
    try {
      const { id, imageId } = req.params
      
      // Get image record
      const result = await client.query(
        'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
        [imageId, id]
      )
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Image not found' })
      }
      
      const image = result.rows[0]
      
      // Stream image from S3
      const fileData = await s3Service.getFile(image.image_url)
      
      // Set appropriate headers
      res.set({
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.contentLength,
        'Cache-Control': 'public, max-age=86400',
        'Last-Modified': fileData.lastModified
      })
      
      // Stream the file
      fileData.body.pipe(res)
    } catch (error) {
      console.error('Error getting product image:', error)
      if (error.message === 'File not found') {
        return res.status(404).json({ error: 'Image not found' })
      }
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Update image (set as thumbnail, change order, update alt text)
  app.put('/api/products/:id/images/:imageId', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id, imageId } = req.params
      const { is_thumbnail, display_order, alt_text } = req.body
      
      await client.query('BEGIN')
      
      // Check if image exists
      const imageResult = await client.query(
        'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
        [imageId, id]
      )
      
      if (imageResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Image not found' })
      }
      
      // If setting as thumbnail, remove thumbnail from other images
      if (is_thumbnail === true) {
        await client.query(
          'UPDATE product_images SET is_thumbnail = FALSE WHERE product_id = $1 AND id != $2',
          [id, imageId]
        )
      }
      
      // Build update query dynamically
      const updates = []
      const values = []
      let valueIndex = 1
      
      if (is_thumbnail !== undefined) {
        updates.push(`is_thumbnail = $${valueIndex++}`)
        values.push(is_thumbnail)
      }
      
      if (display_order !== undefined) {
        updates.push(`display_order = $${valueIndex++}`)
        values.push(display_order)
      }
      
      if (alt_text !== undefined) {
        updates.push(`alt_text = $${valueIndex++}`)
        values.push(alt_text)
      }
      
      if (updates.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'No updates provided' })
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(imageId, id)
      
      const updateQuery = `
        UPDATE product_images 
        SET ${updates.join(', ')} 
        WHERE id = $${valueIndex++} AND product_id = $${valueIndex++}
        RETURNING *
      `
      
      const updateResult = await client.query(updateQuery, values)
      
      await client.query('COMMIT')
      
      res.json({
        success: true,
        image: updateResult.rows[0],
        message: 'Image updated successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error updating product image:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Delete individual image
  app.delete('/api/products/:id/images/:imageId', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id, imageId } = req.params
      
      await client.query('BEGIN')
      
      // Get image record
      const imageResult = await client.query(
        'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
        [imageId, id]
      )
      
      if (imageResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'Image not found' })
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
        `, [id])
      }
      
      await client.query('COMMIT')
      
      // Delete from S3
      try {
        await s3Service.deleteFile(image.image_url)
      } catch (s3Error) {
        console.error('Error deleting image from S3:', s3Error)
        // Don't fail the deletion if S3 cleanup fails
      }
      
      res.json({
        success: true,
        message: 'Image deleted successfully'
      })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error deleting product image:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Get product thumbnail URL (for quick access)
  app.get('/api/products/:id/thumbnail', async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      
      // Get thumbnail image
      const result = await client.query(
        'SELECT * FROM product_images WHERE product_id = $1 AND is_thumbnail = TRUE',
        [id]
      )
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No thumbnail found' })
      }
      
      const image = result.rows[0]
      
      // Stream image from S3
      const fileData = await s3Service.getFile(image.image_url)
      
      // Set appropriate headers
      res.set({
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.contentLength,
        'Cache-Control': 'public, max-age=86400',
        'Last-Modified': fileData.lastModified
      })
      
      // Stream the file
      fileData.body.pipe(res)
    } catch (error) {
      console.error('Error getting product thumbnail:', error)
      if (error.message === 'File not found') {
        return res.status(404).json({ error: 'Thumbnail not found' })
      }
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })

  // Appointments routes
  app.get('/api/appointments', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const { search, status, type, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM appointments WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (client ILIKE $${paramCount} OR type ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (status && status !== 'All') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }
      
      if (type && type !== 'All') {
        query += ` AND type = $${paramCount}`
        params.push(type)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['client', 'type', 'status', 'scheduled_datetime']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY scheduled_datetime DESC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching appointments:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  // Helper function to convert Brazilian date format (DD/MM/YYYY) to PostgreSQL format (YYYY-MM-DD)
  function convertBrazilianDate(dateStr) {
    if (!dateStr) return null
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    // Convert DD/MM/YYYY to YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/')
      // Ensure we have a valid date string that PostgreSQL will interpret correctly
      const paddedDay = day.padStart(2, '0')
      const paddedMonth = month.padStart(2, '0')
      return `${year}-${paddedMonth}-${paddedDay}`
    }
    return dateStr
  }

  app.post('/api/appointments', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { client: clientName, type, status, scheduled_datetime, description, answered } = req.body
      
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'INSERT INTO appointments (client, type, status, scheduled_datetime, description, answered) VALUES ($1, $2, $3, $4::timestamp, $5, $6) RETURNING *',
        [clientName, type, status, scheduled_datetime, description, answered]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating appointment:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { client: clientName, type, status, scheduled_datetime, description, answered } = req.body
      
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'UPDATE appointments SET client = $1, type = $2, status = $3, scheduled_datetime = $4::timestamp, description = $5, answered = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
        [clientName, type, status, scheduled_datetime, description, answered, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating appointment:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting appointment:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })



  // Sales Agenda routes
  app.get('/api/sales-agenda', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, status, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM sales_agenda WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (title ILIKE $${paramCount} OR product_name ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (status && status !== 'All') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['title', 'client', 'product_name', 'value', 'date', 'status']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY date DESC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching sales agenda:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/sales-agenda', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { title, product_name, product_id, status } = req.body
      
      // Validate required fields
      if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' })
      }
      
      // Set current date automatically
      const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      
      const result = await client.query(
        'INSERT INTO sales_agenda (title, product_name, product_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [title, product_name, product_id || null, currentDate, status]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating sales agenda:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/sales-agenda/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { title, product_name, product_id, status } = req.body
      
      // Validate required fields
      if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' })
      }
      
      // Don't update the date - it remains as originally created
      const result = await client.query(
        'UPDATE sales_agenda SET title = $1, product_name = $2, product_id = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        [title, product_name, product_id || null, status, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Sales agenda not found' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating sales agenda:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/sales-agenda/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM sales_agenda WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Sales agenda not found' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting sales agenda:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      client.release()
    }
  })
}