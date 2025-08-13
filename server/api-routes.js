import pool from './database.js'
import { authenticateToken } from './auth.js'

// Generic CRUD operations for database entities
export function createApiRoutes(app) {
  
  // Negócios routes
  app.get('/api/negocios', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, status, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM negocios WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (cliente ILIKE $${paramCount} OR valor ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (status && status !== 'Todos') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['cliente', 'valor', 'status', 'data']
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
      console.error('Error fetching negocios:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/negocios', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { cliente, valor, status, data, descricao } = req.body
      const result = await client.query(
        'INSERT INTO negocios (cliente, valor, status, data, descricao) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [cliente, valor, status, data, descricao]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating negocio:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/negocios/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { cliente, valor, status, data, descricao } = req.body
      const result = await client.query(
        'UPDATE negocios SET cliente = $1, valor = $2, status = $3, data = $4, descricao = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [cliente, valor, status, data, descricao, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Negócio não encontrado' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating negocio:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/negocios/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM negocios WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Negócio não encontrado' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting negocio:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  // Clientes routes
  app.get('/api/clientes', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM clientes WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (nome ILIKE $${paramCount} OR email ILIKE $${paramCount} OR cidade ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['nome', 'email', 'telefone', 'cidade']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY nome ASC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching clientes:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/clientes', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { nome, email, telefone, cidade, endereco, empresa } = req.body
      const result = await client.query(
        'INSERT INTO clientes (nome, email, telefone, cidade, endereco, empresa) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [nome, email, telefone, cidade, endereco, empresa]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating cliente:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/clientes/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { nome, email, telefone, cidade, endereco, empresa } = req.body
      const result = await client.query(
        'UPDATE clientes SET nome = $1, email = $2, telefone = $3, cidade = $4, endereco = $5, empresa = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
        [nome, email, telefone, cidade, endereco, empresa, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating cliente:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/clientes/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting cliente:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  // Produtos routes
  app.get('/api/produtos', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, categoria, estoque, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM produtos WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (nome ILIKE $${paramCount} OR categoria ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (categoria && categoria !== 'Todos') {
        query += ` AND categoria = $${paramCount}`
        params.push(categoria)
        paramCount++
      }
      
      if (estoque) {
        switch (estoque) {
          case 'Em Estoque':
            query += ` AND estoque > 10`
            break
          case 'Baixo Estoque':
            query += ` AND estoque > 0 AND estoque <= 10`
            break
          case 'Sem Estoque':
            query += ` AND estoque = 0`
            break
        }
      }
      
      if (sortBy) {
        const validColumns = ['nome', 'preco', 'categoria', 'estoque']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY nome ASC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching produtos:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/produtos', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { nome, preco, categoria, estoque, descricao } = req.body
      const result = await client.query(
        'INSERT INTO produtos (nome, preco, categoria, estoque, descricao) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [nome, preco, categoria, estoque, descricao]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating produto:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/produtos/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { nome, preco, categoria, estoque, descricao } = req.body
      const result = await client.query(
        'UPDATE produtos SET nome = $1, preco = $2, categoria = $3, estoque = $4, descricao = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [nome, preco, categoria, estoque, descricao, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating produto:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/produtos/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting produto:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })

  // Atendimentos routes
  app.get('/api/atendimentos', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      
      const { search, status, tipo, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM atendimentos WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (cliente ILIKE $${paramCount} OR tipo ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (status && status !== 'Todos') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }
      
      if (tipo && tipo !== 'Todos') {
        query += ` AND tipo = $${paramCount}`
        params.push(tipo)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['cliente', 'tipo', 'status', 'data', 'hora']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY data DESC, hora DESC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching atendimentos:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
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

  app.post('/api/atendimentos', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { cliente, tipo, status, data, hora, descricao } = req.body
      const convertedDate = convertBrazilianDate(data)
      
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'INSERT INTO atendimentos (cliente, tipo, status, data, hora, descricao) VALUES ($1, $2, $3, $4::date, $5, $6) RETURNING *',
        [cliente, tipo, status, convertedDate, hora, descricao]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating atendimento:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/atendimentos/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { cliente, tipo, status, data, hora, descricao } = req.body
      const convertedDate = convertBrazilianDate(data)
      
      // Ensure UTC timezone for this session
      await client.query('SET TIMEZONE = \'UTC\'')
      const result = await client.query(
        'UPDATE atendimentos SET cliente = $1, tipo = $2, status = $3, data = $4::date, hora = $5, descricao = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
        [cliente, tipo, status, convertedDate, hora, descricao, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Atendimento não encontrado' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating atendimento:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/atendimentos/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM atendimentos WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Atendimento não encontrado' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting atendimento:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })

  // Pauta Vendas routes
  app.get('/api/pauta-vendas', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { search, status, sortBy, sortOrder } = req.query
      let query = 'SELECT * FROM pauta_vendas WHERE 1=1'
      let params = []
      let paramCount = 1
      
      if (search) {
        query += ` AND (titulo ILIKE $${paramCount} OR cliente ILIKE $${paramCount})`
        params.push(`%${search}%`)
        paramCount++
      }
      
      if (status && status !== 'Todos') {
        query += ` AND status = $${paramCount}`
        params.push(status)
        paramCount++
      }
      
      if (sortBy) {
        const validColumns = ['titulo', 'cliente', 'valor', 'data', 'status']
        if (validColumns.includes(sortBy)) {
          const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
          query += ` ORDER BY ${sortBy} ${order}`
        }
      } else {
        query += ' ORDER BY data DESC'
      }
      
      const result = await client.query(query, params)
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching pauta vendas:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.post('/api/pauta-vendas', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { titulo, cliente, valor, data, status } = req.body
      const result = await client.query(
        'INSERT INTO pauta_vendas (titulo, cliente, valor, data, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [titulo, cliente, valor, data, status]
      )
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error creating pauta venda:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.put('/api/pauta-vendas/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const { titulo, cliente, valor, data, status } = req.body
      const result = await client.query(
        'UPDATE pauta_vendas SET titulo = $1, cliente = $2, valor = $3, data = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [titulo, cliente, valor, data, status, id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pauta não encontrada' })
      }
      res.json(result.rows[0])
    } catch (error) {
      console.error('Error updating pauta venda:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.delete('/api/pauta-vendas/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const { id } = req.params
      const result = await client.query('DELETE FROM pauta_vendas WHERE id = $1 RETURNING *', [id])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pauta não encontrada' })
      }
      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting pauta venda:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
}