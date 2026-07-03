import { useState, useEffect, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react"
import { api, type AgendaItem } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { EventForm } from "@/components/forms/event-form"

type ViewMode = "day" | "week" | "month"

/**
 * AgendaPage — 3 modos de visualização (dia/semana/mês) unificando compromissos
 * manuais (calendar_events) e follow-ups em aberto. Admin tem toggle "Ver time"
 * pra visualizar compromissos de todos os corretores.
 */
export default function AgendaPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === "admin"

  const [view, setView] = useState<ViewMode>("week")
  const [cursor, setCursor] = useState<Date>(new Date())
  const [viewAll, setViewAll] = useState(false)
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formInitialDate, setFormInitialDate] = useState<Date | null>(null)

  // Range do fetch baseado na view
  const range = useMemo(() => {
    if (view === "day") {
      return { from: startOfDay(cursor), to: endOfDay(cursor) }
    }
    if (view === "week") {
      return {
        from: startOfWeek(cursor, { weekStartsOn: 1 }),
        to: endOfWeek(cursor, { weekStartsOn: 1 }),
      }
    }
    // month: pra mostrar as semanas completas do mês (com dias dos meses vizinhos)
    return {
      from: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
      to: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
    }
  }, [view, cursor])

  const fetchAgenda = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.calendar.getAgenda({
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to, "yyyy-MM-dd"),
        viewAll: isAdmin && viewAll,
      })
      setItems(result.data)
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Erro ao carregar agenda",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [range, viewAll, isAdmin, toast, t])

  useEffect(() => {
    fetchAgenda()
  }, [fetchAgenda])

  // Navegação
  const goPrev = () => {
    if (view === "day") setCursor(subDays(cursor, 1))
    else if (view === "week") setCursor(subWeeks(cursor, 1))
    else setCursor(subMonths(cursor, 1))
  }
  const goNext = () => {
    if (view === "day") setCursor(addDays(cursor, 1))
    else if (view === "week") setCursor(addWeeks(cursor, 1))
    else setCursor(addMonths(cursor, 1))
  }
  const goToday = () => setCursor(new Date())

  const handleCreateEvent = (date?: Date) => {
    setEditingId(null)
    setFormInitialDate(date ?? cursor)
    setIsFormOpen(true)
  }

  const handleEditEvent = (item: AgendaItem) => {
    if (item.kind !== "event") {
      toast({
        title: t("info") || "Info",
        description: "Follow-ups só podem ser editados no módulo Follow-ups",
      })
      return
    }
    setEditingId(item.id)
    setFormInitialDate(null)
    setIsFormOpen(true)
  }

  const handleFormSaved = () => {
    setIsFormOpen(false)
    setEditingId(null)
    setFormInitialDate(null)
    fetchAgenda()
  }

  // Título do header conforme view
  const headerTitle = useMemo(() => {
    if (view === "day") return format(cursor, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 })
      const end = endOfWeek(cursor, { weekStartsOn: 1 })
      return `${format(start, "d MMM", { locale: ptBR })} — ${format(end, "d MMM yyyy", { locale: ptBR })}`
    }
    return format(cursor, "MMMM 'de' yyyy", { locale: ptBR })
  }, [view, cursor])

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("backButton")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                {t("agenda") || "Agenda"}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Toggle Ver Time (só admin) */}
                {isAdmin && (
                  <Button
                    variant={viewAll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewAll(!viewAll)}
                    title="Ver compromissos de todo o time"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {viewAll ? "Time (todos)" : "Meu"}
                  </Button>
                )}
                <Button size="sm" onClick={() => handleCreateEvent()}>
                  <Plus className="w-4 h-4 mr-2" /> {t("newEvent") || "Novo compromisso"}
                </Button>
              </div>
            </div>

            {/* Toolbar de navegação */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goPrev} aria-label="Anterior">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToday}>
                  {t("today") || "Hoje"}
                </Button>
                <Button variant="outline" size="sm" onClick={goNext} aria-label="Próximo">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="ml-3 font-medium capitalize">{headerTitle}</span>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="day">{t("day") || "Dia"}</TabsTrigger>
                  <TabsTrigger value="week">{t("week") || "Semana"}</TabsTrigger>
                  <TabsTrigger value="month">{t("month") || "Mês"}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
            ) : view === "day" ? (
              <DayView cursor={cursor} items={items} onEdit={handleEditEvent} />
            ) : view === "week" ? (
              <WeekView cursor={cursor} items={items} onEdit={handleEditEvent} onCreate={handleCreateEvent} />
            ) : (
              <MonthView cursor={cursor} items={items} onEdit={handleEditEvent} onCreate={handleCreateEvent} />
            )}
          </CardContent>
        </Card>
      </div>

      <EventForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        eventId={editingId}
        initialDate={formInitialDate}
        onSaved={handleFormSaved}
      />
    </div>
  )
}

