import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronDown, Pencil, Trash2 } from "lucide-react"
import { api, type Pipeline } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

const PIPELINE_COLORS = ["#0c343d", "#dc2626", "#ea580c", "#facc15", "#16a34a", "#0ea5e9", "#8b5cf6", "#78716c"]

interface Props {
  pipelines: Pipeline[]
  activePipelineId: number | null
  onChange: (id: number) => void
  onUpdated: (pipeline: Pipeline) => void
  onDeleted: (id: number) => void
}

/**
 * PipelineSwitcher — Popover com lista de funis + botoes editar/excluir
 * por item (mesmo padrao do Popover de etiquetas em DealsPage).
 *
 * Trigger: botao com circulo colorido + nome do funil ativo.
 * Conteudo:
 *   - Item em modo leitura: circulo + nome + check (se ativo) + lapis + lixeira
 *   - Item em modo edicao: input de nome + paleta de cores + Salvar/Cancelar
 *   - Excluir usa confirm() nativo (igual etiquetas)
 */
export function PipelineSwitcher({ pipelines, activePipelineId, onChange, onUpdated, onDeleted }: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingColor, setEditingColor] = useState("#0c343d")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const active = pipelines.find((p) => p.id === activePipelineId)

  const startEdit = (p: Pipeline) => {
    setEditingId(p.id)
    setEditingName(p.name)
    setEditingColor(p.color || "#0c343d")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const saveEdit = async (id: number) => {
    const name = editingName.trim()
    if (!name) return
    setSaving(true)
    try {
      const { data } = await api.pipelines.update(id, { name, color: editingColor })
      onUpdated(data)
      cancelEdit()
      toast({ title: "Funil atualizado" })
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao atualizar funil",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: Pipeline) => {
    if (!confirm(`Excluir o funil "${p.name}"? Os negocios dele ficam sem funil (podem ser reatribuidos depois).`)) return
    setDeletingId(p.id)
    try {
      await api.pipelines.delete(p.id)
      onDeleted(p.id)
      toast({ title: "Funil excluido" })
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao excluir funil",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between h-9">
          <span className="flex items-center gap-2 text-sm min-w-0">
            {active && (
              <span
                className="w-3 h-3 rounded-sm border border-border/30 shrink-0"
                style={{ backgroundColor: active.color || "#0c343d" }}
              />
            )}
            <span className="truncate font-medium">{active?.name || "Selecione um funil"}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-2">
        <div className="text-sm font-medium text-foreground">Funis</div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {pipelines.map((p) => {
            const isActive = p.id === activePipelineId
            const isEditing = editingId === p.id
            if (isEditing) {
              return (
                <div key={p.id} className="rounded border p-2 space-y-2 bg-muted/40">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    maxLength={100}
                  />
                  <div className="flex items-center gap-1.5">
                    {PIPELINE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          editingColor === c ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={saving || !editingName.trim()}
                      onClick={() => saveEdit(p.id)}
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )
            }
            return (
              <div key={p.id} className="flex items-center gap-1 rounded px-1 py-1 hover:bg-accent">
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.id)
                    setOpen(false)
                  }}
                  className="flex-1 flex items-center gap-2 text-left text-sm px-1 py-0.5"
                >
                  <span
                    className="inline-block w-5 h-3 rounded"
                    style={{ backgroundColor: p.color || "#0c343d" }}
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.is_default && (
                    <span className="text-[10px] text-muted-foreground border px-1 rounded">padrão</span>
                  )}
                  {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
                <button
                  type="button"
                  title="Editar funil"
                  onClick={() => startEdit(p)}
                  className="p-1 rounded hover:bg-muted hover:text-foreground text-muted-foreground transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title={pipelines.length <= 1 ? "Nao e possivel excluir o unico funil" : "Excluir funil"}
                  onClick={() => handleDelete(p)}
                  disabled={pipelines.length <= 1 || deletingId === p.id}
                  className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
