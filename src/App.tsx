import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DealsPage from './pages/DealsPage'
import ClientsPage from './pages/ClientsPage'
import AppointmentsPage from './pages/AppointmentsPage'
import ProductsPage from './pages/ProductsPage'
import SalesAgendaPage from './pages/SalesAgendaPage'
import FollowUpsPage from './pages/FollowUpsPage'
import ProposalsPage from './pages/ProposalsPage'
import SalesPage from './pages/SalesPage'
import ChatPage from './pages/ChatPage'
import LeadsPage from './pages/LeadsPage'
import AgendaPage from './pages/AgendaPage'
import ConfigPage from './pages/ConfigPage'
import { MobileBottomNav } from './components/mobile-bottom-nav'
import { useAuth } from '@/hooks/use-auth'
import './lib/i18n'
import './index.css'

/**
 * AppShell — renderiza rotas + BottomNav condicional (só mobile + só logado).
 * Precisa ficar dentro de AuthProvider e Router pra usar useAuth() e NavLink.
 * O padding-bottom (pb-16) reserva espaço pra barra em mobile; desktop zera.
 */
function AppShell() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><DealsPage /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
        <Route path="/sales-agenda" element={<ProtectedRoute><SalesAgendaPage /></ProtectedRoute>} />
        <Route path="/follow-ups" element={<ProtectedRoute><FollowUpsPage /></ProtectedRoute>} />
        <Route path="/proposals" element={<ProtectedRoute><ProposalsPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><ConfigPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Bottom nav só quando logado (não aparece na tela de Login) */}
      {isAuthenticated && <MobileBottomNav />}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <Router>
          <AppShell />
          <Toaster />
          <SonnerToaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
