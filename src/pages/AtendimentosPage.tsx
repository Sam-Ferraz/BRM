import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Plus, Pencil, Trash2, Search, Clock, User, HeadphonesIcon } from "lucide-react"
import { api, type Atendimento } from "@/lib/api-client"
import { AtendimentoForm } from "@/components/forms/atendimento-form"
import { useToast } from "@/hooks/use-toast"

export default function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [tipoFilter, setTipoFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAtendimento, setEditingAtendimento] = useState<Atendimento | undefined>()
  
  const { toast } = useToast()

  const fetchAtendimentos = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (statusFilter && statusFilter !== "Todos") filters.status = statusFilter
      if (tipoFilter && tipoFilter !== "Todos") filters.tipo = tipoFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.atendimentos.getAll(filters)
      setAtendimentos(result.data)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar atendimentos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, tipoFilter, sortBy, sortOrder, toast])

  useEffect(() => {
    fetchAtendimentos()
  }, [fetchAtendimentos])

  const handleCreate = async (data: Omit<Atendimento, "id">) => {
    try {
      setFormLoading(true)
      await api.atendimentos.create(data)
      toast({
        title: "Sucesso",
        description: "Atendimento criado com sucesso",
      })
      setIsFormOpen(false)
      fetchAtendimentos()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar atendimento",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data: Partial<Atendimento>) => {
    if (!editingAtendimento) return

    try {
      setFormLoading(true)
      await api.atendimentos.update(editingAtendimento.id, data)
      toast({
        title: "Sucesso",
        description: "Atendimento atualizado com sucesso",
      })
      setIsFormOpen(false)
      setEditingAtendimento(undefined)
      fetchAtendimentos()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar atendimento",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este atendimento?")) return

    try {
      await api.atendimentos.delete(id)
      toast({
        title: "Sucesso",
        description: "Atendimento excluído com sucesso",
      })
      fetchAtendimentos()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir atendimento",
        variant: "destructive",
      })
    }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Concluído":
        return "default"
      case "Em Andamento":
        return "secondary"
      case "Pendente":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "Suporte":
        return "destructive"
      case "Vendas":
        return "default"
      case "Consultoria":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild className="mr-4">
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Atendimentos</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Atendimento
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Atendimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar atendimentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Tipos</SelectItem>
                  <SelectItem value="Suporte">Suporte</SelectItem>
                  <SelectItem value="Vendas">Vendas</SelectItem>
                  <SelectItem value="Consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando atendimentos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("cliente")}
                    >
                      Cliente {sortBy === "cliente" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("data")}
                    >
                      Data {sortBy === "data" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("hora")}
                    >
                      Hora {sortBy === "hora" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atendimentos.map((atendimento) => (
                    <TableRow key={atendimento.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {atendimento.cliente}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadgeVariant(atendimento.tipo)}>
                          {atendimento.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(atendimento.status)}>
                          {atendimento.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {atendimento.data}
                        </div>
                      </TableCell>
                      <TableCell>{atendimento.hora}</TableCell>
                      <TableCell>
                        {atendimento.descricao ? (
                          <span className="text-sm text-gray-600 truncate max-w-32 block">
                            {atendimento.descricao}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAtendimento(atendimento)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(atendimento.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {atendimentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhum atendimento encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AtendimentoForm
        atendimento={editingAtendimento}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingAtendimento(undefined)
        }}
        onSubmit={editingAtendimento ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}