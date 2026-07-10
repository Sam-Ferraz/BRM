import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AudioRecorder } from "./audio-recorder"
import { DealCodeSearch } from "./deal-code-search"
import { api, type Appointment } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { extractDealCodeFromText, formatDealCode } from "@/lib/deal-code"

/**
 * QuickAppointmentRecorder — Fluxo rápido pro corretor no celular:
 *   1. Aperta FAB de microfone
 *   2. Modal abre com gravador em destaque
 *   3. Grava o resumo do atendimento — Web Speech transcreve em tempo real
 *   4. Ao parar: transcrição preenche o campo "Descrição" automaticamente
 *   5. Preenche Cliente + Tipo (defaults inteligentes)
 *   6. Aperta Salvar → upload do áudio em paralelo → cria appointment
 *
 * Foco em usabilidade mobile: campos mínimos, botão gigante de gravar,
 * descrição já vem preenchida. Se quiser depois editar dados extras (imóvel,
 * data), usa o form completo em outro momento.
 */

interface QuickAppointmentRecorderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (appointment: Appointment) => void
}

const TYPE_OPTIONS: { value: Appointment["type"]; label: string }[] = [
  { value: "visit", label: "Visita" },
  { value: "in_person", label: "Presencial" },
  { value: "call", label: "Ligação" },
  { value: "chat", label: "Mensagem" },
]

export function QuickAppointmentRecorder({
  open,
  onOpenChange,
  onCreated,
}: QuickAppointmentRecorderProps) {
  const { toast } = useToast()

  const [client, setClient] = useState("")
  const [type, setType] = useState<Appointment["type"]>("visit")
  const [description, setDescription] = useState("")
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [answered, setAnswered] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dealId, setDealId] = useState<number | null>(null)

  const handleRecordingFinish = ({
    audioBlob,
    transcript,
  }: {
    audioBlob: Blob
    transcript: string
  }) => {
    setAudioBlob(audioBlob)
    if (transcript) {
      // Se já havia texto, concatena; senão substitui
      setDescription((prev) => (prev ? `${prev.trim()}\n\n${transcript}` : transcript))
    }

    // Auto-detecção: se o corretor falou o código do negócio ("N zero zero
    // quarenta e dois" vira ~"N-0042" no transcript), pré-preenchemos o campo.
    // Só sugerimos se ainda não havia deal_id manual escolhido, pra não
    // sobrescrever intenção explícita.
    if (transcript && dealId == null) {
      const detected = extractDealCodeFromText(transcript)
      if (detected != null) {
        setDealId(detected)
        toast({
          title: `Negócio ${formatDealCode(detected)} detectado`,
          description: "Vinculei automaticamente pelo código falado no áudio. Confira antes de salvar.",
        })
        return
      }
    }

    if (!description && transcript) {
      toast({ title: "Áudio pronto", description: "Transcrição salva no campo abaixo — revise antes de salvar." })
    }
  }

  const resetForm = () => {
    setClient("")
    setType("visit")
    setDescription("")
    setAudioBlob(null)
    setAnswered(true)
    setDealId(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client.trim()) {
      toast({
        title: "Cliente é obrigatório",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // 1. Upload do áudio (se houver)
      let audioUrl: string | null = null
      if (audioBlob) {
        try {
          const res = await api.appointments.uploadAudio(audioBlob)
          audioUrl = res.data.url
        } catch (err) {
          // Falha no upload: mantém dá pra criar o atendimento com transcrição
          console.warn("Falha no upload do áudio:", err)
          toast({
            title: "Áudio não foi salvo",
            description: "A transcrição continua válida — o atendimento vai ser criado sem o arquivo de áudio.",
            variant: "destructive",
          })
        }
      }

      // 2. Cria o atendimento
      const now = new Date()
      const appointment = await api.appointments.create({
        client: client.trim(),
        type,
        scheduled_datetime: now.toISOString(),
        description: description.trim(),
        answered,
        audio_url: audioUrl,
        deal_id: dealId,
      })

      toast({ title: "Atendimento registrado" })
      onCreated?.(appointment)
      resetForm()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao salvar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Registrar atendimento por áudio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            {/* Gravador em destaque */}
            <div className="rounded-lg border bg-card p-4">
              <AudioRecorder onFinish={handleRecordingFinish} disabled={saving} />
            </div>

            {/* Negócio vinculado — pode ser detectado automaticamente do áudio */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-deal">Negócio vinculado (opcional)</Label>
              <DealCodeSearch value={dealId} onChange={setDealId} disabled={saving} />
              <p className="text-xs text-muted-foreground">
                Fale o código no áudio (ex: "negócio N zero zero zero um") ou cole aqui.
              </p>
            </div>

            {/* Descrição — pré-preenchida com a transcrição */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-description">Descrição</Label>
              <Textarea
                id="quick-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="A transcrição do áudio aparece aqui automaticamente — revise e edite se precisar."
              />
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-client">Cliente *</Label>
              <Input
                id="quick-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nome do cliente atendido"
                required
              />
            </div>

            {/* Tipo + Respondido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quick-type">Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as Appointment["type"])}>
                  <SelectTrigger id="quick-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quick-answered">Cliente respondeu?</Label>
                <Select
                  value={answered ? "yes" : "no"}
                  onValueChange={(v) => setAnswered(v === "yes")}
                >
                  <SelectTrigger id="quick-answered">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar atendimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
