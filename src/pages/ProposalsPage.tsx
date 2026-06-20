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
import { ArrowLeft, Plus, Pencil, Trash2, Search, FileSignature } from "lucide-react"
import { api, type Proposal, type ProposalWithDetails, type ProposalStatus } from "@/lib/api-client"
import { ProposalForm } from "@/components/forms/proposal-form"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/datetime"

const STATUS_VARIANTS: Record<ProposalStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
  counter_proposal: "outline",
  expired: "destructive",
}

export default function ProposalsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [proposals, setProposals] = useState<ProposalWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("proposal_date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<ProposalWithDetails | undefined>()

  const formatCurrency = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === "") return "-"
    const numValue = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(numValue)) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue)
  }

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      if (searchTerm) filters.search = searchTerm
      if (statusFilter !== "all") filters.status = statusFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      const result = await api.proposals.getAll(filters)
      setProposals(result.data)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("proposalLoadError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const handleCreate = async (data: any) => {
    try {
      setFormLoading(true)
      await api.proposals.create(data)
      toast({ title: t("success"), description: t("proposalCreatedSuccess") })
      setIsFormOpen(false)
      fetchProposals()
    } catch (error) {
      toast({
        title: t("error"),
        description: t("proposalCreateError"),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingProposal) return
    try {
      setFormLoading(true)
      await api.proposals.update(editingProposal.id, data)
      toast({ title: t("success"), description: t("proposalUpdatedSuccess") })
      setIsFormOpen(false)
      setEditingProposal(undefined)
      fetchProposals()
    } catch (error) {
      toast({
        title: t("error"),
        description: t("proposalUpdateError"),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDeleteProposal"))) return
    try {
      await api.proposals.delete(id)
      toast({ title: t("success"), description: t("proposalDeletedSuccess") })
      fetchProposals()
    } catch (error) {
      toast({
        title: t("error"),
        description: t("proposalDeleteError"),
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
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("newProposal")}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              {t("proposals")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchProposals")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t("status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  <SelectItem value="pending">{t("proposalStatus_pending")}</SelectItem>
                  <SelectItem value="accepted">{t("proposalStatus_accepted")}</SelectItem>
                  <SelectItem value="rejected">{t("proposalStatus_rejected")}</SelectItem>
                  <SelectItem value="counter_proposal">{t("proposalStatus_counter_proposal")}</SelectItem>
                  <SelectItem value="expired">{t("proposalStatus_expired")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">{t("loadingProposals")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("client")}>
                      {t("client")} {sortBy === "client" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("property_name")}>
                      {t("property")} {sortBy === "property_name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("proposal_value")}>
                      {t("proposalValue")} {sortBy === "proposal_value" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("proposal_date")}>
                      {t("proposalDate")} {sortBy === "proposal_date" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("validity_date")}>
                      {t("validityDate")} {sortBy === "validity_date" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                      {t("status")} {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal) => (
                    <TableRow
                      key={proposal.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingProposal(proposal)
                        setIsFormOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">{proposal.deal_client || "-"}</TableCell>
                      <TableCell>{proposal.deal_property_name || "-"}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(proposal.proposal_value)}</TableCell>
                      <TableCell>{formatDate(proposal.proposal_date)}</TableCell>
                      <TableCell>
                        {proposal.validity_date ? formatDate(proposal.validity_date) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[proposal.status]}>
                          {t(`proposalStatus_${proposal.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingProposal(proposal)
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
                              handleDelete(proposal.id)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {proposals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t("noProposalsFound")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ProposalForm
        proposal={editingProposal as Proposal | undefined}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingProposal(undefined)
        }}
        onSubmit={editingProposal ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}
