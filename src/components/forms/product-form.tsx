"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import type { Product } from "@/lib/api-client"

interface ProductFormProps {
  product?: Product
  initialName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Product, "id"> | Partial<Product>) => void
  loading?: boolean
}

export function ProductForm({ product, initialName, open, onOpenChange, onSubmit, loading }: ProductFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    stock: 0,
    description: "",
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || "",
        category: product.category || "",
        stock: product.stock || 0,
        description: product.description || "",
      })
    } else {
      setFormData({
        name: initialName || "",
        price: "",
        category: "",
        stock: 0,
        description: "",
      })
    }
  }, [product, initialName, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? t('editProduct') : t('newProduct')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              tabIndex={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">{t('price')}</Label>
            <CurrencyInput
              id="price"
              value={formData.price}
              onChange={(price) => setFormData({ ...formData, price })}
              tabIndex={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t('category')}</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              tabIndex={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">
              {t('stock')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
              required
              tabIndex={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
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