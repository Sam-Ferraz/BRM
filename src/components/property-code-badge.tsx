import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPropertyCode } from "@/lib/property-code"

/**
 * Badge compacto com o código humano do Imóvel (ex: "001"). O corretor usa
 * pra copiar/ler/falar rapidinho, tanto na listagem quanto no header do form.
 * Formato bruto sem prefixo, como o usuário pediu.
 */

interface PropertyCodeBadgeProps {
  id: number
  className?: string
  readOnly?: boolean
}

export function PropertyCodeBadge({ id, className, readOnly }: PropertyCodeBadgeProps) {
  const code = formatPropertyCode(id)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard indisponível — usuário seleciona o texto manualmente */
    }
  }

  if (!code) return <span className="text-muted-foreground text-xs">—</span>

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-foreground",
        className,
      )}
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
