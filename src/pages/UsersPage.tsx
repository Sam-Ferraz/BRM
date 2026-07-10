import { useState, useEffect, useCallback } from "react"
import { Link, Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus, Pencil, KeyRound, ShieldOff, ShieldCheck, Users as UsersIcon, RotateCcw, Info } from "lucide-react"
import {
  api,
  type ManagedUser,
  type ManagedUserRole,
  type UserPermissionsView,
} from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

const ROLE_INFO: Record<ManagedUserRole, { label: string; description: string; className: string }> = {
  admin: {
    label: "Admin",
    description: "Total — gerencia usuários e permissões",
    className: "bg-primary hover:bg-primary/90",
  },
  manager: {
    label: "Gerente",
    description: "Aprova propostas, revisa contratos como gestor",
    className: "bg-amber-600 hover:bg-amber-700",
  },
  broker: {
    label: "Corretor",
    description: "Trabalha os próprios negócios",
    className: "bg-blue-600 hover:bg-blue-700",
  },
  sdr: {
    label: "SDR",
    description: "Pré-vendas — triagem de leads, agenda",
    className: "bg-purple-600 hover:bg-purple-700",
  },
  administrative: {
    label: "Administrativo",
    description: "Jurídico/financeiro — revisa contratos",
    className: "bg-slate-600 hover:bg-slate-700",
  },
}

