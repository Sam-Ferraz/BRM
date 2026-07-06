import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3, TrendingUp } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart-simple"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList } from "recharts"
import { useAuth } from "@/hooks/use-auth"
import { api, AppointmentAnalytics, AppointmentAnalyticsByType, DealFunnelStage, ProposalWithDetails, Deal } from "@/lib/api-client"
import { formatDateForChart } from "@/lib/datetime"
import { useTimezone } from "@/hooks/use-timezone"
import { DealFunnelChart } from "@/components/charts/deal-funnel-chart"
import {
  DateRangeFilter,
  DateRangeValue,
  computePresetRange,
  toIsoDate,
} from "@/components/analytics/date-range-filter"

const formatAppointmentAnalytics = (analytics: AppointmentAnalytics[], t: any) => {
  return analytics.map(item => ({
    date: formatDateForChart(item.date, t),
    [t('answered')]: parseInt(item.answered),
    [t('notAnswered')]: parseInt(item.not_answered),
  }))
}

// Generate header colors for appointment types (for the type indicator)
const getTypeHeaderColor = (index: number) => {
  const colors = [
    { gradient: 'from-blue-500 to-blue-600' }, // Blue
    { gradient: 'from-purple-500 to-purple-600' }, // Purple
    { gradient: 'from-amber-500 to-amber-600' }, // Amber
    { gradient: 'from-violet-500 to-violet-600' }, // Violet
    { gradient: 'from-cyan-500 to-cyan-600' }, // Cyan
    { gradient: 'from-indigo-500 to-indigo-600' }, // Indigo
  ]
  return colors[index % colors.length]
}

// Consistent colors for answered/not answered
const getAnswerColors = () => ({
  answered: {
    primary: 'hsl(var(--chart-2))', // Green from CSS variables
    secondary: 'hsl(var(--chart-2))',
    gradient: 'from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500'
  },
  notAnswered: {
    primary: 'hsl(var(--destructive))', // Red from CSS variables
    secondary: 'hsl(var(--destructive))',
    gradient: 'from-red-500 to-red-600 dark:from-red-400 dark:to-red-500'
  }
})

