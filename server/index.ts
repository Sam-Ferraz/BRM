import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Import repositories
import {
  UserRepository,
  DealRepository,
  ClientRepository,
  ProductRepository,
  AppointmentRepository,
  SalesAgendaRepository,
  FollowUpRepository,
  ProposalRepository,
  WhatsAppSessionRepository,
  ConversationRepository,
  MessageRepository,
  LeadSourceRepository,
  LeadRepository,
  SaleRepository,
  CalendarEventRepository
} from './repositories/index.js'

// Import services
import {
  AuthService,
  DashboardService,
  DealService,
  ClientService,
  ProductService,
  AppointmentService,
  SalesAgendaService,
  FollowUpService,
  ProposalService,
  WhatsAppService,
  ChatService,
  LeadService,
  SaleService,
  CalendarEventService
} from './services/index.js'
import { StubWhatsAppProvider } from './services/whatsapp-provider.js'
import { BaileysWhatsAppProvider } from './services/baileys-whatsapp-provider.js'
import { CloudApiWhatsAppProvider } from './services/cloud-api-whatsapp-provider.js'

// Import routes
import { createAuthRoutes } from './routes/auth-routes.js'
import { createDashboardRoutes } from './routes/dashboard-routes.js'
import { createDealRoutes } from './routes/deal-routes.js'
import { createClientRoutes } from './routes/client-routes.js'
import { createProductRoutes } from './routes/product-routes.js'
import { createAppointmentRoutes } from './routes/appointment-routes.js'
import { createSalesAgendaRoutes } from './routes/sales-agenda-routes.js'
import { createFollowUpRoutes } from './routes/followup-routes.js'
import { createProposalRoutes } from './routes/proposal-routes.js'
import { createWhatsAppRoutes } from './routes/whatsapp-routes.js'
import { createChatRoutes } from './routes/chat-routes.js'
import { createLeadRoutes } from './routes/lead-routes.js'
import { createSaleRoutes } from './routes/sale-routes.js'
import { createWhatsAppWebhookRoutes } from './routes/whatsapp-webhook-routes.js'
import { createCalendarRoutes } from './routes/calendar-routes.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
// `verify` salva o raw body em req.rawBody — necessário pro webhook do
// WhatsApp Cloud API validar a assinatura X-Hub-Signature-256 (HMAC com
// app_secret sobre o corpo original).
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString('utf8')
  }
}))

// Serve static files from the Vite build
// In Docker: __dirname = /app/server/dist, so ../../dist = /app/dist
// In dev: __dirname = /project/server/dist, so ../../dist = /project/dist
app.use(express.static(path.join(__dirname, '../../dist')))

// Serve uploaded files (only used when STORAGE_MODE=local)
// Path: project_root/uploads -> served at /uploads/*
const uploadsPath = path.resolve(process.env.LOCAL_STORAGE_PATH || './uploads')
app.use('/uploads', express.static(uploadsPath))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// Initialize repositories
const userRepository = new UserRepository()
const dealRepository = new DealRepository()
const clientRepository = new ClientRepository()
const productRepository = new ProductRepository()
const appointmentRepository = new AppointmentRepository()
const salesAgendaRepository = new SalesAgendaRepository()
const followUpRepository = new FollowUpRepository()
const proposalRepository = new ProposalRepository()
const whatsappSessionRepository = new WhatsAppSessionRepository()
const conversationRepository = new ConversationRepository()
const messageRepository = new MessageRepository()
const leadSourceRepository = new LeadSourceRepository()
const leadRepository = new LeadRepository()
const saleRepository = new SaleRepository()
const calendarEventRepository = new CalendarEventRepository()

// Initialize services with dependency injection
const authService = new AuthService(userRepository)
const dashboardService = new DashboardService(
  dealRepository,
  clientRepository,
  productRepository,
  appointmentRepository,
  salesAgendaRepository,
  followUpRepository,
  proposalRepository,
  conversationRepository,
  leadRepository,
  saleRepository
)
const dealService = new DealService(dealRepository)
const clientService = new ClientService(clientRepository)
const productService = new ProductService(productRepository)
const appointmentService = new AppointmentService(appointmentRepository)
const salesAgendaService = new SalesAgendaService(salesAgendaRepository)
const followUpService = new FollowUpService(followUpRepository)
const proposalService = new ProposalService(proposalRepository, dealRepository)
// SaleService depende de proposalRepo/dealRepo/productRepo. ProposalService
// recebe SaleService via setter pra evitar dependência circular na construção
// e disparar auto-criação de Sale quando uma proposta vira 'accepted'.
const saleService = new SaleService(saleRepository, proposalRepository, dealRepository, productRepository)
proposalService.setSaleService(saleService)
const calendarEventService = new CalendarEventService(calendarEventRepository)

