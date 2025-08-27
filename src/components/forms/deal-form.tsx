"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ClientSearch } from "@/components/client-search"
import type { Deal } from "@/lib/api-client"
import { getCurrentDateForForm } from "@/lib/datetime"

interface DealFormProps {
  deal?: Deal
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Deal, "id"> | Partial<Deal>) => void
  loading?: boolean
}

export function DealForm({ deal, open, onOpenChange, onSubmit, loading }: DealFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    client: "",
    value: "",
    status: "Proposta" as "Em Andamento" | "Proposta" | "Fechado",
    date: getCurrentDateForForm(),
    description: "",
  })

  useEffect(() => {
    if (deal) {
      // Convert date from database to form format (YYYY-MM-DD)
      let formattedDate = getCurrentDateForForm()
      
      if (deal.date) {
        // If the date is in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(deal.date)) {
          formattedDate = deal.date
        } else {
          // Parse other formats (like dd/MM/yyyy)
          const date = new Date(deal.date)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0]
          }
        }
      }
      
      setFormData({
        client: deal.client || "",
        value: deal.value || "",
        status: (deal.status || "Proposta") as "Em Andamento" | "Proposta" | "Fechado",
        date: formattedDate,
        description: deal.description || "",
      })
    } else {
      setFormData({
        client: "",
        value: "",
        status: "Proposta" as "Em Andamento" | "Proposta" | "Fechado",
        date: getCurrentDateForForm(),
        description: "",
      })
    }
  }, [deal, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{deal ? t('editDeal') : t('newDeal')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">{t('client')}</Label>
            <ClientSearch
              value={formData.client}
              onSelect={(clientName) => setFormData({ ...formData, client: clientName })}
              placeholder={t('selectClient')}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">
              {t('value')} <span className="text-red-500">*</span>
            </Label>
            <CurrencyInput
              id="valor"
              value={formData.value}
              onChange={(value) => setFormData({ ...formData, value })}
              required
              tabIndex={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">{t('status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
            >
              <SelectTrigger tabIndex={3}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Proposta">{t('proposal')}</SelectItem>
                <SelectItem value="Em Andamento">{t('inProgress')}</SelectItem>
                <SelectItem value="Fechado">{t('closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">
              {t('date')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="data"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              tabIndex={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">{t('description')}</Label>
            <Textarea
              id="descricao"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              tabIndex={5}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} tabIndex={6}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} tabIndex={7}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}