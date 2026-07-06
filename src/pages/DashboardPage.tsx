import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Package, HeadphonesIcon, Settings, LogOut, FileText, Plus, BarChart3, ClipboardCheck, FileSignature, Store, MessageCircle, Inbox, Key, CalendarDays } from "lucide-react"
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
    totalShowcaseProducts: 0,
    totalFollowUps: 0,
    totalProposals: 0,
    totalSales: 0,
    pendingChatAndCalls: 0,
    newLeads: 0,
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
    totalShowcaseProducts: 0,
    totalFollowUps: 0,
    totalProposals: 0,
    totalSales: 0,
    pendingChatAndCalls: 0,
    newLeads: 0,
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
      totalShowcaseProducts: statsData.totalShowcaseProducts,
      totalFollowUps: statsData.totalFollowUps,
      totalProposals: statsData.totalProposals,
      totalSales: statsData.totalSales,
      pendingChatAndCalls: statsData.pendingChatAndCalls,
      newLeads: statsData.newLeads,
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
      const created = await api.products.create(data)
      toast({
        title: t('successMessages.productCreated'),
        description: t('successMessages.productCreated'),
      })
      closeForm('product')
      // Update stats
      await refreshStats()
      return created
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

      // If follow-up data is provided, create the follow-up.
      // O backend exige client_name desde o refactor que tornou os follow-ups
      // independentes de appointment_id — reaproveitamos o cliente do atendimento.
      if (followUpData && createdAppointment.id) {
        await api.followUps.create({
          appointment_id: createdAppointment.id,
          client_name: data.client,
          next_action: followUpData.next_action,
          next_action_date: followUpData.next_action_date,
          completed: false,
        })
      }

      toast({
        title: t('success'),
        description: followUpData
          ? t('serviceAndFollowUpCreatedSuccess')
          : t('serviceCreatedSuccess'),
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
      {/* Header em grid de 3 colunas iguais para que a coluna central fique no
          centro geométrico da página (alinhada à coluna do card Propostas),
          independentemente da largura das áreas esquerda/direita. */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 items-center h-16">
            {/* Esquerda */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
                <span className="font-semibold text-foreground">{t('managementSystem')}</span>
              </Link>
            </div>

            {/* Centro — coluna geometricamente centralizada */}
            <div className="flex justify-center">
              <span className="text-sm text-muted-foreground">
                {t('welcome')}, {user?.name || t('user')}
              </span>
            </div>

            {/* Direita — ícones puros com tooltip via title= */}
            <div className="flex items-center justify-end gap-2">
              <Link to="/settings" title={t('settings')}>
                <Button variant="ghost" size="icon" aria-label={t('settings')}>
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/suporte" title={t('support')}>
                <Button variant="ghost" size="icon" aria-label={t('support')}>
                  <HeadphonesIcon className="w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                title={t('logout')}
                aria-label={t('logout')}
              >
                <LogOut className="w-5 h-5 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards — grid de 4 colunas no desktop (2 no mobile) em formato
            de "rampa invertida": 4 → 3 → 2 → 1 cards por linha. Clientes e
            Vitrine recebem md:col-start-1 para forçar nova linha à esquerda. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {([
                { path: '/agenda',      label: t('agenda'),      icon: CalendarDays,   bg: 'bg-sky-100',     iconColor: 'text-sky-600',      value: '' },
                { path: '/appointments',label: t('services'),    icon: HeadphonesIcon, bg: 'bg-purple-100',  iconColor: 'text-purple-600',   value: stats.totalAppointments },
                { path: '/deals',       label: t('deals'),       icon: Briefcase,      bg: 'bg-blue-100',    iconColor: 'text-blue-600',     value: stats.totalDeals, valueTitle: 'Negócios ativos (todos exceto os descartados)' },
                { path: '/proposals',   label: t('proposals'),   icon: FileSignature,  bg: 'bg-rose-100',    iconColor: 'text-rose-600',     value: stats.totalProposals },
                { path: '/sales',       label: t('sales'),       icon: Key,            bg: 'bg-emerald-100', iconColor: 'text-emerald-600',  value: stats.totalSales },
                { path: '/chat',        label: t('chat'),        icon: MessageCircle,  bg: 'bg-green-100',   iconColor: 'text-green-600',    value: stats.pendingChatAndCalls,  valueTitle: t('pendingChatAndCallsTooltip') },
                { path: '/products',    label: t('products'),    icon: Package,        bg: 'bg-orange-100',  iconColor: 'text-orange-600',   value: stats.totalProducts },
                { path: '/analytics',   label: t('analytics'),   icon: BarChart3,      bg: 'bg-amber-100',   iconColor: 'text-amber-600',    value: 3 },
                { path: '/leads',       label: t('leads'),       icon: Inbox,          bg: 'bg-yellow-100',  iconColor: 'text-yellow-600',   value: stats.newLeads,             valueTitle: t('newLeadsTooltip') },
                { path: '/clients',     label: t('clients'),     icon: Users,          bg: 'bg-green-100',   iconColor: 'text-green-600',    value: stats.totalClients,         position: 'md:col-start-1' },
                { path: '/follow-ups',  label: t('followUps'),   icon: ClipboardCheck, bg: 'bg-teal-100',    iconColor: 'text-teal-600',     value: stats.totalFollowUps },
                { path: '/sales-agenda',label: t('salesAgenda'), icon: Store,          bg: 'bg-indigo-100',  iconColor: 'text-indigo-600',   value: stats.totalShowcaseProducts, position: 'md:col-start-1' },
              ] as const).map((c) => {
                const Icon = c.icon
                const positionClass = 'position' in c && c.position ? c.position : ''
                return (
                  <Link key={c.path} to={c.path} className={positionClass}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 ${c.bg} rounded-lg`}>
                              <Icon className={`w-6 h-6 ${c.iconColor}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                              <p
                                className="text-2xl font-bold text-foreground"
                                {...(('valueTitle' in c && c.valueTitle) ? { title: c.valueTitle } : {})}
                              >
                                {c.value}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
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