// Provider de WhatsApp:
//   WHATSAPP_PROVIDER=stub      → não conversa de verdade (útil para CI / dev offline)
//   WHATSAPP_PROVIDER=baileys   → WhatsApp Web não-oficial via Baileys (DEFAULT, legado)
//   WHATSAPP_PROVIDER=cloud_api → Meta Cloud API oficial (BYOK por usuário)
//
// Migração em andamento de Baileys → Cloud API. Default continua Baileys
// pra não quebrar instâncias com sessões já conectadas. Quando a UI de
// cadastro de credenciais Cloud API estiver pronta e os usuários tiverem
// suas WABAs configuradas, mudamos o default por env var.
//
// Provider e ChatService têm uma dependência circular: o provider precisa
// chamar chatService.receiveMessage quando chega mensagem entrante, mas
// o chatService já depende do provider para enviar. Resolvemos com uma
// referência tardia (closure aponta para chatService criado abaixo).
let chatServiceRef: ChatService | null = null
const incomingHandler = async (input: Parameters<NonNullable<ChatService['receiveMessage']>>[0]) => {
  if (!chatServiceRef) return
  return chatServiceRef.receiveMessage(input)
}

const providerKind = process.env.WHATSAPP_PROVIDER || 'baileys'
const whatsappProvider =
  providerKind === 'stub'
    ? new StubWhatsAppProvider()
    : providerKind === 'cloud_api'
      ? new CloudApiWhatsAppProvider({
          incoming: incomingHandler,
          sessionRepository: whatsappSessionRepository,
        })
      : new BaileysWhatsAppProvider({
          incoming: incomingHandler,
          sessionRepository: whatsappSessionRepository,
        })

const whatsappService = new WhatsAppService(whatsappSessionRepository)
const chatService = new ChatService(
  conversationRepository,
  messageRepository,
  whatsappSessionRepository,
  whatsappProvider,
  appointmentRepository
)
chatServiceRef = chatService

const leadService = new LeadService(
  leadRepository,
  leadSourceRepository,
  clientRepository,
  dealRepository
)

// Setup routes
app.use('/api/auth', createAuthRoutes(authService))
app.use('/api/dashboard', createDashboardRoutes(dashboardService, appointmentService))
app.use('/api/deals', createDealRoutes(dealService))
app.use('/api/clients', createClientRoutes(clientService))
app.use('/api/products', createProductRoutes(productService))
app.use('/api/appointments', createAppointmentRoutes(appointmentService))
app.use('/api/sales-agenda', createSalesAgendaRoutes(salesAgendaService))
app.use('/api/follow-ups', createFollowUpRoutes(followUpService))
app.use('/api/proposals', createProposalRoutes(proposalService))
app.use('/api/whatsapp', createWhatsAppRoutes(whatsappService, whatsappProvider, whatsappSessionRepository))
app.use('/api/chat', createChatRoutes(chatService))
app.use('/api/leads', createLeadRoutes(leadService, leadSourceRepository))
app.use('/api/sales', createSaleRoutes(saleService))
app.use('/api/calendar', createCalendarRoutes(calendarEventService))
// Webhook público do WhatsApp Cloud API (Meta chama esse endpoint).
// Sem autenticação — segurança via validação X-Hub-Signature-256 com
// app_secret cadastrado por usuário.
app.use('/api/whatsapp', createWhatsAppWebhookRoutes(whatsappSessionRepository, () => chatServiceRef))

// Serve React app for all non-API routes (client-side routing)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' })
  }

  res.sendFile(path.join(__dirname, '../../dist/index.html'))
})

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 API available at http://localhost:${PORT}/api`)
  console.log(`🔐 Auth endpoints:`)
  console.log(`   POST /api/auth/login`)
  console.log(`   POST /api/auth/register`)
  console.log(`   GET /api/auth/verify`)
  console.log(`   POST /api/auth/logout`)
})