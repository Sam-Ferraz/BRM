import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Package, HeadphonesIcon, Settings, LogOut, FileText, Plus } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart-simple"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { DealForm } from "@/components/forms/deal-form"
import { ClientForm } from "@/components/forms/client-form"
import { ProductForm } from "@/components/forms/product-form"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { api, AppointmentAnalytics, AppointmentAnalyticsByType } from "@/lib/api-client"


const getStatusData = (t: any) => [
  { name: t('closed'), value: 35, color: "#10b981" },
  { name: t('inProgress'), value: 45, color: "#3b82f6" },
  { name: t('proposals'), value: 20, color: "#f59e0b" },
]

const formatAppointmentAnalytics = (analytics: AppointmentAnalytics[], t: any) => {
  return analytics.map(item => {
    const date = new Date(item.date)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    
    let dateLabel = ''
    if (date.toDateString() === today.toDateString()) {
      dateLabel = t('today') || 'Hoje'
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateLabel = t('yesterday') || 'Ontem'
    } else {
      dateLabel = date.toLocaleDateString('pt-BR', { 
        weekday: 'short',
        day: '2-digit'
      })
    }
    
    return {
      date: dateLabel,
      [t('answered')]: parseInt(item.answered),
      [t('notAnswered')]: parseInt(item.not_answered),
    }
  })
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
    primary: '#10b981', // Green
    secondary: '#059669', // Dark green
    gradient: 'from-emerald-500 to-emerald-600'
  },
  notAnswered: {
    primary: '#ef4444', // Red
    secondary: '#dc2626', // Dark red
    gradient: 'from-red-500 to-red-600'
  }
})

