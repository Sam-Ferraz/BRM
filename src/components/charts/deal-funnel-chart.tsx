import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export interface DealFunnelStage {
  status: string
  count: number
}

interface DealFunnelChartProps {
  data: DealFunnelStage[]
}

/**
 * Order in which funnel stages are rendered (top → bottom).
 * `discarded_*` statuses are intentionally NOT in this list; they
 * are rendered separately as side cards below the funnel.
 */
const FUNNEL_ORDER: string[] = [
  'service_warm',
  'service_mild',
  'service_cold',
  'visit_foreseen_warm',
  'visit_foreseen_mild',
  'visit_foreseen_cold',
  'visit_done_warm',
  'visit_done_mild',
  'visit_done_cold',
  'proposal',
  'sold',
]

const DISCARDED_ORDER: string[] = [
  'discarded_no_profile',
  'discarded_no_interest',
  'discarded_competitor',
  'discarded_error',
]

/**
 * Color for each stage. Temperature: warm = red-orange, mild = amber, cold = sky-blue.
 * Proposal = indigo; Sold = emerald. Discarded = slate (used in side cards).
 */
const STAGE_COLOR: Record<string, string> = {
  service_warm: '#ef4444',          // red-500
  service_mild: '#f59e0b',          // amber-500
  service_cold: '#0ea5e9',          // sky-500
  visit_foreseen_warm: '#dc2626',   // red-600
  visit_foreseen_mild: '#d97706',   // amber-600
  visit_foreseen_cold: '#0284c7',   // sky-600
  visit_done_warm: '#b91c1c',       // red-700
  visit_done_mild: '#b45309',       // amber-700
  visit_done_cold: '#0369a1',       // sky-700
  proposal: '#6366f1',              // indigo-500
  sold: '#10b981',                  // emerald-500
}

export function DealFunnelChart({ data }: DealFunnelChartProps) {
  const { t } = useTranslation()

  // Build a fast lookup map: status → count
  const countByStatus = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of data) {
      map.set(item.status, item.count)
    }
    return map
  }, [data])

  const funnelStages = useMemo(
    () => FUNNEL_ORDER.map(status => ({
      status,
      count: countByStatus.get(status) ?? 0,
      label: t(`dealStatus_${status}`),
      color: STAGE_COLOR[status] ?? '#64748b',
    })),
    [countByStatus, t]
  )

  const discardedStages = useMemo(
    () => DISCARDED_ORDER.map(status => ({
      status,
      count: countByStatus.get(status) ?? 0,
      label: t(`dealStatus_${status}`),
    })),
    [countByStatus, t]
  )

  const totalInFunnel = funnelStages.reduce((sum, s) => sum + s.count, 0)
  const totalDiscarded = discardedStages.reduce((sum, s) => sum + s.count, 0)

  // ---------- Funnel SVG geometry ----------
  // The funnel is drawn as horizontal trapezoidal slices.
  // Each slice narrows progressively from top to bottom.
  const VIEW_W = 800
  const SLICE_H = 44        // height of each slice
  const SLICE_GAP = 2       // tiny gap between slices for visual separation
  const TOP_W = 720         // top-most slice width
  const BOTTOM_W = 200      // bottom-most slice width (Sold)
  // Espaço extra à esquerda do viewBox para acomodar os labels longos sem
  // serem cortados quando o card é reduzido. Os labels ficam alinhados em
  // LABEL_X (textAnchor="end") — todos identados na mesma posição.
  const LABEL_GUTTER = 360
  const LABEL_X = -8        // todos os labels terminam em x=-8 do viewBox original
  const slices = funnelStages.length

  const totalH = slices * SLICE_H + (slices - 1) * SLICE_GAP

  // Width interpolated linearly from top to bottom
  const widthAt = (index: number) => {
    const ratio = index / (slices - 1)
    return TOP_W - (TOP_W - BOTTOM_W) * ratio
  }

  return (
    <div className="w-full">
      {/* Funnel */}
      <div className="relative w-full">
        <svg
          viewBox={`-${LABEL_GUTTER} 0 ${VIEW_W + LABEL_GUTTER} ${totalH}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t('dealFunnel')}
        >
          {funnelStages.map((stage, idx) => {
            const wTop = widthAt(idx)
            const wBot = widthAt(idx + 1 < slices ? idx + 1 : idx)
            const y = idx * (SLICE_H + SLICE_GAP)
            const cx = VIEW_W / 2
            const xTopLeft = cx - wTop / 2
            const xTopRight = cx + wTop / 2
            const xBotLeft = cx - wBot / 2
            const xBotRight = cx + wBot / 2

            const path = [
              `M ${xTopLeft} ${y}`,
              `L ${xTopRight} ${y}`,
              `L ${xBotRight} ${y + SLICE_H}`,
              `L ${xBotLeft} ${y + SLICE_H}`,
              'Z',
            ].join(' ')

            const midY = y + SLICE_H / 2
            const isLast = idx === slices - 1

            return (
              <g key={stage.status}>
                <defs>
                  <linearGradient id={`grad-${stage.status}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stage.color} stopOpacity={1} />
                    <stop offset="100%" stopColor={stage.color} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <path
                  d={path}
                  fill={`url(#grad-${stage.status})`}
                  stroke="rgba(0,0,0,0.06)"
                  strokeWidth={0.5}
                />

                {/* Label à ESQUERDA (fora do funil). Todos alinhados em LABEL_X
                    com textAnchor="end" — ficam identados no mesmo ponto,
                    independente da largura da fatia. */}
                <text
                  x={LABEL_X}
                  y={midY}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-foreground"
                  style={{ fontSize: 22, fontWeight: 600 }}
                >
                  {stage.label}
                </text>

                {/* Count CENTERED on the slice (the key metric) */}
                <text
                  x={cx}
                  y={midY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  style={{
                    fontSize: isLast ? 20 : 24,
                    fontWeight: 700,
                    paintOrder: 'stroke',
                    stroke: 'rgba(0,0,0,0.18)',
                    strokeWidth: 0.5,
                    letterSpacing: 0.3,
                  }}
                >
                  {stage.count}
                </text>

                {/* Percentage of total in funnel on the RIGHT */}
                {totalInFunnel > 0 && (
                  <text
                    x={cx + wTop / 2 + 12}
                    y={midY}
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    style={{ fontSize: 15, fontWeight: 500 }}
                  >
                    {((stage.count / totalInFunnel) * 100).toFixed(1)}%
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Total in funnel summary */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('totalInFunnel')}:</span>
          <span className="font-bold text-foreground text-lg">{totalInFunnel}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('sold')}:</span>
          <span className="font-bold text-emerald-600 text-lg">
            {countByStatus.get('sold') ?? 0}
          </span>
        </div>
        {totalInFunnel > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('conversionRate')}:</span>
              <span className="font-bold text-blue-600 text-lg">
                {(((countByStatus.get('sold') ?? 0) / totalInFunnel) * 100).toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Discarded - shown separately as side cards (not part of the funnel) */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-6 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full" />
          <h4 className="text-base font-semibold text-foreground">
            {t('discardedDeals')}
          </h4>
          <span className="text-sm text-muted-foreground">
            ({totalDiscarded})
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {discardedStages.map(stage => (
            <div
              key={stage.status}
              className="rounded-lg border border-border bg-muted/40 px-4 py-3"
            >
              <p className="text-xs text-muted-foreground leading-tight">
                {stage.label}
              </p>
              <p className="text-xl font-bold text-foreground mt-1">
                {stage.count}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
