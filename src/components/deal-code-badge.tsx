import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDealCode } from "@/lib/deal-code"

/**
 * Badge compacto com o código humano do Negócio (ex: "N-0042") + botão de
 * copiar. Fica bom em tabelas, cards, headers de detalhe.
 *
 * O botão de copiar usa navigator.clipboard.writeText — precisa de contexto
 * seguro (https ou localhost). Em fallback, seleciona o texto pra Ctrl+C.
 */

interface DealCodeBadgeProps {
  id: number
  className?: string
  /** Se true, mostra só o código sem botão de copiar (versão read-only) */
  readOnly?: boolean
  /** Callback opcional pra clique no código todo (ex: navegar pro detalhe) */
  onClick?: () => void
}

export function DealCodeBadge({ id, className, readOnly, onClick }: DealCodeBadgeProps) {
  const code = formatDealCode(id)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Ambiente sem clipboard: ignora silenciosamente. O usuário pode
      // selecionar o texto manualmente.
    }
  }

  if (!code) return <span className="text-muted-foreground text-xs">—</span>

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-foreground",
        onClick && "cursor-pointer hover:bg-muted",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {code}
      {!readOnly && (
        <button
          type="button"
          onClick={handleCopy}
          className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label={copied ? "Código copiado" : "Copiar código"}
          title={copied ? "Copiado!" : "Copiar código"}
        >
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </span>
  )
}
