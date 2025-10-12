import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number
    email: string
    role: string
  }
}

// Middleware to authenticate requests
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
  
  if (!token) {
    res.status(401).json({ error: 'Access token required' })
    return
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number
      email: string
      role: string
    }
    
    req.user = decoded
    next()
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' })
    return
  }
}

export type { AuthenticatedRequest }