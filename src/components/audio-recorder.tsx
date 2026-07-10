import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, RotateCcw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * AudioRecorder — grava áudio no browser + transcreve em tempo real com
 * Web Speech API.
 *
 * Rota feliz:
 *   1. Usuário clica em "Gravar" → getUserMedia pede permissão do mic
 *   2. MediaRecorder começa a gravar (Blob de audio/webm)
 *   3. SpeechRecognition escuta em paralelo e vai emitindo texto em pt-BR
 *   4. UI mostra timer + texto sendo transcrito ao vivo
 *   5. Usuário clica em "Parar" → recorder para → onFinish é chamado com
 *      { audioBlob, transcript }
 *
 * Compatibilidade:
 *   - Chrome/Edge Android/Desktop: 100% (SpeechRecognition + MediaRecorder)
 *   - Firefox: MediaRecorder OK, SpeechRecognition ausente (sem transcrição
 *     ao vivo — precisa fallback pro Whisper API depois)
 *   - Safari iOS: SpeechRecognition existe mas com bugs; usar com cuidado
 *
 * Se o browser não suporta SpeechRecognition, o áudio é gravado normalmente
 * e a transcrição fica vazia — o usuário digita manualmente.
 *
 * Se o browser bloquear o mic (permissão negada), mostra erro claro.
 */

interface AudioRecorderProps {
  onFinish: (result: { audioBlob: Blob; transcript: string }) => void
  disabled?: boolean
}

type Phase = "idle" | "recording" | "stopping"

// Detecta a implementação disponível de SpeechRecognition
function getSpeechRecognitionCtor(): any {
  if (typeof window === "undefined") return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function AudioRecorder({ onFinish, disabled }: AudioRecorderProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [interim, setInterim] = useState("")
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  // Guardamos apenas os trechos "finais" (results.isFinal) pra não misturar
  // com o parcial (interim) que o SpeechRecognition emite ao vivo.
  const finalTranscriptRef = useRef("")

  const supportsSpeech = !!getSpeechRecognitionCtor()

  // Cleanup em unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop())
      } catch { /* ignore */ }
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setTranscript("")
    setInterim("")
    finalTranscriptRef.current = ""
    setElapsed(0)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Permissão do microfone foi negada. Habilite nos ajustes do browser."
          : "Não foi possível acessar o microfone."
      )
      return
    }
    streamRef.current = stream

    // MediaRecorder — captura o áudio
    let recorder: MediaRecorder
    try {
      // Formato webm/opus é o mais compatível cross-browser; deixamos o browser escolher
      recorder = new MediaRecorder(stream)
    } catch {
      setError("Este browser não suporta gravação de áudio.")
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    recorderRef.current = recorder
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start()

    // SpeechRecognition — transcreve em tempo real (se disponível)
    const SR = getSpeechRecognitionCtor()
    if (SR) {
      try {
        const rec = new SR()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = "pt-BR"
        rec.onresult = (event: any) => {
          let interimText = ""
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscriptRef.current += result[0].transcript
            } else {
              interimText += result[0].transcript
            }
          }
          setTranscript(finalTranscriptRef.current)
          setInterim(interimText)
        }
        rec.onerror = (event: any) => {
          // Erros comuns: 'no-speech', 'audio-capture', 'not-allowed'
          // 'no-speech' é benigno (só ficou em silêncio), não avisamos
          if (event.error && event.error !== "no-speech") {
            console.warn("[SpeechRecognition]", event.error)
          }
        }
        rec.onend = () => {
          // Se ainda estamos gravando, reinicia — SpeechRecognition tende a
          // parar sozinho após alguns segundos de silêncio
          if (recorderRef.current?.state === "recording") {
            try { rec.start() } catch { /* ignore duplicate start */ }
          }
        }
        recognitionRef.current = rec
        rec.start()
      } catch (err) {
        console.warn("[SpeechRecognition] falha ao iniciar:", err)
      }
    }

    // Timer
    intervalRef.current = window.setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)

    setPhase("recording")
  }, [])

  const stop = useCallback(async () => {
    setPhase("stopping")
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Para a recognition primeiro pra pegar o último resultado
    try { recognitionRef.current?.stop() } catch { /* ignore */ }

    const recorder = recorderRef.current
    if (!recorder) {
      setPhase("idle")
      return
    }

    // Aguarda o onstop pra ter todos os chunks; envelope a transcript final
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        const finalTranscript = (finalTranscriptRef.current + " " + interim).trim()
        onFinish({ audioBlob, transcript: finalTranscript })
        resolve()
      }
      try {
        recorder.stop()
      } catch {
        resolve()
      }
    })

    setPhase("idle")
  }, [interim, onFinish])

  const reset = () => {
    setTranscript("")
    setInterim("")
    finalTranscriptRef.current = ""
    setElapsed(0)
    setError(null)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar de controles */}
      <div className="flex items-center gap-3">
        {phase === "idle" && (
          <Button
            type="button"
            onClick={start}
            disabled={disabled}
            className="rounded-full h-16 w-16 p-0 bg-red-600 hover:bg-red-700"
            aria-label="Começar gravação"
          >
            <Mic className="w-7 h-7" />
          </Button>
        )}
        {phase === "recording" && (
          <Button
            type="button"
            onClick={stop}
            className="rounded-full h-16 w-16 p-0 bg-slate-700 hover:bg-slate-800 animate-pulse"
            aria-label="Parar gravação"
          >
            <Square className="w-6 h-6 fill-white" />
          </Button>
        )}
        {phase === "stopping" && (
          <Button
            type="button"
            disabled
            className="rounded-full h-16 w-16 p-0"
            aria-label="Finalizando"
          >
            <Loader2 className="w-6 h-6 animate-spin" />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-mono text-2xl font-semibold tabular-nums",
              phase === "recording" ? "text-red-600" : "text-foreground"
            )}
          >
            {formatDuration(elapsed)}
          </div>
          <p className="text-xs text-muted-foreground">
            {phase === "idle" && "Aperte pra gravar seu atendimento"}
            {phase === "recording" && "Gravando... aperte pra parar"}
            {phase === "stopping" && "Finalizando..."}
          </p>
        </div>

        {(phase === "idle" && (transcript || elapsed > 0)) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Erros */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Aviso quando não há Web Speech */}
      {!supportsSpeech && phase === "idle" && !error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Este browser não suporta transcrição automática (você vai poder gravar mesmo assim, mas terá de digitar a descrição).
        </div>
      )}

      {/* Preview em tempo real do transcript */}
      {(transcript || interim) && (
        <div className="rounded-md border bg-muted/40 p-3 max-h-40 overflow-y-auto">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Transcrição
          </p>
          <p className="text-sm whitespace-pre-wrap">
            {transcript}
            {interim && <span className="text-muted-foreground italic">{interim}</span>}
          </p>
        </div>
      )}
    </div>
  )
}