// ===========================================================================
// Sub-views
// ===========================================================================

function itemBadgeVariant(item: AgendaItem): "default" | "secondary" | "outline" {
  if (item.kind === "followup") return "secondary"
  return "default"
}

function ItemCard({ item, onEdit }: { item: AgendaItem; onEdit: (i: AgendaItem) => void }) {
  const start = parseISO(item.start_at)
  const timeLabel = item.all_day ? "Dia todo" : format(start, "HH:mm")
  const context = item.client_name || item.deal_client || item.product_name
  return (
    <button
      onClick={() => onEdit(item)}
      className="w-full text-left rounded-md border px-2 py-1.5 hover:bg-accent transition-colors text-xs"
      style={item.color ? { borderLeftColor: item.color, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate">{item.title}</span>
        <Badge variant={itemBadgeVariant(item)} className="text-[10px] shrink-0">
          {timeLabel}
        </Badge>
      </div>
      {context && <div className="text-muted-foreground truncate">{context}</div>}
      {item.user_name && (
        <div className="text-[10px] text-muted-foreground">{item.user_name}</div>
      )}
    </button>
  )
}

function DayView({ cursor, items, onEdit }: { cursor: Date; items: AgendaItem[]; onEdit: (i: AgendaItem) => void }) {
  const dayItems = items.filter((i) => isSameDay(parseISO(i.start_at), cursor))
  return (
    <div className="space-y-2">
      {dayItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Nenhum compromisso.</div>
      ) : (
        dayItems.map((item) => (
          <ItemCard key={`${item.kind}-${item.id}`} item={item} onEdit={onEdit} />
        ))
      )}
    </div>
  )
}

function WeekView({
  cursor,
  items,
  onEdit,
  onCreate,
}: {
  cursor: Date
  items: AgendaItem[]
  onEdit: (i: AgendaItem) => void
  onCreate: (d: Date) => void
}) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((day) => {
        const dayItems = items.filter((i) => isSameDay(parseISO(i.start_at), day))
        const isToday = isSameDay(day, new Date())
        return (
          <div key={day.toISOString()} className={`rounded-md border min-h-[160px] ${isToday ? "border-primary bg-primary/5" : ""}`}>
            <div
              className="flex items-center justify-between px-2 py-1 border-b cursor-pointer hover:bg-accent"
              onClick={() => onCreate(day)}
            >
              <div className="text-xs font-medium">
                <div className="uppercase text-[10px] text-muted-foreground">
                  {format(day, "EEE", { locale: ptBR })}
                </div>
                <div className={isToday ? "text-primary" : ""}>{format(day, "d")}</div>
              </div>
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="p-1 space-y-1">
              {dayItems.map((item) => (
                <ItemCard key={`${item.kind}-${item.id}`} item={item} onEdit={onEdit} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthView({
  cursor,
  items,
  onEdit,
  onCreate,
}: {
  cursor: Date
  items: AgendaItem[]
  onEdit: (i: AgendaItem) => void
  onCreate: (d: Date) => void
}) {
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
  const days: Date[] = []
  let d = gridStart
  while (d <= gridEnd) {
    days.push(d)
    d = addDays(d, 1)
  }
  const weekdayLabels = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase text-muted-foreground text-center font-medium">
        {weekdayLabels.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayItems = items.filter((i) => isSameDay(parseISO(i.start_at), day))
          const isToday = isSameDay(day, new Date())
          const outOfMonth = !isSameMonth(day, cursor)
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] rounded border p-1 text-xs cursor-pointer hover:bg-accent ${
                isToday ? "border-primary bg-primary/5" : ""
              } ${outOfMonth ? "opacity-40" : ""}`}
              onClick={() => onCreate(day)}
            >
              <div className={`text-[11px] font-medium ${isToday ? "text-primary" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5 mt-1">
                {dayItems.slice(0, 3).map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(item)
                    }}
                    className="text-[9px] truncate rounded px-1 py-0.5 bg-primary/10 hover:bg-primary/20"
                    style={item.color ? { backgroundColor: `${item.color}20`, color: item.color } : undefined}
                    title={item.title}
                  >
                    {item.all_day ? "•" : format(parseISO(item.start_at), "HH:mm")} {item.title}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[9px] text-muted-foreground">+{dayItems.length - 3}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
