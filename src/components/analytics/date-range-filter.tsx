import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { CalendarIcon, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DateRangePreset =
  | "allTime"
  | "today"
  | "last7Days"
  | "last30Days"
  | "last90Days"
  | "thisMonth"
  | "lastMonth"
  | "custom"

export interface DateRangeValue {
  // Para o preset 'allTime', from/to ficam indefinidos — a página consumidora
  // sabe que não deve enviar filtro de período no request.
  from?: Date
  to?: Date
  preset: DateRangePreset
}

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (next: DateRangeValue) => void
  className?: string
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function computePresetRange(preset: Exclude<DateRangePreset, "custom" | "allTime">): { from: Date; to: Date } {
  const today = startOfDay(new Date())
  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "last7Days":
      return { from: addDays(today, -6), to: today }
    case "last30Days":
      return { from: addDays(today, -29), to: today }
    case "last90Days":
      return { from: addDays(today, -89), to: today }
    case "thisMonth":
      return { from: startOfMonth(today), to: today }
    case "lastMonth": {
      const firstOfThisMonth = startOfMonth(today)
      const lastMonthEnd = addDays(firstOfThisMonth, -1)
      return { from: startOfMonth(lastMonthEnd), to: endOfMonth(lastMonthEnd) }
    }
  }
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const PRESETS: Exclude<DateRangePreset, "custom">[] = [
  "allTime",
  "today",
  "last7Days",
  "last30Days",
  "last90Days",
  "thisMonth",
  "lastMonth",
]

function getLocale(language: string): string {
  switch (language) {
    case "pt-BR":
      return "pt-BR"
    case "en-US":
      return "en-US"
    case "es-ES":
      return "es-ES"
    default:
      return "pt-BR"
  }
}

function formatRangeLabel(value: DateRangeValue, t: (k: string) => string, language: string): string {
  // Para "Tempo total", o botão deve convidar o usuário a selecionar — usa
  // a chave 'selectDate' em vez do nome do preset.
  if (value.preset === "allTime") {
    return t("selectDate")
  }
  if (value.preset !== "custom") {
    return t(`datePreset_${value.preset}`)
  }
  if (!value.from || !value.to) {
    return t("selectDate")
  }
  const locale = getLocale(language)
  const fmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
  return `${fmt.format(value.from)} – ${fmt.format(value.to)}`
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    value.from && value.to ? { from: value.from, to: value.to } : undefined
  )

  const label = useMemo(() => formatRangeLabel(value, t, i18n.language), [value, t, i18n.language])

  const handlePreset = (preset: Exclude<DateRangePreset, "custom">) => {
    if (preset === "allTime") {
      // Sem filtro de período — limpa from/to. A página consumidora detecta
      // e omite o filtro no request, trazendo todos os negócios/atendimentos.
      setDraftRange(undefined)
      onChange({ preset })
      setOpen(false)
      return
    }
    const { from, to } = computePresetRange(preset)
    const next: DateRangeValue = { from, to, preset }
    setDraftRange({ from, to })
    onChange(next)
    setOpen(false)
  }

  const handleApplyCustom = () => {
    if (!draftRange?.from || !draftRange?.to) return
    onChange({
      from: startOfDay(draftRange.from),
      to: endOfDay(draftRange.to),
      preset: "custom",
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 font-normal min-w-[220px]",
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{label}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 flex flex-col sm:flex-row"
        align="end"
      >
        <div className="flex flex-col p-2 border-b sm:border-b-0 sm:border-r min-w-[160px]">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("datePresetTitle")}
          </p>
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={value.preset === preset ? "secondary" : "ghost"}
              size="sm"
              className="justify-start font-normal"
              onClick={() => handlePreset(preset)}
            >
              {t(`datePreset_${preset}`)}
            </Button>
          ))}
          <Button
            variant={value.preset === "custom" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start font-normal"
            onClick={() => {
              // Limpa a seleção atual para deixar claro que o usuário deve
              // escolher as datas no calendário. Sem isso, o botão parecia
              // não fazer nada quando já havia um preset selecionado.
              setDraftRange(undefined)
            }}
          >
            {t("datePreset_custom")}
          </Button>
        </div>
        <div className="p-2 flex flex-col">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draftRange}
            onSelect={setDraftRange}
            defaultMonth={draftRange?.from ?? value.from ?? new Date()}
          />
          {/* Dica de uso — orienta o usuário pelo estado da seleção */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            {!draftRange?.from
              ? t("selectStartDate")
              : !draftRange?.to
                ? t("selectEndDate")
                : t("rangeReady")}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t mt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraftRange(
                  value.from && value.to ? { from: value.from, to: value.to } : undefined
                )
                setOpen(false)
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleApplyCustom}
              disabled={!draftRange?.from || !draftRange?.to}
            >
              {t("apply")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
