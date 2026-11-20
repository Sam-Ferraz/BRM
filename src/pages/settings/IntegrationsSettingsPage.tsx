import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Link2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { ImportLeadsCard } from "@/components/import-leads-card"
import { SiteApiCard } from "@/components/site-api-card"

/**
 * Sub-pagina de Integracoes (admin) — agrupa os cards de import de leads
 * (CSV) e configuracao de API publica pra o site institucional enviar
 * leads automaticamente.
 */
export default function IntegrationsSettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  // Guard: so admin acessa. Redireciona pros Configuracoes caso contrario.
  if (user?.role !== 'admin') {
    return <Navigate to="/settings" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="outline" size="sm" asChild className="mr-4">
              <Link to="/settings">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backButton')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Link2 className="w-6 h-6" />
            Integrações
          </h1>

          <ImportLeadsCard />
          <SiteApiCard />
        </div>
      </div>
    </div>
  )
}
