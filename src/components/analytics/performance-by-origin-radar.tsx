import { useEffect, useMemo, useState } from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api-client"

/**
 * Radar de "Performance X Tipo de Origem do Negócio".
 *
 * Eixos do polígono: origens do cliente (Lead Online, Indicação, Portfólio
 * Próprio, Plantão, Cliente de Rua, Não informada).
 *
 * Séries (curvas coloridas sobrepostas): estágios do funil que o usuário
 * escolhe via checkbox — Atendimento / Visita / Proposta / Venda. Um único
 * gráfico permite comparar quais origens produzem mais em cada estágio.
 *
 * Dados vêm agregados do backend em uma query só (COUNT FILTER por status).
 * Componente responsivo — o RadarChart do Recharts se ajusta ao container.
 */

const ORIGIN_LABELS: Record<string, string> = {
  online_lead: "Lead Online",
  own_portfolio: "Portfólio Próprio",
  duty_shift: "Plantão",
  referral: "Indicação",
  street_client: "Cliente de Rua",
  unknown: "Não informada",
}

// Cada série: chave no dado, label na legenda, cor sólida
type SeriesKey = "service_count" | "visit_count" | "proposal_count" | "sale_count"
const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "service_count", label: "Atendimento", color: "#3b82f6" }, // blue-500
  { key: "visit_count", label: "Visita", color: "#f59e0b" }, // amber-500
  { key: "proposal_count", label: "Proposta", color: "#8b5cf6" }, // violet-500
  { key: "sale_count", label: "Venda", color: "#10b981" }, // emerald-500
]

interface RawRow {
  origin: string
  service_count: number
  visit_count: number
  proposal_count: number
  sale_count: number
}

export function PerformanceByOriginRadar() {
  const [rows, setRows] = useState<RawRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<SeriesKey>>(
    () => new Set(["service_count", "visit_count", "proposal_count", "sale_count"]),
  )

  useEffect(() => {
    let cancelled = false
    api.deals
      .getPerformanceByOrigin()
      .then((res) => {
        if (!cancelled) setRows(res.data)
      })
      .catch((err) => {
        console.warn("[PerformanceByOriginRadar] falha:", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const chartData = useMemo(() => {
    // Se não há dados, ainda mostramos um polígono com todos os eixos possíveis
    // (label mais amigável), pra o gráfico não colapsar.
    if (rows.length === 0) {
      return Object.keys(ORIGIN_LABELS).map((o) => ({
        origin_label: ORIGIN_LABELS[o],
        service_count: 0,
        visit_count: 0,
        proposal_count: 0,
        sale_count: 0,
      }))
    }
    return rows.map((r) => ({
      origin_label: ORIGIN_LABELS[r.origin] ?? r.origin,
      service_count: r.service_count,
      visit_count: r.visit_count,
      proposal_count: r.proposal_count,
      sale_count: r.sale_count,
    }))
  }, [rows])

  const toggle = (key: SeriesKey) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Performance por Origem do Negócio
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Quantidade de Negócios em cada estágio do funil, agrupada por origem do cliente.
          Marque as métricas que quer sobrepor no gráfico.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro de métricas — checkboxes horizontais */}
        <div className="flex flex-wrap gap-4">
          {SERIES.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                checked={selected.has(s.key)}
                onCheckedChange={() => toggle(s.key)}
              />
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
        </div>

        {/* Radar */}
        <div className="h-[420px] w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="origin_label"
                  tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {SERIES.filter((s) => selected.has(s.key)).map((s) => (
                  <Radar
                    key={s.key}
                    name={s.label}
                    dataKey={s.key}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
