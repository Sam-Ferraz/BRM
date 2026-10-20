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

interface ExtraColumn {
  id: string      // uuid local gerado no cliente — serve como "status" interno
  label: string
  color: string
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
  const [extraColumns, setExtraColumns] = useState<ExtraColumn[]>([])
  const [showExtraForm, setShowExtraForm] = useState(false)
  const [newExtraLabel, setNewExtraLabel] = useState("")
  const [newExtraColor, setNewExtraColor] = useState<string>(PALETTE[0])

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
    const existingExtras = (account?.custom_config as any)?.pipeline_extra_columns as ExtraColumn[] | undefined
    setExtraColumns(Array.isArray(existingExtras) ? existingExtras : [])
    setShowExtraForm(false)
    setNewExtraLabel("")
    setNewExtraColor(PALETTE[0])
  }, [open, account])

  const addExtraColumn = () => {
    const label = newExtraLabel.trim()
    if (!label) {
      toast({ title: "Informe o nome da coluna", variant: "destructive" })
      return
    }
    const id = `ec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setExtraColumns((prev) => [...prev, { id, label, color: newExtraColor }])
    setNewExtraLabel("")
    setNewExtraColor(PALETTE[0])
    setShowExtraForm(false)
  }

  const removeExtraColumn = (id: string) => {
    setExtraColumns((prev) => prev.filter((c) => c.id !== id))
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
        pipeline_subcolumns: subcolumns,
        pipeline_extra_columns: extraColumns,
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
      setExtraColumns([])
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
                Prévia: {d.label || "(sem nome)"}
              </div>
            </div>
          ))}

          {/* Colunas extras: colunas totalmente novas (fora do enum de status
              padrao). Persistidas em custom_config.pipeline_extra_columns.
              Renderizacao visual no Kanban sera entregue em PR separado. */}
          <div className="mt-4 border-t pt-3 space-y-2">
            <Label className="text-sm font-medium">Colunas extras</Label>
            {extraColumns.length === 0 && !showExtraForm && (
              <p className="text-xs text-muted-foreground">Nenhuma coluna extra cadastrada.</p>
            )}
            {extraColumns.length > 0 && (
              <ul className="space-y-1">
                {extraColumns.map((ec) => (
                  <li key={ec.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                    <span
                      className="inline-block w-3 h-3 rounded"
                      style={{ backgroundColor: ec.color }}
                    />
                    <span className="font-medium">{ec.label}</span>
                    <button
                      type="button"
                      onClick={() => removeExtraColumn(ec.id)}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Remover coluna extra"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showExtraForm && (
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={newExtraLabel}
                    onChange={(e) => setNewExtraLabel(e.target.value)}
                    placeholder="Ex: Backlog"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cor</Label>
                  <div className="flex gap-1 flex-wrap max-w-[160px]">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewExtraColor(c)}
                        className={`w-6 h-6 rounded border-2 transition-all ${newExtraColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <Button type="button" size="sm" onClick={addExtraColumn}>
                  Adicionar
                </Button>
              </div>
            )}
          </div>

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
            onClick={() => setShowExtraForm((v) => !v)}
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
