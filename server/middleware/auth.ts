import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number
    email: string
    role: string
    accountId: number
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
      accountId?: number
    }

    // Multi-tenancy: rejeita tokens antigos que não têm accountId no payload
    // (emitidos antes da migração). Força re-login pra obter token novo.
    if (!decoded.accountId) {
      res.status(401).json({ error: 'Token obsoleto — faça login novamente' })
      return
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      accountId: decoded.accountId
    }
    next()
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' })
    return
  }
}

/**
 * Middleware que garante que o request tem accountId. Aplicado logo depois
 * de authenticateToken em rotas que retornam/mutam dados do cliente.
 *
 * Uso:
 *   router.get('/deals', authenticateToken, requireAccount, handler)
 *
 * Em teoria authenticateToken já garante isso, mas requireAccount torna
 * a intenção explícita e captura qualquer regressão.
 */
export function requireAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.accountId) {
    res.status(403).json({ error: 'Account context required' })
    return
  }
  next()
}

export type { AuthenticatedRequest }
