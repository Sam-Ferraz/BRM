import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Package, HeadphonesIcon, Settings, LogOut, FileText, Plus, BarChart3 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { DealForm } from "@/components/forms/deal-form"
import { ClientForm } from "@/components/forms/client-form"
import { ProductForm } from "@/components/forms/product-form"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { api } from "@/lib/api-client"



export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalClients: 0,
    totalProducts: 0,
    totalAppointments: 0,
    totalSalesAgenda: 0,
  })
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
        const stats = await api.dashboard.getStats()
        
        setStats({
          totalDeals: stats.totalDeals,
          totalClients: stats.totalClients,
          totalProducts: stats.totalProducts,
          totalAppointments: stats.totalAppointments,
          totalSalesAgenda: stats.totalSalesAgenda,
        })
        
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
      }
    }
    
    fetchData()
  }, [])

  const refreshStats = async () => {
    try {
      const stats = await api.dashboard.getStats()
      
      setStats({
        totalDeals: stats.totalDeals,
        totalClients: stats.totalClients,
        totalProducts: stats.totalProducts,
        totalAppointments: stats.totalAppointments,
        totalSalesAgenda: stats.totalSalesAgenda,
      })
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
      title: t('analytics'),
      icon: BarChart3,
      href: "/analytics",
    },
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
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
          </div>

          {/* Right side - Sidebar */}
          <div className="space-y-6">
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