import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronLeft } from "lucide-react"
import { api, type Pipeline } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

/**
 * NewPipelineWizard — jornada de criacao de funil em 2 passos:
 *   1. Nome + escolha do modelo (em branco / copiar de funil existente)
 *   2. Se "copiar", escolhe qual funil servir de base
 *
 * O funil nasce sempre ZERADO (sem deals). Colunas:
 *   - modelo 'empty'  -> usa as fases base padrao do kanban (sem overrides)
 *   - modelo 'clone'  -> herda o custom_config do funil-fonte (labels,
 *                        colors, ordem, colunas extras customizadas), mas
 *                        nao traz os deals.
 */
export type NewPipelineModel = 'empty' | 'clone'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelines: Pipeline[]
  onCreated: (pipeline: Pipeline) => void
}

export function NewPipelineWizard({ open, onOpenChange, pipelines, onCreated }: Props) {
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState("")
  const [model, setModel] = useState<NewPipelineModel>('empty')
  const [sourceId, setSourceId] = useState<string>("")
  const [creating, setCreating] = useState(false)

  const reset = () => {
    setStep(1)
    setName("")
    setModel('empty')
    setSourceId("")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const canAdvance = name.trim().length > 0
  const canFinish = model === 'empty' || (model === 'clone' && sourceId !== "")

  const handleSubmit = async () => {
    if (!canAdvance) return
    setCreating(true)
    try {
      // Backend hoje aceita name+color+is_default. Pra modelo 'clone', faz um
      // segundo PUT em seguida com o custom_config do source — assim evita
      // precisar de um endpoint 'create-from-template' dedicado agora.
      const { data } = await api.pipelines.create({ name: name.trim() })
      if (model === 'clone' && sourceId) {
        const src = pipelines.find((p) => p.id === parseInt(sourceId, 10))
        if (src?.custom_config) {
          const updated = await api.pipelines.update(data.id, { color: src.color })
          // custom_config vai via rota de update tambem; estendo o payload
          await api.pipelines.update(data.id, {
            // @ts-expect-error — custom_config nao esta no type mas o endpoint aceita
            custom_config: src.custom_config,
          })
          onCreated({ ...updated.data, custom_config: src.custom_config })
        } else {
          onCreated(data)
        }
      } else {
        onCreated(data)
      }
      toast({ title: 'Funil criado' })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha ao criar funil',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const otherPipelines = pipelines

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo funil — etapa {step} de 2</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-1 space-y-5">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pipeline-name">Nome do funil</Label>
                <Input
                  id="pipeline-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Locação, Lançamento, Carteira avulsa"
                  maxLength={100}
                />
              </div>

              <div className="space-y-3">
                <Label>Como quer começar?</Label>
                <RadioGroup value={model} onValueChange={(v) => setModel(v as NewPipelineModel)}>
                  <label
                    htmlFor="model-empty"
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/40"
                  >
                    <RadioGroupItem id="model-empty" value="empty" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Funil em branco</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Começa com as fases padrão (Atendimento, Agendamento, Visita, Proposta,
                        Contrato, Vendido, Descartado). Nenhum negócio é copiado — o funil nasce zerado.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="model-clone"
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/40 ${
                      otherPipelines.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <RadioGroupItem
                      id="model-clone"
                      value="clone"
                      className="mt-1"
                      disabled={otherPipelines.length === 0}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Copiar colunas de outro funil</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Herda a configuração de colunas (nomes, cores, ordem, colunas extras)
                        de um funil existente. Nenhum negócio é copiado — o novo funil nasce zerado.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {model === 'empty' && (
                <div className="space-y-3 text-sm">
                  <p className="font-medium">Revise e confirme:</p>
                  <ul className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                    <li>
                      <span className="text-muted-foreground">Nome: </span>
                      <span className="font-medium">{name}</span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">Modelo: </span>
                      <span className="font-medium">Em branco (fases padrão)</span>
                    </li>
                    <li className="text-xs text-muted-foreground pt-1 border-t">
                      Nenhum negócio será copiado. Você pode arrastar deals existentes pra este
                      funil depois, pelo menu de ações do card.
                    </li>
                  </ul>
                </div>
              )}

              {model === 'clone' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="source-pipeline">Copiar colunas de:</Label>
                    <Select value={sourceId} onValueChange={setSourceId}>
                      <SelectTrigger id="source-pipeline">
                        <SelectValue placeholder="Escolha um funil" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherPipelines.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                            {p.is_default && (
                              <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {sourceId && (
                    <p className="text-xs text-muted-foreground p-2 bg-muted/40 rounded">
                      <Check className="inline w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Colunas do funil <strong>{pipelines.find((p) => p.id === parseInt(sourceId, 10))?.name}</strong>{" "}
                      serão clonadas. Negócios NÃO serão copiados.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={!canAdvance}>
              Continuar
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleSubmit} disabled={creating || !canFinish}>
              {creating ? 'Criando...' : 'Criar funil'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
