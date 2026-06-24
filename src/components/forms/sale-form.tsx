"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, XCircle, Upload, FileText } from "lucide-react"
import { api, type SaleWithDetails } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/datetime"

interface SaleFormProps {
  sale: SaleWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  loading?: boolean
  setLoading: (v: boolean) => void
}

/**
 * Form de uma venda. Lê os dados da proposta (read-only) e permite ao corretor
 * preencher data da venda + upload do contrato (PDF). Quando dados completos,
 * mostra botões Aprovar / Rejeitar.
 *
 * Segue o padrão de Dialog scrollable do CLAUDE.md.
 */
export function SaleForm({ sale, open, onOpenChange, onSaved, loading, setLoading }: SaleFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saleDate, setSaleDate] = useState<string>("")
  const [contractUrl, setContractUrl] = useState<string | null>(null)
  const [contractFilename, setContractFilename] = useState<string | null>(null)
  const [approvalNotes, setApprovalNotes] = useState<string>("")

  useEffect(() => {
    if (!open) return
    setSaleDate(sale.sale_date ? sale.sale_date.slice(0, 10) : "")
    setContractUrl(sale.contract_url ?? null)
    setContractFilename(sale.contract_filename ?? null)
    setApprovalNotes(sale.approval_notes ?? "")
  }, [sale, open])

  const formatCurrency = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "-"
    const n = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(n)) return "-"
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
  }

  const isPending = sale.status === "pending_approval"
  // Edição liberada em qualquer status — usuário pode subir novo contrato
  // ou corrigir data mesmo após aprovação/rejeição (auditado por
  // last_modified_by_user_id / last_modified_at no backend).
  const canEdit = true
  const canApprove = isPending && !!saleDate && !!contractUrl

  const handleSaveDetails = async () => {
    try {
      setLoading(true)
      await api.sales.update(sale.id, { sale_date: saleDate || null })
      toast({
        title: t("success") || "Sucesso",
        description: t("saleDetailsSaved") || "Dados da venda salvos",
      })
      onSaved()
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Erro ao salvar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadContract = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: t("error"),
        description: t("contractMustBePdf") || "O contrato deve ser PDF",
        variant: "destructive",
      })
      return
    }
    try {
      setLoading(true)
      const updated = await api.sales.uploadContract(sale.id, file)
      setContractUrl(updated.contract_url ?? null)
      setContractFilename(updated.contract_filename ?? null)
      toast({
        title: t("success") || "Sucesso",
        description: t("contractUploaded") || "Contrato enviado",
      })
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Erro no upload",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!canApprove) return
    try {
      setLoading(true)
      // Garante que sale_date está salvo antes da aprovação (caso usuário não
      // tenha clicado em Salvar antes).
      if (saleDate && saleDate !== (sale.sale_date?.slice(0, 10) || "")) {
        await api.sales.update(sale.id, { sale_date: saleDate })
      }
      await api.sales.approve(sale.id, approvalNotes || null)
      toast({
        title: t("success") || "Sucesso",
        description: t("saleApproved") || "Venda aprovada — imóvel marcado como Vendido",
      })
      onSaved()
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Erro na aprovação",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setLoading(true)
      await api.sales.reject(sale.id, approvalNotes || null)
      toast({
        title: t("success") || "Sucesso",
        description: t("saleRejected") || "Venda rejeitada",
      })
      onSaved()
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Erro ao rejeitar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] max-h-[90vh] flex flex-col"
        {...(isMobile && { onOpenAutoFocus: (e) => e.preventDefault() })}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("saleDetails") || "Detalhes da Venda"}
            <Badge variant={sale.status === "approved" ? "default" : sale.status === "rejected" ? "destructive" : "secondary"}>
              {t(`saleStatus_${sale.status}`) || sale.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex-1 overflow-y-auto p-1 space-y-4">

            {/* Dados da proposta (read-only) */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <h3 className="text-sm font-semibold">{t("proposalData") || "Dados da Proposta"}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{t("client")}:</span> <strong>{sale.deal_client || "-"}</strong></div>
                <div><span className="text-muted-foreground">{t("property")}:</span> <strong>{sale.deal_property_name || "-"}</strong></div>
                <div><span className="text-muted-foreground">{t("propertyPrice")}:</span> {formatCurrency(sale.deal_property_price)}</div>
                <div><span className="text-muted-foreground">{t("proposalValue")}:</span> <strong>{formatCurrency(sale.proposal_value)}</strong></div>
                <div><span className="text-muted-foreground">{t("proposalDate")}:</span> {sale.proposal_date ? formatDate(sale.proposal_date) : "-"}</div>
                <div><span className="text-muted-foreground">{t("validityDate")}:</span> {sale.proposal_validity_date ? formatDate(sale.proposal_validity_date) : "-"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">{t("paymentCondition")}:</span> {sale.proposal_payment_condition || "-"}</div>
                {sale.proposal_vgv && <div><span className="text-muted-foreground">VGV:</span> {formatCurrency(sale.proposal_vgv)}</div>}
                {sale.proposal_vgc && <div><span className="text-muted-foreground">VGC:</span> {formatCurrency(sale.proposal_vgc)}</div>}
                {sale.proposal_intermediation_rate && <div><span className="text-muted-foreground">{t("intermediationRateLabel")}:</span> {sale.proposal_intermediation_rate}%</div>}
              </div>
            </div>

            {/* Corretor (read-only — vem da proposta) */}
            <div className="space-y-2">
              <Label>{t("seller") || "Corretor"}</Label>
              <Input value={sale.seller_name || "-"} readOnly className="bg-muted" />
            </div>

            {/* Data da venda */}
            <div className="space-y-2">
              <Label htmlFor="sale_date">{t("saleDate") || "Data da Venda"}</Label>
              <Input
                id="sale_date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                disabled={!canEdit}
                className={!canEdit ? "bg-muted" : ""}
              />
            </div>

            {/* Contrato */}
            <div className="space-y-2">
              <Label>{t("contract") || "Contrato"}</Label>
              {contractUrl ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                  <FileText className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-sm flex-1 truncate">{contractFilename || "contract.pdf"}</span>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      {t("replaceContract") || "Trocar"}
                    </Button>
                  )}
                </div>
              ) : canEdit ? (
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  {t("uploadContract") || "Enviar contrato (PDF)"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noContract") || "Nenhum contrato"}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadContract(file)
                  e.target.value = "" // permite re-upload do mesmo arquivo
                }}
              />
            </div>

            {/* Notas de aprovação — só editavel enquanto pendente */}
            <div className="space-y-2">
              <Label htmlFor="approval_notes">{t("approvalNotes") || "Observações da aprovação"}</Label>
              <Textarea
                id="approval_notes"
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                disabled={!isPending}
                className={!isPending ? "bg-muted" : ""}
              />
            </div>

            {/* Info de quem aprovou (read-only) */}
            {sale.approver_name && (
              <div className="rounded-md border p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">{t("approvedBy") || "Aprovado por"}:</span> <strong>{sale.approver_name}</strong></div>
                {sale.approved_at && (
                  <div><span className="text-muted-foreground">{t("approvedAt") || "Em"}:</span> {formatDate(typeof sale.approved_at === 'string' ? sale.approved_at : String(sale.approved_at))}</div>
                )}
              </div>
            )}

            {/* Trilha de auditoria — quem alterou por último */}
            {sale.last_modifier_name && (
              <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-1">
                <div className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {t("lastModification") || "Última alteração"}
                </div>
                <div><span className="text-muted-foreground">{t("modifiedBy") || "Alterado por"}:</span> <strong>{sale.last_modifier_name}</strong></div>
                {sale.last_modified_at && (
                  <div><span className="text-muted-foreground">{t("modifiedAt") || "Em"}:</span> {formatDate(typeof sale.last_modified_at === 'string' ? sale.last_modified_at : String(sale.last_modified_at))}</div>
                )}
              </div>
            )}
          </div>{/* fim da área scrollável */}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("close") || "Fechar"}
            </Button>
            {/* Botão Salvar sempre disponível (edição liberada após aprovação) */}
            <Button type="button" variant="outline" onClick={handleSaveDetails} disabled={loading}>
              {t("save")}
            </Button>
            {/* Aprovar/Rejeitar só fazem sentido enquanto pendente */}
            {isPending && (
              <>
                <Button type="button" variant="destructive" onClick={handleReject} disabled={loading}>
                  <XCircle className="w-4 h-4 mr-2" />
                  {t("reject") || "Rejeitar"}
                </Button>
                <Button type="button" onClick={handleApprove} disabled={!canApprove || loading} title={!canApprove ? (t("approvalRequiresDataAndContract") || "Preencha data e envie o contrato") : ""}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t("approve") || "Aprovar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
