import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NegociosPage from './pages/NegociosPage'
import ClientesPage from './pages/ClientesPage'
import AtendimentosPage from './pages/AtendimentosPage'
import ProdutosPage from './pages/ProdutosPage'
import PautaVendasPage from './pages/PautaVendasPage'
import './index.css'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <Router>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/negocios" element={<NegociosPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/atendimentos" element={<AtendimentosPage />} />
            <Route path="/produtos" element={<ProdutosPage />} />
            <Route path="/pauta-vendas" element={<PautaVendasPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Toaster />
      </Router>
    </ThemeProvider>
  )
}

export default App