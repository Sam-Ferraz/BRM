"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Filter, Search, MoreHorizontal, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function NegociosPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const negocios = [
    { id: 1, cliente: "João Silva", valor: "R$ 15.000", status: "Em Andamento", data: "15/01/2024" },
    { id: 2, cliente: "Maria Santos", valor: "R$ 8.500", status: "Proposta", data: "12/01/2024" },
    { id: 3, cliente: "Pedro Costa", valor: "R$ 22.000", status: "Fechado", data: "10/01/2024" },
    { id: 4, cliente: "Ana Oliveira", valor: "R$ 12.300", status: "Em Andamento", data: "08/01/2024" },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Fechado":
        return "bg-green-100 text-green-800"
      case "Em Andamento":
        return "bg-blue-100 text-blue-800"
      case "Proposta":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <span className="ml-4 font-semibold text-gray-900">Gestão de Negócios</span>
            </div>
            <Badge variant="outline">a</Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Negócio
                </Button>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Filtros Rápidos</h4>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Todos
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Em Andamento
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Propostas
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Fechados
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="text-xl">Tabela de Negócios</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar negócios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtros
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {negocios.map((negocio) => (
                        <TableRow key={negocio.id}>
                          <TableCell className="font-medium">#{negocio.id}</TableCell>
                          <TableCell>{negocio.cliente}</TableCell>
                          <TableCell className="font-semibold">{negocio.valor}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(negocio.status)}>{negocio.status}</Badge>
                          </TableCell>
                          <TableCell>{negocio.data}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
