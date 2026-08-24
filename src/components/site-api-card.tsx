import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Copy, RefreshCw, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

/**
 * SiteApiCard — configuração da API pública que o site institucional da
 * imobiliária usa pra puxar imóveis do BRM.
 *
 * Fluxo pro usuário leigo:
 *   1. Clica "Gerar chave" → aparece uma chave secreta
 *   2. Copia a chave e envia pro desenvolvedor do site
 *   3. Dev configura o site pra chamar GET https://brm.tec.br/api/public/products
 *      com header X-BRM-API-Key
 *   4. Cada imóvel novo cadastrado no BRM aparece automaticamente
 */
export function SiteApiCard() {
  const { toast } = useToast()
  const [key, setKey] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://brm.tec.br"
  const endpoint = `${baseUrl}/api/public/products`

  useEffect(() => {
    api.accounts
      .getSiteApiKey()
      .then((res) => {
        setKey(res.data.api_key)
        setGeneratedAt(res.data.generated_at)
      })
      .catch(() => setKey(null))
      .finally(() => setLoading(false))
  }, [])

  const generate = async () => {
    if (key && !confirm("Já existe uma chave. Gerar uma nova invalida a atual (o site vai parar de funcionar até atualizarem a chave lá). Continuar?")) return
    setGenerating(true)
    try {
      const res = await api.accounts.generateSiteApiKey()
      setKey(res.data.api_key)
      setGeneratedAt(res.data.generated_at)
      setVisible(true)
      toast({ title: "Chave gerada", description: "Copie e envie pro desenvolvedor do site" })
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${label} copiado` })
    } catch {
      toast({ title: "Copie manualmente", description: text, variant: "destructive" })
    }
  }

  const maskedKey = key ? `${key.slice(0, 8)}${"•".repeat(24)}${key.slice(-4)}` : ""

  const curlExample = key
    ? `curl -H "X-BRM-API-Key: ${key}" \\
  ${endpoint}`
    : `curl -H "X-BRM-API-Key: SUA_CHAVE_AQUI" \\
  ${endpoint}`

  const jsExample = key
    ? `fetch('${endpoint}', {
  headers: { 'X-BRM-API-Key': '${key}' }
})
  .then(r => r.json())
  .then(data => console.log(data.data))`
    : `fetch('${endpoint}', {
  headers: { 'X-BRM-API-Key': 'SUA_CHAVE_AQUI' }
})
  .then(r => r.json())
  .then(data => console.log(data.data))`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Integração com Site (API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
          <p className="font-medium">Como funciona:</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs text-muted-foreground">
            <li>Você gera uma chave secreta abaixo</li>
            <li>Copia e envia pro desenvolvedor do seu site</li>
            <li>O site usa a chave pra puxar seus imóveis do BRM</li>
            <li>Cada imóvel novo cadastrado aqui aparece automaticamente no site (o site consulta periodicamente)</li>
          </ol>
        </div>

        {/* Chave */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Chave de acesso</div>
          {loading ? (
            <div className="text-xs text-muted-foreground">Carregando…</div>
          ) : key ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted rounded px-2 py-1.5 text-xs font-mono break-all min-w-0">
                  {visible ? key : maskedKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisible((v) => !v)}
                  title={visible ? "Ocultar" : "Mostrar"}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy(key, "Chave")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {generatedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Gerada em: {new Date(generatedAt).toLocaleString("pt-BR")}
                </p>
              )}
              <Button size="sm" variant="outline" onClick={generate} disabled={generating}>
                <RefreshCw className="w-4 h-4 mr-1" />
                {generating ? "Gerando…" : "Gerar nova chave"}
              </Button>
              <p className="text-[11px] text-red-600">
                ⚠️ Gerar nova chave invalida a atual — atualize no site depois
              </p>
            </>
          ) : (
            <Button onClick={generate} disabled={generating}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {generating ? "Gerando…" : "Gerar chave"}
            </Button>
          )}
        </div>

        {/* Endpoints */}
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium">Endereços da API</div>
          <div className="space-y-1.5">
            <EndpointRow label="Listar imóveis disponíveis" method="GET" url={`${endpoint}`} onCopy={copy} />
            <EndpointRow label="Buscar imóvel específico" method="GET" url={`${endpoint}/{id}`} onCopy={copy} />
            <EndpointRow label="Testar conexão" method="GET" url={`${baseUrl}/api/public/ping`} onCopy={copy} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Filtros opcionais na listagem: <code>?type=apartment</code>, <code>?city=Bombinhas</code>,
            <code> ?min_price=500000</code>, <code>?max_price=2000000</code>, <code>?limit=50</code>
          </p>
        </div>

        {/* Exemplos de código */}
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium">Exemplos pro desenvolvedor</div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Terminal (curl)</span>
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copy(curlExample, "curl")}>
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>
            <pre className="bg-muted rounded p-2 text-[11px] font-mono overflow-x-auto whitespace-pre">
              {curlExample}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">JavaScript (fetch)</span>
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copy(jsExample, "código JS")}>
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>
            <pre className="bg-muted rounded p-2 text-[11px] font-mono overflow-x-auto whitespace-pre">
              {jsExample}
            </pre>
          </div>
        </div>

        {/* Formato do retorno */}
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium">O que o site recebe</div>
          <pre className="bg-muted rounded p-2 text-[11px] font-mono overflow-x-auto whitespace-pre">{`{
  "data": [
    {
      "id": 42,
      "name": "Apartamento 3 quartos Bombinhas",
      "type": "apartment",
      "price": "750000.00",
      "rooms": 3,
      "suites": 1,
      "bathrooms": 2,
      "parking_spaces": 2,
      "total_area": "90.00",
      "address": "Rua das Palmeiras, 123",
      "neighborhood": "Centro",
      "city": "Bombinhas",
      "state": "SC",
      "description": "...",
      "images": ["https://...", "https://..."],
      "available_for_sale": true
    }
  ],
  "pagination": { "total": 42, "limit": 50, "offset": 0 }
}`}</pre>
        </div>

        <div className="border-t pt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            <strong>Segurança:</strong> a API só expõe imóveis marcados como
            "Disponível para venda". Clientes, negócios e atendimentos NUNCA
            são acessíveis por essa API.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function EndpointRow({
  label,
  method,
  url,
  onCopy,
}: {
  label: string
  method: string
  url: string
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="inline-block w-12 shrink-0 text-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">
        {method}
      </span>
      <code className="flex-1 bg-muted rounded px-2 py-1 font-mono truncate min-w-0" title={url}>
        {url}
      </code>
      <span className="text-[10px] text-muted-foreground hidden md:inline shrink-0">{label}</span>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onCopy(url, "URL")}>
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  )
}
