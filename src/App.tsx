import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { AccountProvider } from '@/contexts/AccountContext'
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
import ContractsPage from './pages/ContractsPage'
import SalesPage from './pages/SalesPage'
import ChatPage from './pages/ChatPage'
import LeadsPage from './pages/LeadsPage'
import AgendaPage from './pages/AgendaPage'
import ConfigPage from './pages/ConfigPage'
import UsersPage from './pages/UsersPage'
import LeadPipelinesPage from './pages/LeadPipelinesPage'
import AdminAccountsPage from './pages/AdminAccountsPage'
import AdminCouponsPage from './pages/AdminCouponsPage'
import SetupPasswordPage from './pages/SetupPasswordPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import PermissionsPage from './pages/PermissionsPage'
import './lib/i18n'
import './index.css'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <AccountProvider>
        <Router>
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<LoginPage />} />
              {/* Home no estilo WhatsApp — layout 3 colunas com editor de deal inline */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } />
              {/* Dashboard antigo (widgets grid) — mantido como fallback / acesso via ícone Home */}
              <Route path="/dashboard-legacy" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              } />
              <Route path="/deals" element={
                <ProtectedRoute>
                  <DealsPage />
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute>
                  <ClientsPage />
                </ProtectedRoute>
              } />
              <Route path="/appointments" element={
                <ProtectedRoute>
                  <AppointmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              } />
              <Route path="/sales-agenda" element={
                <ProtectedRoute>
                  <SalesAgendaPage />
                </ProtectedRoute>
              } />
              <Route path="/follow-ups" element={
                <ProtectedRoute>
                  <FollowUpsPage />
                </ProtectedRoute>
              } />
              <Route path="/proposals" element={
                <ProtectedRoute>
                  <ProposalsPage />
                </ProtectedRoute>
              } />
              <Route path="/contracts" element={
                <ProtectedRoute>
                  <ContractsPage />
                </ProtectedRoute>
              } />
              <Route path="/sales" element={
                <ProtectedRoute>
                  <SalesPage />
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } />
              <Route path="/leads" element={
                <ProtectedRoute>
                  <LeadsPage />
                </ProtectedRoute>
              } />
              <Route path="/agenda" element={
                <ProtectedRoute>
                  <AgendaPage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <ConfigPage />
                </ProtectedRoute>
              } />
              <Route path="/settings/users" element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="/settings/permissions" element={
                <ProtectedRoute>
                  <PermissionsPage />
                </ProtectedRoute>
              } />
              <Route path="/settings/lead-pipelines" element={
                <ProtectedRoute>
                  <LeadPipelinesPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/accounts" element={
                <ProtectedRoute>
                  <AdminAccountsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/coupons" element={
                <ProtectedRoute>
                  <AdminCouponsPage />
                </ProtectedRoute>
              } />
              {/* Rotas públicas (sem auth) — link mágico do email cai aqui */}
              <Route path="/setup-password" element={<SetupPasswordPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster />
          <SonnerToaster />
        </Router>
        </AccountProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App