export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalClients: 0,
    totalProducts: 0,
    totalAppointments: 0,
    totalSalesAgenda: 0,
  })
  const [appointmentAnalytics, setAppointmentAnalytics] = useState<AppointmentAnalytics[]>([])
  const [appointmentAnalyticsByType, setAppointmentAnalyticsByType] = useState<AppointmentAnalyticsByType>({})
  const [formStates, setFormStates] = useState({
    deal: false,
    client: false,
    product: false,
    appointment: false,
  })
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stats, analytics, analyticsByType] = await Promise.all([
          api.dashboard.getStats(),
          api.appointments.getAnalyticsLast7Days(),
          api.appointments.getAnalyticsByTypeLast7Days()
        ])
        
        setStats({
          totalDeals: stats.totalDeals,
          totalClients: stats.totalClients,
          totalProducts: stats.totalProducts,
          totalAppointments: stats.totalAppointments,
          totalSalesAgenda: stats.totalSalesAgenda,
        })
        
        setAppointmentAnalytics(analytics.data)
        setAppointmentAnalyticsByType(analyticsByType.data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Keep default values on error
        setStats({
          totalDeals: 0,
          totalClients: 0,
          totalProducts: 0,
          totalAppointments: 0,
          totalSalesAgenda: 0,
        })
        setAppointmentAnalytics([])
        setAppointmentAnalyticsByType({})
      }
    }
    
    fetchData()
  }, [])

  const refreshStats = async () => {
    try {
      const [stats, analytics, analyticsByType] = await Promise.all([
        api.dashboard.getStats(),
        api.appointments.getAnalyticsLast7Days(),
        api.appointments.getAnalyticsByTypeLast7Days()
      ])
      
      setStats({
        totalDeals: stats.totalDeals,
        totalClients: stats.totalClients,
        totalProducts: stats.totalProducts,
        totalAppointments: stats.totalAppointments,
        totalSalesAgenda: stats.totalSalesAgenda,
      })
      
      setAppointmentAnalytics(analytics.data)
      setAppointmentAnalyticsByType(analyticsByType.data)
    } catch (error) {
      console.error('Error refreshing dashboard data:', error)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node) && fabMenuOpen) {
        setFabMenuOpen(false)
      }
    }

    if (fabMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [fabMenuOpen])

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: t('successMessages.logoutSuccess'),
        description: t('successMessages.logoutSuccess'),
      })
    } catch (error) {
      toast({
        title: t('errorMessages.logoutError'),
        description: t('errorMessages.logoutError'),
        variant: "destructive",
      })
    }
  }

  const openForm = (formType: keyof typeof formStates) => {
    setFormStates(prev => ({ ...prev, [formType]: true }))
  }

  const closeForm = (formType: keyof typeof formStates) => {
    setFormStates(prev => ({ ...prev, [formType]: false }))
  }

  const openFormFromFab = (formType: keyof typeof formStates) => {
    openForm(formType)
    setFabMenuOpen(false)
  }

  const handleCreateDeal = async (data: any) => {
    setLoading(true)
    try {
      await api.deals.create(data)
      toast({
        title: t('successMessages.dealCreated'),
        description: t('successMessages.dealCreated'),
      })
      closeForm('deal')
      // Update stats
      await refreshStats()
    } catch (error) {
      toast({
        title: t('errorMessages.dealCreationError'),
        description: t('errorMessages.dealCreationError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (data: any) => {
    setLoading(true)
    try {
      await api.clients.create(data)
      toast({
        title: t('successMessages.clientCreated'),
        description: t('successMessages.clientCreated'),
      })
      closeForm('client')
      // Update stats
      await refreshStats()
    } catch (error) {
      toast({
        title: t('errorMessages.clientCreationError'),
        description: t('errorMessages.clientCreationError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (data: any) => {
    setLoading(true)
    try {
      await api.products.create(data)
      toast({
        title: t('successMessages.productCreated'),
        description: t('successMessages.productCreated'),
      })
      closeForm('product')
      // Update stats
      await refreshStats()
    } catch (error) {
      toast({
        title: t('errorMessages.productCreationError'),
        description: t('errorMessages.productCreationError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAppointment = async (data: any) => {
    setLoading(true)
    try {
      await api.appointments.create(data)
      toast({
        title: t('successMessages.serviceCreated'),
        description: t('successMessages.serviceCreated'),
      })
      closeForm('appointment')
      // Update stats
      await refreshStats()
    } catch (error) {
      toast({
        title: t('errorMessages.serviceCreationError'),
        description: t('errorMessages.serviceCreationError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  const settingsItems = [
    {
      title: t('settings'),
      icon: Settings,
      href: "/settings",
    },
    {
      title: t('support'),
      icon: HeadphonesIcon,
      href: "/suporte",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">LOGO</span>
              </div>
              <span className="font-semibold text-foreground">{t('managementSystem')}</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {t('welcome')}, {user?.name || t('user')}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Link to="/deals">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('deals')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalDeals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/clients">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('clients')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/products">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('products')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalProducts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/appointments">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('services')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <HeadphonesIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalAppointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/sales-agenda">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('salesAgenda')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalSalesAgenda}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Full Width Appointments Analytics Chart */}
            <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
              <CardHeader className="pb-4 px-3 sm:px-6">
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                  {t('appointmentsLast7Days')}
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
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
                  className="h-[350px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={formatAppointmentAnalytics(appointmentAnalytics, t)}
                      margin={{ top: 20, right: 5, left: 0, bottom: 20 }}
                      barCategoryGap="15%"
                    >
                      <defs>
                        <linearGradient id="answeredGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="notAnsweredGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                          <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e2e8f0" 
                        strokeOpacity={0.6}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickMargin={8}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
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
                              <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-4 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  <p className="font-semibold text-slate-800">{label}</p>
                                </div>
                                
                                {payload.map((entry, index) => (
                                  <div key={index} className="flex items-center justify-between gap-4 mb-2">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full shadow-sm" 
                                        style={{ backgroundColor: entry.color }}
                                      ></div>
                                      <span className="text-slate-600 text-sm">{entry.dataKey}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">{entry.value}</span>
                                      <span className="text-xs text-slate-500">
                                        ({total > 0 ? ((Number(entry.value) || 0) / total * 100).toFixed(1) : '0.0'}%)
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                
                                <div className="mt-3 pt-2 border-t border-slate-100">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 font-medium">{t('totalAppointments')}:</span>
                                    <span className="font-bold text-blue-600">{total}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-slate-600 font-medium">{t('responseRate')}:</span>
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
                        stroke="#059669"
                        strokeWidth={1}
                        style={{ cursor: 'pointer' }}
                      />
                      <Bar 
                        dataKey={t('notAnswered')} 
                        fill="url(#notAnsweredGradient)" 
                        radius={[6, 6, 0, 0]}
                        stroke="#dc2626"
                        strokeWidth={1}
                        style={{ cursor: 'pointer' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                {/* Summary Stats */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-4 sm:mb-6">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
                        {appointmentAnalytics.reduce((sum, item) => sum + parseInt(item.answered), 0)}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 mt-1">{t('totalAnswered')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-red-600">
                        {appointmentAnalytics.reduce((sum, item) => sum + parseInt(item.not_answered), 0)}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 mt-1">{t('totalNotAnswered')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                        {appointmentAnalytics.reduce((sum, item) => sum + parseInt(item.answered) + parseInt(item.not_answered), 0)}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 mt-1">{t('totalAppointments')}</div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center gap-4 sm:gap-8">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-600"></div>
                      <span className="text-xs sm:text-sm font-medium text-slate-700">{t('answered')}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-gradient-to-b from-red-500 to-red-600 border border-red-600"></div>
                      <span className="text-xs sm:text-sm font-medium text-slate-700">{t('notAnswered')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Appointment Type Charts */}
            {Object.keys(appointmentAnalyticsByType).length > 0 && (
              <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
                <CardHeader className="pb-4 px-3 sm:px-6">
                  <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                    {t('appointmentsByType')}
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
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
                            <h3 className="text-lg font-semibold text-slate-700">
                              {appointmentType}
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
                                  stroke="#e2e8f0" 
                                  strokeOpacity={0.6}
                                  horizontal={true}
                                  vertical={false}
                                />
                                <XAxis 
                                  dataKey="date" 
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: '#64748b' }}
                                  tickMargin={6}
                                />
                                <YAxis 
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: '#64748b' }}
                                  tickMargin={2}
                                  width={25}
                                />
                                <Tooltip 
                                  cursor={{ fill: `${answerColors.answered.primary}20` }}
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)
                                      const answeredEntry = payload.find(entry => entry.dataKey === t('answered'))
                                      const responseRate = total > 0 ? ((Number(answeredEntry?.value) || 0) / total * 100).toFixed(1) : '0.0'
                                      
                                      return (
                                        <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-3 min-w-[180px]">
                                          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-100">
                                            <div 
                                              className="w-2 h-2 rounded-full"
                                              style={{ backgroundColor: answerColors.answered.primary }}
                                            ></div>
                                            <p className="font-semibold text-slate-800 text-sm">{label}</p>
                                          </div>
                                          
                                          {payload.map((entry, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-3 mb-1">
                                              <div className="flex items-center gap-1">
                                                <div 
                                                  className="w-2 h-2 rounded-full" 
                                                  style={{ backgroundColor: entry.color }}
                                                ></div>
                                                <span className="text-slate-600 text-xs">{entry.dataKey}</span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <span className="font-bold text-slate-800 text-sm">{entry.value}</span>
                                                <span className="text-xs text-slate-500">
                                                  ({total > 0 ? ((Number(entry.value) || 0) / total * 100).toFixed(1) : '0.0'}%)
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                          
                                          <div className="mt-2 pt-1 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-slate-600 font-medium">{t('responseRate')}:</span>
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
                            <div className="p-2 bg-slate-50 rounded-lg">
                              <div className="text-lg font-bold" style={{ color: answerColors.answered.primary }}>
                                {data.reduce((sum, item) => sum + parseInt(item.answered), 0)}
                              </div>
                              <div className="text-xs text-slate-600">{t('answered')}</div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-lg">
                              <div className="text-lg font-bold" style={{ color: answerColors.notAnswered.primary }}>
                                {data.reduce((sum, item) => sum + parseInt(item.not_answered), 0)}
                              </div>
                              <div className="text-xs text-slate-600">{t('notAnswered')}</div>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('settings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {settingsItems.map((item) => (
                  <Link key={item.href} to={item.href}>
                    <Button variant="ghost" className="w-full justify-start">
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.title}
                    </Button>
                  </Link>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout')}
                </Button>
              </CardContent>
            </Card>

            {/* Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('performanceIndicators')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('conversionRate')}</span>
                  <span className="font-semibold text-green-600">68%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('averageTicket')}</span>
                  <span className="font-semibold">R$ 15.240</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('monthlyGoal')}</span>
                  <span className="font-semibold text-blue-600">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('satisfaction')}</span>
                  <span className="font-semibold text-yellow-600">4.8/5</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <div className="fixed bottom-6 right-6 z-50" ref={fabRef}>
        {/* FAB Menu Items */}
        {fabMenuOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col space-y-3 mb-2">
            <Button
              size="sm"
              className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => openFormFromFab('deal')}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              {t('deal')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('client')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('client')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('product')}
            >
              <Package className="w-4 h-4 mr-2" />
              {t('product')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('appointment')}
            >
              <HeadphonesIcon className="w-4 h-4 mr-2" />
              {t('service')}
            </Button>
          </div>
        )}
        
        {/* Main FAB */}
        <Button
          size="lg"
          className={`rounded-full w-14 h-14 shadow-lg transition-transform ${
            fabMenuOpen ? 'rotate-45 bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Forms */}
      <DealForm
        open={formStates.deal}
        onOpenChange={() => closeForm('deal')}
        onSubmit={handleCreateDeal}
        loading={loading}
      />
      <ClientForm
        open={formStates.client}
        onOpenChange={() => closeForm('client')}
        onSubmit={handleCreateClient}
        loading={loading}
      />
      <ProductForm
        open={formStates.product}
        onOpenChange={() => closeForm('product')}
        onSubmit={handleCreateProduct}
        loading={loading}
      />
      <AppointmentForm
        open={formStates.appointment}
        onOpenChange={() => closeForm('appointment')}
        onSubmit={handleCreateAppointment}
        loading={loading}
      />
    </div>
  )
}