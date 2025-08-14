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
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react"
import { api, type Negocio } from "@/lib/api-client"
import { NegocioForm } from "@/components/forms/negocio-form"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/datetime"

export default function NegociosPage() {
  const { t } = useTranslation()
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
        title: t('error'),
        description: t('dealLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchNegocios()
  }, [fetchNegocios])

  const handleCreate = async (data: Omit<Negocio, "id">) => {
    try {
      setFormLoading(true)
      await api.negocios.create(data)
      toast({
        title: t('success'),
        description: t('dealCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchNegocios()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('dealCreateError'),
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
        title: t('success'),
        description: t('dealUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingNegocio(undefined)
      fetchNegocios()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('dealUpdateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteDeal'))) return

    try {
      await api.negocios.delete(id)
      toast({
        title: t('success'),
        description: t('dealDeletedSuccess'),
      })
      fetchNegocios()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('dealDeleteError'),
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
        return <Badge variant="secondary">{t('proposal')}</Badge>
      case "Em Andamento":
        return <Badge variant="default">{t('inProgress')}</Badge>
      case "Fechado":
        return <Badge variant="outline">{t('closed')}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const statusOptions = [
    { value: "Todos", label: t('allStatuses') },
    { value: "Proposta", label: t('proposal') },
    { value: "Em Andamento", label: t('inProgress') },
    { value: "Fechado", label: t('closed') }
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
              <h1 className="text-xl font-semibold text-gray-900">{t('dealsTitle')}</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newDeal')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('dealsManagement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchDeals')}
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
              <div className="text-center py-8">{t('loadingDeals')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
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
                      onClick={() => handleSort("status")}
                    >
                      {t('status')} {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("data")}
                    >
                      {t('date')} {sortBy === "data" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {negocios.map((negocio) => (
                    <TableRow key={negocio.id}>
                      <TableCell className="font-medium">{negocio.cliente}</TableCell>
                      <TableCell>{negocio.valor}</TableCell>
                      <TableCell>{getStatusBadge(negocio.status)}</TableCell>
                      <TableCell>{formatDate(negocio.data)}</TableCell>
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
                        {t('noDealsFound')}
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