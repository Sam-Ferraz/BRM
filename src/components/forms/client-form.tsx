"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Client } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"

interface ClientFormProps {
  client?: Client
  initialName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Client, "id"> | Partial<Client>) => void
  loading?: boolean
}

export function ClientForm({ client, initialName, open, onOpenChange, onSubmit, loading }: ClientFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    company: "",
    origin: "online_lead" as Client['origin'],
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        city: client.city || "",
        address: client.address || "",
        company: client.company || "",
        origin: (client.origin || "online_lead") as Client['origin'],
      })
    } else {
      setFormData({
        name: initialName || "",
        email: "",
        phone: "",
        city: "",
        address: "",
        company: "",
        origin: "online_lead",
      })
    }
  }, [client, initialName, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSubmit(formData)
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
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
          <DialogTitle>{client ? t('editClient') : t('newClient')}</DialogTitle>
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
              {...(!isMobile && { tabIndex: 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              {...(!isMobile && { tabIndex: 2 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              {...(!isMobile && { tabIndex: 3 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{t('city')}</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              {...(!isMobile && { tabIndex: 4 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t('address')}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              {...(!isMobile && { tabIndex: 5 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">{t('company')}</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              {...(!isMobile && { tabIndex: 6 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin">{t('origin')}</Label>
            <Select value={formData.origin || ''} onValueChange={(value) => setFormData({ ...formData, origin: value as Client['origin'] })}>
              <SelectTrigger {...(!isMobile && { tabIndex: 7 })}>
                <SelectValue placeholder={`${t('select')} ${t('origin').toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online_lead">{t('onlineLead')}</SelectItem>
                <SelectItem value="own_portfolio">{t('ownPortfolio')}</SelectItem>
                <SelectItem value="duty_shift">{t('dutyShift')}</SelectItem>
                <SelectItem value="referral">{t('referral')}</SelectItem>
                <SelectItem value="street_client">{t('streetClient')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} {...(!isMobile && { tabIndex: 8 })}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} {...(!isMobile && { tabIndex: 9 })}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