// Translate appointment types
const getAppointmentTypeTranslation = (type: string, t: any) => {
  switch (type) {
    case 'chat':
      return t('chatType')
    case 'call':
      return t('callType')
    case 'in_person':
      return t('inPersonType')
    case 'visit':
      return t('visitType')
    default:
      return type
  }
}

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const timezone = useTimezone()

  const initialAppointmentsRange = useMemo<DateRangeValue>(() => {
    const { from, to } = computePresetRange("last30Days")
    return { from, to, preset: "last30Days" }
  }, [])

  // Funil começa em "Tempo total" — sem filtro de período, todos os negócios entram
  const [funnelDateRange, setFunnelDateRange] = useState<DateRangeValue>({ preset: "allTime" })
  const [appointmentsDateRange, setAppointmentsDateRange] = useState<DateRangeValue>(initialAppointmentsRange)

  const [appointmentAnalytics, setAppointmentAnalytics] = useState<AppointmentAnalytics[]>([])
  const [appointmentAnalyticsByType, setAppointmentAnalyticsByType] = useState<AppointmentAnalyticsByType>({})
  const [funnelData, setFunnelData] = useState<DealFunnelStage[]>([])
  // Ao lado do funil: 15 últimas propostas + 15 últimas apresentações (deals visit_done_*)
  const [lastProposals, setLastProposals] = useState<ProposalWithDetails[]>([])
  const [lastPresentations, setLastPresentations] = useState<Deal[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)

  // Quando o filtro está em 'allTime', from/to são undefined → não envia ao backend
  const funnelFromIso = useMemo(
    () => (funnelDateRange.from ? toIsoDate(funnelDateRange.from) : undefined),
    [funnelDateRange.from]
  )
  const funnelToIso = useMemo(
    () => (funnelDateRange.to ? toIsoDate(funnelDateRange.to) : undefined),
    [funnelDateRange.to]
  )
  const appointmentsFromIso = useMemo(
    () => (appointmentsDateRange.from ? toIsoDate(appointmentsDateRange.from) : undefined),
    [appointmentsDateRange.from]
  )
  const appointmentsToIso = useMemo(
    () => (appointmentsDateRange.to ? toIsoDate(appointmentsDateRange.to) : undefined),
    [appointmentsDateRange.to]
  )

  useEffect(() => {
    const fetchData = async () => {
      try {
        setRefetching(true)
        const [analytics, analyticsByType, funnel, proposals, deals] = await Promise.all([
          // Atendimentos: sempre passa from/to (mantém comportamento atual)
          appointmentsFromIso && appointmentsToIso
            ? api.appointments.getAnalyticsByDateRange({
                from: appointmentsFromIso,
                to: appointmentsToIso,
                timezone,
                dateField: 'scheduled_datetime',
              })
            : Promise.resolve({ data: [] as AppointmentAnalytics[] }),
          appointmentsFromIso && appointmentsToIso
            ? api.appointments.getAnalyticsByTypeByDateRange({
                from: appointmentsFromIso,
                to: appointmentsToIso,
                timezone,
                dateField: 'scheduled_datetime',
              })
            : Promise.resolve({ data: {} as AppointmentAnalyticsByType }),
          // Funil: se 'allTime', não manda from/to → backend retorna todos os deals
          api.deals.getFunnel(
            funnelFromIso && funnelToIso
              ? { from: funnelFromIso, to: funnelToIso, timezone, dateField: 'origin_date' }
              : { timezone, dateField: 'origin_date' }
          ),
          // Últimas 15 propostas (ordenadas por data desc)
          api.proposals.getAll({ sortBy: 'proposal_date', sortOrder: 'desc' }),
          // Todos os deals — filtramos as apresentações (visit_done_*) no frontend
          // porque o backend só aceita status único e queremos os 3 variantes
          api.deals.getAll({ sortBy: 'updated_at', sortOrder: 'desc' }),
        ])

        setAppointmentAnalytics(analytics.data)
        setAppointmentAnalyticsByType(analyticsByType.data)
        setFunnelData(funnel.data)
        setLastProposals((proposals.data ?? []).slice(0, 15))
        setLastPresentations(
          (deals.data ?? []).filter((d) => d.status?.startsWith('visit_done_')).slice(0, 15)
        )
      } catch (error) {
        console.error('Error fetching analytics data:', error)
        setAppointmentAnalytics([])
        setAppointmentAnalyticsByType({})
        setFunnelData([])
        setLastProposals([])
        setLastPresentations([])
      } finally {
        setRefetching(false)
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [timezone, funnelFromIso, funnelToIso, appointmentsFromIso, appointmentsToIso])

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('backButton')}
                  </Button>
                </Link>
              </div>
              <div className="flex items-center space-x-4"></div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground mb-8">
            <BarChart3 className="w-5 h-5" />
            {t('analytics')}
          </h2>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">{t('loading')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-4"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5" />
            {t('analytics')}
          </h2>

          {refetching && (
            <p className="text-xs text-muted-foreground/70">{t('loading')}…</p>
          )}

          {/* === FUNNEL SECTION === */}
          <section className="space-y-4">
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm text-muted-foreground">{t('filterByPeriod')}</span>
              <DateRangeFilter value={funnelDateRange} onChange={setFunnelDateRange} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Coluna esquerda 2/3: Funil */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700 dark:backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader className="pb-4 px-3 sm:px-6">
                  <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-amber-500 to-rose-500 dark:from-amber-400 dark:to-rose-400 rounded-full"></div>
                    {t('dealFunnel')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-6">
                  <DealFunnelChart data={funnelData} />
                </CardContent>
              </Card>

              {/* Coluna direita 1/3: Propostas + Últimas apresentações */}
              <div className="lg:col-span-1 space-y-4">
                <LastProposalsCard proposals={lastProposals} />
                <LastPresentationsCard presentations={lastPresentations} />
              </div>
            </div>
          </section>

          {/* === APPOINTMENTS SECTION === */}
          <section className="space-y-4">
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm text-muted-foreground">{t('filterByPeriod')}</span>
              <DateRangeFilter value={appointmentsDateRange} onChange={setAppointmentsDateRange} />
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('totalAnswered')}</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {appointmentAnalytics.reduce((sum, item) => sum + parseInt(item.answered), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('totalNotAnswered')}</p>
                    <p className="text-2xl font-bold text-red-600">
                      {appointmentAnalytics.reduce((sum, item) => sum + parseInt(item.not_answered), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('responseRate')}</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const total = appointmentAnalytics.reduce((sum, item) => sum + parseInt(item.answered) + parseInt(item.not_answered), 0)
                        const answered = appointmentAnalytics.reduce((sum, item) => sum + parseInt(item.answered), 0)
                        return total > 0 ? `${((answered / total) * 100).toFixed(1)}%` : '0%'
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

            {/* Main Appointments Analytics Chart */}
            <Card className="w-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700 dark:backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader className="pb-4 px-3 sm:px-6">
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-400 rounded-full"></div>
                  {t('appointmentsInPeriod')}
                </CardTitle>
              </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-6">
              <ChartContainer
                config={{
                  [t('answered')]: {
                    label: t('answered'),
                    color: "hsl(142, 76%, 36%)",
                  },
                  [t('notAnswered')]: {
                    label: t('notAnswered'),
                    color: "hsl(0, 84%, 60%)",
                  },
                }}
                className="h-[125px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formatAppointmentAnalytics(appointmentAnalytics, t)}
                    margin={{ top: 20, right: 5, left: 0, bottom: 20 }}
                    barCategoryGap="15%"
                  >
                    <defs>
                      <linearGradient id="answeredGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="notAnsweredGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.6}
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickMargin={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickMargin={2}
                      width={30}
                      domain={[0, 50]}
                      allowDataOverflow
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)
                          const answeredEntry = payload.find(entry => entry.dataKey === t('answered'))
                          const responseRate = total > 0 ? ((Number(answeredEntry?.value) || 0) / total * 100).toFixed(1) : '0.0'

                          return (
                            <div className="bg-card border border-border rounded-lg shadow-xl p-4 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <p className="font-semibold text-foreground">{label}</p>
                              </div>

                              {payload.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between gap-4 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full shadow-sm"
                                      style={{ backgroundColor: entry.color }}
                                    ></div>
                                    <span className="text-muted-foreground text-sm">{entry.dataKey}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">{entry.value}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({total > 0 ? ((Number(entry.value) || 0) / total * 100).toFixed(1) : '0.0'}%)
                                    </span>
                                  </div>
                                </div>
                              ))}

                              <div className="mt-3 pt-2 border-t border-border">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground font-medium">{t('totalAppointments')}:</span>
                                  <span className="font-bold text-blue-600">{total}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                  <span className="text-muted-foreground font-medium">{t('responseRate')}:</span>
                                  <span className={`font-bold ${parseFloat(responseRate) >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {responseRate}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey={t('answered')}
                      fill="url(#answeredGradient)"
                      radius={[6, 6, 0, 0]}
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      maxBarSize={20}
                    >
                      <LabelList
                        dataKey={t('answered')}
                        position="top"
                        style={{ fontSize: 10, fill: 'hsl(var(--chart-2))', fontWeight: 600 }}
                        formatter={(v: any) => (v && v > 0 ? v : '')}
                      />
                    </Bar>
                    <Bar
                      dataKey={t('notAnswered')}
                      fill="url(#notAnsweredGradient)"
                      radius={[6, 6, 0, 0]}
                      stroke="hsl(var(--destructive))"
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      maxBarSize={20}
                    >
                      <LabelList
                        dataKey={t('notAnswered')}
                        position="top"
                        style={{ fontSize: 10, fill: 'hsl(var(--destructive))', fontWeight: 600 }}
                        formatter={(v: any) => (v && v > 0 ? v : '')}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

            {/* Dynamic Appointment Type Charts */}
            {Object.keys(appointmentAnalyticsByType).length > 0 && (
              <Card className="max-w-[50%] bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700 dark:backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader className="pb-4 px-3 sm:px-6">
                  <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 rounded-full"></div>
                    {t('visits')}
                  </CardTitle>
                </CardHeader>
              <CardContent className="pt-0 px-3 sm:px-6">
                <div>
                  {Object.entries(appointmentAnalyticsByType)
                    .filter(([appointmentType]) => appointmentType === 'visit')
                    .map(([appointmentType, data], index) => {
                    const headerColor = getTypeHeaderColor(index)
                    const answerColors = getAnswerColors()
                    const formattedData = formatAppointmentAnalytics(data, t)

                    return (
                      <div key={appointmentType} className="space-y-4">
                        <ChartContainer
                          config={{
                            [t('answered')]: {
                              label: t('answered'),
                              color: answerColors.answered.primary,
                            },
                            [t('notAnswered')]: {
                              label: t('notAnswered'),
                              color: answerColors.notAnswered.primary,
                            },
                          }}
                          className="h-[125px]"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={formattedData}
                              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                              barCategoryGap="10%"
                            >
                              <defs>
                                <linearGradient id={`answeredGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={answerColors.answered.primary} stopOpacity={1} />
                                  <stop offset="100%" stopColor={answerColors.answered.secondary} stopOpacity={0.8} />
                                </linearGradient>
                                <linearGradient id={`notAnsweredGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={answerColors.notAnswered.primary} stopOpacity={1} />
                                  <stop offset="100%" stopColor={answerColors.notAnswered.secondary} stopOpacity={0.8} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                strokeOpacity={0.6}
                                horizontal={true}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickMargin={6}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickMargin={2}
                                width={25}
                                domain={[0, 10]}
                                allowDataOverflow
                              />
                              <Tooltip
                                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)
                                    const answeredEntry = payload.find(entry => entry.dataKey === t('answered'))
                                    const responseRate = total > 0 ? ((Number(answeredEntry?.value) || 0) / total * 100).toFixed(1) : '0.0'

                                    return (
                                      <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[180px]">
                                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: answerColors.answered.primary }}
                                          ></div>
                                          <p className="font-semibold text-foreground text-sm">{label}</p>
                                        </div>

                                        {payload.map((entry, idx) => (
                                          <div key={idx} className="flex items-center justify-between gap-3 mb-1">
                                            <div className="flex items-center gap-1">
                                              <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: entry.color }}
                                              ></div>
                                              <span className="text-muted-foreground text-xs">{entry.dataKey}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <span className="font-bold text-foreground text-sm">{entry.value}</span>
                                              <span className="text-xs text-muted-foreground">
                                                ({total > 0 ? ((Number(entry.value) || 0) / total * 100).toFixed(1) : '0.0'}%)
                                              </span>
                                            </div>
                                          </div>
                                        ))}

                                        <div className="mt-2 pt-1 border-t border-border">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">{t('responseRate')}:</span>
                                            <span className={`font-bold ${parseFloat(responseRate) >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                              {responseRate}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                }}
                              />
                              <Bar
                                dataKey={t('answered')}
                                fill={`url(#answeredGradient${index})`}
                                radius={[3, 3, 0, 0]}
                                stroke={answerColors.answered.secondary}
                                strokeWidth={1}
                                maxBarSize={20}
                              >
                                <LabelList
                                  dataKey={t('answered')}
                                  position="top"
                                  style={{ fontSize: 9, fill: answerColors.answered.primary, fontWeight: 600 }}
                                  formatter={(v: any) => (v && v > 0 ? v : '')}
                                />
                              </Bar>
                              <Bar
                                dataKey={t('notAnswered')}
                                fill={`url(#notAnsweredGradient${index})`}
                                radius={[3, 3, 0, 0]}
                                stroke={answerColors.notAnswered.secondary}
                                strokeWidth={1}
                                maxBarSize={20}
                              >
                                <LabelList
                                  dataKey={t('notAnswered')}
                                  position="top"
                                  style={{ fontSize: 9, fill: answerColors.notAnswered.primary, fontWeight: 600 }}
                                  formatter={(v: any) => (v && v > 0 ? v : '')}
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    )
                  })}
                </div>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// LastProposalsCard — mostra as 15 últimas propostas ao lado do funil
