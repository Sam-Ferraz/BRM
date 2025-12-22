import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Package, HeadphonesIcon, Settings, LogOut, FileText, Plus, BarChart3, ClipboardCheck } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart-simple"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { DealForm } from "@/components/forms/deal-form"
import { ClientForm } from "@/components/forms/client-form"
import { ProductForm } from "@/components/forms/product-form"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { api, AppointmentAnalytics } from "@/lib/api-client"
import { formatDateForChart } from "@/lib/datetime"
import { useTimezone } from "@/hooks/use-timezone"

const formatAppointmentAnalytics = (analytics: AppointmentAnalytics[], t: any) => {
  return analytics.map(item => ({
    date: formatDateForChart(item.date, t),
    [t('answered')]: parseInt(item.answered),
    [t('notAnswered')]: parseInt(item.not_answered),
  }))
}


export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalClients: 0,
    totalProducts: 0,
    totalAppointments: 0,
    totalSalesAgenda: 0,
    totalFollowUps: 0,
  })
  const [appointmentAnalytics, setAppointmentAnalytics] = useState<AppointmentAnalytics[]>([])
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
  const timezone = useTimezone()

  const defaultStats = {
    totalDeals: 0,
    totalClients: 0,
    totalProducts: 0,
    totalAppointments: 0,
    totalSalesAgenda: 0,
    totalFollowUps: 0,
  }

  const refreshStats = useCallback(async () => {
    const [statsData, analytics] = await Promise.all([
      api.dashboard.getStats(),
      api.appointments.getAnalyticsLast7Days(timezone)
    ])

    setStats({
      totalDeals: statsData.totalDeals,
      totalClients: statsData.totalClients,
      totalProducts: statsData.totalProducts,
      totalAppointments: statsData.totalAppointments,
      totalSalesAgenda: statsData.totalSalesAgenda,
      totalFollowUps: statsData.totalFollowUps,
    })

    setAppointmentAnalytics(analytics.data)
  }, [timezone])

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshStats()
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Keep default values on error
        setStats(defaultStats)
        setAppointmentAnalytics([])
      }
    }
    
    fetchData()
  }, [refreshStats])

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

  const handleCreateAppointment = async (data: any, followUpData?: { next_action: string; next_action_date: string }) => {
    setLoading(true)
    try {
      const createdAppointment = await api.appointments.create(data)

      // If follow-up data is provided, create the follow-up
      if (followUpData && createdAppointment.id) {
        await api.followUps.create({
          appointment_id: createdAppointment.id,
          next_action: followUpData.next_action,
          next_action_date: followUpData.next_action_date,
          completed: false,
        })
      }

      toast({
        title: t('successMessages.serviceCreated'),
        description: followUpData
          ? t('successMessages.serviceAndFollowUpCreated')
          : t('successMessages.serviceCreated'),
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left side - Stats Cards */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              <Link to="/appointments">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <HeadphonesIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('services')}</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalAppointments}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/clients">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('clients')}</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/deals">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Briefcase className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('deals')}</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalDeals}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/sales-agenda">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('salesAgenda')}</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalSalesAgenda}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/products">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Package className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('products')}</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/follow-ups">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <ClipboardCheck className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('followUps')}</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalFollowUps}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/analytics">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <BarChart3 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('analytics')}</p>
                          <p className="text-2xl font-bold text-foreground">—</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Appointments Analytics Chart */}
            <div className="mt-8">
              <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700 dark:backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-400 rounded-full"></div>
                    {t('appointmentsLast7Days')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('appointmentsAnalyticsDescription')}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
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
                    className="h-[300px]"
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
                          stroke="#dc2626"
                          strokeWidth={1}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right side - Sidebar */}
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
