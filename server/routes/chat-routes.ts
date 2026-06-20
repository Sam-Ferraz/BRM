import { Response, Router } from 'express'
import { ChatService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/chat/* — endpoints de conversas e mensagens.
 *
 * Visão admin: vê todas as conversas (sem filtro por owner).
 * Visão corretor: apenas as suas. A regra mora no ChatService.
 */
export function createChatRoutes(chatService: ChatService): Router {
  const router = Router()

  // Lista de conversas (com último preview já enriquecido)
  router.get('/conversations', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const viewer = { userId: req.user!.userId, role: req.user!.role }
      const result = await chatService.listConversations(viewer)
      res.json(result)
    } catch (error) {
      console.error('Error listing conversations:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Detalhe + histórico de mensagens (também marca como lido)
  router.get('/conversations/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const viewer = { userId: req.user!.userId, role: req.user!.role }
      const result = await chatService.getConversation(id, viewer)
      res.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({ error: 'Conversation not found' })
        return
      }
      if (error instanceof Error && error.message === 'forbidden') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      console.error('Error fetching conversation:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Inicia uma nova conversa (ou reutiliza existente para o mesmo contato)
  // e já envia a primeira mensagem.
  router.post('/conversations', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const viewer = { userId: req.user!.userId, role: req.user!.role }
      const { contact_phone, contact_name, message } = req.body
      const result = await chatService.startConversation(viewer, contact_phone, contact_name ?? null, message)
      res.json(result)
    } catch (error) {
      if (error instanceof Error && ['contact_phone is required', 'message is required'].includes(error.message)) {
        res.status(400).json({ error: error.message })
        return
      }
      if (error instanceof Error && error.message === 'whatsapp_not_connected') {
        res.status(409).json({ error: 'whatsapp_not_connected' })
        return
      }
      console.error('Error starting conversation:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Envia mensagem em conversa existente
  router.post('/conversations/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const viewer = { userId: req.user!.userId, role: req.user!.role }
      const { content } = req.body
      const message = await chatService.sendMessage(id, viewer, content)
      res.json({ data: message })
    } catch (error) {
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({ error: 'Conversation not found' })
        return
      }
      if (error instanceof Error && error.message === 'forbidden') {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      if (error instanceof Error && error.message === 'message is required') {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error sending message:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Endpoint de simulação — recebe uma mensagem entrante como se fosse o
  // webhook do provedor real. Útil para teste local enquanto não há provider.
  // Em produção este endpoint seria substituído pelo handler do webhook.
  router.post('/inbound', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const viewer = req.user!
      const {
        owner_user_id,
        from_phone,
        from_name,
        content,
        provider_message_id,
      } = req.body

      // Admin pode simular entrada para qualquer dono; corretor só para si mesmo.
      const ownerUserId =
        viewer.role === 'admin' && typeof owner_user_id === 'number'
          ? owner_user_id
          : viewer.userId

      const message = await chatService.receiveMessage({
        ownerUserId,
        fromPhone: from_phone,
        fromName: from_name ?? null,
        content,
        providerMessageId: provider_message_id ?? null,
      })
      res.json({ data: message })
    } catch (error) {
      if (error instanceof Error && error.message === 'content is required') {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Error receiving inbound message:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
