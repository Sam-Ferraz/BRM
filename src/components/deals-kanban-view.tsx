import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Pencil, ChevronDown, User, Package } from "lucide-react"
import { api, type Deal } from "@/lib/api-client"

/**
 * DealsKanbanView — visualização em colunas dos Negócios agrupados por fase.
 *
 * 16 status → 6 colunas de fase:
 *   Atendimento (service_*) | Agendamento (visit_foreseen_*) |
 *   Apresentação (visit_done_*) | Proposta | Vendido | Descartado
 *
 * Fases com sub-temperatura (Atendimento, Agendamento, Apresentação)
 * mostram uma bolinha no card indicando frio/morno/quente. Ao arrastar entre
 * fases, tenta preservar a temperatura atual (ex: service_warm → visit_foreseen_warm).
 *
 * Drag-and-drop: HTML5 nativo. Funciona no desktop; no mobile o usuário abre
 * o menu ⋯ do card e muda status por dropdown (fallback acessível).
 */

// -----------------------------------------------------------------------------
// Modelo das fases (colunas)
// -----------------------------------------------------------------------------

type Temperature = "cold" | "mild" | "warm"

interface PhaseColumn {
  key: string
  label: string
  statuses: Deal["status"][]              // status que caem nesta coluna
  hasTemperature: boolean                 // se true, ao dropar mantém temp
  headerColor: string                     // classes tailwind pro topo da coluna
  // Se hasTemperature=false: qual status usar ao dropar aqui
  singleStatus?: Deal["status"]
  // Se dropou aqui e é descartado, precisa perguntar o motivo
  requiresReason?: boolean
}

