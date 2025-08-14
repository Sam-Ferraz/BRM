import { useState, useEffect, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
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
import { combineDateAndTime } from "@/lib/datetime"
import { ReactiveDateTime } from "@/components/reactive-datetime"

export default function AtendimentosPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
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

  // Check for auto-open dialog from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      setEditingAtendimento(undefined)
      // Remove the query parameter after opening
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('new')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

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
        title: t('error'),
        description: t('serviceLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, tipoFilter, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchAtendimentos()
  }, [fetchAtendimentos])

  const handleCreate = async (data: Omit<Atendimento, "id">) => {
    try {
      setFormLoading(true)
      await api.atendimentos.create(data)
      toast({
        title: t('success'),
        description: t('serviceCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchAtendimentos()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('serviceCreateError'),
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
        title: t('success'),
        description: t('serviceUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingAtendimento(undefined)
      fetchAtendimentos()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('serviceUpdateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteService'))) return

    try {
      await api.atendimentos.delete(id)
      toast({
        title: t('success'),
        description: t('serviceDeletedSuccess'),
      })
      fetchAtendimentos()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('serviceDeleteError'),
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
                  {t('backButton')}
                </Link>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">{t('servicesTitle')}</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newService')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('servicesManagement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchServices')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">{t('allStatuses')}</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Andamento">{t('inProgress')}</SelectItem>
                  <SelectItem value="Concluído">{t('completed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">{t('allTypes')}</SelectItem>
                  <SelectItem value="Suporte">{t('supportType')}</SelectItem>
                  <SelectItem value="Vendas">{t('salesType')}</SelectItem>
                  <SelectItem value="Consultoria">{t('consultingType')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingServices')}</div>
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
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("data")}
                    >
                      {t('dateTime')} {sortBy === "data" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
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
                          <ReactiveDateTime 
                            value={combineDateAndTime(atendimento.data, atendimento.hora)}
                            type="datetime"
                          />
                        </div>
                      </TableCell>
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {t('noServicesFound')}
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