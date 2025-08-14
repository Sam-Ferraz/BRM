import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Package, HeadphonesIcon, Settings, LogOut, FileText, Plus } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart-simple"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { NegocioForm } from "@/components/forms/negocio-form"
import { ClienteForm } from "@/components/forms/cliente-form"
import { ProdutoForm } from "@/components/forms/produto-form"
import { AtendimentoForm } from "@/components/forms/atendimento-form"
import { api } from "@/lib/api-client"

// Mock data for charts
const salesData = [
  { month: "Jan", vendas: 12000, propostas: 8000 },
  { month: "Fev", vendas: 15000, propostas: 12000 },
  { month: "Mar", vendas: 18000, propostas: 15000 },
  { month: "Abr", vendas: 22000, propostas: 18000 },
  { month: "Mai", vendas: 25000, propostas: 20000 },
  { month: "Jun", vendas: 28000, propostas: 22000 },
]

const getStatusData = (t: any) => [
  { name: t('closed'), value: 35, color: "#10b981" },
  { name: t('inProgress'), value: 45, color: "#3b82f6" },
  { name: t('proposals'), value: 20, color: "#f59e0b" },
]

export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalNegocios: 0,
    totalClientes: 0,
    totalProdutos: 0,
    totalAtendimentos: 0,
  })
  const [formStates, setFormStates] = useState({
    negocio: false,
    cliente: false,
    produto: false,
    atendimento: false,
  })
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Mock stats - in real app, fetch from API
    setStats({
      totalNegocios: 24,
      totalClientes: 156,
      totalProdutos: 89,
      totalAtendimentos: 42,
    })
  }, [])

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

  const handleCreateNegocio = async (data: any) => {
    setLoading(true)
    try {
      await api.negocios.create(data)
      toast({
        title: t('successMessages.dealCreated'),
        description: t('successMessages.dealCreated'),
      })
      closeForm('negocio')
      // Update stats
      setStats(prev => ({ ...prev, totalNegocios: prev.totalNegocios + 1 }))
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

  const handleCreateCliente = async (data: any) => {
    setLoading(true)
    try {
      await api.clientes.create(data)
      toast({
        title: t('successMessages.clientCreated'),
        description: t('successMessages.clientCreated'),
      })
      closeForm('cliente')
      // Update stats
      setStats(prev => ({ ...prev, totalClientes: prev.totalClientes + 1 }))
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

  const handleCreateProduto = async (data: any) => {
    setLoading(true)
    try {
      await api.produtos.create(data)
      toast({
        title: t('successMessages.productCreated'),
        description: t('successMessages.productCreated'),
      })
      closeForm('produto')
      // Update stats
      setStats(prev => ({ ...prev, totalProdutos: prev.totalProdutos + 1 }))
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

  const handleCreateAtendimento = async (data: any) => {
    setLoading(true)
    try {
      await api.atendimentos.create(data)
      toast({
        title: t('successMessages.serviceCreated'),
        description: t('successMessages.serviceCreated'),
      })
      closeForm('atendimento')
      // Update stats
      setStats(prev => ({ ...prev, totalAtendimentos: prev.totalAtendimentos + 1 }))
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
      href: "/configuracoes",
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
          <Link to="/negocios">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('deals')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalNegocios}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/clientes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('clients')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalClientes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/produtos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('products')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalProdutos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/atendimentos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('services')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <HeadphonesIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">{stats.totalAtendimentos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/pauta-vendas">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">{t('salesAgenda')}</p>
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-foreground ml-3">8</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('salesVsProposals')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      vendas: {
                        label: "Vendas",
                        color: "hsl(var(--chart-1))",
                      },
                      propostas: {
                        label: "Propostas",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={ChartTooltipContent as any} />
                        <Bar dataKey="vendas" fill="var(--color-vendas)" />
                        <Bar dataKey="propostas" fill="var(--color-propostas)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('dealStatus')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      fechados: {
                        label: "Fechados",
                        color: "#10b981",
                      },
                      andamento: {
                        label: "Em Andamento",
                        color: "#3b82f6",
                      },
                      propostas: {
                        label: "Propostas",
                        color: "#f59e0b",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getStatusData(t)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {getStatusData(t).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={ChartTooltipContent as any} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
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
              onClick={() => openFormFromFab('negocio')}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              {t('deal')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('cliente')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('client')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('produto')}
            >
              <Package className="w-4 h-4 mr-2" />
              {t('product')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('atendimento')}
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
      <NegocioForm
        open={formStates.negocio}
        onOpenChange={() => closeForm('negocio')}
        onSubmit={handleCreateNegocio}
        loading={loading}
      />
      <ClienteForm
        open={formStates.cliente}
        onOpenChange={() => closeForm('cliente')}
        onSubmit={handleCreateCliente}
        loading={loading}
      />
      <ProdutoForm
        open={formStates.produto}
        onOpenChange={() => closeForm('produto')}
        onSubmit={handleCreateProduto}
        loading={loading}
      />
      <AtendimentoForm
        open={formStates.atendimento}
        onOpenChange={() => closeForm('atendimento')}
        onSubmit={handleCreateAtendimento}
        loading={loading}
      />
    </div>
  )
}