const PHASES: PhaseColumn[] = [
  {
    key: "service",
    label: "Atendimento",
    statuses: ["service_cold", "service_mild", "service_warm"],
    hasTemperature: true,
    headerColor: "bg-blue-100 text-blue-900 border-blue-300",
  },
  {
    key: "visit_foreseen",
    label: "Agendamento",
    statuses: ["visit_foreseen_cold", "visit_foreseen_mild", "visit_foreseen_warm"],
    hasTemperature: true,
    headerColor: "bg-amber-100 text-amber-900 border-amber-300",
  },
  {
    key: "visit_done",
    label: "Apresentação",
    statuses: ["visit_done_cold", "visit_done_mild", "visit_done_warm"],
    hasTemperature: true,
    headerColor: "bg-orange-100 text-orange-900 border-orange-300",
  },
  {
    key: "proposal",
    label: "Proposta",
    statuses: ["proposal"],
    hasTemperature: false,
    singleStatus: "proposal",
    headerColor: "bg-purple-100 text-purple-900 border-purple-300",
  },
  {
    key: "contract",
    label: "Contrato",
    statuses: ["contract"],
    hasTemperature: false,
    singleStatus: "contract",
    headerColor: "bg-cyan-100 text-cyan-900 border-cyan-300",
  },
  {
    key: "sold",
    label: "Vendido",
    statuses: ["sold"],
    hasTemperature: false,
    singleStatus: "sold",
    headerColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  {
    key: "discarded",
    label: "Descartado",
    statuses: [
      "discarded_no_profile",
      "discarded_no_interest",
      "discarded_competitor",
      "discarded_error",
    ],
    hasTemperature: false,
    requiresReason: true,
    headerColor: "bg-slate-100 text-slate-900 border-slate-300",
  },
]

// Mapa reverso: status → fase key
const STATUS_TO_PHASE: Record<string, string> = PHASES.reduce((acc, phase) => {
  for (const s of phase.statuses) acc[s] = phase.key
  return acc
}, {} as Record<string, string>)

/**
 * Extrai a temperatura de um status (se aplicável).
 * "service_warm" → "warm"; "proposal" → undefined
 */
function getTemperature(status: Deal["status"]): Temperature | undefined {
  if (status.endsWith("_cold")) return "cold"
  if (status.endsWith("_mild")) return "mild"
  if (status.endsWith("_warm")) return "warm"
  return undefined
}

/**
 * Ao mover pra uma fase com temperatura, tenta preservar a atual.
 * Se veio de fase sem temperatura, assume "warm".
 */
function resolveStatusOnDrop(
  targetPhase: PhaseColumn,
  currentStatus: Deal["status"]
): Deal["status"] | null {
  if (targetPhase.requiresReason) {
    // Descartado precisa escolher motivo — retorna null pra abrir menu
    return null
  }
  if (!targetPhase.hasTemperature) {
    return targetPhase.singleStatus!
  }
  const temp = getTemperature(currentStatus) || "warm"
  return `${targetPhase.key}_${temp}` as Deal["status"]
}

const DISCARD_REASONS: { value: Deal["status"]; label: string }[] = [
  { value: "discarded_no_profile",  label: "Sem perfil" },
  { value: "discarded_no_interest", label: "Sem interesse" },
  { value: "discarded_competitor",  label: "Foi pra concorrência" },
  { value: "discarded_error",       label: "Erro no cadastro" },
]

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(n)) return "—"
  // Sempre 2 casas decimais (R$ 750.000,00)
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function tempIndicator(temp: Temperature | undefined): { color: string; label: string } {
  if (temp === "cold") return { color: "bg-blue-400", label: "Frio" }
  if (temp === "mild") return { color: "bg-amber-400", label: "Morno" }
  if (temp === "warm") return { color: "bg-red-500", label: "Quente" }
  return { color: "bg-slate-300", label: "" }
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

interface DealsKanbanViewProps {
  deals: Deal[]
  onEdit: (deal: Deal) => void
  onStatusChange: (dealId: number, newStatus: Deal["status"]) => Promise<void>
}

export function DealsKanbanView({ deals, onEdit, onStatusChange }: DealsKanbanViewProps) {
  const { t } = useTranslation()
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null)
  // Se o usuário dropou num descartado, precisamos perguntar o motivo
  const [pendingDiscard, setPendingDiscard] = useState<{ dealId: number } | null>(null)

  // Set de dealIds em atraso de cadência — consumido pelo <DealCard> pra decidir
  // se renderiza o badge vermelho. Fetchado uma vez por montagem do Kanban.
  // Recarrega quando o array de deals muda (ex: usuário criou/moveu/deletou).
  const [cadenceSet, setCadenceSet] = useState<Set<number>>(() => new Set())
  useEffect(() => {
    let cancelled = false
    api.deals.getCadence()
      .then((res) => {
        if (!cancelled) setCadenceSet(new Set(res.data.map((r) => r.deal_id)))
      })
      .catch((err) => {
        console.warn("[Kanban] falha ao buscar cadência:", err)
      })
    return () => {
      cancelled = true
    }
  }, [deals.length])

  // Drag-to-scroll horizontal: usuário clica numa área vazia (não em card do
  // deal, que tem seu próprio HTML5 drag) e arrasta pra rolar as colunas.
  // Refs em vez de state — evitamos re-renders no mousemove.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ startX: number; startScrollLeft: number } | null>(null)

  const handleScrollMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Se o click começou dentro de um elemento draggable (card do deal),
    // deixa o HTML5 drag do card assumir. Não sequestra o gesto.
    const target = e.target as HTMLElement
    if (target.closest('[draggable="true"]')) return
    // Só botão esquerdo
    if (e.button !== 0) return
    const el = scrollRef.current
    if (!el) return
    dragState.current = { startX: e.pageX, startScrollLeft: el.scrollLeft }
    el.style.cursor = "grabbing"
    el.style.userSelect = "none"
  }, [])

  const handleScrollMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const st = dragState.current
    const el = scrollRef.current
    if (!st || !el) return
    e.preventDefault()
    const dx = e.pageX - st.startX
    el.scrollLeft = st.startScrollLeft - dx
  }, [])

  const stopScrollDrag = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    dragState.current = null
    el.style.cursor = ""
    el.style.userSelect = ""
  }, [])

  const dealsByPhase = useMemo(() => {
    const map: Record<string, Deal[]> = Object.fromEntries(PHASES.map((p) => [p.key, []]))
    for (const deal of deals) {
      const phaseKey = STATUS_TO_PHASE[deal.status]
      if (phaseKey && map[phaseKey]) {
        map[phaseKey].push(deal)
      }
    }
    // Ordena dentro da coluna: quente > morno > frio, depois por data
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const tA = getTemperature(a.status)
        const tB = getTemperature(b.status)
        const rank = { warm: 0, mild: 1, cold: 2 }
        const rA = tA ? rank[tA] : 3
        const rB = tB ? rank[tB] : 3
        if (rA !== rB) return rA - rB
        // Mais recente primeiro
        return (b.origin_date || "").localeCompare(a.origin_date || "")
      })
    }
    return map
  }, [deals])

  const handleDragStart = (dealId: number) => (e: React.DragEvent) => {
    setDraggingId(dealId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(dealId))
  }

  const handleDragOver = (phaseKey: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverPhase(phaseKey)
  }

  const handleDragLeave = (phaseKey: string) => (e: React.DragEvent) => {
    // Só remove se saiu do container (não dos filhos)
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
    if (dragOverPhase === phaseKey) setDragOverPhase(null)
  }

  const handleDrop = (phase: PhaseColumn) => async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverPhase(null)
    const dealId = parseInt(e.dataTransfer.getData("text/plain"))
    setDraggingId(null)
    if (!dealId) return

    const deal = deals.find((d) => d.id === dealId)
    if (!deal) return

    // Não faz nada se já está na mesma fase
    if (STATUS_TO_PHASE[deal.status] === phase.key) return

    const newStatus = resolveStatusOnDrop(phase, deal.status)
    if (newStatus === null) {
      // Descartado — abrir menu de motivos
      setPendingDiscard({ dealId })
      return
    }
    await onStatusChange(dealId, newStatus)
  }

  const handleDiscardReasonPick = async (status: Deal["status"]) => {
    if (!pendingDiscard) return
    await onStatusChange(pendingDiscard.dealId, status)
    setPendingDiscard(null)
  }

  const handleManualStatusChange = async (deal: Deal, phase: PhaseColumn) => {
    if (STATUS_TO_PHASE[deal.status] === phase.key) return
    const newStatus = resolveStatusOnDrop(phase, deal.status)
    if (newStatus === null) {
      setPendingDiscard({ dealId: deal.id })
      return
    }
    await onStatusChange(deal.id, newStatus)
  }

  return (
    <div className="relative">
      {/* Modal simples pra pedir motivo do descarte */}
      {pendingDiscard && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setPendingDiscard(null)}
        >
          <div
            className="bg-card rounded-lg shadow-lg max-w-sm w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-semibold text-lg">Motivo do descarte</h3>
              <p className="text-sm text-muted-foreground">
                Por que este negócio está sendo descartado?
              </p>
            </div>
            <div className="space-y-2">
              {DISCARD_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleDiscardReasonPick(r.value)}
                  className="w-full text-left px-3 py-2 rounded border hover:bg-accent transition-colors text-sm"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingDiscard(null)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 cursor-grab"
        onMouseDown={handleScrollMouseDown}
        onMouseMove={handleScrollMouseMove}
        onMouseUp={stopScrollDrag}
        onMouseLeave={stopScrollDrag}
      >
        {PHASES.map((phase) => {
          const dealsInPhase = dealsByPhase[phase.key] || []
          const totalValue = dealsInPhase.reduce((sum, d) => {
            const v = typeof d.gsv === "string" ? parseFloat(d.gsv) : (d.gsv || 0)
            return sum + (isNaN(v) ? 0 : v)
          }, 0)
          const isDragOver = dragOverPhase === phase.key
          return (
            <div
              key={phase.key}
              className={`shrink-0 w-72 flex flex-col rounded-lg border-2 transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted/30"
              }`}
              onDragOver={handleDragOver(phase.key)}
              onDragLeave={handleDragLeave(phase.key)}
              onDrop={handleDrop(phase)}
            >
              {/* Header da coluna — sticky */}
              <div
                className={`sticky top-0 z-10 px-3 py-2 rounded-t-lg border-b ${phase.headerColor}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{phase.label}</div>
                  <Badge variant="secondary" className="bg-white/60 text-xs">
                    {dealsInPhase.length}
                  </Badge>
                </div>
                {totalValue > 0 && (
                  <div className="text-[11px] mt-0.5 opacity-70">
                    Total: {formatCurrency(totalValue)}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[80px]">
                {dealsInPhase.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    {isDragOver ? "Solte aqui" : "—"}
                  </div>
                ) : (
                  dealsInPhase.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      isDragging={draggingId === deal.id}
                      onDragStart={handleDragStart(deal.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onEdit={() => onEdit(deal)}
                      onMoveTo={(targetPhase) => handleManualStatusChange(deal, targetPhase)}
                      needsCadence={cadenceSet.has(deal.id)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// DealCard — card compacto dentro da coluna Kanban
// -----------------------------------------------------------------------------

interface DealCardProps {
  deal: Deal
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onEdit: () => void
  onMoveTo: (phase: PhaseColumn) => void
  needsCadence?: boolean
}

function DealCard({ deal, isDragging, onDragStart, onDragEnd, onEdit, onMoveTo, needsCadence }: DealCardProps) {
  const temp = getTemperature(deal.status)
  const tempInfo = tempIndicator(temp)
  // Origem: lead vs manual (heurística — se tem lead_id no futuro, usar aquilo)
  const fromLead = deal.client_origin === "online_lead"

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className={`p-2.5 cursor-pointer active:cursor-grabbing transition-all ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      {/* Header do card: nome cliente + menu */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {temp && (
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${tempInfo.color}`}
              title={tempInfo.label}
            />
          )}
          <span className="font-medium text-sm truncate">{deal.client}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-0.5 rounded hover:bg-accent shrink-0"
              onClick={(e) => e.stopPropagation()}
              aria-label="Ações"
            >
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Mover para</DropdownMenuLabel>
            {PHASES.filter((p) => STATUS_TO_PHASE[deal.status] !== p.key).map((p) => (
              <DropdownMenuItem key={p.key} onClick={() => onMoveTo(p)}>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info secundária */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {deal.property_name && (
          <div className="flex items-center gap-1.5 truncate">
            <Package className="w-3 h-3 shrink-0" />
            <span className="truncate">{deal.property_name}</span>
          </div>
        )}
        {deal.gsv && parseFloat(String(deal.gsv)) > 0 && (
          <div className="font-medium text-foreground">
            {formatCurrency(deal.gsv)}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {deal.client_phone && (
            <span className="truncate">{deal.client_phone}</span>
          )}
          {fromLead && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-400 text-blue-700">
              Lead
            </Badge>
          )}
        </div>
        {needsCadence && (
          <div className="pt-1">
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1 border-red-500 bg-red-50 text-red-700 font-semibold"
              title="Tentativas de atendimento estão abaixo da cadência esperada (menos tentativas do que dias em carteira)."
            >
              Cadência
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}
