import { Router, Response } from 'express'
import { AccountService } from '../services/account-service.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * Rotas de account:
 *  - GET /me      → retorna a account do usuário logado (usado pelo frontend
 *                   pra hidratar tema/branding/features na boot)
 *  - PATCH /me/config → admin da account atualiza custom_config dela
 *
 * Rotas de super-admin (isolado — só admin com role='admin' + account_id=1):
 *  - GET /       → lista todas as accounts (visão global)
 *  - POST /      → cria uma nova account + user admin (onboarding manual)
 *  - PATCH /:id  → atualiza nome/plano/status de qualquer account
 */
export function createAccountRoutes(service: AccountService): Router {
  const router = Router()

  // --------------------------------------------------------------------------
  // Endpoints self-service (qualquer user autenticado)
  // --------------------------------------------------------------------------

  router.get('/me', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const account = await service.getById(req.user!.accountId)
      if (!account) {
        res.status(404).json({ error: 'Account não encontrada' })
        return
      }
      res.json({ data: account })
    } catch (err) {
      console.error('Error fetching current account:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.patch('/me/config', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Apenas admin pode editar configuração da conta' })
        return
      }
      const config = req.body?.custom_config
      if (!config || typeof config !== 'object') {
        res.status(400).json({ error: 'custom_config é obrigatório e deve ser objeto' })
        return
      }
      const account = await service.updateCustomConfig(req.user!.accountId, config)
      res.json({ data: account })
    } catch (err) {
      console.error('Error updating account config:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // --------------------------------------------------------------------------
  // Endpoints super-admin (só user da account #1 "BRM Demo" com role admin)
  // Isso permite VOCÊ (Sam) gerenciar accounts de clientes.
  // --------------------------------------------------------------------------

  function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: () => void): void {
    if (req.user?.accountId !== 1 || req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Super-admin required' })
      return
    }
    next()
  }

  router.get('/', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const accounts = await service.listAll()
      res.json({ data: accounts })
    } catch (err) {
      console.error('Error listing accounts:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }))

  // Diagnostico de config do sistema de email (super-admin). Retorna
  // has_api_key/from/app_url pra confirmar se o servidor esta configurado
  // corretamente pra mandar email. Nao expoe secrets.
  router.get('/email-diagnostics', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const diag = service.getEmailDiagnostics()
      res.json({ data: diag })
    } catch (err) {
      console.error('Error fetching email diagnostics:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }))

  router.post('/', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const result = await service.provisionNewAccount(req.body)
      res.status(201).json({ data: result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar account'
      console.error('Error provisioning account:', err)
      res.status(400).json({ error: msg })
    }
  }))

  // Reenvia email de setup pra user que ainda não definiu senha.
  // Body: { user_id: number }. Só super-admin usa.
  router.post('/resend-setup', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const userId = parseInt(req.body?.user_id, 10)
      if (!Number.isFinite(userId)) {
        res.status(400).json({ error: 'user_id é obrigatório' })
        return
      }
      const result = await service.resendSetupEmail(userId)
      res.json({ data: result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao reenviar email'
      console.error('Error resending setup email:', err)
      res.status(400).json({ error: msg })
    }
  }))

  router.patch('/:id', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const id = parseInt(req.params.id, 10)
      const account = await service.update(id, req.body)
      if (!account) {
        res.status(404).json({ error: 'Account não encontrada' })
        return
      }
      res.json({ data: account })
    } catch (err) {
      console.error('Error updating account:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }))

  // Exclusao IRREVERSIVEL (super-admin). Bloqueia account #1 (BRM Demo).
  router.delete('/:id', authenticateToken, requireAccount, (req: AuthenticatedRequest, res: Response) => requireSuperAdmin(req, res, async () => {
    try {
      const id = parseInt(req.params.id, 10)
      if (id === 1) {
        res.status(403).json({ error: 'Nao e permitido excluir a account #1 (BRM Demo)' })
        return
      }
      const result = await service.deleteAccount(id)
      res.json({ data: result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir account'
      console.error('Error deleting account:', err)
      res.status(msg.includes('nao encontrada') ? 404 : 400).json({ error: msg })
    }
  }))

  return router
}
