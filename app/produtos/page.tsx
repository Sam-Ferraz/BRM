"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Filter, Search, MoreHorizontal, ArrowLeft, Package } from "lucide-react"
import Link from "next/link"

export default function ProdutosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  const produtos = [
    { id: 1, nome: "Produto A", preco: "R$ 299,90", categoria: "Eletrônicos", estoque: 15 },
    { id: 2, nome: "Produto B", preco: "R$ 199,90", categoria: "Casa", estoque: 8 },
    { id: 3, nome: "Produto C", preco: "R$ 399,90", categoria: "Esportes", estoque: 22 },
    { id: 4, nome: "Produto D", preco: "R$ 149,90", categoria: "Livros", estoque: 5 },
    { id: 5, nome: "Produto E", preco: "R$ 599,90", categoria: "Eletrônicos", estoque: 12 },
    { id: 6, nome: "Produto F", preco: "R$ 89,90", categoria: "Casa", estoque: 30 },
  ]

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
              <span className="ml-4 font-semibold text-gray-900">Gestão de Produtos</span>
            </div>
            <Badge variant="outline">d</Badge>
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
                  Novo Produto
                </Button>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Filtros & Ordenação</h4>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Todos
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Em Estoque
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Baixo Estoque
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Sem Estoque
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Visualização</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                    >
                      Grade
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                    >
                      Lista
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="text-xl">Pauta de Produtos</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar produtos..."
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {produtos.map((produto) => (
                    <Card key={produto.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-sm text-gray-500">ID #{produto.id}</span>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                          <h3 className="font-semibold text-lg">{produto.nome}</h3>
                          <p className="text-xl font-bold text-green-600">{produto.preco}</p>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{produto.categoria}</span>
                            <Badge
                              variant={
                                produto.estoque > 10 ? "default" : produto.estoque > 0 ? "secondary" : "destructive"
                              }
                            >
                              {produto.estoque} un.
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
