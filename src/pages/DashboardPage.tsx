import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Package, HeadphonesIcon, Settings, LogOut, FileText } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart-simple"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

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

  const handleLogout = async () => {
    try {
      await logout()
      toast.success("Logout realizado com sucesso")
    } catch (error) {
      toast.error("Erro ao fazer logout")
    }
  }

  const menuItems = [
    {
      title: "Negócios",
      description: "Gerencie seus negócios e oportunidades",
      icon: Briefcase,
      href: "/negocios",
      badge: "a",
      color: "bg-blue-500",
    },
    {
      title: "Clientes",
      description: "Cadastro e gestão de clientes",
      icon: Users,
      href: "/clientes",
      badge: "b",
      color: "bg-green-500",
    },
    {
      title: "Atendimentos",
      description: "Controle de atendimentos e suporte",
      icon: HeadphonesIcon,
      href: "/atendimentos",
      badge: "c",
      color: "bg-purple-500",
    },
    {
      title: "Produtos",
      description: "Catálogo e estoque de produtos",
      icon: Package,
      href: "/produtos",
      badge: "d",
      color: "bg-orange-500",
    },
    {
      title: "Pauta de Vendas",
      description: "Planejamento e acompanhamento de vendas",
      icon: FileText,
      href: "/pauta-vendas",
      badge: "e",
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 ${item.color} rounded-lg`}>
                              <item.icon className="w-6 h-6 text-white" />
                            </div>
                            <Badge variant="outline">{item.badge}</Badge>
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

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" asChild>
                  <Link to="/negocios">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Novo Negócio
                  </Link>
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link to="/clientes">
                    <Users className="w-4 h-4 mr-2" />
                    Novo Cliente
                  </Link>
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link to="/produtos">
                    <Package className="w-4 h-4 mr-2" />
                    Novo Produto
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}