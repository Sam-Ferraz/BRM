import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Settings,
  Palette,
  Calendar,
  Users as UsersIcon,
  Shield,
  Route as RouteIcon,
  Building2,
  Tag,
  Link2,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

/**
 * ConfigPage — hub de Configuracoes.
 *
 * Layout clean: grid de widgets soltos (sem container externo). Cada widget
 * tem icone + nome e navega pra sub-pagina com os detalhes daquele tema.
 *
 * Visibilidade por role:
 *   - Todos: Aparencia, Google Agenda
 *   - Admin: + Usuarios, Permissoes, Esteiras de Leads, Integracoes
 *   - Super-admin (conta BRM, account_id=1): + Contas cliente, Cupons
 *     Esses dois sao de uso INTERNO da empresa BRM para administrar
 *     contas-cliente e cupons da LP — nenhum cliente ve.
 */
interface Widget {
  key: string
  label: string
  icon: typeof Settings
  to: string
  iconBg: string
  iconColor: string
  visible: boolean
}

export default function ConfigPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isSuperAdmin = isAdmin && user?.account_id === 1

  const widgets: Widget[] = [
    {
      key: 'appearance',
      label: 'Aparência',
      icon: Palette,
      to: '/settings/appearance',
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/40',
      iconColor: 'text-indigo-700 dark:text-indigo-300',
      visible: true,
    },
    {
      key: 'google-calendar',
      label: 'Google Agenda',
      icon: Calendar,
      to: '/settings/google-calendar',
      iconBg: 'bg-blue-100 dark:bg-blue-950/40',
      iconColor: 'text-blue-700 dark:text-blue-300',
      visible: true,
    },
    {
      key: 'users',
      label: 'Usuários',
      icon: UsersIcon,
      to: '/settings/users',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-700 dark:text-emerald-300',
      visible: isAdmin,
    },
    {
      key: 'permissions',
      label: 'Permissões',
      icon: Shield,
      to: '/settings/permissions',
      iconBg: 'bg-amber-100 dark:bg-amber-950/40',
      iconColor: 'text-amber-700 dark:text-amber-300',
      visible: isAdmin,
    },
    {
      key: 'lead-pipelines',
      label: 'Esteiras de Leads',
      icon: RouteIcon,
      to: '/settings/lead-pipelines',
      iconBg: 'bg-violet-100 dark:bg-violet-950/40',
      iconColor: 'text-violet-700 dark:text-violet-300',
      visible: isAdmin,
    },
    {
      key: 'integrations',
      label: 'Integrações',
      icon: Link2,
      to: '/settings/integrations',
      iconBg: 'bg-teal-100 dark:bg-teal-950/40',
      iconColor: 'text-teal-700 dark:text-teal-300',
      visible: isAdmin,
    },
    {
      key: 'accounts',
      label: 'Contas cliente',
      icon: Building2,
      to: '/admin/accounts',
      iconBg: 'bg-orange-100 dark:bg-orange-950/40',
      iconColor: 'text-orange-700 dark:text-orange-300',
      visible: isSuperAdmin,
    },
    {
      key: 'coupons',
      label: 'Cupons',
      icon: Tag,
      to: '/admin/coupons',
      iconBg: 'bg-rose-100 dark:bg-rose-950/40',
      iconColor: 'text-rose-700 dark:text-rose-300',
      visible: isSuperAdmin,
    },
  ]

  const visibleWidgets = widgets.filter((w) => w.visible)

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="outline" size="sm" asChild className="mr-4">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backButton')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Settings className="w-6 h-6" />
            {t('settings')}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleWidgets.map((w) => {
              const Icon = w.icon
              return (
                <Link
                  key={w.key}
                  to={w.to}
                  className="group rounded-lg border border-border bg-card p-4 flex items-center gap-3 hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className={`shrink-0 p-2.5 rounded-lg ${w.iconBg}`}>
                    <Icon className={`w-5 h-5 ${w.iconColor}`} />
                  </div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {w.label}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
