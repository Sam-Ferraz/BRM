import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { authLimiter, webhookLimiter } from './middleware/rate-limits.js'

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
  CalendarEventRepository,
  GoogleCalendarRepository,
  ContractRepository,
  ManagedUserRepository,
  PermissionRepository
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
  CalendarEventService,
  GoogleCalendarService,
  ContractService,
  UserManagementService,
  PermissionService
} from './services/index.js'
import { StubWhatsAppProvider } from './services/whatsapp-provider.js'
import { BaileysWhatsAppProvider } from './services/baileys-whatsapp-provider.js'
import { CloudApiWhatsAppProvider } from './services/cloud-api-whatsapp-provider.js'
import { MultiWhatsAppProvider } from './services/multi-whatsapp-provider.js'

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
import { createLeadPipelineRoutes } from './routes/lead-pipeline-routes.js'
import { LeadPipelineRepository } from './repositories/lead-pipeline-repository.js'
import { LeadPipelineService } from './services/lead-pipeline-service.js'
import { AccountRepository } from './repositories/account-repository.js'
import { AccountService } from './services/account-service.js'
import { createAccountRoutes } from './routes/account-routes.js'
import { PasswordSetupTokenRepository } from './repositories/password-setup-token-repository.js'
import { EmailService } from './services/email-service.js'
import { PasswordService } from './services/password-service.js'
import { CouponRepository } from './repositories/coupon-repository.js'
import { CouponService } from './services/coupon-service.js'
import { createCouponRoutes } from './routes/coupon-routes.js'
import { createSaleRoutes } from './routes/sale-routes.js'
import { createWhatsAppWebhookRoutes } from './routes/whatsapp-webhook-routes.js'
import { createCalendarRoutes } from './routes/calendar-routes.js'
import { createGoogleCalendarRoutes } from './routes/google-calendar-routes.js'
import { createContractRoutes } from './routes/contract-routes.js'
import { createUserManagementRoutes } from './routes/user-management-routes.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
// -----------------------------------------------------------------------------
// Segurança HTTP (helmet) — headers padrão recomendados.
// CSP fica DESLIGADA porque o Vite/React em prod inclui scripts inline e
// ativar sem tuning quebra a app. Reavaliar após auditoria de assets.
// crossOriginEmbedderPolicy também off porque bloqueia recursos externos
// (S3, google-analytics, etc) usados no front.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

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

// KILL SWITCH — quando o browser pede /sw.js, servimos um SW kamikaze
// COM header Clear-Site-Data que força o browser a limpar caches,
// cookies e storage relacionados ao site. Isso resolve o problema de
// Service Workers cacheados de um deploy anterior. Precisa vir ANTES
// do express.static pra sobrescrever o /sw.js do dist.
//
// O header Clear-Site-Data é honrado por todos os browsers modernos
// (Chrome, Edge, Firefox) e é a única forma programática de forçar
// limpeza total sem depender do browser cooperar.
app.get('/sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Clear-Site-Data', '"cache", "storage"')
  res.send(
    `self.addEventListener('install', () => self.skipWaiting());\n` +
    `self.addEventListener('activate', async (e) => {\n` +
    `  e.waitUntil((async () => {\n` +
    `    const keys = await caches.keys();\n` +
    `    await Promise.all(keys.map(k => caches.delete(k)));\n` +
    `    await self.registration.unregister();\n` +
    `    const clients = await self.clients.matchAll({type: 'window'});\n` +
    `    for (const c of clients) c.navigate(c.url);\n` +
    `  })());\n` +
    `});\n` +
    `self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));\n`
  )
})

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
const googleCalendarRepository = new GoogleCalendarRepository()
const contractRepository = new ContractRepository()
const managedUserRepository = new ManagedUserRepository()
const permissionRepository = new PermissionRepository()

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
  saleRepository,
  contractRepository
)
const dealService = new DealService(dealRepository)
const clientService = new ClientService(clientRepository, dealRepository)
const productService = new ProductService(productRepository)
const appointmentService = new AppointmentService(appointmentRepository)
const salesAgendaService = new SalesAgendaService(salesAgendaRepository)
const followUpService = new FollowUpService(followUpRepository)
const proposalService = new ProposalService(proposalRepository, dealRepository)
// SaleService, ContractService e ProposalService têm dependência entre si.
// Resolvido via setters (setSaleService/setContractService) pra evitar
// ciclo na construção. Nova ordem do fluxo:
//   Proposta aceita → ContractService.createFromAcceptedProposal
//   Contrato aprovado pelo gestor → ContractService.managerApprove chama
//     SaleService.createFromAcceptedProposal (mesma API que ProposalService
//     usava antes).
const saleService = new SaleService(saleRepository, proposalRepository, dealRepository, productRepository)
const contractService = new ContractService(contractRepository, dealRepository, proposalRepository, saleService)
const userManagementService = new UserManagementService(managedUserRepository)
const permissionService = new PermissionService(permissionRepository)
proposalService.setSaleService(saleService)          // legado — não é mais chamado no fluxo automático
proposalService.setContractService(contractService)  // agora proposta aceita cria contrato
const googleCalendarService = new GoogleCalendarService(googleCalendarRepository)
const calendarEventService = new CalendarEventService(calendarEventRepository, googleCalendarService)

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

