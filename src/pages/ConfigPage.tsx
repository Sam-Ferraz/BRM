import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings, CheckCircle2, XCircle, Users as UsersIcon, Shield, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { TimezoneSelector } from "@/components/timezone-selector"
import { api, type GoogleCalendarStatus } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function ConfigPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [searchParams, setSearchParams] = useSearchParams()
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Query params vindos do callback backend (/callback → /settings?googleConnect=...)
  useEffect(() => {
    const flag = searchParams.get('googleConnect')
    if (!flag) return
    if (flag === 'success') {
      toast({ title: 'Google Calendar conectado' })
    } else if (flag === 'denied') {
      toast({ title: 'Autorização cancelada', variant: 'destructive' })
    } else if (flag === 'error') {
      const msg = searchParams.get('msg') || 'Erro ao conectar'
      toast({ title: 'Erro na conexão', description: msg, variant: 'destructive' })
    }
    // Limpa a query pra não repetir o toast em navegações internas
    searchParams.delete('googleConnect')
    searchParams.delete('msg')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, toast])

  // Carrega status inicial
  useEffect(() => {
    api.googleCalendar
      .getStatus()
      .then(({ data }) => setGoogleStatus(data))
      .catch((err) => console.error('Falha ao buscar status Google Calendar:', err))
  }, [])

  const handleGoogleConnect = async () => {
    try {
      setGoogleLoading(true)
      const { data } = await api.googleCalendar.getAuthUrl()
      window.location.href = data.url
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao iniciar OAuth',
        variant: 'destructive',
      })
      setGoogleLoading(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    if (!confirm('Desconectar sua conta Google Calendar? Os eventos deixarão de aparecer na Agenda.')) return
    try {
      setGoogleLoading(true)
      await api.googleCalendar.disconnect()
      setGoogleStatus({ connected: false })
      toast({ title: 'Google Calendar desconectado' })
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao desconectar',
        variant: 'destructive',
      })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header — mesmo padrão de Propostas: apenas o botão Voltar */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild className="mr-4">
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Título do módulo — sem borda, apenas ícone + texto */}
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Settings className="w-6 h-6" />
            {t('settings')}
          </h1>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('theme')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('selectTheme')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('chooseAppearance')}
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('language')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('selectLanguage')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('chooseLanguage')}
                  </p>
                </div>
                <LanguageSelector />
              </div>
            </CardContent>
          </Card>

          {/* Administração — só admin */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Administração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Link
                  to="/settings/users"
                  className="flex items-center justify-between rounded-md p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <UsersIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Gerenciar Usuários</p>
                      <p className="text-xs text-muted-foreground">
                        Criar, editar e desativar usuários da equipe
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
                <Link
                  to="/settings/permissions"
                  className="flex items-center justify-between rounded-md p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Permissões</p>
                      <p className="text-xs text-muted-foreground">
                        Matriz de rotinas por tipo de usuário
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Timezone Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('timezone')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('selectTimezone')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('chooseTimezone')}
                  </p>
                </div>
                <TimezoneSelector />
              </div>
            </CardContent>
          </Card>

          {/* Integração Google Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Z" fill="#4285F4"/>
                </svg>
                Google Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  {googleStatus?.connected ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium truncate">{googleStatus.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Seus eventos do Google Calendar aparecem na Agenda do BRM em tempo real.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Nenhuma conta conectada</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Conecte sua conta Google para ver seus compromissos pessoais na mesma agenda.
                      </p>
                    </>
                  )}
                </div>
                {googleStatus?.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleDisconnect}
                    disabled={googleLoading}
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleGoogleConnect}
                    disabled={googleLoading}
                  >
                    Conectar Google Calendar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}