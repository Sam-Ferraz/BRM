import { cn } from "@/lib/utils"

/**
 * Indicador visual da cadência de um Negócio.
 *
 * Estados:
 *   - "ok"        → verde  (é lead, dentro dos 8 dias, tentativas em dia)
 *   - "overdue"   → vermelho (é lead, tentativas < dias em carteira)
 *   - "na"        → cinza  (não é lead — sem análise; ex: cliente cadastrado manual)
 *
 * Renderiza um círculo colorido pequeno + label opcional. Reutilizado tanto
 * na tabela de Negócios quanto no card do Kanban.
 */

export type CadenceState = "ok" | "overdue" | "na"

interface CadenceIndicatorProps {
  state: CadenceState
  showLabel?: boolean
  className?: string
}

const CONFIG: Record<CadenceState, { color: string; label: string; title: string }> = {
  ok: {
    color: "bg-green-500",
    label: "Em dia",
    title: "Cadência em dia — tentativas suficientes para os dias em carteira.",
  },
  overdue: {
    color: "bg-red-500",
    label: "Atrasada",
    title: "Cadência atrasada — tentativas abaixo dos dias em carteira. Fazer contato hoje.",
  },
  na: {
    color: "bg-slate-300",
    label: "—",
    title: "Sem análise de cadência (cliente cadastrado manualmente).",
  },
}

export function CadenceIndicator({ state, showLabel, className }: CadenceIndicatorProps) {
  const cfg = CONFIG[state]
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={cfg.title}
    >
      <span className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0", cfg.color)} />
      {showLabel && <span className="text-xs text-muted-foreground">{cfg.label}</span>}
    </span>
  )
}

/**
 * Deriva o estado da cadência a partir do Deal + set de deals em atraso.
 * Puro helper — a lógica de "é lead" mora aqui pra manter as duas views
 * (tabela e Kanban) coerentes.
 */
export function deriveCadenceState(
  clientOrigin: string | null | undefined,
  dealId: number,
  overdueSet: Set<number>,
): CadenceState {
  if (clientOrigin !== "online_lead") return "na"
  if (overdueSet.has(dealId)) return "overdue"
  return "ok"
}
