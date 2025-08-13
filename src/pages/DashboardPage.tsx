import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Package, HeadphonesIcon, Settings, LogOut, FileText, Plus } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart-simple"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { NegocioForm } from "@/components/forms/negocio-form"
import { ClienteForm } from "@/components/forms/cliente-form"
import { ProdutoForm } from "@/components/forms/produto-form"
import { AtendimentoForm } from "@/components/forms/atendimento-form"
import { api } from "@/lib/api"

// Mock data for charts
const salesData = [
  { month: "Jan", vendas: 12000, propostas: 8000 },
  { month: "Fev", vendas: 15000, propostas: 12000 },
  { month: "Mar", vendas: 18000, propostas: 15000 },
  { month: "Abr", vendas: 22000, propostas: 18000 },
  { month: "Mai", vendas: 25000, propostas: 20000 },
  { month: "Jun", vendas: 28000, propostas: 22000 },
]

const statusData = [
  { name: "Fechados", value: 35, color: "#10b981" },
  { name: "Em Andamento", value: 45, color: "#3b82f6" },
  { name: "Propostas", value: 20, color: "#f59e0b" },
]

export default function DashboardPage() {
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
      toast.success("Logout realizado com sucesso")
    } catch (error) {
      toast.error("Erro ao fazer logout")
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
      toast.success("Negócio criado com sucesso!")
      closeForm('negocio')
      // Update stats
      setStats(prev => ({ ...prev, totalNegocios: prev.totalNegocios + 1 }))
    } catch (error) {
      toast.error("Erro ao criar negócio")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCliente = async (data: any) => {
    setLoading(true)
    try {
      await api.clientes.create(data)
      toast.success("Cliente criado com sucesso!")
      closeForm('cliente')
      // Update stats
      setStats(prev => ({ ...prev, totalClientes: prev.totalClientes + 1 }))
    } catch (error) {
      toast.error("Erro ao criar cliente")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduto = async (data: any) => {
    setLoading(true)
    try {
      await api.produtos.create(data)
      toast.success("Produto criado com sucesso!")
      closeForm('produto')
      // Update stats
      setStats(prev => ({ ...prev, totalProdutos: prev.totalProdutos + 1 }))
    } catch (error) {
      toast.error("Erro ao criar produto")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAtendimento = async (data: any) => {
    setLoading(true)
    try {
      await api.atendimentos.create(data)
      toast.success("Atendimento criado com sucesso!")
      closeForm('atendimento')
      // Update stats
      setStats(prev => ({ ...prev, totalAtendimentos: prev.totalAtendimentos + 1 }))
    } catch (error) {
      toast.error("Erro ao criar atendimento")
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    {
      title: "Negócios",
      description: "Gerencie seus negócios e oportunidades",
      icon: Briefcase,
      href: "/negocios",
      color: "bg-blue-500",
    },
    {
      title: "Clientes",
      description: "Cadastro e gestão de clientes",
      icon: Users,
      href: "/clientes",
      color: "bg-green-500",
    },
    {
      title: "Atendimentos",
      description: "Controle de atendimentos e suporte",
      icon: HeadphonesIcon,
      href: "/atendimentos",
      color: "bg-purple-500",
    },
    {
      title: "Produtos",
      description: "Catálogo e estoque de produtos",
      icon: Package,
      href: "/produtos",
      color: "bg-orange-500",
    },
    {
      title: "Pauta de Vendas",
      description: "Planejamento e acompanhamento de vendas",
      icon: FileText,
      href: "/pauta-vendas",
      color: "bg-indigo-500",
    },
  ]

  const settingsItems = [
    {
      title: "Configurações",
      icon: Settings,
      href: "/configuracoes",
    },
    {
      title: "Suporte",
      icon: HeadphonesIcon,
      href: "/suporte",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">LOGO</span>
              </div>
              <span className="font-semibold text-gray-900">Sistema de Gestão</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Bem-vindo, {user?.name || "Usuário"}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Negócios</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalNegocios}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalClientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Produtos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProdutos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <HeadphonesIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Atendimentos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAtendimentos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Navigation */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Menu Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map((item) => (
                    <Link key={item.href} to={item.href}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex items-center mb-4">
                            <div className={`p-3 ${item.color} rounded-lg`}>
                              <item.icon className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendas vs Propostas</CardTitle>
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
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="vendas" fill="var(--color-vendas)" />
                        <Bar dataKey="propostas" fill="var(--color-propostas)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status dos Negócios</CardTitle>
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
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
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
                <CardTitle className="text-lg">Configurações</CardTitle>
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
                  Sair
                </Button>
              </CardContent>
            </Card>

            {/* Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Painel de Indicadores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Taxa de Conversão</span>
                  <span className="font-semibold text-green-600">68%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ticket Médio</span>
                  <span className="font-semibold">R$ 15.240</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Meta Mensal</span>
                  <span className="font-semibold text-blue-600">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Satisfação</span>
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
              Negócio
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('cliente')}
            >
              <Users className="w-4 h-4 mr-2" />
              Cliente
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('produto')}
            >
              <Package className="w-4 h-4 mr-2" />
              Produto
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-lg bg-white border-gray-300"
              onClick={() => openFormFromFab('atendimento')}
            >
              <HeadphonesIcon className="w-4 h-4 mr-2" />
              Atendimento
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