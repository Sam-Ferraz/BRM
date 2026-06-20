import { Response, Router } from 'express'
import { WhatsAppService } from '../services/index.js'
import { WhatsAppProvider } from '../services/whatsapp-provider.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/whatsapp/* — gerencia o vínculo entre usuário do BRM e número
 * WhatsApp. Cada usuário tem no máximo uma sessão (1:1).
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
  provider: WhatsAppProvider
): Router {
  const router = Router()

  router.get('/session', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const session = await whatsappService.getSession(userId)
      res.json({ data: session })
    } catch (error) {
      console.error('Error fetching whatsapp session:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/session', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const { phone_number, display_name } = req.body
      if (!phone_number || typeof phone_number !== 'string') {
        res.status(400).json({ error: 'phone_number is required' })
        return
      }
      const session = await whatsappService.connect(userId, phone_number, display_name ?? null)
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

  router.delete('/session', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      // Encerra também o socket Baileys (se existir) e apaga auth state em disco.
      await provider.stopSession(userId)
      const result = await whatsappService.disconnect(userId)
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
  router.post('/start', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  router.get('/state', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId
      const state = provider.getSessionState(userId)
      res.json({ data: state })
    } catch (error) {
      console.error('Error fetching whatsapp state:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
