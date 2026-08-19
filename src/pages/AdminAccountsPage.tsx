import { useCallback, useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { ArrowLeft, Plus, Building2, User, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { api, type Account } from "@/lib/api-client"

/**
 * AdminAccountsPage — painel de super-admin (só o user admin da account #1
 * "BRM Demo" pode acessar).
 *
 * Permite:
 *   - Ver todas as accounts do sistema
 *   - Provisionar nova account + primeiro user admin (fluxo de onboarding manual)
 *   - Ativar/desativar accounts
 *   - Trocar plano
 *
 * Depois de criar, exibe as credenciais UMA VEZ pra copiar e enviar pro cliente.
 */

type ProvisionPayload = {
  account_name: string
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  admin_name: string
  admin_email: string
}

const emptyPayload = (): ProvisionPayload => ({
  account_name: '',
  plan: 'trial',
  admin_name: '',
  admin_email: '',
})

export default function AdminAccountsPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payload, setPayload] = useState<ProvisionPayload>(emptyPayload())
  const [lastCreated, setLastCreated] = useState<{
    account_name: string
    admin_email: string
    admin_user_id: number
    email_sent: boolean
  } | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.accounts.list()
      setAccounts(res.data)
    } catch (err) {
      toast({
        title: 'Erro ao carregar',
        description: err instanceof Error ? err.message : 'Sem permissão ou falha na API',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Gate: só super-admin (account_id === 1 + role === 'admin')
  if (currentUser && (currentUser.account_id !== 1 || currentUser.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />
  }

  const openCreate = () => {
    setPayload(emptyPayload())
    setDialogOpen(true)
  }

  const handleProvision = async () => {
    setSaving(true)
    try {
      const res = await api.accounts.provision(payload)
      setLastCreated({
        account_name: payload.account_name,
        admin_email: payload.admin_email,
        admin_user_id: res.data.admin_user.id,
        email_sent: res.data.email_sent,
      })
      toast({
        title: 'Conta criada',
        description: res.data.email_sent
          ? 'Email de convite enviado ao cliente'
          : 'Conta criada, mas o email falhou — use "Reenviar"',
      })
      setDialogOpen(false)
      loadAll()
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao provisionar',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResendSetup = async () => {
    if (!lastCreated) return
    try {
      await api.accounts.resendSetup(lastCreated.admin_user_id)
      toast({ title: 'Email reenviado' })
      setLastCreated({ ...lastCreated, email_sent: true })
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao reenviar',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (acc: Account) => {
    // Dupla confirmacao — acao IRREVERSIVEL, apaga TODOS os dados da account
    if (!confirm(`⚠️ EXCLUIR EMPRESA "${acc.name}"?\n\nIsso apaga TODOS os dados dessa conta:\n- Usuarios\n- Negocios\n- Clientes\n- Imoveis\n- Conversas\n- Etiquetas\n- Etc\n\nAcao IRREVERSIVEL. Continuar?`)) return
    const typed = prompt(`Pra confirmar, digite exatamente o nome da empresa:\n\n${acc.name}`)
    if (typed !== acc.name) {
      toast({ title: 'Cancelado', description: 'Nome nao confere', variant: 'destructive' })
      return
    }
    try {
      await api.accounts.delete(acc.id)
      toast({ title: 'Empresa excluida', description: `${acc.name} e todos os dados foram apagados` })
      loadAccounts()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (acc: Account) => {
    try {
      await api.accounts.update(acc.id, { is_active: !acc.is_active })
      toast({ title: `Account ${!acc.is_active ? 'ativada' : 'desativada'}` })
      loadAll()
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha',
        variant: 'destructive',
      })
    }
  }

  const handleChangePlan = async (acc: Account, plan: Account['plan']) => {
    try {
      await api.accounts.update(acc.id, { plan })
      toast({ title: `Plano trocado para ${plan}` })
      loadAll()
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha',
        variant: 'destructive',
      })
    }
  }

  // Não copia mais credenciais — cliente recebe email direto com link mágico

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nova conta cliente
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Confirmação de conta criada + email enviado */}
        {lastCreated && (
          <Card className={lastCreated.email_sent ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}>
            <CardHeader>
              <CardTitle className={lastCreated.email_sent ? 'text-emerald-900 flex items-center gap-2' : 'text-amber-900 flex items-center gap-2'}>
                <Check className="w-5 h-5" />
                {lastCreated.email_sent ? 'Conta criada e email enviado' : 'Conta criada — email falhou'}
              </CardTitle>
              <p className={lastCreated.email_sent ? 'text-xs text-emerald-800' : 'text-xs text-amber-800'}>
                Empresa <strong>{lastCreated.account_name}</strong>. Admin{' '}
                <strong className="font-mono">{lastCreated.admin_email}</strong>.
                {lastCreated.email_sent
                  ? ' O cliente vai receber um email com link pra definir a senha.'
                  : ' Reenvie o email — pode ter sido falha temporária do provedor.'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {!lastCreated.email_sent && (
                  <Button size="sm" onClick={handleResendSetup}>
                    Reenviar email
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setLastCreated(null)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Contas cliente
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada conta é uma empresa/cliente do BRM. Dados são isolados por conta.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma conta criada ainda.</p>
              </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base truncate">{acc.name}</h3>
                      {acc.id === 1 && (
                        <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">BRM Demo</Badge>
                      )}
                      {acc.is_active ? (
                        <Badge className="bg-green-100 text-green-800 border-0 text-xs">Ativa</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                          Suspensa
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {acc.id} · Criada em {acc.created_at?.slice(0, 10) || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={acc.plan}
                      onValueChange={(v) => handleChangePlan(acc, v as Account['plan'])}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={acc.is_active}
                        onCheckedChange={() => handleToggleActive(acc)}
                        disabled={acc.id === 1}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(acc)}
                      disabled={acc.id === 1}
                      title={acc.id === 1 ? 'BRM Demo nao pode ser excluida' : `Excluir ${acc.name}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nova conta cliente</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            <div className="space-y-2">
              <Label>Nome da empresa *</Label>
              <Input
                value={payload.account_name}
                onChange={(e) => setPayload((p) => ({ ...p, account_name: e.target.value }))}
                placeholder="Ex: Lenon Imóveis"
              />
            </div>

            <div className="space-y-2">
              <Label>Plano</Label>
              <Select
                value={payload.plan}
                onValueChange={(v) => setPayload((p) => ({ ...p, plan: v as ProvisionPayload['plan'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (avaliação)</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <User className="w-4 h-4" />
                Usuário admin inicial
              </div>
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input
                  value={payload.admin_name}
                  onChange={(e) => setPayload((p) => ({ ...p, admin_name: e.target.value }))}
                  placeholder="Ex: Lucas Menezes"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={payload.admin_email}
                  onChange={(e) => setPayload((p) => ({ ...p, admin_email: e.target.value.toLowerCase() }))}
                  placeholder="admin@empresa.com.br"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-2">
                O cliente vai receber um email com link mágico pra definir a própria senha (válido por 48h).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleProvision} disabled={saving}>
              {saving ? 'Criando...' : 'Criar conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
