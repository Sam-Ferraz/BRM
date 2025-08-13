import { useState, useEffect, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react"
import { api, type Negocio } from "@/lib/api-client"
import { NegocioForm } from "@/components/forms/negocio-form"
import { useToast } from "@/hooks/use-toast"

export default function NegociosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingNegocio, setEditingNegocio] = useState<Negocio | undefined>()
  
  const { toast } = useToast()

  // Check for auto-open dialog from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      setEditingNegocio(undefined)
      // Remove the query parameter after opening
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('new')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchNegocios = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (statusFilter !== "Todos") filters.status = statusFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.negocios.getAll(filters)
      setNegocios(result.data)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar negócios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder, toast])

  useEffect(() => {
    fetchNegocios()
  }, [fetchNegocios])

  const handleCreate = async (data: Omit<Negocio, "id">) => {
    try {
      setFormLoading(true)
      await api.negocios.create(data)
      toast({
        title: "Sucesso",
        description: "Negócio criado com sucesso",
      })
      setIsFormOpen(false)
      fetchNegocios()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar negócio",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data: Partial<Negocio>) => {
    if (!editingNegocio) return

    try {
      setFormLoading(true)
      await api.negocios.update(editingNegocio.id, data)
      toast({
        title: "Sucesso",
        description: "Negócio atualizado com sucesso",
      })
      setIsFormOpen(false)
      setEditingNegocio(undefined)
      fetchNegocios()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar negócio",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este negócio?")) return

    try {
      await api.negocios.delete(id)
      toast({
        title: "Sucesso",
        description: "Negócio excluído com sucesso",
      })
      fetchNegocios()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir negócio",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Proposta":
        return <Badge variant="secondary">Proposta</Badge>
      case "Em Andamento":
        return <Badge variant="default">Em Andamento</Badge>
      case "Fechado":
        return <Badge variant="outline">Fechado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const statusOptions = ["Todos", "Proposta", "Em Andamento", "Fechado"]

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
              <h1 className="text-xl font-semibold text-gray-900">Negócios</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Negócio
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Negócios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar negócios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando negócios...</div>
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
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("valor")}
                    >
                      Valor {sortBy === "valor" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("status")}
                    >
                      Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("data")}
                    >
                      Data {sortBy === "data" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {negocios.map((negocio) => (
                    <TableRow key={negocio.id}>
                      <TableCell className="font-medium">{negocio.cliente}</TableCell>
                      <TableCell>{negocio.valor}</TableCell>
                      <TableCell>{getStatusBadge(negocio.status)}</TableCell>
                      <TableCell>{negocio.data}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {negocio.descricao || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingNegocio(negocio)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(negocio.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {negocios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum negócio encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <NegocioForm
        negocio={editingNegocio}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingNegocio(undefined)
        }}
        onSubmit={editingNegocio ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}