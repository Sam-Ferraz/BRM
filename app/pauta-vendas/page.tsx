"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, MoreHorizontal, ArrowLeft, Edit, Trash2, ArrowUpDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type PautaVenda } from "@/lib/api"
import { PautaVendaForm } from "@/components/forms/pauta-venda-form"
import { useToast } from "@/hooks/use-toast"

export default function PautaVendasPage() {
  const [pautaVendas, setPautaVendas] = useState<PautaVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState<string>("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [formOpen, setFormOpen] = useState(false)
  const [editingPauta, setEditingPauta] = useState<PautaVenda | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const { toast } = useToast()

  const loadPautaVendas = async () => {
    try {
      setLoading(true)
      const response = await api.pautaVendas.getAll({
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder,
      })
      setPautaVendas(response.data)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar pauta de vendas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPautaVendas()
  }, [searchTerm, statusFilter, sortBy, sortOrder])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const handleCreate = () => {
    setEditingPauta(undefined)
    setFormOpen(true)
  }

  const handleEdit = (pauta: PautaVenda) => {
    setEditingPauta(pauta)
    setFormOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingId) return

    try {
      await api.pautaVendas.delete(deletingId)
      toast({
        title: "Sucesso",
        description: "Pauta excluída com sucesso",
      })
      loadPautaVendas()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir pauta",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setDeletingId(null)
    }
  }

  const handleFormSubmit = async (data: any) => {
    try {
      setFormLoading(true)
      if (editingPauta) {
        await api.pautaVendas.update(editingPauta.id, data)
        toast({
          title: "Sucesso",
          description: "Pauta atualizada com sucesso",
        })
      } else {
        await api.pautaVendas.create(data)
        toast({
          title: "Sucesso",
          description: "Pauta criada com sucesso",
        })
      }
      setFormOpen(false)
      loadPautaVendas()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar pauta",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluída":
        return "bg-green-100 text-green-800"
      case "Ativa":
        return "bg-blue-100 text-blue-800"
      case "Cancelada":
        return "bg-red-100 text-red-800"
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
              <span className="ml-4 font-semibold text-gray-900">Pauta de Vendas</span>
            </div>
            <Badge variant="outline">e</Badge>
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
                <Button className="w-full" onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Pauta
                </Button>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Filtros</h4>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Ativa">Ativas</SelectItem>
                      <SelectItem value="Concluída">Concluídas</SelectItem>
                      <SelectItem value="Cancelada">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="text-xl">Pauta de Vendas</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar pautas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleSort("id")} className="h-auto p-0 font-medium">
                            ID <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("titulo")}
                            className="h-auto p-0 font-medium"
                          >
                            Título <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("cliente")}
                            className="h-auto p-0 font-medium"
                          >
                            Cliente <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("valor")}
                            className="h-auto p-0 font-medium"
                          >
                            Valor <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("status")}
                            className="h-auto p-0 font-medium"
                          >
                            Status <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleSort("data")} className="h-auto p-0 font-medium">
                            Data <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : pautaVendas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Nenhuma pauta encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        pautaVendas.map((pauta) => (
                          <TableRow key={pauta.id}>
                            <TableCell className="font-medium">#{pauta.id}</TableCell>
                            <TableCell className="font-semibold">{pauta.titulo}</TableCell>
                            <TableCell>{pauta.cliente}</TableCell>
                            <TableCell className="font-semibold text-green-600">{pauta.valor}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(pauta.status)}>{pauta.status}</Badge>
                            </TableCell>
                            <TableCell>{pauta.data}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(pauta)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(pauta.id)} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PautaVendaForm
        pautaVenda={editingPauta}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pauta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
