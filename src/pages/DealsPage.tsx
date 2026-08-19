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
import { ArrowLeft, Plus, Pencil, Trash2, Search, Briefcase, List, LayoutGrid, ArrowUpDown, Tags, X, Check, Columns3 } from "lucide-react"
import { api, type Deal, type LeadWithDetails, type DealLabel } from "@/lib/api-client"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { DealForm } from "@/components/forms/deal-form"
import { DealsKanbanView } from "@/components/deals-kanban-view"
import { ManagePipelineColumnsDialog } from "@/components/manage-pipeline-columns-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { ReactiveDateTime } from "@/components/reactive-datetime"
import { DealCodeBadge } from "@/components/deal-code-badge"
import { CadenceIndicator, deriveCadenceState } from "@/components/cadence-indicator"

export default function DealsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([])
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  // Etiquetas (estilo Trello): CRUD + filtro por selecionadas
  const [labels, setLabels] = useState<DealLabel[]>([])
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<number>>(new Set())
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#0c343d")
  const [labelsOpen, setLabelsOpen] = useState(false)
  // Edicao inline de etiqueta: id sendo editada + valores em rascunho
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingColor, setEditingColor] = useState("#0c343d")
  const LABEL_COLORS = ["#0c343d", "#dc2626", "#ea580c", "#facc15", "#16a34a", "#0ea5e9", "#8b5cf6", "#78716c"]
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  // Filtro por qualificacao (temperatura extraida do status): cold/mild/warm.
  // Aplicado client-side; substitui o antigo statusFilter que listava as
  // 16 combinacoes status x temperatura.
  const [qualificationFilter, setQualificationFilter] = useState<"all" | "cold" | "mild" | "warm">("all")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>()
  // Set de deal_ids com cadência ATRASADA (tag vermelha). Fetchado uma vez;
  // deals que não estão nesse set e são leads = OK (verde); os demais = N/A (cinza).
  const [cadenceOverdueSet, setCadenceOverdueSet] = useState<Set<number>>(() => new Set())
  // Filtros extras (aplicados client-side sobre o array retornado do backend)
  const [cadenceFilter, setCadenceFilter] = useState<"all" | "overdue" | "ok" | "na">("all")

  // Aplica o filtro de cadência sobre os deals já filtrados pelo backend.
  // Regra da tag: overdue = deal_id in cadenceOverdueSet (lead + atrasado);
  //               ok      = client_origin='online_lead' AND NOT overdue;
  //               na      = client_origin !== 'online_lead' (sem análise).
  const filteredDeals = deals.filter((d) => {
    // Filtro por qualificacao (temperatura extraida do sufixo do status)
    if (qualificationFilter !== "all") {
      if (!d.status.endsWith(`_${qualificationFilter}`)) return false
    }
    // Filtro por cadencia (client-side, usa o Set fetchado)
    if (cadenceFilter === "all") return true
    const isOverdue = cadenceOverdueSet.has(d.id)
    const isLead = d.client_origin === "online_lead"
    if (cadenceFilter === "overdue") return isLead && isOverdue
    if (cadenceFilter === "ok") return isLead && !isOverdue
    if (cadenceFilter === "na") return !isLead
    return true
  })
  // Modo de visualização: lista (tabela tradicional) ou kanban (colunas por fase)
  // Persistido em localStorage pra manter a escolha do usuário entre sessões
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    // Default agora e kanban — usuario pediu que a pagina de Negocios abra
    // sempre no kanban primeiro. Se o usuario ja tinha trocado pra list em
    // sessao anterior, respeitamos essa escolha (localStorage).
    const stored = typeof window !== "undefined" ? localStorage.getItem("deals:viewMode") : null
    return stored === "list" ? "list" : "kanban"
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
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.deals.getAll(filters)
      setDeals(result.data)
      // Busca leads em paralelo pra alimentar a coluna 'Sem atendimento' do
      // kanban. Falha silenciosa: se leads nao carregar, kanban ainda funciona.
      api.leads
        .list()
        .then((r) => setLeads(r.data || []))
        .catch(() => setLeads([]))
    } catch (error) {
      toast({
        title: t('error'),
        description: t('dealLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  // Carrega etiquetas da account uma vez ao montar. Falha silenciosa —
  // se falhar, o Popover mostra "Nenhuma etiqueta ainda" e o CRUD ainda
  // funciona pra criar novas.
  useEffect(() => {
    api.dealLabels
      .list()
      .then((r) => setLabels(r.data || []))
      .catch(() => setLabels([]))
  }, [])

  // Fetch de cadência: uma chamada só, cache local. Roda no mount e sempre que
  // um deal é criado/atualizado (via fetchDeals mudar de referência não basta,
  // então re-fetchamos junto — cheap query).
  useEffect(() => {
    let cancelled = false
    api.deals.getCadence()
      .then((res) => {
        if (!cancelled) setCadenceOverdueSet(new Set(res.data.map((r) => r.deal_id)))
      })
      .catch((err) => console.warn("[DealsPage] falha ao buscar cadência:", err))
    return () => {
      cancelled = true
    }
  }, [deals.length])

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
              <Select value={qualificationFilter} onValueChange={(v) => setQualificationFilter(v as typeof qualificationFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Qualificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualificação: Todas</SelectItem>
                  <SelectItem value="cold">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Frio
                    </span>
                  </SelectItem>
                  <SelectItem value="mild">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Morno
                    </span>
                  </SelectItem>
                  <SelectItem value="warm">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Quente
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por Cadência (client-side, usa o Set fetchado) */}
              <Select value={cadenceFilter} onValueChange={(v) => setCadenceFilter(v as typeof cadenceFilter)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Cadência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cadência: Todas</SelectItem>
                  <SelectItem value="overdue">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Atrasada
                    </span>
                  </SelectItem>
                  <SelectItem value="ok">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" /> Em dia
                    </span>
                  </SelectItem>
                  <SelectItem value="na">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-300" /> Sem análise
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Etiquetas (estilo Trello) — substitui o antigo "Ordenar por" */}
              <Popover open={labelsOpen} onOpenChange={setLabelsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[220px] justify-between h-9">
                    <span className="flex items-center gap-1.5 text-sm">
                      <Tags className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedLabelIds.size > 0
                        ? `${selectedLabelIds.size} etiqueta(s)`
                        : "Etiquetas"}
                    </span>
                    <span className="text-xs text-muted-foreground">▼</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Filtrar por etiqueta</div>
                  {labels.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Nenhuma etiqueta ainda
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {labels.map((lb) => {
                        const isSelected = selectedLabelIds.has(lb.id)
                        const isEditing = editingLabelId === lb.id
                        if (isEditing) {
                          return (
                            <div key={lb.id} className="rounded border p-2 space-y-2 bg-muted/40">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                              />
                              <div className="flex items-center gap-1.5">
                                {LABEL_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEditingColor(c)}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                                      editingColor === c ? "border-foreground scale-110" : "border-transparent"
                                    }`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs flex-1"
                                  onClick={async () => {
                                    const name = editingName.trim()
                                    if (!name) return
                                    try {
                                      const result = await api.dealLabels.update(lb.id, { name, color: editingColor })
                                      setLabels((l) =>
                                        l.map((x) => (x.id === lb.id ? result.data : x)).sort((a, b) => a.name.localeCompare(b.name)),
                                      )
                                      setEditingLabelId(null)
                                    } catch (err) {
                                      toast({
                                        title: t("error"),
                                        description: err instanceof Error ? err.message : String(err),
                                        variant: "destructive",
                                      })
                                    }
                                  }}
                                >
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setEditingLabelId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div
                            key={lb.id}
                            className="flex items-center gap-1 rounded px-1 py-1 hover:bg-accent"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLabelIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(lb.id)) next.delete(lb.id)
                                  else next.add(lb.id)
                                  return next
                                })
                              }}
                              className="flex-1 flex items-center gap-2 text-left text-sm px-1 py-0.5"
                            >
                              <span
                                className="inline-block w-5 h-3 rounded"
                                style={{ backgroundColor: lb.color }}
                              />
                              <span className="flex-1 truncate">{lb.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                            <button
                              type="button"
                              title="Editar etiqueta"
                              onClick={() => {
                                setEditingLabelId(lb.id)
                                setEditingName(lb.name)
                                setEditingColor(lb.color)
                              }}
                              className="p-1 rounded hover:bg-muted hover:text-foreground text-muted-foreground transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Excluir etiqueta"
                              onClick={async () => {
                                if (!confirm(`Excluir etiqueta "${lb.name}"?`)) return
                                try {
                                  await api.dealLabels.delete(lb.id)
                                  setLabels((l) => l.filter((x) => x.id !== lb.id))
                                  setSelectedLabelIds((prev) => {
                                    const next = new Set(prev)
                                    next.delete(lb.id)
                                    return next
                                  })
                                } catch (err) {
                                  toast({
                                    title: t("error"),
                                    description: err instanceof Error ? err.message : String(err),
                                    variant: "destructive",
                                  })
                                }
                              }}
                              className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="border-t pt-2 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Nova etiqueta</div>
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Nome"
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-1.5">
                      {["#0c343d", "#dc2626", "#ea580c", "#facc15", "#16a34a", "#0ea5e9", "#8b5cf6", "#78716c"].map(
                        (c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewLabelColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              newLabelColor === c ? "border-foreground scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ),
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const name = newLabelName.trim()
                        if (!name) return
                        try {
                          const result = await api.dealLabels.create({ name, color: newLabelColor })
                          setLabels((l) => [...l, result.data].sort((a, b) => a.name.localeCompare(b.name)))
                          setNewLabelName("")
                        } catch (err) {
                          toast({
                            title: t("error"),
                            description: err instanceof Error ? err.message : String(err),
                            variant: "destructive",
                          })
                        }
                      }}
                      className="w-full h-8 text-xs"
                    >
                      Criar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Gerenciar colunas — so admin ve, so aparece no modo kanban */}
              {viewMode === "kanban" && user?.role === "admin" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setColumnsDialogOpen(true)}
                  className="h-8 px-2 shrink-0"
                  title="Gerenciar colunas do Kanban"
                >
                  <Columns3 className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Colunas</span>
                </Button>
              )}
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
            <ManagePipelineColumnsDialog
              open={columnsDialogOpen}
              onOpenChange={setColumnsDialogOpen}
            />

            {loading ? (
              <div className="text-center py-8">{t('loadingDeals')}</div>
            ) : viewMode === "kanban" ? (
              <DealsKanbanView
                deals={filteredDeals}
                leads={leads}
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
                    <TableHead className="w-[120px]">Código</TableHead>
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
                    <TableHead className="w-[100px]">Cadência</TableHead>
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
                  {filteredDeals.map((deal) => (
                    <TableRow 
                      key={deal.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingDeal(deal)
                        setIsFormOpen(true)
                      }}
                    >
                      <TableCell>
                        <DealCodeBadge id={deal.id} />
                      </TableCell>
                      <TableCell className="font-medium">{deal.client}</TableCell>
                      <TableCell>{formatCurrency(deal.gsv)}</TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                      <TableCell>
                        <CadenceIndicator
                          state={deriveCadenceState(deal.client_origin, deal.id, cadenceOverdueSet)}
                        />
                      </TableCell>
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
                  {filteredDeals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
