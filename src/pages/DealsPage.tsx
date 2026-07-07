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
import { ArrowLeft, Plus, Pencil, Trash2, Search, Briefcase, List, LayoutGrid } from "lucide-react"
import { api, type Deal } from "@/lib/api-client"
import { DealForm } from "@/components/forms/deal-form"
import { DealsKanbanView } from "@/components/deals-kanban-view"
import { useToast } from "@/hooks/use-toast"
import { ReactiveDateTime } from "@/components/reactive-datetime"

export default function DealsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>()
  // Modo de visualização: lista (tabela tradicional) ou kanban (colunas por fase)
  // Persistido em localStorage pra manter a escolha do usuário entre sessões
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("deals:viewMode") : null
    return stored === "kanban" ? "kanban" : "list"
  })
  useEffect(() => {
    localStorage.setItem("deals:viewMode", viewMode)
  }, [viewMode])

  const { toast } = useToast()

  // Format currency as Brazilian Real
  const formatCurrency = (value: string | number): string => {
    if (!value) return '-'
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '-'

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue)
  }

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

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (statusFilter !== "Todos") filters.status = statusFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.deals.getAll(filters)
      setDeals(result.data)
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
    fetchDeals()
  }, [fetchDeals])

  const handleCreate = async (data: Omit<Deal, "id">) => {
    try {
      setFormLoading(true)
      await api.deals.create(data)
      toast({
        title: t('success'),
        description: t('dealCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchDeals()
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

  const handleUpdate = async (data: Partial<Deal>) => {
    if (!editingDeal) return

    try {
      setFormLoading(true)
      await api.deals.update(editingDeal.id, data)
      toast({
        title: t('success'),
        description: t('dealUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingDeal(undefined)
      fetchDeals()
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
      await api.deals.delete(id)
      toast({
        title: t('success'),
        description: t('dealDeletedSuccess'),
      })
      fetchDeals()
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

  // Handler pra Kanban: atualiza status de um deal (drag-and-drop ou dropdown)
  const handleStatusChange = async (dealId: number, newStatus: Deal["status"]) => {
    // Optimistic update — reflete na UI antes de esperar o backend
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d)))
    try {
      await api.deals.update(dealId, { status: newStatus })
      toast({ title: t("success"), description: t("dealUpdatedSuccess") })
    } catch (error) {
      // Rollback: volta ao estado anterior recarregando do backend
      fetchDeals()
      toast({
        title: t("error"),
        description: t("dealUpdateError"),
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: Deal['status']) => {
    switch (status) {
      case "service_cold":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-900">{t('dealStatusServiceCold')}</Badge>
      case "service_mild":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-900">{t('dealStatusServiceMild')}</Badge>
      case "service_warm":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-900">{t('dealStatusServiceWarm')}</Badge>
      case "visit_foreseen_cold":
        return <Badge variant="outline" className="bg-blue-100 text-blue-900">{t('dealStatusVisitForeseenCold')}</Badge>
      case "visit_foreseen_mild":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-900">{t('dealStatusVisitForeseenMild')}</Badge>
      case "visit_foreseen_warm":
        return <Badge variant="outline" className="bg-orange-100 text-orange-900">{t('dealStatusVisitForeseenWarm')}</Badge>
      case "visit_done_cold":
        return <Badge variant="outline" className="bg-blue-200 text-blue-900">{t('dealStatusVisitDoneCold')}</Badge>
      case "visit_done_mild":
        return <Badge variant="outline" className="bg-yellow-200 text-yellow-900">{t('dealStatusVisitDoneMild')}</Badge>
      case "visit_done_warm":
        return <Badge variant="outline" className="bg-orange-200 text-orange-900">{t('dealStatusVisitDoneWarm')}</Badge>
      case "proposal":
        return <Badge variant="default">{t('dealStatusProposal')}</Badge>
      case "contract":
        return <Badge variant="default" className="bg-cyan-600 hover:bg-cyan-700">{t('dealStatusContract')}</Badge>
      case "sold":
        return <Badge variant="default" className="bg-green-500">{t('dealStatusSold')}</Badge>
      case "discarded_no_profile":
        return <Badge variant="destructive">{t('dealStatusDiscardedNoProfile')}</Badge>
      case "discarded_no_interest":
        return <Badge variant="destructive">{t('dealStatusDiscardedNoInterest')}</Badge>
      case "discarded_competitor":
        return <Badge variant="destructive">{t('dealStatusDiscardedCompetitor')}</Badge>
      case "discarded_error":
        return <Badge variant="destructive">{t('dealStatusDiscardedError')}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const statusOptions = [
    { value: "Todos", label: t('allStatuses') },
    { value: "service_cold", label: t('dealStatusServiceCold') },
    { value: "service_mild", label: t('dealStatusServiceMild') },
    { value: "service_warm", label: t('dealStatusServiceWarm') },
    { value: "visit_foreseen_cold", label: t('dealStatusVisitForeseenCold') },
    { value: "visit_foreseen_mild", label: t('dealStatusVisitForeseenMild') },
    { value: "visit_foreseen_warm", label: t('dealStatusVisitForeseenWarm') },
    { value: "visit_done_cold", label: t('dealStatusVisitDoneCold') },
    { value: "visit_done_mild", label: t('dealStatusVisitDoneMild') },
    { value: "visit_done_warm", label: t('dealStatusVisitDoneWarm') },
    { value: "proposal", label: t('dealStatusProposal') },
    { value: "contract", label: t('dealStatusContract') },
    { value: "sold", label: t('dealStatusSold') },
    { value: "discarded_no_profile", label: t('dealStatusDiscardedNoProfile') },
    { value: "discarded_no_interest", label: t('dealStatusDiscardedNoInterest') },
    { value: "discarded_competitor", label: t('dealStatusDiscardedCompetitor') },
    { value: "discarded_error", label: t('dealStatusDiscardedError') },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backButton')}
              </Link>
            </Button>
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
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {t('dealsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
              {/* Toggle Lista/Kanban */}
              <div className="flex gap-1 border rounded-md p-0.5 shrink-0">
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="h-8 px-2"
                  title="Visualização em lista"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  onClick={() => setViewMode("kanban")}
                  className="h-8 px-2"
                  title="Visualização em Kanban (colunas por fase)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingDeals')}</div>
            ) : viewMode === "kanban" ? (
              <DealsKanbanView
                deals={deals}
                onEdit={(deal) => {
                  setEditingDeal(deal)
                  setIsFormOpen(true)
                }}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("client")}
                    >
                      {t('client')} {sortBy === "client" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("gsv")}
                    >
                      {t('gsv')} {sortBy === "gsv" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("status")}
                    >
                      {t('status')} {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("origin_date")}
                    >
                      {t('originDate')} {sortBy === "origin_date" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>{t('property')}</TableHead>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow 
                      key={deal.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingDeal(deal)
                        setIsFormOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">{deal.client}</TableCell>
                      <TableCell>{formatCurrency(deal.gsv)}</TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                      <TableCell>
                        <ReactiveDateTime 
                          value={deal.origin_date}
                          type="date"
                        />
                      </TableCell>
                      <TableCell>
                        {deal.property_name ? (
                          <span className="text-sm text-muted-foreground truncate max-w-32 block">
                            {deal.property_name}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {deal.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingDeal(deal)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(deal.id)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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

      <DealForm
        deal={editingDeal}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingDeal(undefined)
        }}
        onSubmit={editingDeal ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}
