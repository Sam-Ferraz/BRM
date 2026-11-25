import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  MessageCircle,
  Phone,
  User,
  Home,
  CheckCircle2,
  XCircle,
  Mic,
  CalendarClock,
  Clock,
  AlertTriangle,
  Check,
} from "lucide-react"
import { api, type Appointment, type FollowUpWithDetails } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * DealAppointmentsTimeline — linha do tempo unificada do Negócio, mostrando
 * atendimentos E follow-ups ordenados por data (mais recente primeiro).
 * A aba antiga "Follow-up" foi removida do DealEditor — todos os dados dela
 * agora aparecem aqui, como itens de outro tipo no mesmo feed.
 *
 * Tipos de item renderizados:
 *   - Appointment: badge do tipo (chat/call/in_person/visit/schedule),
 *     descrição livre, áudio quando houver, imóvel vinculado.
 *   - Follow-up: badge do status (open/pending/overdue/completed), texto da
 *     próxima ação, botão "Marcar como concluído".
 */

interface DealAppointmentsTimelineProps {
  dealId: number
  clientName?: string
  /** Handler pra abrir o AppointmentForm com o Negócio pré-selecionado. */
  onAddAppointment: () => void
  /** Trigger externo pra re-fetchar (ex: depois de criar um atendimento/follow-up). */
  reloadKey?: number
}

const TYPE_META: Record<Appointment["type"], { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  chat: { label: "Mensagem", icon: MessageCircle, color: "text-green-700", bg: "bg-green-100" },
  call: { label: "Ligação", icon: Phone, color: "text-blue-700", bg: "bg-blue-100" },
  in_person: { label: "Presencial", icon: User, color: "text-purple-700", bg: "bg-purple-100" },
  visit: { label: "Visita", icon: Home, color: "text-amber-700", bg: "bg-amber-100" },
  schedule: { label: "Agendamento", icon: CalendarClock, color: "text-yellow-800", bg: "bg-yellow-100" },
}

const SCHEDULE_ACTION_LABEL: Record<string, string> = {
  meeting: "Reunião de acompanhamento",
  visit: "Visita presencial",
  remote_presentation: "Apresentação remota",
}

const FOLLOWUP_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  open: { label: "Aberto", color: "text-blue-700", bg: "bg-blue-100", icon: Clock },
  pending: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-100", icon: Clock },
  overdue: { label: "Atrasado", color: "text-red-700", bg: "bg-red-100", icon: AlertTriangle },
  completed: { label: "Concluído", color: "text-green-700", bg: "bg-green-100", icon: CheckCircle2 },
}

// Item unificado da timeline — discrimina via `kind` para o render decidir.
type TimelineRow =
  | { kind: "appointment"; date: string; data: Appointment }
  | { kind: "followup"; date: string; data: FollowUpWithDetails }

