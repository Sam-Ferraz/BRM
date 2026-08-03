import { useAuth } from '@/hooks/use-auth'
import { Navigate, useLocation } from 'react-router-dom'
import { BottomNav } from './bottom-nav'
import { useBottomNavPreference } from '@/hooks/use-bottom-nav-preference'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const { enabled: showBottomNav } = useBottomNavPreference()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Bottom nav só aparece se o usuário quiser (toggle em Configurações).
  // Quando ligada, adicionamos padding-bottom pro conteúdo não ser cortado.
  return (
    <>
      <div className={showBottomNav ? "pb-20" : ""}>{children}</div>
      {showBottomNav && <BottomNav />}
    </>
  )
}