// Provider agora e escolhido em runtime por sessao via MultiWhatsAppProvider —
// evita depender da env WHATSAPP_PROVIDER (que estava obrigando um caminho
// unico e quebrando o fluxo Cloud API mesmo com sessao correta). Se voce
// quiser forcar um provider unico em algum ambiente, ainda pode setar
// WHATSAPP_PROVIDER=stub|cloud_api|baileys.
const providerKind = process.env.WHATSAPP_PROVIDER || 'multi'
const whatsappProvider =
  providerKind === 'stub'
    ? new StubWhatsAppProvider()
    : providerKind === 'cloud_api'
      ? new CloudApiWhatsAppProvider({
          incoming: incomingHandler,
          sessionRepository: whatsappSessionRepository,
        })
      : providerKind === 'multi'
        ? new MultiWhatsAppProvider(
            new CloudApiWhatsAppProvider({
              incoming: incomingHandler,
              sessionRepository: whatsappSessionRepository,
            }),
            new BaileysWhatsAppProvider({
              incoming: incomingHandler,
              sessionRepository: whatsappSessionRepository,
            }),
            whatsappSessionRepository,
          )
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
// Login e verify passam pelo authLimiter — brute-force fica inviável.
// Password setup/reset via email + Resend
const passwordTokenRepository = new PasswordSetupTokenRepository()
const emailService = new EmailService()
const passwordService = new PasswordService(userRepository, passwordTokenRepository, emailService, authService)

app.use('/api/auth', authLimiter, createAuthRoutes(authService, passwordService))
app.use('/api/dashboard', createDashboardRoutes(dashboardService, appointmentService))
app.use('/api/deals', createDealRoutes(dealService))
app.use('/api/clients', createClientRoutes(clientService))
app.use('/api/products', createProductRoutes(productService, productRepository))
app.use('/api/appointments', createAppointmentRoutes(appointmentService))
app.use('/api/sales-agenda', createSalesAgendaRoutes(salesAgendaService))
app.use('/api/follow-ups', createFollowUpRoutes(followUpService))
app.use('/api/proposals', createProposalRoutes(proposalService))
app.use('/api/whatsapp', createWhatsAppRoutes(whatsappService, whatsappProvider, whatsappSessionRepository))
app.use('/api/chat', createChatRoutes(chatService))
app.use('/api/leads', createLeadRoutes(leadService, leadSourceRepository))
app.use('/api/sales', createSaleRoutes(saleService))
app.use('/api/calendar', createCalendarRoutes(calendarEventService))
app.use('/api/google-calendar', createGoogleCalendarRoutes(googleCalendarService))
app.use('/api/contracts', createContractRoutes(contractService))
app.use('/api/user-mgmt', createUserManagementRoutes(userManagementService, permissionService))
{
  // Esteira de leads — CRUD das esteiras (a integração com escalação em
  // tempo real vem em iteração posterior).
  const leadPipelineRepository = new LeadPipelineRepository()
  const leadPipelineService = new LeadPipelineService(leadPipelineRepository)
  app.use('/api/lead-pipelines', createLeadPipelineRoutes(leadPipelineService))
}
{
  // Multi-tenancy: accounts. GET /me (qualquer user) + super-admin (BRM Demo).
  const accountRepository = new AccountRepository()
  const accountService = new AccountService(accountRepository, userRepository, passwordTokenRepository, emailService)
  app.use('/api/accounts', createAccountRoutes(accountService))
}
{
  // Cupons de desconto — super-admin gerencia, LP valida antes do checkout.
  const couponRepository = new CouponRepository()
  const couponService = new CouponService(couponRepository)
  app.use('/api/coupons', createCouponRoutes(couponService))
}
// Webhook público do WhatsApp Cloud API (Meta chama esse endpoint).
// Sem autenticação — segurança via validação X-Hub-Signature-256 com
// app_secret cadastrado por usuário. Rate limit protege contra flood.
app.use('/api/whatsapp', webhookLimiter, createWhatsAppWebhookRoutes(whatsappSessionRepository, () => chatServiceRef))

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