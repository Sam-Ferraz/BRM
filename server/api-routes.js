import pool from './database.js'
import { authenticateToken } from './auth.js'

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
      const { name, email, phone, city, address, company } = req.body
      const result = await client.query(
        'INSERT INTO clients (name, email, phone, city, address, company) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, email, phone, city, address, company]
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
      const { name, email, phone, city, address, company } = req.body
      const result = await client.query(
        'UPDATE clients SET name = $1, email = $2, phone = $3, city = $4, address = $5, company = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
        [name, email, phone, city, address, company, id]
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
      const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting product:', error)
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
      const { client: clientName, type, status, scheduled_datetime, description } = req.body
      
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'INSERT INTO appointments (client, type, status, scheduled_datetime, description) VALUES ($1, $2, $3, $4::timestamp, $5) RETURNING *',
        [clientName, type, status, scheduled_datetime, description]
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
      const { client: clientName, type, status, scheduled_datetime, description } = req.body
      
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'UPDATE appointments SET client = $1, type = $2, status = $3, scheduled_datetime = $4::timestamp, description = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [clientName, type, status, scheduled_datetime, description, id]
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
      const { title, product_name, product_id, date, status } = req.body
      
      // Validate required fields
      if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' })
      }
      
      const result = await client.query(
        'INSERT INTO sales_agenda (title, product_name, product_id, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [title, product_name, product_id || null, date, status]
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
      const { title, product_name, product_id, date, status } = req.body
      
      // Validate required fields
      if (!product_name) {
        return res.status(400).json({ error: 'Product name is required' })
      }
      
      const result = await client.query(
        'UPDATE sales_agenda SET title = $1, product_name = $2, product_id = $3, date = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [title, product_name, product_id || null, date, status, id]
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