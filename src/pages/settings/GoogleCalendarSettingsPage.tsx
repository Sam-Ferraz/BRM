import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
import { api, type GoogleCalendarStatus } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

/**
 * Sub-pagina de Google Calendar — conectar/desconectar conta pra sincronizar
 * eventos pessoais do Google na Agenda do BRM. Acessivel via widget
 * "Google Calendar" na pagina de Configuracoes.
 *
 * O callback OAuth do backend redireciona pra /configuracoes?googleConnect=...,
 * entao esta pagina tambem consome esse query param (ja que o usuario pode
 * cair aqui depois de autorizar).
 */
export default function GoogleCalendarSettingsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const flag = searchParams.get('googleConnect')
    if (!flag) return
    if (flag === 'success') toast({ title: 'Google Calendar conectado' })
    else if (flag === 'denied') toast({ title: 'Autorização cancelada', variant: 'destructive' })
    else if (flag === 'error') {
      const msg = searchParams.get('msg') || 'Erro ao conectar'
      toast({ title: 'Erro na conexão', description: msg, variant: 'destructive' })
    }
    searchParams.delete('googleConnect')
    searchParams.delete('msg')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, toast])

  useEffect(() => {
    api.googleCalendar
      .getStatus()
      .then(({ data }) => setStatus(data))
      .catch((err) => console.error('Falha ao buscar status Google Calendar:', err))
  }, [])

  const handleConnect = async () => {
    try {
      setLoading(true)
      const { data } = await api.googleCalendar.getAuthUrl()
      window.location.href = data.url
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao iniciar OAuth',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar sua conta Google Calendar? Os eventos deixarão de aparecer na Agenda.')) return
    try {
      setLoading(true)
      await api.googleCalendar.disconnect()
      setStatus({ connected: false })
      toast({ title: 'Google Calendar desconectado' })
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao desconectar',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Z" fill="#4285F4" />
            </svg>
            Google Calendar
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>Sincronização de eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  {status?.connected ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium truncate">{status.email}</span>
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
                {status?.connected ? (
                  <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={loading}>
                    Desconectar
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleConnect} disabled={loading}>
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
