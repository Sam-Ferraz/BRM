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
import { api, type Deal } from "@/lib/api-client"
import { DealForm } from "@/components/forms/deal-form"
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

  const getStatusBadge = (status: Deal['status']) => {
    switch (status) {
      case "service":
        return <Badge variant="secondary">{t('dealStatusService')}</Badge>
      case "visit_foreseen":
        return <Badge variant="outline" className="bg-amber-100 text-amber-900">{t('dealStatusVisitForeseen')}</Badge>
      case "visit_done":
        return <Badge variant="outline" className="bg-blue-100 text-blue-900">{t('dealStatusVisitDone')}</Badge>
      case "proposal":
        return <Badge variant="default">{t('dealStatusProposal')}</Badge>
      case "sold":
        return <Badge variant="default" className="bg-green-500">{t('dealStatusSold')}</Badge>
      case "discarded":
        return <Badge variant="destructive">{t('dealStatusDiscarded')}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTemperatureBadge = (temperature?: Deal['temperature']) => {
    if (!temperature) return '-'
    switch (temperature) {
      case 'warm':
        return <Badge variant="default" className="bg-orange-500">{t('temperatureWarm')}</Badge>
      case 'mild':
        return <Badge variant="outline">{t('temperatureMild')}</Badge>
      case 'cold':
        return <Badge variant="secondary">{t('temperatureCold')}</Badge>
      default:
        return temperature
    }
  }

  const statusOptions = [
    { value: "Todos", label: t('allStatuses') },
    { value: "service", label: t('dealStatusService') },
    { value: "visit_foreseen", label: t('dealStatusVisitForeseen') },
    { value: "visit_done", label: t('dealStatusVisitDone') },
    { value: "proposal", label: t('dealStatusProposal') },
    { value: "sold", label: t('dealStatusSold') },
    { value: "discarded", label: t('dealStatusDiscarded') },
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
              <h1 className="text-xl font-semibold text-foreground">{t('dealsTitle')}</h1>
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
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingDeals')}</div>
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
                    <TableHead>{t('temperature')}</TableHead>
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
                      <TableCell>{deal.gsv || '-'}</TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                      <TableCell>{getTemperatureBadge(deal.temperature)}</TableCell>
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
