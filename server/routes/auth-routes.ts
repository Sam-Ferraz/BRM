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

  // POST /register foi REMOVIDO em 2026-07-27 por questão de segurança.
  //
  // Antes: qualquer pessoa na internet criava conta como 'user' anonimamente.
  // Agora: criação de usuário passa exclusivamente por /api/user-mgmt/users
  // (gated por role admin). Isso mantém o CRM fechado — só admin cadastra
  // corretor/gerente/etc.
  //
  // Se um dia precisarmos de signup público (ex: onboarding de conta trial),
  // essa rota vira POST /api/accounts/signup e cria também a organization,
  // não só o user. Não reabrir esta rota como estava.

  router.get('/users', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Multi-tenancy: só lista users da account do requester
      const users = await authService.listUsers(req.user!.accountId)
      res.json({ success: true, users })
    } catch (error) {
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