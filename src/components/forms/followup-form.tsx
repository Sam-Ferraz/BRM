"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { FollowUp, Appointment } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { format } from "date-fns"

interface FollowUpFormProps {
  followUp?: FollowUp
  appointment?: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<FollowUp, "id" | "created_at" | "updated_at" | "completed_at"> | Partial<FollowUp>) => void
  loading?: boolean
}

export function FollowUpForm({ followUp, appointment, open, onOpenChange, onSubmit, loading }: FollowUpFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()

  // Get current date for default next action date
  const currentDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const [formData, setFormData] = useState({
    appointment_id: appointment?.id || 0,
    next_action: "",
    next_action_date: currentDate,
    completed: false
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    setErrors({})

    if (followUp) {
      setFormData({
        appointment_id: followUp.appointment_id,
        next_action: followUp.next_action || "",
        next_action_date: followUp.next_action_date || currentDate,
        completed: followUp.completed || false
      })
    } else {
      setFormData({
        appointment_id: appointment?.id || 0,
        next_action: "",
        next_action_date: currentDate,
        completed: false
      })
    }
  }, [followUp, appointment, open, currentDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    setErrors({})

    const newErrors: { [key: string]: string } = {}

    if (!formData.next_action.trim()) {
      newErrors.next_action = t('nextActionRequired') || 'Next action is required'
    }

    if (!formData.next_action_date) {
      newErrors.next_action_date = t('nextActionDateRequired') || 'Next action date is required'
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
          <DialogTitle>{followUp ? t('editFollowUp') : t('newFollowUp')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {appointment && (
            <div className="space-y-2">
              <Label>{t('client')}</Label>
              <Input
                value={appointment.client}
                readOnly
                className="bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="next_action">
              {t('nextAction')} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="next_action"
              value={formData.next_action}
              onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
              rows={3}
              placeholder={t('nextAction')}
              className={errors.next_action ? 'ring-2 ring-red-500' : ''}
              {...(!isMobile && { tabIndex: 1 })}
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
              value={formData.next_action_date}
              onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
              className={errors.next_action_date ? 'ring-2 ring-red-500' : ''}
              {...(!isMobile && { tabIndex: 2 })}
            />
            {errors.next_action_date && (
              <p className="text-sm text-red-500">{errors.next_action_date}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              {...(!isMobile && { tabIndex: 3 })}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              {...(!isMobile && { tabIndex: 4 })}
            >
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
