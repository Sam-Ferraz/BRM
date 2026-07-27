import { useCallback, useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { ArrowLeft, Plus, Tag, Pencil, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { api, type Coupon, type CouponPayload } from "@/lib/api-client"

/**
 * AdminCouponsPage — gestão de cupons de desconto (super-admin BRM Demo).
 *
 * Fluxo:
 *   1. Admin cria cupom com código, tipo (%/R$), valor, validade, limite de usos
 *   2. LP consome POST /api/coupons/validate público antes do checkout
 *   3. Quando checkout completa (Camada C, futuro), incrementa uses_count
 *
 * Cupom aplica em TODAS as mensalidades enquanto assinatura ativa
 * (opção B do cliente).
 */

const emptyPayload = (): CouponPayload => ({
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: 10,
  valid_from: null,
  valid_until: null,
  max_uses: null,
  plan_filter: null,
  is_active: true,
})

function formatDiscount(c: Coupon): string {
  if (c.discount_type === 'percent') return `${c.discount_value}%`
  return `R$ ${(c.discount_value / 100).toFixed(2).replace('.', ',')}`
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function AdminCouponsPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [payload, setPayload] = useState<CouponPayload>(emptyPayload())
  const [saving, setSaving] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.coupons.list()
      setCoupons(res.data)
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

  // Gate super-admin
  if (currentUser && (currentUser.account_id !== 1 || currentUser.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />
  }

  const openCreate = () => {
    setEditingId(null)
    setPayload(emptyPayload())
    setDialogOpen(true)
  }

  const openEdit = (c: Coupon) => {
    setEditingId(c.id)
    setPayload({
      code: c.code,
      description: c.description || '',
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      valid_from: c.valid_from || null,
      valid_until: c.valid_until || null,
      max_uses: c.max_uses,
      plan_filter: c.plan_filter,
      is_active: c.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingId) {
        await api.coupons.update(editingId, payload)
      } else {
        await api.coupons.create(payload)
      }
      toast({ title: editingId ? 'Cupom atualizado' : 'Cupom criado' })
      setDialogOpen(false)
      loadAll()
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao salvar',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (c: Coupon) => {
    try {
      await api.coupons.update(c.id, { is_active: !c.is_active })
      loadAll()
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este cupom? Não pode ser desfeito.')) return
    try {
      await api.coupons.delete(id)
      loadAll()
      toast({ title: 'Cupom removido' })
    } catch (err) {
      toast({ title: 'Erro', description: String(err), variant: 'destructive' })
    }
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 1500)
    } catch { /* ignore */ }
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
            Novo cupom
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Cupons de desconto
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cupons criados aqui podem ser aplicados pelos visitantes da landing page antes de fechar a compra.
              O desconto vale por TODAS as mensalidades enquanto a assinatura estiver ativa.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Tag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum cupom criado ainda.</p>
              </div>
            ) : (
              coupons.map((c) => (
                <div key={c.id} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => copyCode(c.code)}
                        className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded flex items-center gap-1 hover:bg-accent"
                        title="Copiar código"
                      >
                        {c.code}
                        {copiedCode === c.code ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                      </button>
                      <Badge variant="outline" className="text-xs">{formatDiscount(c)} off</Badge>
                      {c.is_active ? (
                        <Badge className="bg-green-100 text-green-800 border-0 text-xs">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">Inativo</Badge>
                      )}
                      {c.plan_filter && <Badge variant="outline" className="text-xs">Plano: {c.plan_filter}</Badge>}
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mb-1">{c.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Usos: {c.uses_count}{c.max_uses != null ? ` / ${c.max_uses}` : ' (ilimitado)'}</span>
                      <span>Válido até: {formatDate(c.valid_until)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={c.is_active} onCheckedChange={() => handleToggleActive(c)} />
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog criar/editar cupom */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar cupom' : 'Novo cupom'}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={payload.code}
                onChange={(e) => setPayload((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="LANCAMENTO50"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={payload.description || ''}
                onChange={(e) => setPayload((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Cupom de lançamento — apenas primeiros 100 clientes"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de desconto *</Label>
                <Select
                  value={payload.discount_type}
                  onValueChange={(v) => setPayload((p) => ({ ...p, discount_type: v as 'percent' | 'fixed_brl' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed_brl">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  value={payload.discount_type === 'fixed_brl' ? (payload.discount_value / 100).toFixed(2) : payload.discount_value}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0
                    setPayload((p) => ({
                      ...p,
                      discount_value: p.discount_type === 'fixed_brl' ? Math.round(v * 100) : Math.round(v),
                    }))
                  }}
                  min={0}
                  step={payload.discount_type === 'fixed_brl' ? 0.01 : 1}
                />
                <p className="text-xs text-muted-foreground">
                  {payload.discount_type === 'percent' ? '% off' : 'R$ off por mês'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Válido até (opcional)</Label>
                <Input
                  type="date"
                  value={payload.valid_until ? payload.valid_until.slice(0, 10) : ''}
                  onChange={(e) => setPayload((p) => ({ ...p, valid_until: e.target.value || null }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de usos (opcional)</Label>
                <Input
                  type="number"
                  value={payload.max_uses || ''}
                  onChange={(e) => setPayload((p) => ({ ...p, max_uses: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  min={1}
                  placeholder="Ilimitado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Plano específico (opcional)</Label>
              <Select
                value={payload.plan_filter || 'any'}
                onValueChange={(v) => setPayload((p) => ({ ...p, plan_filter: v === 'any' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer plano</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Cupom ativo</Label>
                <p className="text-xs text-muted-foreground">Desligado = LP rejeita esse código.</p>
              </div>
              <Switch checked={payload.is_active} onCheckedChange={(v) => setPayload((p) => ({ ...p, is_active: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar cupom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
