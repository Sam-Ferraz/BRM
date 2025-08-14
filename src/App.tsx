import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NegociosPage from './pages/NegociosPage'
import ClientesPage from './pages/ClientesPage'
import AtendimentosPage from './pages/AtendimentosPage'
import ProdutosPage from './pages/ProdutosPage'
import PautaVendasPage from './pages/PautaVendasPage'
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
              <Route path="/negocios" element={
                <ProtectedRoute>
                  <NegociosPage />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute>
                  <ClientesPage />
                </ProtectedRoute>
              } />
              <Route path="/atendimentos" element={
                <ProtectedRoute>
                  <AtendimentosPage />
                </ProtectedRoute>
              } />
              <Route path="/produtos" element={
                <ProtectedRoute>
                  <ProdutosPage />
                </ProtectedRoute>
              } />
              <Route path="/pauta-vendas" element={
                <ProtectedRoute>
                  <PautaVendasPage />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute>
                  <ConfigPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App