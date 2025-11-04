"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Appointment } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { getCurrentDateTimeForForm, convertFromAppToLocal, convertFromLocalToApp } from "@/lib/datetime"
import { ClientSearch } from "@/components/client-search"
import { AnsweredStatusToggle } from "@/components/ui/answered-status-toggle"
import { useTimezone } from "@/hooks/use-timezone"

interface AppointmentFormProps {
  appointment?: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Appointment, "id"> | Partial<Appointment>) => void
  loading?: boolean
}

export function AppointmentForm({ appointment, open, onOpenChange, onSubmit, loading }: AppointmentFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const currentTimezone = useTimezone()
  const { date: currentDate, time: currentTime } = useMemo(
    () => getCurrentDateTimeForForm(currentTimezone),
    [currentTimezone]
  )
  const currentDateTime = useMemo(() => `${currentDate}T${currentTime}`, [currentDate, currentTime])
  const [formData, setFormData] = useState({
    client: "",
    type: "chat" as "chat" | "call" | "in_person" | "visit",
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
        // Convert from stored timezone to user's configured timezone for form input
        formattedDateTime = convertFromAppToLocal(appointment.scheduled_datetime, currentTimezone)
      }
      
      setFormData({
        client: appointment.client || "",
        type: (appointment.type || "chat") as "chat" | "call" | "in_person" | "visit",
        status: (appointment.status || "Pendente") as "Em Andamento" | "Concluído" | "Pendente",
        scheduled_datetime: formattedDateTime,
        description: appointment.description || "",
        answered: appointment.answered,
      })
    } else {
      setFormData({
        client: "",
        type: "chat" as "chat" | "call" | "in_person" | "visit",
        status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
        scheduled_datetime: currentDateTime,
        description: "",
        answered: undefined,
      })
    }
  }, [appointment, currentDateTime, open, currentTimezone])
  
  // Update datetime format when timezone changes
  useEffect(() => {
    if (appointment?.scheduled_datetime) {
      const formattedDateTime = convertFromAppToLocal(appointment.scheduled_datetime, currentTimezone)
      setFormData(prev => ({ ...prev, scheduled_datetime: formattedDateTime }))
    }
  }, [currentTimezone, appointment?.scheduled_datetime])

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
    
    // Convert datetime from user's configured timezone to app timezone before sending to server
    const dataToSubmit = {
      ...formData,
      scheduled_datetime: convertFromLocalToApp(formData.scheduled_datetime, currentTimezone)
    }
    
    onSubmit(dataToSubmit)
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
              <SelectTrigger {...(!isMobile && { tabIndex: 2 })}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">{t('chatType')}</SelectItem>
                <SelectItem value="call">{t('callType')}</SelectItem>
                <SelectItem value="in_person">{t('inPersonType')}</SelectItem>
                <SelectItem value="visit">{t('visitType')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">{t('status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
            >
              <SelectTrigger {...(!isMobile && { tabIndex: 3 })}>
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
              {...(!isMobile && { tabIndex: 4 })}
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
              {...(!isMobile && { tabIndex: 6 })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} {...(!isMobile && { tabIndex: 7 })}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} {...(!isMobile && { tabIndex: 8 })}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
