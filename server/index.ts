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
  SalesAgendaRepository
} from './repositories/index.js'

// Import services
import {
  AuthService,
  DashboardService,
  DealService,
  ClientService,
  ProductService,
  AppointmentService,
  SalesAgendaService
} from './services/index.js'

// Import routes
import { createAuthRoutes } from './routes/auth-routes.js'
import { createDashboardRoutes } from './routes/dashboard-routes.js'
import { createDealRoutes } from './routes/deal-routes.js'
import { createClientRoutes } from './routes/client-routes.js'
import { createProductRoutes } from './routes/product-routes.js'
import { createAppointmentRoutes } from './routes/appointment-routes.js'
import { createSalesAgendaRoutes } from './routes/sales-agenda-routes.js'

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
app.use(express.json())

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, '../dist')))

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

// Initialize services with dependency injection
const authService = new AuthService(userRepository)
const dashboardService = new DashboardService(
  dealRepository,
  clientRepository,
  productRepository,
  appointmentRepository,
  salesAgendaRepository
)
const dealService = new DealService(dealRepository)
const clientService = new ClientService(clientRepository)
const productService = new ProductService(productRepository)
const appointmentService = new AppointmentService(appointmentRepository)
const salesAgendaService = new SalesAgendaService(salesAgendaRepository)

// Setup routes
app.use('/api/auth', createAuthRoutes(authService))
app.use('/api/dashboard', createDashboardRoutes(dashboardService, appointmentService))
app.use('/api/deals', createDealRoutes(dealService))
app.use('/api/clients', createClientRoutes(clientService))
app.use('/api/products', createProductRoutes(productService))
app.use('/api/appointments', createAppointmentRoutes(appointmentService))
app.use('/api/sales-agenda', createSalesAgendaRoutes(salesAgendaService))

// Serve React app for all non-API routes (client-side routing)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' })
  }
  
  res.sendFile(path.join(__dirname, '../dist/index.html'))
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