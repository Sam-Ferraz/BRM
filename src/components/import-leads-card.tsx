import { useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react"
import { api } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

/**
 * ImportLeadsCard — importação em lote de leads via CSV.
 *
 * Fluxo:
 *   1. Usuário baixa template CSV (Nome,Telefone,Email,Observacoes)
 *   2. Preenche no Excel/Google Sheets e salva como CSV
 *   3. Faz upload → preview das primeiras 5 linhas
 *   4. Confirma → POST /api/leads/import com array parseado
 *   5. Novos leads aparecem no Kanban de Negocios na coluna 'Sem atendimento'
 */

interface ParsedRow {
  name?: string
  phone?: string
  email?: string
  notes?: string
  source?: string
}

// Parser CSV simples — suporta virgula ou ponto-e-virgula, aspas duplas
// pra campos com virgula interna. Nao suporta escape de aspas (basico).
function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []
  const separator = lines[0].includes(";") ? ";" : ","
  const headers = lines[0]
    .split(separator)
    .map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase())
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], separator)
    const row: any = {}
    headers.forEach((h, idx) => {
      const val = (cols[idx] || "").trim()
      // Mapa flexivel de aliases pt/en
      if (["nome", "name", "cliente"].includes(h)) row.name = val
      else if (["telefone", "phone", "celular", "whatsapp"].includes(h)) row.phone = val
      else if (["email", "e-mail", "e_mail"].includes(h)) row.email = val
      else if (["observacoes", "observacao", "notes", "notas", "descricao"].includes(h)) row.notes = val
      else if (["origem", "source", "fonte", "canal"].includes(h)) row.source = val
    })
    if (row.name || row.phone) rows.push(row)
  }
  return rows
}

function splitCsvLine(line: string, sep: string): string[] {
  const result: string[] = []
  let curr = ""
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuote = !inQuote
      continue
    }
    if (c === sep && !inQuote) {
      result.push(curr)
      curr = ""
      continue
    }
    curr += c
  }
  result.push(curr)
  return result
}

const TEMPLATE_CSV = `Nome,Telefone,Email,Origem,Observacoes
João Silva,+5547999999999,joao@email.com,Facebook,Interessado em apartamento
Maria Souza,+5547988888888,maria@email.com,Indicação,Casa em Bombinhas
`

export function ImportLeadsCard() {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [filename, setFilename] = useState<string>("")
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template-importacao-leads.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setResult(null)
    setFilename(file.name)
    const text = await file.text()
    const rows = parseCsv(text)
    setParsed(rows)
    if (rows.length === 0) {
      toast({
        title: "Nenhuma linha valida",
        description: "Confira se o CSV tem as colunas Nome/Telefone/Email",
        variant: "destructive",
      })
    }
  }

  const doImport = async () => {
    if (parsed.length === 0) return
    setImporting(true)
    try {
      const res = await api.leads.import(parsed)
      setResult(res.data)
      toast({
        title: "Importacao concluida",
        description: `${res.data.created} importados, ${res.data.skipped} ignorados`,
      })
      setParsed([])
    } catch (err) {
      toast({
        title: "Erro na importacao",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Importação Clientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
          <p className="font-medium">Como importar:</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs text-muted-foreground">
            <li>Baixe o modelo CSV abaixo</li>
            <li>Preencha no Excel ou Google Sheets (colunas: Nome, Telefone, Email, Origem, Observacoes)</li>
            <li>Salve como CSV e envie aqui</li>
            <li>Os leads importados aparecem no funil de Negocios na coluna <strong>Sem atendimento</strong></li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Baixar modelo CSV
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            Selecionar arquivo CSV
          </Button>
        </div>

        {parsed.length > 0 && (
          <div className="border rounded-md p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium truncate">{filename}</div>
              <div className="text-xs text-muted-foreground">{parsed.length} leads detectados</div>
            </div>
            <div className="text-xs space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-muted/20">
              {parsed.slice(0, 5).map((r, i) => (
                <div key={i} className="flex gap-2 text-[11px]">
                  <span className="font-medium truncate min-w-0 flex-1">{r.name || "(sem nome)"}</span>
                  <span className="text-muted-foreground shrink-0">{r.phone || "-"}</span>
                </div>
              ))}
              {parsed.length > 5 && (
                <div className="text-[10px] text-muted-foreground italic">
                  +{parsed.length - 5} outros…
                </div>
              )}
            </div>
            <Button className="w-full" onClick={doImport} disabled={importing}>
              {importing ? "Importando…" : `Confirmar importacao de ${parsed.length} leads`}
            </Button>
          </div>
        )}

        {result && (
          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Importacao finalizada
            </div>
            <div className="text-xs text-muted-foreground">
              <p>✅ {result.created} leads criados</p>
              {result.skipped > 0 && <p>⚠️ {result.skipped} ignorados</p>}
            </div>
            {result.errors.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Ver detalhes dos erros
                </summary>
                <ul className="mt-1 pl-4 list-disc text-muted-foreground max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
