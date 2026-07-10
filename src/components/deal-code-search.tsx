import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { api, type Deal } from "@/lib/api-client"
import { formatDealCode, parseDealCode } from "@/lib/deal-code"
import { cn } from "@/lib/utils"

/**
 * Input com autocomplete pra vincular um atendimento a um Negócio.
 *
 * Fluxo:
 *   - Corretor digita "N-42" ou "42" → resolvemos pelo id direto (rápido).
 *   - Corretor digita o nome do cliente → buscamos deals com esse cliente e
 *     mostramos as opções (código + cliente + imóvel).
 *   - Ao selecionar, mostramos um chip com o código selecionado + botão pra
 *     desvincular.
 *
 * Usado no AppointmentForm manual e no QuickAppointmentRecorder por áudio.
 */

interface DealCodeSearchProps {
  value: number | null
  onChange: (dealId: number | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

interface DealOption {
  id: number
  client: string
  property_name?: string
  status: string
}

export function DealCodeSearch({
  value,
  onChange,
  disabled,
  placeholder = "Ex: N0001 ou nome do cliente",
  className,
}: DealCodeSearchProps) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<DealOption[]>([])
  const [showOptions, setShowOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<DealOption | null>(null)
  const debounceRef = useRef<number | null>(null)

  // Ao receber um value do pai (ex: auto-detecção do áudio), busca os dados do deal
  useEffect(() => {
    if (value == null) {
      setSelectedDeal(null)
      return
    }
    if (selectedDeal?.id === value) return

    let cancelled = false
    const fetchDeal = async () => {
      try {
        // Não há endpoint /deals/:id — buscamos todos e filtramos.
        // Como é auto-complete raro, aceita esse custo.
        const res = await api.deals.getAll()
        if (cancelled) return
        const found = res.data.find((d) => d.id === value)
        if (found) {
          setSelectedDeal({
            id: found.id,
            client: found.client,
            property_name: found.property_name,
            status: found.status,
          })
        }
      } catch (err) {
        console.warn("[DealCodeSearch] falha ao buscar deal:", err)
      }
    }
    fetchDeal()
    return () => {
      cancelled = true
    }
  }, [value, selectedDeal?.id])

  const searchDeals = useCallback(async (rawQuery: string) => {
    setLoading(true)
    try {
      const parsedId = parseDealCode(rawQuery)
      const res = await api.deals.getAll(
        parsedId ? undefined : { search: rawQuery },
      )
      let filtered: Deal[] = res.data
      if (parsedId) {
        filtered = res.data.filter((d) => d.id === parsedId)
        // Se não encontrou pelo id exato, cai pro fuzzy também
        if (filtered.length === 0) {
          filtered = res.data.filter((d) =>
            d.client.toLowerCase().includes(rawQuery.toLowerCase()),
          )
        }
      }
      setOptions(
        filtered.slice(0, 8).map((d) => ({
          id: d.id,
          client: d.client,
          property_name: d.property_name,
          status: d.status,
        })),
      )
    } catch (err) {
      console.warn("[DealCodeSearch] busca falhou:", err)
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (v: string) => {
    setQuery(v)
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    if (!v.trim()) {
      setOptions([])
      setShowOptions(false)
      return
    }
    setShowOptions(true)
    debounceRef.current = window.setTimeout(() => {
      searchDeals(v.trim())
    }, 250)
  }

  const handleSelect = (opt: DealOption) => {
    setSelectedDeal(opt)
    onChange(opt.id)
    setQuery("")
    setOptions([])
    setShowOptions(false)
  }

  const handleClear = () => {
    setSelectedDeal(null)
    onChange(null)
    setQuery("")
  }

  // Se há deal selecionado, mostra chip; senão mostra o input
  if (selectedDeal) {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2", className)}>
        <span className="font-mono text-sm font-semibold">{formatDealCode(selectedDeal.id)}</span>
        <span className="text-sm text-muted-foreground truncate flex-1">
          {selectedDeal.client}
          {selectedDeal.property_name ? ` — ${selectedDeal.property_name}` : ""}
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Desvincular negócio"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => query.trim() && setShowOptions(true)}
        onBlur={() => window.setTimeout(() => setShowOptions(false), 150)}
        disabled={disabled}
        placeholder={placeholder}
      />
      {showOptions && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum negócio encontrado</div>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="font-mono text-xs font-semibold shrink-0">
                {formatDealCode(opt.id)}
              </span>
              <span className="truncate flex-1">
                {opt.client}
                {opt.property_name ? (
                  <span className="text-muted-foreground"> — {opt.property_name}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
