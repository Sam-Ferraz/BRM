import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, MessageCircle, Phone, User, Home, CheckCircle2, XCircle, Mic } from "lucide-react"
import { api, type Appointment } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * DealAppointmentsTimeline — linha do tempo vertical dos atendimentos
 * vinculados a um Negócio. Dentro do modal "Editar Negócio", aba
 * "Histórico de atendimento".
 *
 * Cada item mostra:
 *   - Ícone colorido por tipo (chat/call/in_person/visit) na coluna esquerda
 *   - Data + hora formatadas em pt-BR
 *   - Badge de status (Respondido / Não respondido)
 *   - Descrição do atendimento
 *   - Miniatura de player HTML5 se houver áudio anexado
 *
 * Botão "+ Adicionar atendimento" no topo abre um form já pré-preenchido
 * com o Negócio (que auto-preenche Cliente e Telefone).
 */

interface DealAppointmentsTimelineProps {
  dealId: number
  clientName?: string
  /** Handler pra abrir o AppointmentForm com o Negócio pré-selecionado. */
  onAddAppointment: () => void
  /** Trigger externo pra re-fetchar (ex: depois de criar um atendimento novo). */
  reloadKey?: number
}

const TYPE_META: Record<Appointment["type"], { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  chat: { label: "Mensagem", icon: MessageCircle, color: "text-green-700", bg: "bg-green-100" },
  call: { label: "Ligação", icon: Phone, color: "text-blue-700", bg: "bg-blue-100" },
  in_person: { label: "Presencial", icon: User, color: "text-purple-700", bg: "bg-purple-100" },
  visit: { label: "Visita", icon: Home, color: "text-amber-700", bg: "bg-amber-100" },
}

export function DealAppointmentsTimeline({
  dealId,
  clientName,
  onAddAppointment,
  reloadKey = 0,
}: DealAppointmentsTimelineProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.appointments.getAll({ dealId })
      // Ordena por data DESC (mais recente primeiro)
      const sorted = [...res.data].sort((a, b) =>
        (b.scheduled_datetime || "").localeCompare(a.scheduled_datetime || "")
      )
      setAppointments(sorted)
    } catch (err) {
      console.warn("[Timeline] falha ao buscar atendimentos:", err)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header + CTA */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-base">Linha do tempo</h3>
        </div>
        <Button type="button" size="sm" onClick={onAddAppointment}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo atendimento
        </Button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              Nenhum atendimento registrado ainda.
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
            {appointments.map((app) => (
              <TimelineItem key={app.id} appointment={app} />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function TimelineItem({ appointment }: { appointment: Appointment }) {
  const meta = TYPE_META[appointment.type] ?? TYPE_META.chat
  const Icon = meta.icon

  // Formatação de data — se falha o parse, mostra bruto
  let formattedDate = appointment.scheduled_datetime
  try {
    formattedDate = format(parseISO(appointment.scheduled_datetime), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR,
    })
  } catch {
    /* usa raw */
  }

  return (
    <li className="ml-6">
      {/* Ícone na "bolha" fora da linha */}
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn("text-[10px] h-5", meta.bg, meta.color, "border-0")}>
              {meta.label}
            </Badge>
            {appointment.answered ? (
              <Badge variant="outline" className="text-[10px] h-5 border-green-500 text-green-700 bg-green-50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Respondido
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5 border-slate-300 text-slate-600 bg-slate-50">
                <XCircle className="w-3 h-3 mr-1" />
                Não respondido
              </Badge>
            )}
            {appointment.audio_url && (
              <Badge variant="outline" className="text-[10px] h-5 border-red-300 text-red-700 bg-red-50">
                <Mic className="w-3 h-3 mr-1" />
                Áudio
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
        </div>

        {appointment.description ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{appointment.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sem descrição</p>
        )}

        {appointment.audio_url && (
          <audio controls src={appointment.audio_url} className="w-full h-8 mt-1" />
        )}
      </div>
    </li>
  )
}
