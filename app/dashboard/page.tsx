"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Users, ShoppingBag, Calendar, TrendingUp, Settings, LogOut } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard")

  const menuItems = [
    { id: "negocios", label: "Negócios", icon: TrendingUp, badge: "a" },
    { id: "clientes", label: "Clientes", icon: Users, badge: "b" },
    { id: "atendimentos", label: "Atendimentos", icon: Calendar, badge: "c" },
    { id: "produtos", label: "Produtos", icon: ShoppingBag, badge: "d" },
    { id: "pauta-vendas", label: "Pauta de Vendas", icon: BarChart3, badge: "e" },
  ]

  const settingsItems = [
    { label: "Configurações", icon: Settings },
    { label: "Suporte", icon: Users },
    { label: "Tema", icon: Settings },
    { label: "Sair", icon: LogOut },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="ml-2 font-semibold text-gray-900">Sistema de Gestão</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">Legal</Badge>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Menu Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {menuItems.map((item) => (
                  <Link key={item.id} href={`/${item.id}`}>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveSection(item.id)}>
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Settings Menu */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {settingsItems.map((item, index) => (
                  <Button key={index} variant="ghost" className="w-full justify-start">
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Painel de Indicadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Sales Funnel */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Funil de Vendas</h3>
                    <div className="space-y-3">
                      <div className="bg-blue-100 p-4 rounded-lg">
                        <div className="text-center">
                          <div className="w-full h-8 bg-blue-500 rounded-t"></div>
                          <div className="w-4/5 h-8 bg-blue-400 mx-auto"></div>
                          <div className="w-3/5 h-8 bg-blue-300 mx-auto"></div>
                          <div className="w-2/5 h-8 bg-blue-200 mx-auto rounded-b"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Performance</h3>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-green-600 font-bold">85%</span>
                        </div>
                        <p className="text-sm text-gray-600">Propostas</p>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-blue-600 font-bold">72%</span>
                        </div>
                        <p className="text-sm text-gray-600">Fechados</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Negócios X Data Inicial</h4>
                    <div className="h-32 bg-gray-100 rounded flex items-end justify-center space-x-2 p-4">
                      <div className="w-8 bg-blue-500 h-16 rounded-t"></div>
                      <div className="w-8 bg-blue-400 h-20 rounded-t"></div>
                      <div className="w-8 bg-blue-500 h-12 rounded-t"></div>
                      <div className="w-8 bg-blue-400 h-24 rounded-t"></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Tipos Atendimentos X Data Atendimento</h4>
                    <div className="h-32 bg-gray-100 rounded flex items-end justify-center space-x-2 p-4">
                      <div className="w-8 bg-green-500 h-20 rounded-t"></div>
                      <div className="w-8 bg-green-400 h-16 rounded-t"></div>
                      <div className="w-8 bg-green-500 h-24 rounded-t"></div>
                      <div className="w-8 bg-green-400 h-18 rounded-t"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
