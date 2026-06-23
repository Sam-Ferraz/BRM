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
import type { Appointment, Client } from "@/lib/api-client"
import { api } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { getCurrentDateTimeForForm, convertFromAppToLocal, convertFromLocalToApp } from "@/lib/datetime"
import { ClientSearch } from "@/components/client-search"
import { ProductSearch } from "@/components/product-search"
import { AnsweredStatusToggle } from "@/components/ui/answered-status-toggle"
import { Checkbox } from "@/components/ui/checkbox"
import { useTimezone } from "@/hooks/use-timezone"
import { format } from "date-fns"

interface AppointmentFormProps {
  appointment?: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Appointment, "id"> | Partial<Appointment>, followUpData?: { next_action: string; next_action_date: string }) => void
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
    scheduled_datetime: currentDateTime,
    description: "",
    client: "",
    type: "chat" as "chat" | "call" | "in_person" | "visit",
    answered: undefined as boolean | undefined,
    property_name: "",
  })
  const [selectedClientPhone, setSelectedClientPhone] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Follow-up fields (optional)
  const [includeFollowUp, setIncludeFollowUp] = useState(false)
  const [followUpData, setFollowUpData] = useState({
    next_action: "",
    next_action_date: format(new Date(), 'yyyy-MM-dd'),
  })

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
        scheduled_datetime: formattedDateTime,
        description: appointment.description || "",
        client: appointment.client || "",
        type: (appointment.type || "chat") as "chat" | "call" | "in_person" | "visit",
        answered: appointment.answered,
        property_name: appointment.property_name || "",
      })
      setSelectedClientPhone(null)
      setIncludeFollowUp(false)
    } else {
      setFormData({
        scheduled_datetime: currentDateTime,
        description: "",
        client: "",
        type: "chat" as "chat" | "call" | "in_person" | "visit",
        answered: undefined,
        property_name: "",
      })
      setSelectedClientPhone(null)
      setIncludeFollowUp(false)
      setFollowUpData({
        next_action: "",
        next_action_date: format(new Date(), 'yyyy-MM-dd'),
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

  useEffect(() => {
    if (formData.type !== 'visit' && formData.property_name) {
      setFormData(prev => ({ ...prev, property_name: "" }))
    }
  }, [formData.type])

  useEffect(() => {
    if (!formData.client) {
      setSelectedClientPhone(null)
      return
    }

    if (selectedClientPhone !== null) {
      return
    }

    let isMounted = true

    const fetchClientPhone = async () => {
      try {
        const response = await api.clients.getAll({ search: formData.client })
        const matchedClient = response.data.find((client) => client.name === formData.client)
        if (isMounted) {
          setSelectedClientPhone(matchedClient?.phone ?? '')
        }
      } catch (error) {
        console.error('Error fetching client phone:', error)
        if (isMounted) {
          setSelectedClientPhone('')
        }
      }
    }

    fetchClientPhone()

    return () => {
      isMounted = false
    }
  }, [formData.client, selectedClientPhone])

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

    if (formData.type === 'visit' && !formData.property_name.trim()) {
      newErrors.property_name = t('productRequired') || 'Property is required'
    }

    // Validate follow-up fields if enabled
    if (includeFollowUp) {
      if (!followUpData.next_action.trim()) {
        newErrors.next_action = t('nextActionRequired') || 'Next action is required'
      }
      if (!followUpData.next_action_date) {
        newErrors.next_action_date = t('nextActionDateRequired') || 'Next action date is required'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Convert datetime from user's configured timezone to app timezone before sending to server
    const dataToSubmit = {
      ...formData,
      property_name: formData.type === 'visit' ? formData.property_name : null,
      scheduled_datetime: convertFromLocalToApp(formData.scheduled_datetime, currentTimezone)
    }

    // Pass follow-up data if enabled
    onSubmit(dataToSubmit, includeFollowUp ? followUpData : undefined)
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
        <div className="max-h-[70vh] overflow-y-auto p-1">
        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
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
              {...(!isMobile && { tabIndex: 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              {...(!isMobile && { tabIndex: 2 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">
              {t('client')} <span className="text-red-500">*</span>
            </Label>
            <ClientSearch
              value={formData.client}
              onSelect={(clientName) => {
                setFormData({ ...formData, client: clientName })
                setSelectedClientPhone(null)
              }}
              onClientSelect={(client: Client) => {
                setSelectedClientPhone(client.phone ?? '')
              }}
              placeholder={t('selectClient')}
              className={`w-full ${errors.client ? 'ring-2 ring-red-500' : ''}`}
            />
            {errors.client && (
              <p className="text-sm text-red-500">{errors.client}</p>
            )}
          </div>
          {formData.client && (
            <div className="space-y-2">
              <Label htmlFor="client_phone">{t('phone')}</Label>
              <Input
                id="client_phone"
                value={selectedClientPhone || t('noPhoneAvailable')}
                readOnly
                className="bg-muted"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="type">{t('type')}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData(prev => ({
                  ...prev,
                  type: value as any,
                  property_name: value === 'visit' ? prev.property_name : ""
                }))
              }
            >
              <SelectTrigger {...(!isMobile && { tabIndex: 3 })}>
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
          {formData.type === 'visit' && (
            <div className="space-y-2">
              <Label htmlFor="property_name">
                {t('product')} <span className="text-red-500">*</span>
              </Label>
              <ProductSearch
                value={formData.property_name}
                onSelect={(productName) => setFormData({ ...formData, property_name: productName })}
                placeholder={t('selectProduct')}
                className={`w-full ${errors.property_name ? 'ring-2 ring-red-500' : ''}`}
              />
              {errors.property_name && (
                <p className="text-sm text-red-500">{errors.property_name}</p>
              )}
            </div>
          )}
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

          {/* Follow-up section - only for new appointments */}
          {!appointment && (
            <>
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_followup"
                    checked={includeFollowUp}
                    onCheckedChange={(checked) => setIncludeFollowUp(checked === true)}
                  />
                  <Label
                    htmlFor="include_followup"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t('includeFollowUp')}
                  </Label>
                </div>
              </div>

              {includeFollowUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="next_action">
                      {t('nextAction')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="next_action"
                      value={followUpData.next_action}
                      onChange={(e) => setFollowUpData({ ...followUpData, next_action: e.target.value })}
                      rows={3}
                      placeholder={t('nextAction')}
                      className={errors.next_action ? 'ring-2 ring-red-500' : ''}
                    />
                    {errors.next_action && (
                      <p className="text-sm text-red-500">{errors.next_action}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="next_action_date">
                      {t('nextActionDate')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="next_action_date"
                      type="date"
                      value={followUpData.next_action_date}
                      onChange={(e) => setFollowUpData({ ...followUpData, next_action_date: e.target.value })}
                      className={errors.next_action_date ? 'ring-2 ring-red-500' : ''}
                    />
                    {errors.next_action_date && (
                      <p className="text-sm text-red-500">{errors.next_action_date}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} {...(!isMobile && { tabIndex: 5 })}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} {...(!isMobile && { tabIndex: 6 })}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
