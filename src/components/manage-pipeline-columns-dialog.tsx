import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Eye, EyeOff, GripVertical } from "lucide-react"
import { useAccount } from "@/hooks/use-account"
import { useToast } from "@/hooks/use-toast"

/**
 * ManagePipelineColumnsDialog — permite admin/gerente customizar as colunas
 * do Kanban de Negocios da SUA account: renomear, mudar cor do header,
 * ocultar e reordenar. Nao adiciona colunas novas (as fases sao definidas
 * pelo enum de status; adicionar coluna sem status atrelado ficaria vazia).
 *
 * As mudancas ficam em account.custom_config.pipeline_columns, aplicadas
 * pelo DealsKanbanView em tempo de render sobre a lista PHASES padrao.
 */

interface DefaultColumn {
  key: string
  label: string
  headerHex: string  // cor sugerida em hex (background do header)
}

/**
 * Cores default por fase (equivalente ao headerColor Tailwind do Kanban).
 * Passa em hex pra serem editaveis no color picker.
 */
export const DEFAULT_COLUMNS: DefaultColumn[] = [
  { key: "no_service",     label: "Sem atendimento", headerHex: "#f1f5f9" },
  { key: "service",        label: "Atendimento",     headerHex: "#dbeafe" },
  { key: "visit_foreseen", label: "Agendamento",     headerHex: "#fef3c7" },
  { key: "visit_done",     label: "Visita",    headerHex: "#ffedd5" },
  { key: "proposal",       label: "Proposta",        headerHex: "#f3e8ff" },
  { key: "contract",       label: "Contrato",        headerHex: "#e0e7ff" },
  { key: "sold",           label: "Vendido",         headerHex: "#dcfce7" },
  { key: "discarded",      label: "Descartado",      headerHex: "#fee2e2" },
]

const PALETTE = [
  "#f1f5f9", "#dbeafe", "#fef3c7", "#ffedd5", "#f3e8ff",
  "#e0e7ff", "#dcfce7", "#fee2e2", "#fce7f3", "#ccfbf1",
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

interface Draft {
  key: string
  label: string
  color: string
  hidden: boolean
  position: number
}

export function ManagePipelineColumnsDialog({ open, onOpenChange, onSaved }: Props) {
  const { account, updateConfig } = useAccount()
  const { toast } = useToast()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [saving, setSaving] = useState(false)

  // Ao abrir, hidrata drafts com override atual OU defaults
  useEffect(() => {
    if (!open) return
    const overrides = account?.custom_config?.pipeline_columns || {}
    const list: Draft[] = DEFAULT_COLUMNS.map((col, idx) => {
      const ov = overrides[col.key] || {}
      return {
        key: col.key,
        label: ov.label ?? col.label,
        color: ov.color ?? col.headerHex,
        hidden: ov.hidden ?? false,
        position: ov.position ?? idx,
      }
    })
    list.sort((a, b) => a.position - b.position)
    setDrafts(list)
  }, [open, account])

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= drafts.length) return
    setDrafts((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((d, i) => ({ ...d, position: i }))
    })
  }

  const patchDraft = (index: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const save = async () => {
    setSaving(true)
    try {
      const overrides: Record<string, { label?: string; color?: string; hidden?: boolean; position?: number }> = {}
      drafts.forEach((d, idx) => {
        overrides[d.key] = {
          label: d.label.trim(),
          color: d.color,
          hidden: d.hidden,
          position: idx,
        }
      })
      const nextConfig = {
        ...(account?.custom_config || {}),
        pipeline_columns: overrides,
      }
      await updateConfig(nextConfig)
      toast({ title: "Colunas atualizadas" })
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (!confirm("Restaurar colunas padrao? Isso apaga suas personalizacoes.")) return
    setSaving(true)
    try {
      const nextConfig = { ...(account?.custom_config || {}) }
      delete (nextConfig as any).pipeline_columns
      await updateConfig(nextConfig)
      toast({ title: "Colunas restauradas" })
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar colunas do Kanban</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            Renomeie, mude a cor do cabecalho, oculte ou reordene as colunas do Kanban de Negocios.
            As mudancas valem so pra sua empresa.
          </p>
          {drafts.map((d, index) => (
            <div key={d.key} className="border rounded-lg p-3 space-y-2 bg-card">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                    title="Mover pra cima"
                  >
                    <GripVertical className="w-3.5 h-3.5 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === drafts.length - 1}
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                    title="Mover pra baixo"
                  >
                    <GripVertical className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={d.label}
                    onChange={(e) => patchDraft(index, { label: e.target.value })}
                    className="h-8"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => patchDraft(index, { hidden: !d.hidden })}
                  className={`p-2 rounded border transition-colors ${
                    d.hidden ? "border-red-300 text-red-600 bg-red-50" : "border-muted hover:bg-accent"
                  }`}
                  title={d.hidden ? "Ocultada — clique pra mostrar" : "Visivel — clique pra ocultar"}
                >
                  {d.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Cor do cabecalho:</span>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchDraft(index, { color: c })}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      d.color.toLowerCase() === c.toLowerCase() ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={d.color}
                  onChange={(e) => patchDraft(index, { color: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                  title="Cor personalizada"
                />
              </div>
              <div
                className="mt-1 px-3 py-2 rounded text-sm font-semibold border"
                style={{ backgroundColor: d.color, opacity: d.hidden ? 0.4 : 1 }}
              >
                Preview: {d.label || "(sem nome)"}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={reset} disabled={saving}>
            Restaurar padrao
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
