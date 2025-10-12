import { Request, Response, Router } from 'express'
import { AuthService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

export function createAuthRoutes(authService: AuthService): Router {
  const router = Router()

  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body
      
      if (!email || !password) {
        res.status(200).json({ 
          success: false, 
          error: 'Email e senha são obrigatórios' 
        })
        return
      }
      
      const result = await authService.loginUser(email, password)
      
      if (!result.success) {
        res.status(200).json({ 
          success: false, 
          error: result.error 
        })
        return
      }
      
      res.status(200).json({
        success: true,
        token: result.token,
        user: result.user
      })
    } catch (error) {
      console.error('Login endpoint error:', error)
      res.status(200).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      })
    }
  })

  router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role } = req.body
      
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
        return
      }
      
      const result = await authService.registerUser(name, email, password, role)
      
      if (!result.success) {
        res.status(400).json({ error: result.error })
        return
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

  router.get('/verify', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
    res.json({
      success: true,
      user: req.user
    })
  })

  router.post('/logout', (req: Request, res: Response): void => {
    // In a stateless JWT system, logout is handled client-side by removing the token
    res.json({ success: true, message: 'Logout realizado com sucesso' })
  })

  return router
}