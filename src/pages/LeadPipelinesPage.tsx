import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { ArrowLeft, Plus, Pencil, Trash2, Route, Clock, Timer, User, GripVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { api, type LeadPipeline, type LeadPipelinePayload, type ManagedUser } from "@/lib/api-client"

/**
 * LeadPipelinesPage — CRUD das Esteiras de Leads.
 *
 * Uma esteira define quem recebe leads em cada janela horária, em que
 * ordem, quanto tempo cada corretor tem pra aceitar (timeout) e quem é o
 * gerente que herda se ninguém aceitar. Este arquivo cobre APENAS a
 * configuração — a mecânica de escalação em tempo real vem em uma segunda
 * iteração (webhook do lead → assignment com expiration → escalação).
 *
 * Acesso restrito ao role 'admin' (gerentes podem participar mas não
 * configurar).
 */

const HOURS_0_23 = Array.from({ length: 24 }, (_, i) => i)

// Formata segundos como "5min 30s" / "1h 15min" — o backend guarda segundos
// mas o corretor pensa em minutos, então mostramos por extenso.
function formatSeconds(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "—"
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}min`)
  if (s && !h) parts.push(`${s}s`)
  return parts.join(" ") || `${total}s`
}

const emptyPayload = (): LeadPipelinePayload => ({
  name: "",
  hour_start: 8,
  hour_end: 18,
  timeout_seconds: 300,
  manager_user_id: 0,
  is_active: true,
  member_user_ids: [],
})

export default function LeadPipelinesPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [pipelines, setPipelines] = useState<LeadPipeline[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [payload, setPayload] = useState<LeadPipelinePayload>(emptyPayload())

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pipelinesRes, usersRes] = await Promise.all([
        api.leadPipelines.list(),
        api.userMgmt.listUsers(),
      ])
      setPipelines(pipelinesRes.data)
      setUsers(usersRes.data.filter((u) => u.active))
    } catch (err) {
      toast({
        title: "Erro ao carregar",
        description: err instanceof Error ? err.message : "Falha na requisição",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const usersById = useMemo(() => {
    const map = new Map<number, ManagedUser>()
    for (const u of users) map.set(u.id, u)
    return map
  }, [users])

  // Gate: só admin pode gerenciar esteiras
  if (currentUser && currentUser.role !== "admin") {
    return <Navigate to="/dashboard" replace />
  }

  const openCreate = () => {
    setEditingId(null)
    setPayload(emptyPayload())
    setDialogOpen(true)
  }

  const openEdit = (p: LeadPipeline) => {
    setEditingId(p.id)
    setPayload({
      name: p.name,
      hour_start: p.hour_start,
      hour_end: p.hour_end,
      timeout_seconds: p.timeout_seconds,
      manager_user_id: p.manager_user_id,
      is_active: p.is_active,
      member_user_ids: p.members.map((m) => m.user_id),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingId) {
        await api.leadPipelines.update(editingId, payload)
      } else {
        await api.leadPipelines.create(payload)
      }
      toast({ title: editingId ? "Esteira atualizada" : "Esteira criada" })
      setDialogOpen(false)
      loadAll()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao salvar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Remover essa esteira? Não é possível desfazer.")) return
    try {
      await api.leadPipelines.delete(id)
      toast({ title: "Esteira removida" })
      loadAll()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao remover",
        variant: "destructive",
      })
    }
  }

  // Manipulação da lista ordenada de corretores dentro do form
  const availableForMembers = users.filter(
    (u) => u.id !== payload.manager_user_id && !payload.member_user_ids.includes(u.id),
  )

  const addMember = (userId: number) => {
    setPayload((prev) => ({ ...prev, member_user_ids: [...prev.member_user_ids, userId] }))
  }
  const removeMember = (userId: number) => {
    setPayload((prev) => ({
      ...prev,
      member_user_ids: prev.member_user_ids.filter((id) => id !== userId),
    }))
  }
  const moveMember = (from: number, to: number) => {
    setPayload((prev) => {
      const arr = [...prev.member_user_ids]
      if (to < 0 || to >= arr.length) return prev
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return { ...prev, member_user_ids: arr }
    })
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
            Nova esteira
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Esteiras de Leads
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure janelas de horário e listas ordenadas de corretores. Quando um lead chega, o sistema oferece pro
              primeiro da fila; se ele não aceitar dentro do tempo limite, o lead pula pro próximo. Se ninguém aceitar,
              vai pro gerente supervisor.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : pipelines.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Route className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma esteira configurada.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar a primeira
                </Button>
              </div>
            ) : (
              pipelines.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">{p.name}</h3>
                        {p.is_active ? (
                          <Badge className="bg-green-100 text-green-800 border-0 text-xs">Ativa</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Inativa
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {String(p.hour_start).padStart(2, "0")}:00 –{" "}
                          {String(p.hour_end).padStart(2, "0")}:59
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5" />
                          Timeout: {formatSeconds(p.timeout_seconds)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          Gerente: {p.manager_name || `#${p.manager_user_id}`}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.members.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Sem corretores</span>
                        ) : (
                          p.members.map((m, idx) => (
                            <Badge key={m.user_id} variant="secondary" className="text-xs">
                              {idx + 1}. {m.name || `#${m.user_id}`}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar esteira" : "Nova esteira"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pipeline-name"
                value={payload.name}
                onChange={(e) => setPayload((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Plantão manhã / Alto padrão"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Horário inicial *</Label>
                <Select
                  value={String(payload.hour_start)}
                  onValueChange={(v) => setPayload((p) => ({ ...p, hour_start: parseInt(v, 10) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS_0_23.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário final *</Label>
                <Select
                  value={String(payload.hour_end)}
                  onValueChange={(v) => setPayload((p) => ({ ...p, hour_end: parseInt(v, 10) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS_0_23.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}:59
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">
                Tempo limite para aceitação (segundos) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="timeout"
                type="number"
                min={10}
                step={10}
                value={payload.timeout_seconds}
                onChange={(e) =>
                  setPayload((p) => ({ ...p, timeout_seconds: parseInt(e.target.value, 10) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Equivale a {formatSeconds(payload.timeout_seconds)}. Se o corretor não aceitar nesse tempo, o lead pula
                pro próximo.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Gerente supervisor <span className="text-red-500">*</span>
              </Label>
              <Select
                value={payload.manager_user_id ? String(payload.manager_user_id) : ""}
                onValueChange={(v) => setPayload((p) => ({ ...p, manager_user_id: parseInt(v, 10) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar gerente" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.role === "manager" || u.role === "admin")
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} — {u.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Recebe o lead se nenhum corretor da lista aceitar.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Corretores na ordem de tentativa <span className="text-red-500">*</span>
              </Label>
              <div className="rounded-md border bg-muted/30 p-2 space-y-2">
                {payload.member_user_ids.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhum corretor adicionado ainda.
                  </p>
                ) : (
                  payload.member_user_ids.map((uid, idx) => {
                    const u = usersById.get(uid)
                    return (
                      <div
                        key={uid}
                        className="flex items-center gap-2 bg-card border rounded px-2 py-1.5"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="w-6 text-xs font-mono text-muted-foreground">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm truncate">
                          {u ? `${u.name} (${u.email})` : `#${uid}`}
                        </span>
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveMember(idx, idx - 1)}
                            disabled={idx === 0}
                            title="Subir"
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveMember(idx, idx + 1)}
                            disabled={idx === payload.member_user_ids.length - 1}
                            title="Descer"
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600"
                            onClick={() => removeMember(uid)}
                            title="Remover"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {availableForMembers.length > 0 && (
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(v) => addMember(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Adicionar corretor à fila" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableForMembers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name} ({u.email}) — {u.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="is_active">Esteira ativa</Label>
                <p className="text-xs text-muted-foreground">Quando desligada, novos leads não passam por essa esteira.</p>
              </div>
              <Switch
                id="is_active"
                checked={payload.is_active}
                onCheckedChange={(checked) => setPayload((p) => ({ ...p, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
