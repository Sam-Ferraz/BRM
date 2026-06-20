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
import { api, type Deal, type Proposal, type ProposalStatus } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { format } from "date-fns"

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

export function ProposalForm({ proposal, open, onOpenChange, onSubmit, loading }: ProposalFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const [deals, setDeals] = useState<Deal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)

  const [formData, setFormData] = useState<{
    deal_id: number | ""
    property_name: string
    proposal_value: number | null
    payment_condition: string
    proposal_date: string
    validity_date: string
    status: ProposalStatus
    notes: string
  }>({
    deal_id: "",
    property_name: "",
    proposal_value: null,
    payment_condition: "",
    proposal_date: today,
    validity_date: "",
    status: "pending",
    notes: "",
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
        // For an existing proposal we don't store property on the proposal row;
        // initialize from the joined deal data when available (set later by the
        // deal-load effect once deals are fetched).
        property_name: "",
        proposal_value: Number(proposal.proposal_value) || null,
        payment_condition: proposal.payment_condition ?? "",
        proposal_date: (proposal.proposal_date || today).slice(0, 10),
        validity_date: (proposal.validity_date || "").slice(0, 10),
        status: proposal.status,
        notes: proposal.notes ?? "",
      })
    } else {
      setFormData({
        deal_id: "",
        property_name: "",
        proposal_value: null,
        payment_condition: "",
        proposal_date: today,
        validity_date: "",
        status: "pending",
        notes: "",
      })
    }
  }, [proposal, open, today])

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

    onSubmit({
      deal_id: formData.deal_id as number,
      proposal_value: formData.proposal_value as number,
      payment_condition: formData.payment_condition.trim() || null,
      proposal_date: formData.proposal_date,
      validity_date: formData.validity_date || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px]"
        {...(isMobile && { onOpenAutoFocus: (e) => e.preventDefault() })}
      >
        <DialogHeader>
          <DialogTitle>{proposal ? t("editProposal") : t("newProposal")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal_id">
              {t("deal")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.deal_id === "" ? undefined : String(formData.deal_id)}
              onValueChange={(v) => setFormData({ ...formData, deal_id: parseInt(v) })}
              disabled={dealsLoading}
            >
              <SelectTrigger className={errors.deal_id ? "ring-2 ring-red-500" : ""}>
                <SelectValue placeholder={dealsLoading ? t("loading") : t("selectDeal")} />
              </SelectTrigger>
              <SelectContent>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.client}
                    {d.property_name ? ` — ${d.property_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

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
