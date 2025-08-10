import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { loginUser, registerUser, authenticateToken } from './auth.js'
import { createApiRoutes } from './api-routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }
    
    const result = await loginUser(email, password)
    
    if (!result.success) {
      return res.status(401).json({ error: result.error })
    }
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    })
  } catch (error) {
    console.error('Login endpoint error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
    }
    
    const result = await registerUser(name, email, password, role)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    })
  } catch (error) {
    console.error('Register endpoint error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  })
})

app.post('/api/auth/logout', (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  res.json({ success: true, message: 'Logout realizado com sucesso' })
})

// API routes for business entities
createApiRoutes(app)

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 API available at http://localhost:${PORT}/api`)
  console.log(`🔐 Auth endpoints:`)
  console.log(`   POST /api/auth/login`)
  console.log(`   POST /api/auth/register`)
  console.log(`   GET /api/auth/verify`)
  console.log(`   POST /api/auth/logout`)
})