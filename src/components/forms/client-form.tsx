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

// Lista de países comuns para o seletor de DDI. Ordenada por dial code do mais
// longo para o mais curto — isso garante que ao fazer parse de "+5547999..."
// o "+55" seja detectado antes do "+5" (Estados Unidos).
const COUNTRIES = [
  { code: "BR", name: "Brasil",        dial: "+55",  flag: "🇧🇷" },
  { code: "PT", name: "Portugal",      dial: "+351", flag: "🇵🇹" },
  { code: "US", name: "Estados Unidos", dial: "+1",   flag: "🇺🇸" },
  { code: "AR", name: "Argentina",     dial: "+54",  flag: "🇦🇷" },
  { code: "CL", name: "Chile",         dial: "+56",  flag: "🇨🇱" },
  { code: "UY", name: "Uruguai",       dial: "+598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguai",      dial: "+595", flag: "🇵🇾" },
  { code: "ES", name: "Espanha",       dial: "+34",  flag: "🇪🇸" },
  { code: "IT", name: "Itália",        dial: "+39",  flag: "🇮🇹" },
  { code: "FR", name: "França",        dial: "+33",  flag: "🇫🇷" },
  { code: "DE", name: "Alemanha",      dial: "+49",  flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido",   dial: "+44",  flag: "🇬🇧" },
].sort((a, b) => b.dial.length - a.dial.length)

const DEFAULT_DIAL = "+55"

// Decompõe um telefone E.164 (ex.: "+5547123456789") em DDI, DDD e número.
// Se não conseguir reconhecer o DDI, devolve Brasil como padrão e joga tudo
// no campo número — assim cliente antigo com telefone "solto" continua editável.
function parsePhone(phone: string | null | undefined): { ddi: string; ddd: string; number: string } {
  if (!phone) return { ddi: DEFAULT_DIAL, ddd: "", number: "" }
  const digits = phone.replace(/\D/g, "")
  if (!digits) return { ddi: DEFAULT_DIAL, ddd: "", number: "" }

  // Telefone começa com '+' explícito → tenta identificar o DDI
  if (phone.trim().startsWith("+")) {
    for (const c of COUNTRIES) {
      const dialDigits = c.dial.replace("+", "")
      if (digits.startsWith(dialDigits)) {
        const rest = digits.slice(dialDigits.length)
        return { ddi: c.dial, ddd: rest.slice(0, 2), number: rest.slice(2) }
      }
    }
  }

  // Sem '+': assume Brasil. Se houver 10-11 dígitos, separa DDD do número.
  if (digits.length >= 10) {
    return { ddi: DEFAULT_DIAL, ddd: digits.slice(0, 2), number: digits.slice(2) }
  }
  return { ddi: DEFAULT_DIAL, ddd: "", number: digits }
}

// Recompõe E.164 a partir das partes. Vazio se faltar DDD ou número.
function composePhone(ddi: string, ddd: string, number: string): string {
  const d = ddd.replace(/\D/g, "")
  const n = number.replace(/\D/g, "")
  if (!d || !n) return ""
  return `${ddi}${d}${n}`
}

export function ClientForm({ client, initialName, open, onOpenChange, onSubmit, loading }: ClientFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneDdi: DEFAULT_DIAL,
    phoneDdd: "",
    phoneNumber: "",
    city: "",
    address: "",
    origin: "online_lead" as Client['origin'],
  })

  useEffect(() => {
    if (client) {
      const parsed = parsePhone(client.phone)
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phoneDdi: parsed.ddi,
        phoneDdd: parsed.ddd,
        phoneNumber: parsed.number,
        city: client.city || "",
        address: client.address || "",
        origin: (client.origin || "online_lead") as Client['origin'],
      })
    } else {
      setFormData({
        name: initialName || "",
        email: "",
        phoneDdi: DEFAULT_DIAL,
        phoneDdd: "",
        phoneNumber: "",
        city: "",
        address: "",
        origin: "online_lead",
      })
    }
  }, [client, initialName, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const { phoneDdi, phoneDdd, phoneNumber, ...rest } = formData
    const phone = composePhone(phoneDdi, phoneDdd, phoneNumber)
    onSubmit({ ...rest, phone })
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
          <div className="max-h-[70vh] overflow-y-auto p-1">
            <div className="space-y-4">
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

              {/* Telefone: DDI (com bandeira) + DDD + número, todos obrigatórios.
                  No submit, são concatenados em E.164 (+551147123456789). */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  {t('phone')} <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5 sm:col-span-4">
                    <Select
                      value={formData.phoneDdi}
                      onValueChange={(value) => setFormData({ ...formData, phoneDdi: value })}
                    >
                      <SelectTrigger aria-label="DDI">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.dial}>
                            <span className="mr-2">{c.flag}</span>
                            {c.dial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input
                      id="phoneDdd"
                      placeholder="DDD"
                      inputMode="numeric"
                      maxLength={3}
                      value={formData.phoneDdd}
                      onChange={(e) => setFormData({ ...formData, phoneDdd: e.target.value.replace(/\D/g, '') })}
                      required
                      aria-label="DDD"
                      {...(!isMobile && { tabIndex: 3 })}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-6">
                    <Input
                      id="phoneNumber"
                      placeholder={t('phone')}
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                      required
                      aria-label={t('phone')}
                      {...(!isMobile && { tabIndex: 4 })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{t('city')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  {...(!isMobile && { tabIndex: 5 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('address')}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
            </div>
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
