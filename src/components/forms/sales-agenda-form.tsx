"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ProductSearch } from "@/components/product-search"
import type { SalesAgenda } from "@/lib/api-client"
import { getCurrentDateForForm } from "@/lib/datetime"

interface SalesAgendaFormProps {
  salesAgenda?: SalesAgenda
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<SalesAgenda, "id"> | Partial<SalesAgenda>) => void
  loading?: boolean
}

export function SalesAgendaForm({ salesAgenda, open, onOpenChange, onSubmit, loading }: SalesAgendaFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: "",
    client: "",
    product_name: "",
    value: "",
    date: getCurrentDateForForm(),
    status: "Ativa" as "Ativa" | "Concluída" | "Cancelada",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    // Clear errors when form opens/closes or changes mode
    setErrors({})
    
    if (salesAgenda) {
      // Convert date from database to form format (YYYY-MM-DD)
      let formattedDate = getCurrentDateForForm()
      
      if (salesAgenda.date) {
        // If the date is in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(salesAgenda.date)) {
          formattedDate = salesAgenda.date
        } else {
          // Parse other formats (like dd/MM/yyyy)
          const date = new Date(salesAgenda.date)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0]
          }
        }
      }
      
      setFormData({
        title: salesAgenda.title || "",
        client: salesAgenda.client || "",
        product_name: salesAgenda.product_name || "",
        value: salesAgenda.value || "",
        date: formattedDate,
        status: (salesAgenda.status || "Ativa") as "Ativa" | "Concluída" | "Cancelada",
      })
    } else {
      setFormData({
        title: "",
        client: "",
        product_name: "",
        value: "",
        date: getCurrentDateForForm(),
        status: "Ativa" as "Ativa" | "Concluída" | "Cancelada",
      })
    }
  }, [salesAgenda, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})
    
    // Validate required fields
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.product_name.trim()) {
      newErrors.product_name = t('productRequired') || 'Product is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{salesAgenda ? t('editSalesAgenda') : t('newSalesAgenda')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">{t('title')}</Label>
            <Input
              id="titulo"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente">{t('client')}</Label>
            <Input
              id="cliente"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product">
              {t('product')} <span className="text-red-500">*</span>
            </Label>
            <ProductSearch
              value={formData.product_name}
              onSelect={(productName) => setFormData({ ...formData, product_name: productName })}
              placeholder={t('selectProduct')}
              className={`w-full ${errors.product_name ? 'ring-2 ring-red-500' : ''}`}
            />
            {errors.product_name && (
              <p className="text-sm text-red-500">{errors.product_name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">{t('value')}</Label>
            <CurrencyInput
              id="valor"
              value={formData.value}
              onChange={(value) => setFormData({ ...formData, value })}
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
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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