export function DealAppointmentsTimeline({
  dealId,
  onAddAppointment,
  reloadKey = 0,
}: DealAppointmentsTimelineProps) {
  const [rows, setRows] = useState<TimelineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [completingFollowUp, setCompletingFollowUp] = useState<number | null>(null)
  const [completingSchedule, setCompletingSchedule] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Busca os dois em paralelo. Promise.all falha se um falhar — tratamos
      // individualmente com allSettled pra tolerar erro parcial (se um deles
      // der 500 o outro ainda renderiza).
      const [apRes, fuRes] = await Promise.allSettled([
        api.appointments.getAll({ dealId }),
        api.followUps.getAll({ dealId }),
      ])

      const appointmentRows: TimelineRow[] =
        apRes.status === "fulfilled"
          ? (apRes.value.data || []).map((a) => ({
              kind: "appointment" as const,
              date: a.scheduled_datetime || "",
              data: a,
            }))
          : []

      const followUpRows: TimelineRow[] =
        fuRes.status === "fulfilled"
          ? (fuRes.value.data || []).map((f) => ({
              kind: "followup" as const,
              date: f.next_action_date || "",
              data: f,
            }))
          : []

      // Ordena DESC por data — comparação lexicográfica funciona pq ambos
      // os formatos sao ISO (YYYY-MM-DD vs YYYY-MM-DDTHH:mm), e o followup
      // de curto formato fica "abaixo" do appointment do mesmo dia, o que
      // esta OK pra visualizacao.
      const merged = [...appointmentRows, ...followUpRows].sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      )

      setRows(merged)
    } catch (err) {
      console.warn("[Timeline] falha ao buscar atendimentos/follow-ups:", err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const handleCompleteFollowUp = async (id: number) => {
    setCompletingFollowUp(id)
    try {
      await api.followUps.markAsCompleted(id)
      await load()
    } catch (err) {
      console.warn("[Timeline] falha ao concluir follow-up:", err)
    } finally {
      setCompletingFollowUp(null)
    }
  }

  // Concluir um agendamento = converter o registro para visita realizada.
  // Backend recebe PUT com type='visit' e answered=true; schedule_action
  // volta a null (nao faz sentido em visita direta); property_name e
  // preservado pq visita direta tambem exige imovel.
  const handleCompleteSchedule = async (appointment: Appointment) => {
    setCompletingSchedule(appointment.id)
    try {
      await api.appointments.update(appointment.id, {
        client: appointment.client,
        type: "visit",
        scheduled_datetime: appointment.scheduled_datetime,
        description: appointment.description ?? "",
        answered: true,
        property_name: appointment.property_name ?? null,
        audio_url: appointment.audio_url ?? null,
        deal_id: appointment.deal_id ?? null,
        schedule_action: null,
      } as any)
      await load()
    } catch (err) {
      console.warn("[Timeline] falha ao concluir agendamento:", err)
    } finally {
      setCompletingSchedule(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="shrink-0">
        <h3 className="font-semibold text-base">Linha do tempo</h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              Nenhum atendimento ou follow-up registrado ainda.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onAddAppointment}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Registrar o primeiro
            </Button>
          </div>
        ) : (
          <ol className="relative border-l-2 border-muted ml-4 space-y-4 pt-1">
            {rows.map((row) =>
              row.kind === "appointment" ? (
                <AppointmentTimelineItem
                  key={`a-${row.data.id}`}
                  appointment={row.data}
                  onCompleteSchedule={() => handleCompleteSchedule(row.data)}
                  completingSchedule={completingSchedule === row.data.id}
                />
              ) : (
                <FollowUpTimelineItem
                  key={`f-${row.data.id}`}
                  followUp={row.data}
                  onComplete={() => handleCompleteFollowUp(row.data.id)}
                  completing={completingFollowUp === row.data.id}
                />
              )
            )}
          </ol>
        )}
      </div>
    </div>
  )
}

