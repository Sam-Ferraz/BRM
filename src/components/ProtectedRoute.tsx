import { useAuth } from '@/hooks/use-auth'
import { Navigate, useLocation } from 'react-router-dom'
import { BottomNav } from './bottom-nav'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

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

  // Bottom nav aparece em TODAS as páginas autenticadas. Padding-bottom no
  // wrapper garante que a nav (~72px) não corte o conteúdo da página.
  return (
    <>
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  )
}
