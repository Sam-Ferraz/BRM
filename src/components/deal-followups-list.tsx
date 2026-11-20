import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, CheckCircle2, Clock, AlertTriangle, Check, Plus } from "lucide-react"
import { api, type FollowUpWithDetails } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * Lista de follow-ups vinculados a um Negocio. Dentro do modal "Editar
 * Negocio", aba "Follow-up". Analogo ao DealAppointmentsTimeline mas pra
 * follow-ups — inclui tanto os que estao vinculados a um appointment do
 * deal quanto os "avulsos" criados direto do DealEditor.
 *
 * Filtro no backend: /follow-ups?dealId=X — ver followup-repository.ts.
 */

interface DealFollowUpsListProps {
  dealId: number
  /** Handler pra abrir o form de "Novo follow-up" ja apontando pro deal. */
  onAddFollowUp: () => void
  /** Trigger externo pra re-fetchar (ex: depois de criar/concluir). */
  reloadKey?: number
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: "Aberto", color: "text-blue-700", bg: "bg-blue-50 border-blue-300", icon: Clock },
  pending: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-50 border-amber-300", icon: Clock },
  overdue: { label: "Atrasado", color: "text-red-700", bg: "bg-red-50 border-red-300", icon: AlertTriangle },
  completed: { label: "Concluído", color: "text-green-700", bg: "bg-green-50 border-green-300", icon: CheckCircle2 },
}

export function DealFollowUpsList({ dealId, onAddFollowUp, reloadKey = 0 }: DealFollowUpsListProps) {
  const [items, setItems] = useState<FollowUpWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.followUps.getAll({ dealId })
      const sorted = [...(res.data || [])].sort((a, b) =>
        (b.next_action_date || "").localeCompare(a.next_action_date || "")
      )
      setItems(sorted)
    } catch (err) {
      console.warn("[DealFollowUpsList] falha ao buscar:", err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const handleComplete = async (id: number) => {
    setCompleting(id)
    try {
      await api.followUps.markAsCompleted(id)
      await load()
    } catch (err) {
      console.warn("[DealFollowUpsList] falha ao concluir:", err)
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="shrink-0 flex items-center justify-between">
        <h3 className="font-semibold text-base">Follow-ups do negócio</h3>
        <Button type="button" size="sm" variant="outline" onClick={onAddFollowUp}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              Nenhum follow-up registrado pra esse negócio.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onAddFollowUp}>
              <Plus className="w-4 h-4 mr-1.5" />
              Criar o primeiro
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((f) => {
              const statusKey = f.completed ? "completed" : f.followup_status
              const meta = STATUS_META[statusKey] ?? STATUS_META.open
              const StatusIcon = meta.icon

              let formattedDate = f.next_action_date
              try {
                formattedDate = format(parseISO(f.next_action_date), "dd/MM/yyyy", { locale: ptBR })
              } catch {
                /* usa raw */
              }

              return (
                <li
                  key={f.id}
                  className={cn("rounded-lg border p-3 flex items-start gap-3 shadow-sm", meta.bg)}
                >
                  <StatusIcon className={cn("w-5 h-5 shrink-0 mt-0.5", meta.color)} />

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground break-words">
                        {f.next_action}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5 shrink-0", meta.color, "border-current bg-background")}
                      >
                        {meta.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="w-3 h-3" />
                      <span>Próxima ação em {formattedDate}</span>
                    </div>

                    {!f.completed && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs mt-1"
                        disabled={completing === f.id}
                        onClick={() => handleComplete(f.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {completing === f.id ? "Concluindo..." : "Marcar como concluído"}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
