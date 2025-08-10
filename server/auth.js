import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pool from './database.js'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Generate JWT token
export function generateToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Middleware to authenticate requests
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }
  
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
  
  req.user = decoded
  next()
}

// Login function
export async function loginUser(email, password) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(
      'SELECT id, username, nome, email, password_hash FROM users WHERE email = $1',
      [email]
    )
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Usuário não encontrado' }
    }
    
    const user = result.rows[0]
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    
    if (!isPasswordValid) {
      return { success: false, error: 'Senha incorreta' }
    }
    
    const role = user.username === 'admin' ? 'admin' : 'user' // Determine role based on username
    const token = generateToken(user.id, user.email, role)
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.nome || user.username,
        email: user.email,
        role: role
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Erro interno do servidor' }
  } finally {
    client.release()
  }
}

// Register function
export async function registerUser(name, email, password, role = 'user') {
  const client = await pool.connect()
  
  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )
    
    if (existingUser.rows.length > 0) {
      return { success: false, error: 'Usuário já existe' }
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)
    
    // Generate username from email
    const username = email.split('@')[0]
    
    // Insert new user
    const result = await client.query(
      `INSERT INTO users (username, nome, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, nome, email`,
      [username, name, email, passwordHash]
    )
    
    const user = result.rows[0]
    const token = generateToken(user.id, user.email, role)
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.nome || user.username,
        email: user.email,
        role: role
      }
    }
  } catch (error) {
    console.error('Register error:', error)
    return { success: false, error: 'Erro interno do servidor' }
  } finally {
    client.release()
  }
}