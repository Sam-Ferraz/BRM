import { useCallback, useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { ArrowLeft, Plus, Building2, User, Check, X, Copy } from "lucide-react"
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
  admin_password: string
}

const emptyPayload = (): ProvisionPayload => ({
  account_name: '',
  plan: 'trial',
  admin_name: '',
  admin_email: '',
  admin_password: '',
})

// Gera senha temporária aleatória (14 caracteres, alfanum + símbolos leves)
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

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
    admin_password: string
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
    setPayload({ ...emptyPayload(), admin_password: generateTempPassword() })
    setDialogOpen(true)
  }

  const handleProvision = async () => {
    setSaving(true)
    try {
      await api.accounts.provision(payload)
      // Guarda pra mostrar credenciais na tela DEPOIS de fechar o dialog
      setLastCreated({
        account_name: payload.account_name,
        admin_email: payload.admin_email,
        admin_password: payload.admin_password,
      })
      toast({ title: 'Account criada com sucesso' })
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

  const copyCredentials = async () => {
    if (!lastCreated) return
    const text = `BRM — Credenciais de acesso\n\nEmpresa: ${lastCreated.account_name}\nURL: https://app.brm.tec.br\nEmail: ${lastCreated.admin_email}\nSenha temporária: ${lastCreated.admin_password}\n\nRecomendamos trocar a senha no primeiro login.`
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: 'Credenciais copiadas' })
    } catch {
      toast({ title: 'Copie manualmente', variant: 'destructive' })
    }
  }

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
        {/* Credenciais recém-criadas — banner destacado */}
        {lastCreated && (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardHeader>
              <CardTitle className="text-emerald-900 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Credenciais de "{lastCreated.account_name}"
              </CardTitle>
              <p className="text-xs text-emerald-800">
                Envie essas credenciais pro cliente por WhatsApp/email. Elas não vão ser mostradas de novo.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-emerald-900">Email</Label>
                  <p className="font-mono text-sm p-2 bg-white border border-emerald-200 rounded">
                    {lastCreated.admin_email}
                  </p>
                </div>
                <div>
                  <Label className="text-emerald-900">Senha temporária</Label>
                  <p className="font-mono text-sm p-2 bg-white border border-emerald-200 rounded">
                    {lastCreated.admin_password}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={copyCredentials}>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copiar tudo
                </Button>
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
              <div className="space-y-2">
                <Label>Senha temporária *</Label>
                <div className="flex gap-2">
                  <Input
                    value={payload.admin_password}
                    onChange={(e) => setPayload((p) => ({ ...p, admin_password: e.target.value }))}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPayload((p) => ({ ...p, admin_password: generateTempPassword() }))}
                  >
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O cliente deve trocar essa senha no primeiro login.
                </p>
              </div>
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
