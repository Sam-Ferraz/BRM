"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ProductSearch } from "@/components/product-search"
import type { SalesAgenda, SalesAgendaCreateInput } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"

interface SalesAgendaFormProps {
  salesAgenda?: SalesAgenda
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SalesAgendaCreateInput | Partial<SalesAgenda>) => void
  loading?: boolean
}

export function SalesAgendaForm({ salesAgenda, open, onOpenChange, onSubmit, loading }: SalesAgendaFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const [formData, setFormData] = useState({
    title: "",
    product_name: "",
    status: "Ativa" as "Ativa" | "Concluída" | "Cancelada",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    // Clear errors when form opens/closes or changes mode
    setErrors({})
    
    if (salesAgenda) {
      setFormData({
        title: salesAgenda.title || "",
        product_name: salesAgenda.product_name || "",
        status: (salesAgenda.status || "Ativa") as "Ativa" | "Concluída" | "Cancelada",
      })
    } else {
      setFormData({
        title: "",
        product_name: "",
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
      <DialogContent 
        className="sm:max-w-[425px]"
        {...(isMobile && {
          onOpenAutoFocus: (e) => e.preventDefault()
        })}
      >
        <DialogHeader>
          <DialogTitle>{salesAgenda ? t('editSalesAgenda') : t('newSalesAgenda')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">
              {t('title')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titulo"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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