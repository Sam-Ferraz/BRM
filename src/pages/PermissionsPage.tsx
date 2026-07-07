import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Shield, Save, Lock } from "lucide-react"
import { api, type PermissionsMatrix, type UserRole } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

/**
 * PermissionsPage — matriz roles × permissões editável.
 *
 * Coluna Admin não é editável (sempre marcada e desabilitada) — admin
 * sempre pode tudo por regra do sistema (bypass no backend).
 *
 * Ao clicar num checkbox, marca a mudança em um "buffer" (dirty state).
 * Só quando o admin clica em "Salvar" que envia o bulk pra API.
 */

const ROLE_ORDER: UserRole[] = ["admin", "manager", "broker", "sdr", "administrative"]
const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Gerente",
  broker: "Corretor",
  sdr: "SDR",
  administrative: "Administrativo",
}

interface PendingChange {
  role: UserRole
  permissionId: number
  allowed: boolean
}

export default function PermissionsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />
  }

  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Buffer de mudanças pendentes indexadas por "role:permId"
  const [pending, setPending] = useState<Map<string, PendingChange>>(new Map())

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.permissions.getMatrix()
      setMatrix(res.data)
      setPending(new Map())
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao carregar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetch()
  }, [fetch])

  const dirtyCount = pending.size

  /**
   * Toggle uma célula: se o novo valor bater com o que já está no matrix,
   * remove do pending; senão adiciona/atualiza.
   */
  const toggle = (role: UserRole, permissionId: number, currentAllowed: boolean) => {
    const key = `${role}:${permissionId}`
    const newAllowed = !currentAllowed
    setPending((prev) => {
      const next = new Map(prev)
      // Se estamos revertendo pra o estado original que veio do backend,
      // remove do pending pra manter o buffer enxuto
      const original = getOriginal(matrix, role, permissionId)
      if (original === newAllowed) {
        next.delete(key)
      } else {
        next.set(key, { role, permissionId, allowed: newAllowed })
      }
      return next
    })
  }

  const isChecked = (role: UserRole, permissionId: number, defaultAllowed: boolean): boolean => {
    const key = `${role}:${permissionId}`
    const p = pending.get(key)
    if (p) return p.allowed
    return defaultAllowed
  }

  const handleSave = async () => {
    if (dirtyCount === 0) return
    try {
      setSaving(true)
      const updates = Array.from(pending.values()).map((p) => ({
        role: p.role,
        permission_id: p.permissionId,
        allowed: p.allowed,
      }))
      await api.permissions.saveMatrix(updates)
      toast({
        title: "Permissões salvas",
        description: `${dirtyCount} ${dirtyCount === 1 ? "alteração" : "alterações"}.`,
      })
      // Recarrega pra ver reflexo do banco
      await fetch()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
            <Button onClick={handleSave} disabled={saving || dirtyCount === 0}>
              <Save className="w-4 h-4 mr-2" />
              {saving
                ? "Salvando..."
                : dirtyCount > 0
                ? `Salvar (${dirtyCount})`
                : "Sem mudanças"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Matriz de Permissões
            </CardTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Marque quais rotinas cada tipo de usuário pode executar. A coluna{" "}
              <strong>Admin</strong> é bloqueada — admin sempre pode tudo.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Carregando matriz...</div>
            ) : !matrix ? (
              <div className="text-center py-16 text-muted-foreground">
                Não foi possível carregar a matriz.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-sm font-semibold">
                        Rotina
                      </th>
                      {ROLE_ORDER.map((r) => (
                        <th
                          key={r}
                          className="text-center py-2 px-2 text-xs font-semibold w-24"
                        >
                          {ROLE_LABELS[r]}
                          {r === "admin" && (
                            <Lock className="w-3 h-3 inline-block ml-1 text-muted-foreground" />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.modules.map((mod) => (
                      <ModuleRows
                        key={mod.module}
                        module={mod}
                        isChecked={isChecked}
                        onToggle={toggle}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Renderiza o header do módulo + linhas de cada permissão. Componente
 * separado pra evitar re-render desnecessário do resto quando um checkbox
 * é clicado.
 */
function ModuleRows({
  module,
  isChecked,
  onToggle,
}: {
  module: PermissionsMatrix["modules"][number]
  isChecked: (role: UserRole, permissionId: number, defaultAllowed: boolean) => boolean
  onToggle: (role: UserRole, permissionId: number, currentAllowed: boolean) => void
}) {
  return (
    <>
      <tr className="bg-muted/40">
        <td colSpan={ROLE_ORDER.length + 1} className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {module.label}
        </td>
      </tr>
      {module.permissions.map((perm) => (
        <tr key={perm.id} className="border-b hover:bg-accent/30">
          <td className="py-2 pr-4">
            <div className="text-sm">{perm.label}</div>
            {perm.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{perm.description}</div>
            )}
          </td>
          {ROLE_ORDER.map((role) => {
            const defaultAllowed = perm.allowed[role]
            const checked = isChecked(role, perm.id, defaultAllowed)
            const isAdminCol = role === "admin"
            return (
              <td key={role} className="text-center px-2 py-2">
                <Checkbox
                  checked={checked}
                  disabled={isAdminCol}
                  onCheckedChange={() =>
                    !isAdminCol && onToggle(role, perm.id, checked)
                  }
                  aria-label={`${role} pode ${perm.label}`}
                />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

function getOriginal(
  matrix: PermissionsMatrix | null,
  role: UserRole,
  permissionId: number
): boolean {
  if (!matrix) return false
  for (const mod of matrix.modules) {
    for (const p of mod.permissions) {
      if (p.id === permissionId) return p.allowed[role]
    }
  }
  return false
}