// ===========================================================================

function formatCurrencyBRL(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—"
  const n = typeof v === "string" ? parseFloat(v) : v
  if (isNaN(n)) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatShortDate(d: string | null | undefined): string {
  if (!d) return "—"
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return "—"
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date)
  } catch {
    return "—"
  }
}

function proposalStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "accepted":
      return { label: "Aceita", className: "bg-emerald-100 text-emerald-800 border-emerald-200" }
    case "rejected":
      return { label: "Rejeitada", className: "bg-red-100 text-red-800 border-red-200" }
    case "counter_proposal":
      return { label: "Contra", className: "bg-amber-100 text-amber-800 border-amber-200" }
    case "expired":
      return { label: "Expirada", className: "bg-slate-100 text-slate-800 border-slate-200" }
    default:
      return { label: "Pendente", className: "bg-blue-100 text-blue-800 border-blue-200" }
  }
}

function LastProposalsCard({ proposals }: { proposals: ProposalWithDetails[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          Propostas
          <span className="text-xs text-muted-foreground font-normal ml-1">
            ({proposals.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {proposals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">
            Nenhuma proposta ainda.
          </p>
        ) : (
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {proposals.map((p) => {
              const badge = proposalStatusBadge(p.status)
              return (
                <div key={p.id} className="px-3 py-2 hover:bg-accent/50 transition-colors text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate flex-1">
                      {p.deal_client || `Deal #${p.deal_id}`}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground mt-0.5">
                    <span className="truncate">{p.deal_property_name || "—"}</span>
                    <span className="font-medium text-foreground shrink-0 ml-2">
                      {formatCurrencyBRL(p.proposal_value)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatShortDate(p.proposal_date)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// LastPresentationsCard — 15 deals mais recentes com status visit_done_*
// ===========================================================================

function presentationTempBadge(status: string): { label: string; className: string } {
  if (status.endsWith("_warm")) return { label: "Quente", className: "bg-red-100 text-red-800 border-red-200" }
  if (status.endsWith("_mild")) return { label: "Morno", className: "bg-amber-100 text-amber-800 border-amber-200" }
  if (status.endsWith("_cold")) return { label: "Fria", className: "bg-blue-100 text-blue-800 border-blue-200" }
  return { label: "—", className: "bg-slate-100 text-slate-800" }
}

function LastPresentationsCard({ presentations }: { presentations: Deal[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          Últimas Apresentações
          <span className="text-xs text-muted-foreground font-normal ml-1">
            ({presentations.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {presentations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">
            Nenhuma apresentação ainda.
          </p>
        ) : (
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {presentations.map((d) => {
              const badge = presentationTempBadge(d.status)
              return (
                <div key={d.id} className="px-3 py-2 hover:bg-accent/50 transition-colors text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate flex-1">{d.client}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground mt-0.5">
                    <span className="truncate">{d.property_name || "—"}</span>
                    <span className="font-medium text-foreground shrink-0 ml-2">
                      {formatCurrencyBRL(d.gsv)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatShortDate(d.origin_date)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
