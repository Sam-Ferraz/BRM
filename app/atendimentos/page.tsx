"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Filter, Search, MoreHorizontal, ArrowLeft, Clock, User } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function AtendimentosPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const atendimentos = [
    { id: 1, cliente: "João Silva", tipo: "Suporte", status: "Em Andamento", data: "15/01/2024", hora: "14:30" },
    { id: 2, cliente: "Maria Santos", tipo: "Vendas", status: "Concluído", data: "15/01/2024", hora: "10:15" },
    { id: 3, cliente: "Pedro Costa", tipo: "Suporte", status: "Pendente", data: "14/01/2024", hora: "16:45" },
    { id: 4, cliente: "Ana Oliveira", tipo: "Consultoria", status: "Em Andamento", data: "14/01/2024", hora: "09:00" },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído":
        return "bg-green-100 text-green-800"
      case "Em Andamento":
        return "bg-blue-100 text-blue-800"
      case "Pendente":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "Vendas":
        return "bg-purple-100 text-purple-800"
      case "Suporte":
        return "bg-orange-100 text-orange-800"
      case "Consultoria":
        return "bg-cyan-100 text-cyan-800"
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
              <span className="ml-4 font-semibold text-gray-900">Gestão de Atendimentos</span>
            </div>
            <Badge variant="outline">c</Badge>
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
                  Novo Atendimento
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
                    Pendentes
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Concluídos
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Por Tipo</h4>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Suporte
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Vendas
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Consultoria
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
                  <CardTitle className="text-xl">Tabela de Atendimentos</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar atendimentos..."
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
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atendimentos.map((atendimento) => (
                        <TableRow key={atendimento.id}>
                          <TableCell className="font-medium">#{atendimento.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              {atendimento.cliente}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getTipoColor(atendimento.tipo)}>{atendimento.tipo}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(atendimento.status)}>{atendimento.status}</Badge>
                          </TableCell>
                          <TableCell>{atendimento.data}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-gray-400" />
                              {atendimento.hora}
                            </div>
                          </TableCell>
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
