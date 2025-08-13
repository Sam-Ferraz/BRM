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

// Helper functions for São Paulo timezone conversion
function formatDateForSaoPaulo(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function formatTimeForSaoPaulo(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function parseUTCDate(dateStr: string): Date {
  // Handle both "YYYY-MM-DD" and ISO format dates from the database
  if (dateStr.includes('T')) {
    return new Date(dateStr)
  } else {
    // For "YYYY-MM-DD" format, create date in UTC
    return new Date(dateStr + 'T00:00:00.000Z')
  }
}

interface AtendimentoFormProps {
  atendimento?: Atendimento
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Atendimento, "id"> | Partial<Atendimento>) => void
  loading?: boolean
}

export function AtendimentoForm({ atendimento, open, onOpenChange, onSubmit, loading }: AtendimentoFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    cliente: "",
    tipo: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
    status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
    data: formatDateForSaoPaulo(new Date()),
    hora: formatTimeForSaoPaulo(new Date()),
    descricao: "",
  })

  useEffect(() => {
    if (atendimento) {
      // Convert UTC date from database to São Paulo timezone
      const utcDate = atendimento.data ? parseUTCDate(atendimento.data) : new Date()
      
      setFormData({
        cliente: atendimento.cliente || "",
        tipo: (atendimento.tipo || "Suporte") as "Suporte" | "Vendas" | "Consultoria",
        status: (atendimento.status || "Pendente") as "Em Andamento" | "Concluído" | "Pendente",
        data: formatDateForSaoPaulo(utcDate),
        hora: atendimento.hora || formatTimeForSaoPaulo(new Date()),
        descricao: atendimento.descricao || "",
      })
    } else {
      setFormData({
        cliente: "",
        tipo: "Suporte" as "Suporte" | "Vendas" | "Consultoria",
        status: "Pendente" as "Em Andamento" | "Concluído" | "Pendente",
        data: formatDateForSaoPaulo(new Date()),
        hora: formatTimeForSaoPaulo(new Date()),
        descricao: "",
      })
    }
  }, [atendimento])

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">{t('date')}</Label>
              <Input
                id="data"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
                tabIndex={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">{t('hour')}</Label>
              <Input
                id="hora"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                required
                tabIndex={5}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">{t('description')}</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
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