import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Eye, EyeOff, GripVertical, Plus, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface SubColumn {
  id: string      // uuid local gerado no cliente
  parent: string  // key da coluna pai (ex: 'service')
  label: string
}

interface ExtraDraft {
  id: string
  label: string
  color: string
  hidden: boolean
}

export function ManagePipelineColumnsDialog({ open, onOpenChange, onSaved }: Props) {
  const { account, updateConfig } = useAccount()
  const { toast } = useToast()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [saving, setSaving] = useState(false)
  const [subcolumns, setSubcolumns] = useState<SubColumn[]>([])
  const [showSubForm, setShowSubForm] = useState(false)
  const [newSubParent, setNewSubParent] = useState<string>("")
  const [newSubLabel, setNewSubLabel] = useState("")
  const [extraDrafts, setExtraDrafts] = useState<ExtraDraft[]>([])
  // Estado de drag-and-drop pra reordenar via grip handle (HTML5 native).
  // kind identifica se o drag e sobre drafts default ou extras, pra nao
  // permitir reordenacao cruzada (default <-> extra).
  const [dragSrc, setDragSrc] = useState<{ kind: "default" | "extra"; index: number } | null>(null)

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
    const existingSubs = (account?.custom_config as any)?.pipeline_subcolumns as SubColumn[] | undefined
    setSubcolumns(Array.isArray(existingSubs) ? existingSubs : [])
    setShowSubForm(false)
    setNewSubParent("")
    setNewSubLabel("")
    const existingExtras = (account?.custom_config as any)?.pipeline_extra_columns as any[] | undefined
    const hydrated: ExtraDraft[] = Array.isArray(existingExtras)
      ? existingExtras.map((c) => ({
          id: c.id,
          label: c.label ?? "",
          color: c.color ?? PALETTE[0],
          hidden: !!c.hidden,
        }))
      : []
    setExtraDrafts(hydrated)
  }, [open, account])

  const addExtraColumn = () => {
    const id = `ec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setExtraDrafts((prev) => [...prev, { id, label: "Nova coluna", color: PALETTE[0], hidden: false }])
  }

  const patchExtra = (index: number, patch: Partial<ExtraDraft>) => {
    setExtraDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const removeExtra = (index: number) => {
    setExtraDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  // Drag-and-drop handlers (HTML5 nativo). Reordena DENTRO do mesmo grupo.
  const onDragStartItem = (kind: "default" | "extra", index: number) => (e: React.DragEvent) => {
    setDragSrc({ kind, index })
    e.dataTransfer.effectAllowed = "move"
    // Em alguns browsers precisa setData pra o drag "pegar"
    try { e.dataTransfer.setData("text/plain", `${kind}:${index}`) } catch { /* ignore */ }
  }
  const onDragOverItem = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }
  const onDropItem = (kind: "default" | "extra", targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragSrc || dragSrc.kind !== kind) {
      setDragSrc(null)
      return
    }
    const srcIndex = dragSrc.index
    if (srcIndex === targetIndex) {
      setDragSrc(null)
      return
    }
    if (kind === "default") {
      setDrafts((prev) => {
        const next = [...prev]
        const [moved] = next.splice(srcIndex, 1)
        next.splice(targetIndex, 0, moved)
        return next.map((d, i) => ({ ...d, position: i }))
      })
    } else {
      setExtraDrafts((prev) => {
        const next = [...prev]
        const [moved] = next.splice(srcIndex, 1)
        next.splice(targetIndex, 0, moved)
        return next
      })
    }
    setDragSrc(null)
  }

  const addSubColumn = () => {
    const parent = newSubParent.trim()
    const label = newSubLabel.trim()
    if (!parent || !label) {
      toast({ title: "Preencha coluna pai e nome", variant: "destructive" })
      return
    }
    // id simples baseado em timestamp — Date.now ok no browser
    const id = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setSubcolumns((prev) => [...prev, { id, parent, label }])
    setNewSubParent("")
    setNewSubLabel("")
    setShowSubForm(false)
  }

  const removeSubColumn = (id: string) => {
    setSubcolumns((prev) => prev.filter((s) => s.id !== id))
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
        pipeline_subcolumns: subcolumns,
        pipeline_extra_columns: extraDrafts.map((d) => ({
          id: d.id,
          label: d.label.trim() || "Nova coluna",
          color: d.color,
          hidden: d.hidden,
        })),
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
      delete (nextConfig as any).pipeline_subcolumns
      delete (nextConfig as any).pipeline_extra_columns
      await updateConfig(nextConfig)
      setSubcolumns([])
      setExtraDrafts([])
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
          <DialogTitle>Colunas do Quadro</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            Renomeie, mude a cor do cabecalho, oculte ou reordene as colunas do Kanban de Negocios.
            As mudancas valem so pra sua empresa.
          </p>
          {drafts.map((d, index) => (
            <ColumnCard
              key={d.key}
              label={d.label}
              color={d.color}
              hidden={d.hidden}
              onLabelChange={(v) => patchDraft(index, { label: v })}
              onColorChange={(v) => patchDraft(index, { color: v })}
              onToggleHidden={() => patchDraft(index, { hidden: !d.hidden })}
              draggable
              onDragStart={onDragStartItem("default", index)}
              onDragOver={onDragOverItem}
              onDrop={onDropItem("default", index)}
              isDragging={dragSrc?.kind === "default" && dragSrc.index === index}
            />
          ))}

          {/* Colunas extras: colunas totalmente novas (fora do enum de status
              padrao). Mesmo visual dos defaults. Persistidas em
              custom_config.pipeline_extra_columns e renderizadas no Kanban. */}
          {extraDrafts.length > 0 && (
            <>
              <div className="pt-3 pb-1">
                <Label className="text-xs text-muted-foreground">Colunas extras</Label>
              </div>
              {extraDrafts.map((d, index) => (
                <ColumnCard
                  key={d.id}
                  label={d.label}
                  color={d.color}
                  hidden={d.hidden}
                  onLabelChange={(v) => patchExtra(index, { label: v })}
                  onColorChange={(v) => patchExtra(index, { color: v })}
                  onToggleHidden={() => patchExtra(index, { hidden: !d.hidden })}
                  onRemove={() => removeExtra(index)}
                  draggable
                  onDragStart={onDragStartItem("extra", index)}
                  onDragOver={onDragOverItem}
                  onDrop={onDropItem("extra", index)}
                  isDragging={dragSrc?.kind === "extra" && dragSrc.index === index}
                />
              ))}
            </>
          )}

          {/* Sub-colunas: subdivisao dentro de uma coluna. Persistida em
              custom_config.pipeline_subcolumns. Renderizacao visual no
              Kanban sera entregue em PR separado. */}
          <div className="mt-4 border-t pt-3 space-y-2">
            <Label className="text-sm font-medium">Sub-colunas</Label>
            {subcolumns.length === 0 && !showSubForm && (
              <p className="text-xs text-muted-foreground">Nenhuma sub-coluna cadastrada.</p>
            )}
            {subcolumns.length > 0 && (
              <ul className="space-y-1">
                {subcolumns.map((sc) => {
                  const parentLabel = drafts.find((d) => d.key === sc.parent)?.label || sc.parent
                  return (
                    <li key={sc.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                      <span className="font-medium">{sc.label}</span>
                      <span className="text-muted-foreground">em</span>
                      <span className="italic">{parentLabel}</span>
                      <button
                        type="button"
                        onClick={() => removeSubColumn(sc.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Remover sub-coluna"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {showSubForm && (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Coluna pai</Label>
                  <Select value={newSubParent} onValueChange={setNewSubParent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drafts.filter((d) => !d.hidden).map((d) => (
                        <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={newSubLabel}
                    onChange={(e) => setNewSubLabel(e.target.value)}
                    placeholder="Ex: Primeiro contato"
                  />
                </div>
                <Button type="button" size="sm" onClick={addSubColumn}>
                  Adicionar
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          {/* Botoes de criacao a esquerda (antes de "Restaurar padrao"),
              conforme pedido do backlog. Clique toggla o form inline da
              secao correspondente dentro do content. */}
          <Button
            type="button"
            variant="outline"
            onClick={addExtraColumn}
            disabled={saving}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova coluna
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSubForm((v) => !v)}
            disabled={saving}
          >
            <Plus className="w-4 h-4 mr-1" />
            Sub-coluna
          </Button>
          <div className="flex-1" />
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

// ===========================================================================
// ColumnCard — card unificado usado tanto pros defaults quanto pras extras.
// Mesmo visual, mesmo comportamento: 1 grip handle (drag-and-drop), Input
// nome, Palette de cor, color picker custom, botao de visibilidade e Previa.
// Props opcionais onRemove — so aparece pras extras.
// ===========================================================================
interface ColumnCardProps {
  label: string
  color: string
  hidden: boolean
  onLabelChange: (v: string) => void
  onColorChange: (v: string) => void
  onToggleHidden: () => void
  onRemove?: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragging?: boolean
}

function ColumnCard({
  label,
  color,
  hidden,
  onLabelChange,
  onColorChange,
  onToggleHidden,
  onRemove,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: ColumnCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`border rounded-lg p-3 space-y-2 bg-card transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Grip unico — cursor pega-mover, serve de handle do drag-and-drop
            do card inteiro (o atributo draggable esta no container pai) */}
        <div
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent text-muted-foreground"
          title="Arraste pra reordenar"
          aria-label="Reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Nome</Label>
          <Input
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="h-8"
          />
        </div>
        <button
          type="button"
          onClick={onToggleHidden}
          className={`p-2 rounded border transition-colors ${
            hidden ? "border-red-300 text-red-600 bg-red-50" : "border-muted hover:bg-accent"
          }`}
          title={hidden ? "Ocultada — clique pra mostrar" : "Visivel — clique pra ocultar"}
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 rounded border border-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Remover coluna extra"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Cor do cabecalho:</span>
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            className={`w-6 h-6 rounded border-2 transition-all ${
              color.toLowerCase() === c.toLowerCase() ? "border-foreground scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer"
          title="Cor personalizada"
        />
      </div>
      <div
        className="mt-1 px-3 py-2 rounded text-sm font-semibold border"
        style={{ backgroundColor: color, opacity: hidden ? 0.4 : 1 }}
      >
        Prévia: {label || "(sem nome)"}
      </div>
    </div>
  )
}
