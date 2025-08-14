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
import type { Atendimento } from "@/lib/api-client"
import { getCurrentDateTimeForForm } from "@/lib/datetime"

interface AtendimentoFormProps {
  atendimento?: Atendimento
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Atendimento, "id"> | Partial<Atendimento>) => void
  loading?: boolean
}

export function AtendimentoForm({ atendimento, open, onOpenChange, onSubmit, loading }: AtendimentoFormProps) {
  const { t } = useTranslation()
  const { date: currentDate, time: currentTime } = getCurrentDateTimeForForm()
  const currentDateTime = `${currentDate}T${currentTime}`
  const [formData, setFormData] = useState({
    cliente: "",
    tipo: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
    status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
    datetime_agendamento: currentDateTime,
    descricao: "",
  })

  useEffect(() => {
    if (atendimento) {
      // Convert datetime from database to form format (YYYY-MM-DDTHH:mm)
      let formattedDateTime = currentDateTime
      
      if (atendimento.datetime_agendamento) {
        // Parse the datetime from database
        const date = new Date(atendimento.datetime_agendamento)
        // Format as YYYY-MM-DDTHH:mm for datetime-local input
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      setFormData({
        cliente: atendimento.cliente || "",
        tipo: (atendimento.tipo || "Suporte") as "Suporte" | "Vendas" | "Consultoria",
        status: (atendimento.status || "Pendente") as "Em Andamento" | "Concluído" | "Pendente",
        datetime_agendamento: formattedDateTime,
        descricao: atendimento.descricao || "",
      })
    } else {
      setFormData({
        cliente: "",
        tipo: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
        status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
        datetime_agendamento: currentDateTime,
        descricao: "",
      })
    }
  }, [atendimento, currentDateTime])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{atendimento ? t('editService') : t('newService')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">{t('client')}</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              required
              tabIndex={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">{t('type')}</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}>
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
            <Label htmlFor="datetime_agendamento">{t('dateTime')}</Label>
            <Input
              id="datetime_agendamento"
              type="datetime-local"
              value={formData.datetime_agendamento}
              onChange={(e) => setFormData({ ...formData, datetime_agendamento: e.target.value })}
              required
              tabIndex={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">{t('description')}</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
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