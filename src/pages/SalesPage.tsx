import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Pencil, Search, Key, FileText } from "lucide-react"
import { api, type SaleWithDetails, type SaleStatus } from "@/lib/api-client"
import { SaleForm } from "@/components/forms/sale-form"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/datetime"

const STATUS_VARIANTS: Record<SaleStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending_approval: "secondary",
  approved: "default",
  rejected: "destructive",
}

export default function SalesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [sales, setSales] = useState<SaleWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [createdFrom, setCreatedFrom] = useState<string>("")
  const [createdTo, setCreatedTo] = useState<string>("")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<SaleWithDetails | undefined>()

  const formatCurrency = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === "") return "-"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num)
  }

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true)
      const filters: {
        status?: SaleStatus | "all"
        search?: string
        createdFrom?: string
        createdTo?: string
      } = {}
      if (searchTerm) filters.search = searchTerm
      if (statusFilter !== "all") filters.status = statusFilter as SaleStatus
      if (createdFrom) filters.createdFrom = createdFrom
      if (createdTo) filters.createdTo = createdTo
      const result = await api.sales.getAll(filters)
      setSales(result.data)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("saleLoadError") || "Erro ao carregar vendas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, createdFrom, createdTo, toast, t])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const handleOpenEdit = (sale: SaleWithDetails) => {
    setEditingSale(sale)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingSale(undefined)
  }

  const handleFormSaved = () => {
    setIsFormOpen(false)
    setEditingSale(undefined)
    fetchSales()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild className="mr-4">
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("backButton")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t("sales") || "Vendas"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros — busca, status, range de data de criação */}
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("searchSalesPlaceholder") || "Buscar por cliente, imóvel ou corretor..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses") || "Todos os status"}</SelectItem>
                  <SelectItem value="pending_approval">{t("saleStatus_pending_approval") || "Aguardando aprovação"}</SelectItem>
                  <SelectItem value="approved">{t("saleStatus_approved") || "Aprovada"}</SelectItem>
                  <SelectItem value="rejected">{t("saleStatus_rejected") || "Rejeitada"}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{t("createdFromLabel") || "Criada de"}</span>
                <Input
                  type="date"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  className="w-[160px]"
                  aria-label={t("createdFromLabel") || "Data inicial"}
                />
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{t("createdToLabel") || "Até"}</span>
                <Input
                  type="date"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  className="w-[160px]"
                  aria-label={t("createdToLabel") || "Data final"}
                />
              </div>
              {(createdFrom || createdTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setCreatedFrom(""); setCreatedTo("") }}>
                  {t("clearDates") || "Limpar datas"}
                </Button>
              )}
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("client")}</TableHead>
                    <TableHead>{t("property")}</TableHead>
                    <TableHead>{t("proposalValue")}</TableHead>
                    <TableHead>{t("seller") || "Corretor"}</TableHead>
                    <TableHead>{t("saleDate") || "Data Venda"}</TableHead>
                    <TableHead>{t("contract") || "Contrato"}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions") || "Ações"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t("loading")}
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t("noSalesFound") || "Nenhuma venda encontrada"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.deal_client || "-"}</TableCell>
                        <TableCell>{sale.deal_property_name || "-"}</TableCell>
                        <TableCell>{formatCurrency(sale.proposal_value)}</TableCell>
                        <TableCell>{sale.seller_name || "-"}</TableCell>
                        <TableCell>{sale.sale_date ? formatDate(sale.sale_date) : "-"}</TableCell>
                        <TableCell>
                          {sale.contract_url ? (
                            <FileText className="w-4 h-4 text-green-600" />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[sale.status]}>
                            {t(`saleStatus_${sale.status}`) || sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(sale)}
                            title={t("editSale") || "Abrir venda"}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
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

      {editingSale && (
        <SaleForm
          sale={editingSale}
          open={isFormOpen}
          onOpenChange={(open) => (open ? setIsFormOpen(true) : handleCloseForm())}
          onSaved={handleFormSaved}
          loading={formLoading}
          setLoading={setFormLoading}
        />
      )}
    </div>
  )
}
