import { Request, Response, Router } from 'express'
import { GoogleCalendarService } from '../services/google-calendar-service.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/google-calendar/* — integração unidirecional Google → BRM.
 *
 * Endpoints:
 *   GET    /status         → devolve { connected, email, last_sync_at } (auth)
 *   GET    /auth-url       → devolve URL do OAuth pro frontend redirecionar (auth)
 *   GET    /callback       → PÚBLICO (Google redireciona aqui com ?code&state)
 *   DELETE /disconnect     → revoga a conexão local (não revoga no Google) (auth)
 *
 * O callback não usa authenticateToken porque o Google redireciona o browser
 * do usuário — não há token JWT no header. A autenticidade + tenancy vem do
 * `state` (JWT assinado com JWT_SECRET) que contém userId + accountId.
 */
export function createGoogleCalendarRoutes(service: GoogleCalendarService): Router {
  const router = Router()

  // ----------- Status da conexão -----------
  router.get('/status', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const status = await service.getStatus(req.user!.accountId, req.user!.userId)
      res.json({ data: status })
    } catch (error) {
      console.error('Error getting Google Calendar status:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ----------- URL de autorização -----------
  router.get('/auth-url', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const url = service.buildAuthUrl(req.user!.accountId, req.user!.userId)
      res.json({ data: { url } })
    } catch (error) {
      console.error('Error building Google auth URL:', error)
      const message = error instanceof Error ? error.message : 'Erro interno'
      res.status(500).json({ error: message })
    }
  })

  // ----------- Callback do OAuth (público) -----------
  router.get('/callback', async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string | undefined
    const state = req.query.state as string | undefined
    const errorParam = req.query.error as string | undefined

    // Usuário negou consentimento
    if (errorParam) {
      res.redirect(`/settings?googleConnect=denied`)
      return
    }

    if (!code || !state) {
      res.status(400).send('Requisição inválida: code e state obrigatórios')
      return
    }

    const parsed = service.parseState(state)
    if (!parsed) {
      res.status(400).send('State inválido ou expirado. Refaça a conexão.')
      return
    }

    try {
      await service.handleOAuthCallback(code, parsed.accountId, parsed.userId)
      // Redireciona pro frontend confirmando sucesso — settings é onde fica o botão
      res.redirect(`/settings?googleConnect=success`)
    } catch (error) {
      console.error('Error handling Google OAuth callback:', error)
      const message = error instanceof Error ? error.message : 'Erro no callback'
      res.redirect(`/settings?googleConnect=error&msg=${encodeURIComponent(message)}`)
    }
  })

  // ----------- Desconectar -----------
  router.delete('/disconnect', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const ok = await service.disconnect(req.user!.accountId, req.user!.userId)
      res.json({ success: ok })
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
