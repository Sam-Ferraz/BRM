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
  
  // Similar routes for produtos, atendimentos, pauta_vendas...
  // For brevity, I'll add just the get endpoints for the others
  
  app.get('/api/produtos', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT * FROM produtos ORDER BY nome ASC')
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching produtos:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.get('/api/atendimentos', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT * FROM atendimentos ORDER BY data DESC, hora DESC')
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching atendimentos:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
  
  app.get('/api/pauta-vendas', authenticateToken, async (req, res) => {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT * FROM pauta_vendas ORDER BY data DESC')
      res.json({ data: result.rows, total: result.rows.length })
    } catch (error) {
      console.error('Error fetching pauta vendas:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    } finally {
      client.release()
    }
  })
}