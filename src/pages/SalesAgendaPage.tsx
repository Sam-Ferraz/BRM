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
import { ArrowLeft, Plus, Pencil, Trash2, Search, Calendar, Package } from "lucide-react"
import { api, type SalesAgenda, type SalesAgendaCreateInput } from "@/lib/api-client"
import { SalesAgendaForm } from "@/components/forms/sales-agenda-form"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/datetime"

export default function SalesAgendaPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [salesAgendas, setSalesAgendas] = useState<SalesAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSalesAgenda, setEditingSalesAgenda] = useState<SalesAgenda | undefined>()
  
  const { toast } = useToast()

  // Check for auto-open dialog from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      setEditingSalesAgenda(undefined)
      // Remove the query parameter after opening
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('new')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchSalesAgendas = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (statusFilter !== "Todos") filters.status = statusFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.salesAgenda.getAll(filters)
      setSalesAgendas(result.data)
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
    fetchSalesAgendas()
  }, [fetchSalesAgendas])

  const handleCreate = async (data: SalesAgendaCreateInput) => {
    try {
      setFormLoading(true)
      await api.salesAgenda.create(data)
      toast({
        title: t('success'),
        description: t('salesAgendaCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchSalesAgendas()
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

  const handleUpdate = async (data: Partial<SalesAgenda>) => {
    if (!editingSalesAgenda) return

    try {
      setFormLoading(true)
      await api.salesAgenda.update(editingSalesAgenda.id, data)
      toast({
        title: t('success'),
        description: t('salesAgendaUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingSalesAgenda(undefined)
      fetchSalesAgendas()
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
      await api.salesAgenda.delete(id)
      toast({
        title: t('success'),
        description: t('salesAgendaDeletedSuccess'),
      })
      fetchSalesAgendas()
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
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild className="mr-4">
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Link>
              </Button>
              <h1 className="text-xl font-semibold text-foreground">{t('salesAgendaTitle')}</h1>
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                      onClick={() => handleSort("title")}
                    >
                      {t('title')} {sortBy === "title" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("product_name")}
                    >
                      {t('product')} {sortBy === "product_name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("date")}
                    >
                      {t('date')} {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
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
                  {salesAgendas.map((agenda) => (
                    <TableRow key={agenda.id}>
                      <TableCell className="font-medium">{agenda.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {agenda.product_name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(agenda.date)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(agenda.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSalesAgenda(agenda)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(agenda.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesAgendas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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

      <SalesAgendaForm
        salesAgenda={editingSalesAgenda}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingSalesAgenda(undefined)
        }}
        onSubmit={editingSalesAgenda ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}