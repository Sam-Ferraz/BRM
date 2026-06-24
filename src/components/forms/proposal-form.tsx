"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ProductSearch } from "@/components/product-search"
import { DealSearch } from "@/components/deal-search"
import { api, type Deal, type Proposal, type ProposalStatus } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { format, addBusinessDays } from "date-fns"

interface ProposalFormProps {
  proposal?: Proposal
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Proposal, "id" | "user_id" | "created_at" | "updated_at"> | Partial<Proposal>) => void
  loading?: boolean
}

const STATUS_OPTIONS: ProposalStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "counter_proposal",
  "expired",
]

// Formata moeda em BRL pra exibição read-only no campo Preço do Imóvel.
const formatCurrencyBRL = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return ""
  const n = typeof value === "string" ? parseFloat(value) : value
  if (!Number.isFinite(n)) return ""
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
}

export function ProposalForm({ proposal, open, onOpenChange, onSubmit, loading }: ProposalFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  // Padrão de validade da proposta: 7 dias úteis a partir de hoje.
  // date-fns.addBusinessDays já pula sábados e domingos.
  const defaultValidity = useMemo(
    () => format(addBusinessDays(new Date(), 7), "yyyy-MM-dd"),
    []
  )

  const [deals, setDeals] = useState<Deal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)

  const [formData, setFormData] = useState<{
    deal_id: number | ""
    property_name: string
    property_price: string  // preenchido automaticamente ao escolher imóvel; readonly
    proposal_value: number | null
    payment_condition: string
    proposal_date: string
    validity_date: string
    status: ProposalStatus
    notes: string
    vgv: number | null
    vgc: number | null
    intermediation_rate: string  // string pra UX; convertido em número no submit
  }>({
    deal_id: "",
    property_name: "",
    property_price: "",
    proposal_value: null,
    payment_condition: "",
    proposal_date: today,
    validity_date: defaultValidity,
    status: "pending",
    notes: "",
    vgv: null,
    vgc: null,
    intermediation_rate: "",
  })

  // Tracks whether the user manually edited the property in this session.
  // Once they have, switching the deal must NOT clobber their override.
  const [propertyTouched, setPropertyTouched] = useState(false)

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const fetchDeals = async () => {
      try {
        setDealsLoading(true)
        const result = await api.deals.getAll()
        if (!cancelled) setDeals(result.data)
      } catch (e) {
        console.error("Error loading deals:", e)
        if (!cancelled) setDeals([])
      } finally {
        if (!cancelled) setDealsLoading(false)
      }
    }
    fetchDeals()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    setErrors({})
    setPropertyTouched(false)
    if (proposal) {
      setFormData({
        deal_id: proposal.deal_id,
        // Para proposta existente o imóvel vem do deal joined (effect abaixo).
        property_name: "",
        property_price: "",
        proposal_value: Number(proposal.proposal_value) || null,
        payment_condition: proposal.payment_condition ?? "",
        proposal_date: (proposal.proposal_date || today).slice(0, 10),
        validity_date: (proposal.validity_date || defaultValidity).slice(0, 10),
        status: proposal.status,
        notes: proposal.notes ?? "",
        vgv: proposal.vgv != null ? Number(proposal.vgv) : null,
        vgc: proposal.vgc != null ? Number(proposal.vgc) : null,
        intermediation_rate:
          proposal.intermediation_rate != null ? String(proposal.intermediation_rate) : "",
      })
    } else {
      setFormData({
        deal_id: "",
        property_name: "",
        property_price: "",
        proposal_value: null,
        payment_condition: "",
        proposal_date: today,
        validity_date: defaultValidity,
        status: "pending",
        notes: "",
        vgv: null,
        vgc: null,
        intermediation_rate: "",
      })
    }
  }, [proposal, open, today, defaultValidity])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    if (!formData.deal_id) newErrors.deal_id = t("dealRequired") || "Deal is required"
    if (!formData.proposal_value || formData.proposal_value <= 0) {
      newErrors.proposal_value = t("proposalValueRequired") || "Value is required"
    }
    if (!formData.proposal_date) {
      newErrors.proposal_date = t("proposalDateRequired") || "Date is required"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const rateAsNumber = formData.intermediation_rate.trim()
      ? parseFloat(formData.intermediation_rate.replace(",", "."))
      : null

    onSubmit({
      deal_id: formData.deal_id as number,
      proposal_value: formData.proposal_value as number,
      payment_condition: formData.payment_condition.trim() || null,
      proposal_date: formData.proposal_date,
      validity_date: formData.validity_date || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
      vgv: formData.vgv,
      vgc: formData.vgc,
      intermediation_rate: rateAsNumber,
      // Out-of-band field: backend reads this and propagates it to the deal's
      // property_name (it is NOT stored on the proposal row).
      property_name: formData.property_name.trim() || null,
    } as any)
  }

  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === formData.deal_id) || null,
    [deals, formData.deal_id]
  )

  // Auto-load property from the selected deal, unless the user already touched
  // the field manually in this session.
  useEffect(() => {
    if (propertyTouched) return
    if (!selectedDeal) return
    setFormData((prev) =>
      prev.property_name === (selectedDeal.property_name || "")
        ? prev
        : { ...prev, property_name: selectedDeal.property_name || "" }
    )
  }, [selectedDeal, propertyTouched])

  // Sempre que o nome do imóvel mudar (auto ou manual), busca o preço atual
  // do produto pra preencher o campo readonly "Preço do Imóvel". Match exato
  // por nome — se houver mais de um produto com mesmo nome, pega o primeiro.
  useEffect(() => {
    const name = formData.property_name.trim()
    if (!name) {
      setFormData((prev) => (prev.property_price === "" ? prev : { ...prev, property_price: "" }))
      return
    }
    let cancelled = false
    const fetchPrice = async () => {
      try {
        const res = await api.products.getAll({ search: name })
        if (cancelled) return
        const exact = res.data.find((p) => p.name === name)
        const price = exact?.price != null ? String(exact.price) : ""
        setFormData((prev) => (prev.property_price === price ? prev : { ...prev, property_price: price }))
      } catch (error) {
        console.error("Error fetching property price:", error)
      }
    }
    fetchPrice()
    return () => {
      cancelled = true
    }
  }, [formData.property_name])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Padrão de dialog scrollable (ver CLAUDE.md → Convenções → Dialog/Form). */}
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] flex flex-col"
        {...(isMobile && { onOpenAutoFocus: (e) => e.preventDefault() })}
      >
        <DialogHeader>
          <DialogTitle>{proposal ? t("editProposal") : t("newProposal")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal_id">
                {t("deal")} <span className="text-red-500">*</span>
              </Label>
              {/* Combobox com lupa de busca (mesmo padrão UX do ClientSearch /
                  ProductSearch) — busca por cliente ou nome do imóvel. */}
              <DealSearch
                deals={deals}
                value={formData.deal_id}
                onSelect={(d) => setFormData((prev) => ({ ...prev, deal_id: d.id }))}
                loading={dealsLoading}
                placeholder={t("selectDeal")}
                className={`w-full ${errors.deal_id ? "ring-2 ring-red-500" : ""}`}
              />
              {errors.deal_id && <p className="text-sm text-red-500">{errors.deal_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_name">{t("property")}</Label>
              <ProductSearch
                value={formData.property_name}
                onSelect={(name) => {
                  setPropertyTouched(true)
                  setFormData((prev) => ({ ...prev, property_name: name }))
                }}
                placeholder={selectedDeal ? t("selectProduct") : t("propertyDerivedFromDeal")}
                className="w-full"
              />
            </div>

            {/* Preço do Imóvel — preenchido automaticamente ao escolher o
                imóvel, somente leitura. */}
            <div className="space-y-2">
              <Label htmlFor="property_price">{t("propertyPrice")}</Label>
              <Input
                id="property_price"
                value={formatCurrencyBRL(formData.property_price)}
                placeholder={t("propertyPricePlaceholder")}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposal_value">
                  {t("proposalValue")} <span className="text-red-500">*</span>
                </Label>
                <CurrencyInput
                  id="proposal_value"
                  value={formData.proposal_value ?? ""}
                  onChange={(v) => setFormData({ ...formData, proposal_value: v })}
                  className={errors.proposal_value ? "ring-2 ring-red-500" : ""}
                />
                {errors.proposal_value && (
                  <p className="text-sm text-red-500">{errors.proposal_value}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t("status")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData({ ...formData, status: v as ProposalStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`proposalStatus_${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposal_date">
                  {t("proposalDate")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="proposal_date"
                  type="date"
                  value={formData.proposal_date}
                  onChange={(e) =>
                    setFormData({ ...formData, proposal_date: e.target.value })
                  }
                  className={errors.proposal_date ? "ring-2 ring-red-500" : ""}
                />
                {errors.proposal_date && (
                  <p className="text-sm text-red-500">{errors.proposal_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity_date">{t("validityDate")}</Label>
                <Input
                  id="validity_date"
                  type="date"
                  value={formData.validity_date}
                  onChange={(e) =>
                    setFormData({ ...formData, validity_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_condition">{t("paymentCondition")}</Label>
              <Textarea
                id="payment_condition"
                rows={2}
                value={formData.payment_condition}
                onChange={(e) =>
                  setFormData({ ...formData, payment_condition: e.target.value })
                }
                placeholder={t("paymentConditionPlaceholder")}
              />
            </div>

            {/* Trio financeiro: VGV, VGC, Taxa de Intermediação. VGV e VGC são
                campos de moeda (decimal); taxa é número decimal em % (ex: 6.00). */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vgv">{t("vgvLabel")}</Label>
                <CurrencyInput
                  id="vgv"
                  value={formData.vgv ?? ""}
                  onChange={(v) => setFormData({ ...formData, vgv: v })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vgc">{t("vgcLabel")}</Label>
                <CurrencyInput
                  id="vgc"
                  value={formData.vgc ?? ""}
                  onChange={(v) => setFormData({ ...formData, vgc: v })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="intermediation_rate">{t("intermediationRateLabel")}</Label>
                <div className="relative">
                  <Input
                    id="intermediation_rate"
                    type="text"
                    inputMode="decimal"
                    placeholder="6,00"
                    value={formData.intermediation_rate}
                    onChange={(e) =>
                      // Aceita apenas dígitos e vírgula/ponto. Limita a 5 chars
                      // ("99,99" cobre o range esperado: 0-99% com 2 decimais).
                      setFormData({
                        ...formData,
                        intermediation_rate: e.target.value
                          .replace(/[^\d.,]/g, "")
                          .slice(0, 5),
                      })
                    }
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>{/* fim da área scrollável */}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
