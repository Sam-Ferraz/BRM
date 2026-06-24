"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { type Deal } from "@/lib/api-client"

interface DealSearchProps {
  deals: Deal[]
  /** ID do deal atualmente selecionado (number) ou "" se nenhum */
  value: number | ""
  /** Chamado ao escolher um deal; passa o deal completo. */
  onSelect: (deal: Deal) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

/**
 * Combobox com busca para escolher um Negócio (Deal). Mesmo padrão visual e
 * de UX do ClientSearch / ProductSearch — botão com chevron que abre popover
 * com input de busca e lista filtrada por cliente ou imóvel.
 *
 * Diferente dos outros search components, NÃO oferece "Criar novo" porque
 * deals dependem de cliente cadastrado e não devem ser criados a partir
 * deste contexto (ex: dentro do form de proposta).
 */
export function DealSearch({
  deals,
  value,
  onSelect,
  placeholder,
  disabled,
  loading,
  className,
}: DealSearchProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const commandListRef = useRef<HTMLDivElement>(null)

  // Habilita scroll do mouse na lista (mesmo padrão usado pelos outros searchs)
  useEffect(() => {
    if (!open) return
    const timeoutId = setTimeout(() => {
      const commandList = commandListRef.current
      if (commandList) {
        commandList.style.overflowY = "auto"
        commandList.style.overscrollBehavior = "contain"
        const handleWheel = (e: WheelEvent) => {
          if (commandList.contains(e.target as Node)) {
            e.stopPropagation()
          }
        }
        commandList.addEventListener("wheel", handleWheel, { passive: true })
        return () => commandList.removeEventListener("wheel", handleWheel)
      }
    }, 50)
    return () => clearTimeout(timeoutId)
  }, [open])

  const handleSelect = useCallback(
    (deal: Deal) => {
      onSelect(deal)
      setOpen(false)
      setSearchValue("")
    },
    [onSelect]
  )

  // Filtragem local (já temos a lista carregada). Busca por cliente ou imóvel.
  const filteredDeals = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return deals
    return deals.filter((d) => {
      const haystack = [d.client, d.property_name].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(q)
    })
  }, [deals, searchValue])

  const selectedDeal = deals.find((d) => d.id === value)
  const displayValue = selectedDeal
    ? `${selectedDeal.client}${selectedDeal.property_name ? ` — ${selectedDeal.property_name}` : ""}`
    : ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading
              ? t("loading")
              : displayValue || placeholder || t("selectDeal")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("searchDeals") || t("searchClients")}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList
            ref={commandListRef}
            className="max-h-[240px] overflow-y-auto"
            style={{ overscrollBehavior: "contain" }}
          >
            {filteredDeals.length === 0 ? (
              <CommandEmpty>{t("noDealsFound") || t("noClientsFound")}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredDeals.map((deal) => (
                  <CommandItem
                    key={deal.id}
                    value={`${deal.id}`}
                    onSelect={() => handleSelect(deal)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === deal.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{deal.client}</div>
                      {deal.property_name && (
                        <div className="text-sm text-muted-foreground truncate">
                          {deal.property_name}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
