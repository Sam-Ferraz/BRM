"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Trash2 } from "lucide-react"
import { api, type CalendarEvent, type CalendarEventStatus } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface EventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId?: number | null
  initialDate?: Date | null
  onSaved: () => void
}

const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6b7280", label: "Cinza" },
]

const STATUS_OPTIONS: { value: CalendarEventStatus; label: string }[] = [
  { value: "scheduled", label: "Agendado" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
]

/**
 * Formata Date em "yyyy-MM-ddTHH:mm" pra input datetime-local.
 * Usa horário local — o browser cuida da tz.
 */
function toDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

/**
 * EventForm — cria/edita compromissos manuais (calendar_events).
 * Follow-ups NÃO passam por aqui — abrem no módulo Follow-ups.
 */
export function EventForm({ open, onOpenChange, eventId, initialDate, onSaved }: EventFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [color, setColor] = useState("#3b82f6")
  const [status, setStatus] = useState<CalendarEventStatus>("scheduled")

  // Reset/preencher ao abrir
  useEffect(() => {
    if (!open) return

    if (eventId) {
      // Editando: carrega do backend
      setLoading(true)
      api.calendar
        .getEvent(eventId)
        .then(({ data }) => {
          setTitle(data.title || "")
          setDescription(data.description || "")
          setLocation(data.location || "")
          setStartAt(data.start_at ? toDatetimeLocal(new Date(data.start_at)) : "")
          setEndAt(data.end_at ? toDatetimeLocal(new Date(data.end_at)) : "")
          setAllDay(!!data.all_day)
          setColor(data.color || "#3b82f6")
          setStatus(data.status || "scheduled")
        })
        .catch((err) => {
          toast({
            title: t("error"),
            description: err instanceof Error ? err.message : "Erro ao carregar compromisso",
            variant: "destructive",
          })
          onOpenChange(false)
        })
        .finally(() => setLoading(false))
    } else {
      // Novo: default 09:00 no dia clicado (ou hoje) + 1h de duração
      const base = initialDate ? new Date(initialDate) : new Date()
      base.setHours(9, 0, 0, 0)
      const end = new Date(base)
      end.setHours(base.getHours() + 1)
      setTitle("")
      setDescription("")
      setLocation("")
      setStartAt(toDatetimeLocal(base))
      setEndAt(toDatetimeLocal(end))
      setAllDay(false)
      setColor("#3b82f6")
      setStatus("scheduled")
    }
  }, [open, eventId, initialDate, toast, t, onOpenChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" })
      return
    }
    if (!startAt) {
      toast({ title: "Data de início obrigatória", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const payload: Partial<CalendarEvent> = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : undefined,
        all_day: allDay,
        color,
        status,
      }

      if (eventId) {
        await api.calendar.updateEvent(eventId, payload)
        toast({ title: "Compromisso atualizado" })
      } else {
        await api.calendar.createEvent(payload)
        toast({ title: "Compromisso criado" })
      }
      onSaved()
    } catch (err) {
      toast({
        title: t("error"),
        description: err instanceof Error ? err.message : "Erro ao salvar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!eventId) return
    if (!confirm("Excluir este compromisso?")) return
    setDeleting(true)
    try {
      await api.calendar.deleteEvent(eventId)
      toast({ title: "Compromisso excluído" })
      onSaved()
    } catch (err) {
      toast({
        title: t("error"),
        description: err instanceof Error ? err.message : "Erro ao excluir",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{eventId ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Título *</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Reunião com cliente"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
              <Label htmlFor="all-day" className="cursor-pointer">Dia todo</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-at">Início *</Label>
                <Input
                  id="start-at"
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? startAt.slice(0, 10) : startAt}
                  onChange={(e) => setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-at">Fim</Label>
                <Input
                  id="end-at"
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? endAt.slice(0, 10) : endAt}
                  onChange={(e) => setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: Escritório, Zoom, endereço do imóvel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detalhes do compromisso"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="color">Cor</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger id="color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: opt.value }}
                          />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CalendarEventStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div>
              {eventId && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting || loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t("saving") || "Salvando..." : t("save") || "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
