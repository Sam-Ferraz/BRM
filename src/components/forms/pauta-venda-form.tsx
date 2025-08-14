"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { PautaVenda } from "@/lib/api-client"
import { getCurrentDateForForm } from "@/lib/datetime"

interface PautaVendaFormProps {
  pautaVenda?: PautaVenda
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<PautaVenda, "id"> | Partial<PautaVenda>) => void
  loading?: boolean
}

export function PautaVendaForm({ pautaVenda, open, onOpenChange, onSubmit, loading }: PautaVendaFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    titulo: "",
    cliente: "",
    valor: "",
    data: getCurrentDateForForm(),
    status: "Ativa" as "Ativa" | "Concluída" | "Cancelada",
  })

  useEffect(() => {
    if (pautaVenda) {
      // Convert date from database to form format (YYYY-MM-DD)
      let formattedDate = getCurrentDateForForm()
      
      if (pautaVenda.data) {
        // If the date is in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(pautaVenda.data)) {
          formattedDate = pautaVenda.data
        } else {
          // Parse other formats (like dd/MM/yyyy)
          const date = new Date(pautaVenda.data)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0]
          }
        }
      }
      
      setFormData({
        titulo: pautaVenda.titulo || "",
        cliente: pautaVenda.cliente || "",
        valor: pautaVenda.valor || "",
        data: formattedDate,
        status: (pautaVenda.status || "Ativa") as "Ativa" | "Concluída" | "Cancelada",
      })
    } else {
      setFormData({
        titulo: "",
        cliente: "",
        valor: "",
        data: getCurrentDateForForm(),
        status: "Ativa" as "Ativa" | "Concluída" | "Cancelada",
      })
    }
  }, [pautaVenda])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{pautaVenda ? t('editSalesAgenda') : t('newSalesAgenda')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">{t('title')}</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente">{t('client')}</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">{t('value')}</Label>
            <Input
              id="valor"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder={t('currencyPlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">{t('status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativa">{t('active')}</SelectItem>
                <SelectItem value="Concluída">{t('completed')}</SelectItem>
                <SelectItem value="Cancelada">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">{t('date')}</Label>
            <Input
              id="data"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}