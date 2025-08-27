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
import type { Appointment } from "@/lib/api-client"
import { getCurrentDateTimeForForm } from "@/lib/datetime"
import { ClientSearch } from "@/components/client-search"
import { AnsweredStatusToggle } from "@/components/ui/answered-status-toggle"

interface AppointmentFormProps {
  appointment?: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Appointment, "id"> | Partial<Appointment>) => void
  loading?: boolean
}

export function AppointmentForm({ appointment, open, onOpenChange, onSubmit, loading }: AppointmentFormProps) {
  const { t } = useTranslation()
  const { date: currentDate, time: currentTime } = getCurrentDateTimeForForm()
  const currentDateTime = `${currentDate}T${currentTime}`
  const [formData, setFormData] = useState({
    client: "",
    type: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
    status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
    scheduled_datetime: currentDateTime,
    description: "",
    answered: undefined as boolean | undefined,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    // Clear errors when form opens/closes or changes mode
    setErrors({})
    
    if (appointment) {
      // Convert datetime from database to form format (YYYY-MM-DDTHH:mm)
      let formattedDateTime = currentDateTime
      
      if (appointment.scheduled_datetime) {
        // Parse the datetime from database
        const date = new Date(appointment.scheduled_datetime)
        // Format as YYYY-MM-DDTHH:mm for datetime-local input
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      setFormData({
        client: appointment.client || "",
        type: (appointment.type || "Suporte") as "Suporte" | "Vendas" | "Consultoria",
        status: (appointment.status || "Pendente") as "Em Andamento" | "Concluído" | "Pendente",
        scheduled_datetime: formattedDateTime,
        description: appointment.description || "",
        answered: appointment.answered,
      })
    } else {
      setFormData({
        client: "",
        type: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
        status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
        scheduled_datetime: currentDateTime,
        description: "",
        answered: undefined,
      })
    }
  }, [appointment, currentDateTime, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})
    
    // Validate required fields
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.client.trim()) {
      newErrors.client = t('clientRequired') || 'Client is required'
    }
    
    if (formData.answered === undefined) {
      newErrors.answered = t('answeredStatusRequired') || 'Response status is required'
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
          <DialogTitle>{appointment ? t('editAppointment') : t('newAppointment')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">
              {t('client')} <span className="text-red-500">*</span>
            </Label>
            <ClientSearch
              value={formData.client}
              onSelect={(clientName) => setFormData({ ...formData, client: clientName })}
              placeholder={t('selectClient')}
              className={`w-full ${errors.client ? 'ring-2 ring-red-500' : ''}`}
            />
            {errors.client && (
              <p className="text-sm text-red-500">{errors.client}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">{t('type')}</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
              <SelectTrigger tabIndex={2}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Suporte">{t('supportType')}</SelectItem>
                <SelectItem value="Vendas">{t('salesType')}</SelectItem>
                <SelectItem value="Consultoria">{t('consultingType')}</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="Pendente">{t('pending')}</SelectItem>
                <SelectItem value="Em Andamento">{t('inProgress')}</SelectItem>
                <SelectItem value="Concluído">{t('completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled_datetime">
              {t('dateTime')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="scheduled_datetime"
              type="datetime-local"
              value={formData.scheduled_datetime}
              onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
              required
              tabIndex={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="answered">
              {t('answeredStatus')} <span className="text-red-500">*</span>
            </Label>
            <AnsweredStatusToggle
              value={formData.answered}
              onChange={(answered) => setFormData({ ...formData, answered })}
              className="w-full"
            />
            {errors.answered && (
              <p className="text-sm text-red-500">{errors.answered}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              tabIndex={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} tabIndex={7}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} tabIndex={8}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}