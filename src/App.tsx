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
import ConfigPage from './pages/ConfigPage'
import './lib/i18n'
import './index.css'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <Router>
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/dashboard" element={
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
              <Route path="/settings" element={
                <ProtectedRoute>
                  <ConfigPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster />
          <SonnerToaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App