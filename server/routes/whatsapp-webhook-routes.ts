import { Request, Response, Router } from 'express'
import crypto from 'crypto'
import { WhatsAppSessionRepository } from '../repositories/index.js'
import { ChatService } from '../services/chat-service.js'

// Buffer em memoria com as ultimas 20 tentativas de webhook.
// Zera a cada restart do processo. So pra debug — nao persiste.
const webhookLog: Array<{
  at: string
  outcome: string
  phone_number_id?: string
  message_count?: number
  signature_valid?: boolean
  error?: string
}> = []
function logWebhook(entry: (typeof webhookLog)[0]): void {
  webhookLog.unshift(entry)
  if (webhookLog.length > 20) webhookLog.pop()
}

/**
 * Endpoint público que recebe eventos do WhatsApp Cloud API (Meta).
 *
 * • GET  /api/whatsapp/webhook → challenge inicial. Quando o usuário
 *   configura o webhook no Meta Business Manager, a Meta faz UM GET
 *   com ?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY.
 *   Devemos responder com o challenge SE o verify_token bater com o
 *   que o usuário cadastrou na UI do BRM.
 *
 * • POST /api/whatsapp/webhook → eventos contínuos (mensagens entrantes,
 *   status de entrega). Validamos a assinatura X-Hub-Signature-256
 *   usando o app_secret da sessão (descoberta pelo phone_number_id do
 *   payload) e disparamos ChatService.receiveMessage.
 *
 * Sem autenticação — Meta vai chamar diretamente (é público na internet).
 * A segurança vem da validação de assinatura HMAC SHA-256.
 */
export function createWhatsAppWebhookRoutes(
  sessionRepository: WhatsAppSessionRepository,
  chatServiceGetter: () => ChatService | null
): Router {
  const router = Router()

  // ---------------------------------------------------------------------------
  // GET — challenge inicial (verificação do webhook)
  // ---------------------------------------------------------------------------
  router.get('/webhook', async (req: Request, res: Response): Promise<void> => {
    const mode = req.query['hub.mode']
    const verifyToken = req.query['hub.verify_token'] as string | undefined
    const challenge = req.query['hub.challenge'] as string | undefined

    if (mode !== 'subscribe' || !verifyToken || !challenge) {
      res.status(400).send('bad request')
      return
    }

    const session = await sessionRepository.findByVerifyToken(verifyToken)
    if (!session) {
      console.warn('[Webhook] Verify token desconhecido:', verifyToken)
      res.status(403).send('forbidden')
      return
    }

    console.log(`[Webhook] Verify OK para user_id=${session.user_id}`)
    res.status(200).send(challenge)
  })

  // ---------------------------------------------------------------------------
  // GET — endpoint de debug que retorna as ultimas 20 tentativas de webhook
  // ---------------------------------------------------------------------------
  router.get('/webhook-debug', (_req: Request, res: Response): void => {
    res.json({ entries: webhookLog, count: webhookLog.length })
  })

  // ---------------------------------------------------------------------------
  // POST — eventos do WhatsApp
  // ---------------------------------------------------------------------------
  router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    const at = new Date().toISOString()
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined
      const rawBody = (req as any).rawBody as string | undefined
      const body = req.body

      // Pega o phone_number_id do payload pra descobrir qual sessão é
      const entry = body?.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value
      const phoneNumberId = value?.metadata?.phone_number_id as string | undefined

      if (!phoneNumberId) {
        // Pode ser um evento que não temos interesse (account_update, etc).
        // Respondemos 200 pra Meta não ficar reentregando.
        logWebhook({ at, outcome: 'no_phone_number_id' })
        res.status(200).send('no phone_number_id')
        return
      }

      const session = await sessionRepository.findByPhoneNumberId(phoneNumberId)
      if (!session || !session.app_secret) {
        console.warn('[Webhook] phone_number_id desconhecido:', phoneNumberId)
        logWebhook({ at, outcome: 'unknown_phone_number_id', phone_number_id: phoneNumberId })
        res.status(200).send('unknown phone_number_id') // 200 evita retry
        return
      }

      // Valida assinatura HMAC SHA-256 com app_secret do user
      let signatureValid: boolean | undefined
      if (signature && rawBody) {
        const expected =
          'sha256=' +
          crypto.createHmac('sha256', session.app_secret).update(rawBody).digest('hex')
        signatureValid = signature === expected
        if (!signatureValid) {
          console.warn(`[Webhook] Assinatura inválida pra user_id=${session.user_id}`)
          logWebhook({ at, outcome: 'invalid_signature', phone_number_id: phoneNumberId, signature_valid: false })
          res.status(403).send('invalid signature')
          return
        }
      } else {
        console.warn('[Webhook] Sem assinatura ou rawBody — aceitando em modo permissivo')
      }

      // Processa mensagens entrantes
      const messages: any[] = value?.messages || []
      const contacts: any[] = value?.contacts || []
      const chatService = chatServiceGetter()
      if (!chatService) {
        console.warn('[Webhook] ChatService ainda não disponível')
        res.status(200).send('ok')
        return
      }

      for (const msg of messages) {
        // Por enquanto só texto. Outras tipos (image, document, audio) ficam
        // pra mini-entrega futura.
        if (msg.type !== 'text') {
          console.log(`[Webhook] Ignorando tipo não-texto: ${msg.type}`)
          continue
        }
        const contact = contacts.find((c) => c.wa_id === msg.from)
        const fromName = contact?.profile?.name ?? null
        try {
          await chatService.receiveMessage({
            ownerUserId: session.user_id,
            fromPhone: `+${msg.from}`, // Meta entrega só dígitos; salvamos E.164
            fromName,
            content: msg.text.body,
            providerMessageId: msg.id,
          })
        } catch (err) {
          console.error('[Webhook] Erro processando mensagem:', err)
        }
      }

      logWebhook({
        at,
        outcome: 'processed',
        phone_number_id: phoneNumberId,
        message_count: messages.length,
        signature_valid: signatureValid,
      })
      res.status(200).send('ok')
    } catch (error) {
      console.error('[Webhook] Erro inesperado:', error)
      logWebhook({ at, outcome: 'exception', error: error instanceof Error ? error.message : String(error) })
      // Respondemos 200 pra Meta não ficar reentregando — o erro fica no log
      res.status(200).send('error logged')
    }
  })

  return router
}