function AppointmentTimelineItem({
  appointment,
  onCompleteSchedule,
  completingSchedule,
}: {
  appointment: Appointment
  onCompleteSchedule: () => void
  completingSchedule: boolean
}) {
  const meta = TYPE_META[appointment.type] ?? TYPE_META.chat
  const Icon = meta.icon

  let formattedDate = appointment.scheduled_datetime
  try {
    formattedDate = format(parseISO(appointment.scheduled_datetime), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR,
    })
  } catch {
    /* usa raw */
  }

  const isSchedule = appointment.type === "schedule"
  const scheduleActionLabel = isSchedule && appointment.schedule_action
    ? SCHEDULE_ACTION_LABEL[appointment.schedule_action]
    : null
  // Agendamento mostra imovel quando a acao e visita presencial ou apresentacao remota.
  // Visita direta tambem exibe.
  const showProperty =
    (appointment.type === "visit" ||
      (isSchedule && (appointment.schedule_action === "visit" || appointment.schedule_action === "remote_presentation"))) &&
    !!appointment.property_name

  return (
    <li className="ml-6">
      <span
        className={cn(
          "absolute -left-[17px] flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-background shadow-sm",
          meta.bg,
        )}
      >
        <Icon className={cn("w-4 h-4", meta.color)} />
      </span>

      <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn("text-[10px] h-5", meta.bg, meta.color, "border-0")}>
              {meta.label}
            </Badge>
            {scheduleActionLabel && (
              <Badge variant="outline" className="text-[10px] h-5 border-yellow-400 text-yellow-900 bg-yellow-50">
                {scheduleActionLabel}
              </Badge>
            )}
            {appointment.answered ? (
              <Badge variant="outline" className="text-[10px] h-5 border-green-500 text-green-700 bg-green-50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Realizado
              </Badge>
            ) : isSchedule ? (
              // Agendamento aberto (ainda nao concluido) exibe "Previsto" —
              // estado de compromisso marcado mas nao consumado.
              <Badge variant="outline" className="text-[10px] h-5 border-blue-400 text-blue-700 bg-blue-50">
                <Clock className="w-3 h-3 mr-1" />
                Previsto
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5 border-slate-300 text-slate-600 bg-slate-50">
                <XCircle className="w-3 h-3 mr-1" />
                Não realizado
              </Badge>
            )}
            {appointment.audio_url && !isSchedule && (
              <Badge variant="outline" className="text-[10px] h-5 border-red-300 text-red-700 bg-red-50">
                <Mic className="w-3 h-3 mr-1" />
                Áudio
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
        </div>

        {showProperty && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Home className="w-3 h-3 shrink-0" />
            <span>
              {isSchedule ? "Imóvel a apresentar: " : "Imóvel apresentado: "}
              <span className="font-medium text-foreground">{appointment.property_name}</span>
            </span>
          </div>
        )}

        {!isSchedule && (
          appointment.description ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{appointment.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sem descrição</p>
          )
        )}

        {appointment.audio_url && !isSchedule && (
          <audio controls src={appointment.audio_url} className="w-full h-8 mt-1" />
        )}

        {/* Agendamento previsto pode ser concluido pela timeline. Ao concluir
            o registro vira type='visit' com answered=true — passa a contar
            como visita realizada nos indicadores. */}
        {isSchedule && !appointment.answered && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs mt-1"
            disabled={completingSchedule}
            onClick={onCompleteSchedule}
          >
            <Check className="w-3 h-3 mr-1" />
            {completingSchedule ? "Concluindo..." : "Marcar como concluído"}
          </Button>
        )}
      </div>
    </li>
  )
}

function FollowUpTimelineItem({
  followUp,
  onComplete,
  completing,
}: {
  followUp: FollowUpWithDetails
  onComplete: () => void
  completing: boolean
}) {
  const statusKey = followUp.completed ? "completed" : followUp.followup_status
  const meta = FOLLOWUP_STATUS_META[statusKey] ?? FOLLOWUP_STATUS_META.open
  const Icon = meta.icon

  let formattedDate = followUp.next_action_date
  try {
    formattedDate = format(parseISO(followUp.next_action_date), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    /* usa raw */
  }

  return (
    <li className="ml-6">
      <span
        className={cn(
          "absolute -left-[17px] flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-background shadow-sm",
          meta.bg,
        )}
      >
        <Icon className={cn("w-4 h-4", meta.color)} />
      </span>

      <div className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn("text-[10px] h-5", meta.bg, meta.color, "border-0")}>
              Follow-up
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] h-5 border-current bg-background", meta.color)}
            >
              {meta.label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">Próxima ação em {formattedDate}</span>
        </div>

        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{followUp.next_action}</p>

        {!followUp.completed && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={completing}
            onClick={onComplete}
          >
            <Check className="w-3 h-3 mr-1" />
            {completing ? "Concluindo..." : "Marcar como concluído"}
          </Button>
        )}
      </div>
    </li>
  )
}