export default function UsersPage() {
  // === HOOKS SEMPRE ANTES DE QUALQUER RETURN ===
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | undefined>()
  const [resetPasswordUser, setResetPasswordUser] = useState<ManagedUser | undefined>()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.userMgmt.listUsers()
      setUsers(result.data)
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao carregar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // Só busca se for admin — evita 403 se por acaso um não-admin acessar
    if (currentUser?.role === "admin") {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [fetchUsers, currentUser?.role])

  // === Gate depois dos hooks ===
  if (currentUser && currentUser.role !== "admin") {
    return <Navigate to="/dashboard" replace />
  }

  const handleToggleActive = async (user: ManagedUser) => {
    const action = user.active ? "desativar" : "ativar"
    if (!confirm(`Deseja ${action} ${user.name}?`)) return
    try {
      await api.userMgmt.updateUser(user.id, { active: !user.active })
      toast({ title: user.active ? "Usuário desativado" : "Usuário ativado" })
      fetchUsers()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar às configurações
              </Link>
            </Button>
            <Button
              onClick={() => {
                setEditingUser(undefined)
                setIsFormOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Novo usuário
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário cadastrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo de acesso</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const info = ROLE_INFO[u.role]
                    return (
                      <TableRow key={u.id} className={u.active ? "" : "opacity-60"}>
                        <TableCell className="font-medium">
                          {u.name}
                          {u.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge className={info?.className || ""}>
                            {info?.label || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.last_login_at
                            ? new Date(u.last_login_at).toLocaleString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {u.active ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUser(u)
                                setIsFormOpen(true)
                              }}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setResetPasswordUser(u)}
                              title="Resetar senha"
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(u)}
                              title={u.active ? "Desativar" : "Ativar"}
                              disabled={u.id === currentUser?.id}
                            >
                              {u.active ? (
                                <ShieldOff className="w-4 h-4 text-red-600" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={editingUser}
        onSaved={() => {
          setIsFormOpen(false)
          setEditingUser(undefined)
          fetchUsers()
        }}
      />

      <ResetPasswordDialog
        user={resetPasswordUser}
        onOpenChange={(open) => !open && setResetPasswordUser(undefined)}
      />
    </div>
  )
}

// Buffer de mudanças de override: role_default vira null (limpa) OU boolean explícito
type OverrideChange = boolean | null // null = "voltar ao padrão do role"

function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: ManagedUser
  onSaved: () => void
}) {
  const { toast } = useToast()
  const isEditing = !!user
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<ManagedUserRole>("broker")
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Seção de permissões
  const [permView, setPermView] = useState<UserPermissionsView | null>(null)
  const [permLoading, setPermLoading] = useState(false)
  // Buffer de mudanças pendentes: permission_id -> allowed | null
  const [pendingPerms, setPendingPerms] = useState<Map<number, OverrideChange>>(new Map())

  useEffect(() => {
    if (!open) return
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setRole(user.role)
      setActive(user.active)
      setPassword("")
    } else {
      setName("")
      setEmail("")
      setPassword("")
      setRole("broker")
      setActive(true)
    }
    setPendingPerms(new Map())
    setPermView(null)
  }, [open, user])

  // Carrega permissões do usuário quando abre em modo edição
  useEffect(() => {
    if (!open || !user || user.role === "admin") return
    let cancelled = false
    ;(async () => {
      try {
        setPermLoading(true)
        const res = await api.userMgmt.getUserPermissions(user.id)
        if (!cancelled) setPermView(res.data)
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Erro",
            description: err instanceof Error ? err.message : "Falha ao carregar permissões",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setPermLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, user, toast])

  const getEffective = (permId: number, roleDefault: boolean, currentOverride: boolean | null): boolean => {
    if (pendingPerms.has(permId)) {
      const p = pendingPerms.get(permId)
      if (p === null) return roleDefault
      return !!p
    }
    if (currentOverride !== null) return currentOverride
    return roleDefault
  }

  const togglePermission = (
    permId: number,
    roleDefault: boolean,
    currentOverride: boolean | null,
    currentEffective: boolean
  ) => {
    const newValue = !currentEffective
    // Se o novo valor coincide com o padrão do role → grava null (remove override)
    // Senão → grava o valor explícito
    const change: OverrideChange = newValue === roleDefault ? null : newValue

    setPendingPerms((prev) => {
      const next = new Map(prev)
      // Se coincide com o override atual persistido (ou com role_default se não há), remove do pending
      const persistedOrDefault = currentOverride !== null ? currentOverride : roleDefault
      if (change === null && currentOverride === null) {
        // Já está sem override e queremos remover → nada a fazer
        next.delete(permId)
      } else if (change !== null && change === persistedOrDefault && currentOverride === null) {
        // Mudança seria pro mesmo valor do role_default e não há override → não precisa gravar
        next.delete(permId)
      } else {
        next.set(permId, change)
      }
      return next
    })
  }

  const resetToRoleDefault = (permId: number, currentOverride: boolean | null) => {
    setPendingPerms((prev) => {
      const next = new Map(prev)
      if (currentOverride === null) {
        // Já está no padrão do role — remove qualquer mudança pendente
        next.delete(permId)
      } else {
        // Vai remover o override existente
        next.set(permId, null)
      }
      return next
    })
  }

  const permDirtyCount = pendingPerms.size

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEditing) {
        // 1. Atualiza dados básicos
        await api.userMgmt.updateUser(user!.id, { name, email, role, active })
        // 2. Salva overrides se houver mudanças
        if (permDirtyCount > 0) {
          const updates = Array.from(pendingPerms.entries()).map(([permission_id, allowed]) => ({
            permission_id,
            allowed,
          }))
          await api.userMgmt.saveUserPermissions(user!.id, updates)
        }
        toast({
          title: "Usuário atualizado",
          description: permDirtyCount > 0 ? `Também ${permDirtyCount} ajuste(s) de permissão.` : undefined,
        })
      } else {
        if (password.length < 8) {
          toast({
            title: "Senha muito curta",
            description: "Mínimo de 8 caracteres.",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
        await api.userMgmt.createUser({ name, email, password, role })
        toast({ title: "Usuário criado" })
      }
      onSaved()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nome *</Label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
            </div>
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="user-password">Senha inicial *</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="user-role">Tipo de acesso *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ManagedUserRole)}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div>
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-muted-foreground">Total — gerencia usuários e permissões</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div>
                      <div className="font-medium">Gerente</div>
                      <div className="text-xs text-muted-foreground">Aprova propostas, revisa contratos como gestor</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="broker">
                    <div>
                      <div className="font-medium">Corretor</div>
                      <div className="text-xs text-muted-foreground">Trabalha os próprios negócios</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="sdr">
                    <div>
                      <div className="font-medium">SDR</div>
                      <div className="text-xs text-muted-foreground">Pré-vendas — triagem de leads, agenda</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="administrative">
                    <div>
                      <div className="font-medium">Administrativo</div>
                      <div className="text-xs text-muted-foreground">Jurídico/financeiro — revisa contratos</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seção de permissões — só na edição, e só se role != admin */}
            {isEditing && role !== "admin" && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                    <UsersIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Permissões da rotina</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Habilite ou desabilite rotinas específicas pra este usuário — sobrescreve o padrão do tipo de acesso.
                    </p>
                  </div>
                  {permDirtyCount > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 shrink-0">
                      {permDirtyCount} pendente(s)
                    </Badge>
                  )}
                </div>

                {permLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Carregando permissões...</p>
                ) : !permView ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Não foi possível carregar.</p>
                ) : (
                  <div className="space-y-3">
                    {permView.modules.map((mod) => (
                      <div key={mod.module} className="rounded-md border bg-muted/20 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          {mod.label}
                        </p>
                        <div className="space-y-2">
                          {mod.permissions.map((perm) => {
                            const currentOverride = pendingPerms.has(perm.id)
                              ? pendingPerms.get(perm.id)!
                              : perm.override
                            const effective = getEffective(perm.id, perm.role_default, perm.override)
                            const isCustom = pendingPerms.has(perm.id)
                              ? pendingPerms.get(perm.id) !== null
                              : perm.override !== null

                            return (
                              <div key={perm.id} className="flex items-start gap-3 text-sm">
                                <Checkbox
                                  checked={effective}
                                  onCheckedChange={() =>
                                    togglePermission(perm.id, perm.role_default, perm.override, effective)
                                  }
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{perm.label}</span>
                                    {isCustom ? (
                                      <Badge
                                        variant="outline"
                                        className={
                                          effective
                                            ? "text-[10px] border-emerald-500 text-emerald-700 bg-emerald-50"
                                            : "text-[10px] border-red-500 text-red-700 bg-red-50"
                                        }
                                      >
                                        {effective ? "Concedido" : "Negado"} pra este usuário
                                      </Badge>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Info className="w-3 h-3" /> Padrão do tipo:{" "}
                                        {perm.role_default ? "permite" : "nega"}
                                      </span>
                                    )}
                                  </div>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                                  )}
                                </div>
                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => resetToRoleDefault(perm.id, perm.override)}
                                    className="text-xs text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1"
                                    title="Voltar ao padrão do tipo de acesso"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Voltar padrão
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user?: ManagedUser
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setPassword("")
  }, [user])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (password.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "Mínimo de 8 caracteres.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      await api.userMgmt.resetPassword(user.id, password)
      toast({ title: "Senha resetada" })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Resetar senha</DialogTitle>
        </DialogHeader>
        {user && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Definindo nova senha pra <strong>{user.name}</strong> ({user.email}).
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-pw">Nova senha</Label>
              <Input
                id="reset-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Resetar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
