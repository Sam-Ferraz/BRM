import { useState, useEffect, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
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
import { ArrowLeft, Plus, Pencil, Trash2, Search, DollarSign, Calendar, User } from "lucide-react"
import { api, type PautaVenda } from "@/lib/api-client"
import { PautaVendaForm } from "@/components/forms/pauta-venda-form"
import { useToast } from "@/hooks/use-toast"

export default function PautaVendasPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [pautaVendas, setPautaVendas] = useState<PautaVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPautaVenda, setEditingPautaVenda] = useState<PautaVenda | undefined>()
  
  const { toast } = useToast()

  // Check for auto-open dialog from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      setEditingPautaVenda(undefined)
      // Remove the query parameter after opening
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('new')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchPautaVendas = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (statusFilter !== "Todos") filters.status = statusFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.pautaVendas.getAll(filters)
      setPautaVendas(result.data)
    } catch (error) {
      toast({
        title: t('error'),
        description: t('salesAgendaLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchPautaVendas()
  }, [fetchPautaVendas])

  const handleCreate = async (data: Omit<PautaVenda, "id">) => {
    try {
      setFormLoading(true)
      await api.pautaVendas.create(data)
      toast({
        title: t('success'),
        description: t('salesAgendaCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchPautaVendas()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('salesAgendaCreateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data: Partial<PautaVenda>) => {
    if (!editingPautaVenda) return

    try {
      setFormLoading(true)
      await api.pautaVendas.update(editingPautaVenda.id, data)
      toast({
        title: t('success'),
        description: t('salesAgendaUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingPautaVenda(undefined)
      fetchPautaVendas()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('salesAgendaUpdateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteSalesAgenda'))) return

    try {
      await api.pautaVendas.delete(id)
      toast({
        title: t('success'),
        description: t('salesAgendaDeletedSuccess'),
      })
      fetchPautaVendas()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('salesAgendaDeleteError'),
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
      case "Ativa":
        return <Badge variant="default">{t('active')}</Badge>
      case "Concluída":
        return <Badge variant="outline">{t('completed')}</Badge>
      case "Cancelada":
        return <Badge variant="destructive">{t('cancelled')}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const statusOptions = [
    { value: "Todos", label: t('allStatuses') },
    { value: "Ativa", label: t('active') },
    { value: "Concluída", label: t('completed') },
    { value: "Cancelada", label: t('cancelled') }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild className="mr-4">
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Link>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">{t('salesAgendaTitle')}</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newSalesAgenda')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('salesAgendaManagement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchSalesAgenda')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingSalesAgenda')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("titulo")}
                    >
                      {t('title')} {sortBy === "titulo" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("cliente")}
                    >
                      {t('client')} {sortBy === "cliente" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("valor")}
                    >
                      {t('value')} {sortBy === "valor" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("data")}
                    >
                      {t('date')} {sortBy === "data" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("status")}
                    >
                      {t('status')} {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pautaVendas.map((pauta) => (
                    <TableRow key={pauta.id}>
                      <TableCell className="font-medium">{pauta.titulo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {pauta.cliente}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          {pauta.valor}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {pauta.data}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(pauta.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPautaVenda(pauta)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(pauta.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pautaVendas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {t('noSalesAgendaFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <PautaVendaForm
        pautaVenda={editingPautaVenda}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingPautaVenda(undefined)
        }}
        onSubmit={editingPautaVenda ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}