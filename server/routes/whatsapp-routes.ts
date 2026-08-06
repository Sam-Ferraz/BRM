import { Response, Router } from 'express'
import { WhatsAppService } from '../services/index.js'
import { WhatsAppProvider } from '../services/whatsapp-provider.js'
import { WhatsAppSessionRepository } from '../repositories/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/whatsapp/* — gerencia o vínculo entre usuário do BRM e número
 * WhatsApp. Cada usuário tem no máximo uma sessão (1:1).
 *
 * Todas as rotas exigem accountId no token (multi-tenancy) — o webhook
 * público fica noutro router (whatsapp-webhook-routes).
 *
 * Fluxo com Baileys:
 *   1. Frontend chama POST /api/whatsapp/start
 *   2. Backend abre o socket Baileys → Baileys emite QR Code
 *   3. Frontend faz polling em GET /api/whatsapp/state
 *   4. Usuário escaneia QR no celular
 *   5. Status passa para 'connected'; o provider já gravou o número na tabela
 *      whatsapp_sessions via WhatsAppSessionRepository.
 */
export function createWhatsAppRoutes(
  whatsappService: WhatsAppService,
  provider: WhatsAppProvider,
  sessionRepository: WhatsAppSessionRepository
): Router {
  const router = Router()

  router.get('/session', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const session = await whatsappService.getSession(accountId, userId)
      // Debug: exibe presença/ausência dos campos Cloud API sem vazar os valores.
      // Ajuda a diagnosticar quando o toast diz "conectado" mas o provider
      // acusa whatsapp_not_connected (indica que phone_number_id ou access_token
      // estão null no banco — geralmente porque foi conectado via Baileys).
      const debug = session
        ? {
            provider: (session as any).provider ?? null,
            status: (session as any).status ?? null,
            has_phone_number_id: !!(session as any).phone_number_id,
            has_access_token: !!(session as any).access_token,
            has_app_secret: !!(session as any).app_secret,
            has_verify_token: !!(session as any).verify_token,
          }
        : null
      res.json({ data: session, debug })
    } catch (error) {
      console.error('Error fetching whatsapp session:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/session', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const { phone_number, display_name } = req.body
      if (!phone_number || typeof phone_number !== 'string') {
        res.status(400).json({ error: 'phone_number is required' })
        return
      }
      const session = await whatsappService.connect(accountId, userId, phone_number, display_name ?? null)
      res.json({ data: session })
    } catch (error) {
      if (error instanceof Error && error.message === 'phone_number is required') {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error connecting whatsapp session:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/session', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      // Encerra também o socket Baileys (se existir) e apaga auth state em disco.
      await provider.stopSession(userId)
      const result = await whatsappService.disconnect(accountId, userId)
      res.json(result)
    } catch (error) {
      console.error('Error disconnecting whatsapp session:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ------------------- Pareamento via QR Code (Baileys) -------------------

  /**
   * Inicia a sessão do provedor (abre socket Baileys). Resposta imediata
   * com o estado atual; o QR aparecerá em GET /state assim que disponível.
   */
  router.post('/start', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const state = await provider.startSession(userId)
      res.json({ data: state })
    } catch (error) {
      console.error('Error starting whatsapp session:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * Estado atual da sessão (status + QR Code se aplicável). Frontend deve
   * fazer polling enquanto status !== 'connected'.
   */
  router.get('/state', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const state = provider.getSessionState(userId)
      res.json({ data: state })
    } catch (error) {
      console.error('Error fetching whatsapp state:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ------------------- Cloud API (BYOK) -----------------------------------

  /**
   * Cadastra/atualiza credenciais do WhatsApp Cloud API (Meta) para o
   * usuário logado. Validação básica de presença; a validade real é
   * confirmada na primeira chamada à Graph API.
   */
  router.post('/cloud-api/connect', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const userId = req.user!.userId
      const {
        phone_number,
        display_name,
        phone_number_id,
        access_token,
        app_secret,
        verify_token,
        business_account_id,
      } = req.body

      if (!phone_number || !phone_number_id || !access_token || !app_secret || !verify_token) {
        res.status(400).json({
          error: 'phone_number, phone_number_id, access_token, app_secret e verify_token são obrigatórios',
        })
        return
      }

      const session = await sessionRepository.upsertCloudApiCredentials({
        accountId,
        userId,
        phoneNumber: String(phone_number),
        displayName: display_name ?? null,
        phoneNumberId: String(phone_number_id),
        accessToken: String(access_token),
        appSecret: String(app_secret),
        verifyToken: String(verify_token),
        businessAccountId: business_account_id ? String(business_account_id) : null,
      })

      // Esconde o access_token e app_secret da resposta — UI só precisa saber
      // que está conectado, não os valores em si.
      res.json({
        data: {
          ...session,
          access_token: '****',
          app_secret: '****',
        },
      })
    } catch (error) {
      console.error('Error connecting cloud api:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
