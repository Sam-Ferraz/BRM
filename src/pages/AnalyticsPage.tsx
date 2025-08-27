import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3, TrendingUp } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart-simple"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { useAuth } from "@/hooks/use-auth"
import { api, AppointmentAnalytics, AppointmentAnalyticsByType } from "@/lib/api-client"
import { formatDateForChart } from "@/lib/datetime"

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
  const [appointmentAnalytics, setAppointmentAnalytics] = useState<AppointmentAnalytics[]>([])
  const [appointmentAnalyticsByType, setAppointmentAnalyticsByType] = useState<AppointmentAnalyticsByType>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [analytics, analyticsByType] = await Promise.all([
          api.appointments.getAnalyticsLast7Days(),
          api.appointments.getAnalyticsByTypeLast7Days()
        ])
        
        setAppointmentAnalytics(analytics.data)
        setAppointmentAnalyticsByType(analyticsByType.data)
      } catch (error) {
        console.error('Error fetching analytics data:', error)
        setAppointmentAnalytics([])
        setAppointmentAnalyticsByType({})
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('backButton')}
                  </Button>
                </Link>
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <h1 className="text-xl font-semibold text-foreground">{t('analytics')}</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {t('welcome')}, {user?.name || t('user')}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-foreground">{t('analytics')}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {t('welcome')}, {user?.name || t('user')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
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
          <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700 dark:backdrop-blur-sm dark:bg-slate-900/80">
            <CardHeader className="pb-4 px-3 sm:px-6">
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
                <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-400 rounded-full"></div>
                {t('appointmentsLast7Days')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('appointmentsAnalyticsDescription')}
              </p>
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
                className="h-[400px]"
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
                    />
                    <Bar 
                      dataKey={t('notAnswered')} 
                      fill="url(#notAnsweredGradient)" 
                      radius={[6, 6, 0, 0]}
                      stroke="hsl(var(--destructive))"
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Dynamic Appointment Type Charts */}
          {Object.keys(appointmentAnalyticsByType).length > 0 && (
            <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700 dark:backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader className="pb-4 px-3 sm:px-6">
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400 rounded-full"></div>
                  {t('appointmentsByType')}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('appointmentsByTypeDescription')}
                </p>
              </CardHeader>
              <CardContent className="pt-0 px-3 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(appointmentAnalyticsByType).map(([appointmentType, data], index) => {
                    const headerColor = getTypeHeaderColor(index)
                    const answerColors = getAnswerColors()
                    const formattedData = formatAppointmentAnalytics(data, t)
                    
                    return (
                      <div key={appointmentType} className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div 
                            className={`w-4 h-4 rounded bg-gradient-to-b ${headerColor.gradient}`}
                          ></div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {getAppointmentTypeTranslation(appointmentType, t)}
                          </h3>
                        </div>
                        
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
                          className="h-[250px]"
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
                              />
                              <Bar 
                                dataKey={t('notAnswered')} 
                                fill={`url(#notAnsweredGradient${index})`}
                                radius={[3, 3, 0, 0]}
                                stroke={answerColors.notAnswered.secondary}
                                strokeWidth={1}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                        
                        {/* Type-specific summary */}
                        <div className="grid grid-cols-2 gap-4 text-center mt-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <div className="text-lg font-bold" style={{ color: answerColors.answered.primary }}>
                              {data.reduce((sum, item) => sum + parseInt(item.answered), 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">{t('answered')}</div>
                          </div>
                          <div className="p-2 bg-muted rounded-lg">
                            <div className="text-lg font-bold" style={{ color: answerColors.notAnswered.primary }}>
                              {data.reduce((sum, item) => sum + parseInt(item.not_answered), 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">{t('notAnswered')}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}