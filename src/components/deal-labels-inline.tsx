import { useEffect, useState } from "react"
import { Tags, Plus, Check } from "lucide-react"
import { api, type DealLabel } from "@/lib/api-client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"

interface Props {
  dealId: number
  /**
   * Quando true, badges aparecem em tamanho pequeno pra caber ao lado do
   * codigo do negocio no header do editor. Sem essa flag, badges saem
   * em tamanho medio (usado em cards).
   */
  compact?: boolean
}

/**
 * DealLabelsInline — badges das etiquetas de um deal + popover pra
 * atribuir/remover. Usado ao lado do codigo do negocio no editor
 * (header da coluna A e dialog Editar Negocio).
 */
export function DealLabelsInline({ dealId, compact = false }: Props) {
  const { toast } = useToast()
  const [allLabels, setAllLabels] = useState<DealLabel[]>([])
  const [dealLabels, setDealLabels] = useState<DealLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const refresh = () => {
    Promise.all([api.dealLabels.list(), api.dealLabels.listOfDeal(dealId)])
      .then(([all, mine]) => {
        setAllLabels(all.data || [])
        setDealLabels(mine.data || [])
      })
      .catch(() => {
        setAllLabels([])
        setDealLabels([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId])

  const dealLabelIds = new Set(dealLabels.map((l) => l.id))

  const toggle = async (labelId: number) => {
    const isAssigned = dealLabelIds.has(labelId)
    try {
      if (isAssigned) {
        await api.dealLabels.unassignFromDeal(dealId, labelId)
      } else {
        await api.dealLabels.assignToDeal(dealId, labelId)
      }
      refresh()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    }
  }

  const badgeCls = compact
    ? "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
    : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white"

  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      {dealLabels.map((lb) => (
        <span key={lb.id} className={badgeCls} style={{ backgroundColor: lb.color }}>
          {lb.name}
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Gerenciar etiquetas"
            className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {dealLabels.length === 0 ? <Tags className="w-3.5 h-3.5" /> : <Plus className="w-3 h-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2 space-y-1">
          <div className="text-xs font-medium text-muted-foreground px-2 py-1">Etiquetas</div>
          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-2">Carregando…</div>
          ) : allLabels.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              Nenhuma etiqueta criada ainda. Crie na pagina Negocios.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {allLabels.map((lb) => {
                const isAssigned = dealLabelIds.has(lb.id)
                return (
                  <button
                    key={lb.id}
                    type="button"
                    onClick={() => toggle(lb.id)}
                    className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left"
                  >
                    <span
                      className="inline-block w-5 h-3 rounded"
                      style={{ backgroundColor: lb.color }}
                    />
                    <span className="flex-1 truncate">{lb.name}</span>
                    {isAssigned && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                )
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
