import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Inbox,
  CheckCircle2,
  XCircle,
  Settings as SettingsIcon,
  Plus,
  Copy,
  Trash2,
  Mail,
  Phone,
  Calendar,
} from "lucide-react"
import {
  api,
  type LeadWithDetails,
  type LeadSource,
  type LeadStatus,
  type LeadSourceType,
} from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

/**
 * /leads — Triagem de leads vindos de plataformas de anúncio (Meta etc).
 *
 * Abas:
 *   • Novos (triagem)
 *   • Aceitos
 *   • Descartados
 *   • Integrações (apenas admin) — cadastra Lead Sources e fornece a URL
 *     do webhook que deve ser configurada na Meta / Zapier / etc.
 */
export default function LeadsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === "admin"

  const [tab, setTab] = useState<LeadStatus | "integrations">("novo")
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<LeadStatus, number>>({ novo: 0, aceito: 0, descartado: 0 })

  const [actingLeadId, setActingLeadId] = useState<number | null>(null)

  const [isSourceOpen, setIsSourceOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<LeadSource | undefined>(undefined)

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      // Não busca quando está na aba de integrações
      if (tab === "integrations") return
      const result = await api.leads.list(tab as LeadStatus)
      setLeads(result.data)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("leadsLoadError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [tab, toast, t])

  const fetchCounts = useCallback(async () => {
    try {
      const result = await api.leads.getCounts()
      setCounts(result.data)
    } catch (error) {
      console.error("Error fetching lead counts:", error)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    fetchCounts()
  }, [fetchLeads, fetchCounts])

  const handleAccept = async (leadId: number) => {
    if (!confirm(t("confirmAcceptLead"))) return
    try {
      setActingLeadId(leadId)
      const result = await api.leads.accept(leadId)
      toast({
        title: t("success"),
        description: t("leadAcceptedSuccess"),
      })
      // Atualiza lista
      fetchLeads()
      fetchCounts()
      // Sugere abrir o negócio criado
      console.log("Cliente:", result.data.client_id, "Negócio:", result.data.deal_id)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("leadAcceptError"),
        variant: "destructive",
      })
    } finally {
      setActingLeadId(null)
    }
  }

  const handleDiscard = async (leadId: number) => {
    if (!confirm(t("confirmDiscardLead"))) return
    try {
      setActingLeadId(leadId)
      await api.leads.discard(leadId)
      toast({
        title: t("success"),
        description: t("leadDiscardedSuccess"),
      })
      fetchLeads()
      fetchCounts()
    } catch (error) {
      toast({
        title: t("error"),
        description: t("leadDiscardError"),
        variant: "destructive",
      })
    } finally {
      setActingLeadId(null)
    }
  }

  const formatDateTime = (iso?: string | null): string => {
    if (!iso) return "—"
    try {
      const locale = i18n.language === "en-US" ? "en-US" : i18n.language === "es-ES" ? "es-ES" : "pt-BR"
      return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backButton")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Inbox className="w-5 h-5" />
          <h2 className="text-xl font-semibold">{t("leads")}</h2>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="novo" className="gap-2">
              <Inbox className="w-4 h-4" />
              {t("leadStatusNovo")}
              <Badge variant="secondary" className="ml-1">{counts.novo}</Badge>
            </TabsTrigger>
            <TabsTrigger value="aceito" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t("leadStatusAceito")}
              <Badge variant="secondary" className="ml-1">{counts.aceito}</Badge>
            </TabsTrigger>
            <TabsTrigger value="descartado" className="gap-2">
              <XCircle className="w-4 h-4" />
              {t("leadStatusDescartado")}
              <Badge variant="secondary" className="ml-1">{counts.descartado}</Badge>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="integrations" className="gap-2">
                <SettingsIcon className="w-4 h-4" />
                {t("integrations")}
              </TabsTrigger>
            )}
          </TabsList>

          {/* === Listas de leads === */}
          {(["novo", "aceito", "descartado"] as LeadStatus[]).map((s) => (
            <TabsContent key={s} value={s} className="mt-4">
              {loading ? (
                <div className="text-center py-16 text-muted-foreground">{t("loading")}…</div>
              ) : leads.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">{t("noLeadsFound")}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.map((lead) => (
                    <Card key={lead.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">
                            {lead.name || lead.email || lead.phone || `Lead #${lead.id}`}
                          </CardTitle>
                          {lead.source_name && (
                            <Badge variant="outline" className="text-[10px]">
                              {lead.source_name}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-2 text-sm">
                        {lead.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" /> {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" /> {lead.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Calendar className="w-3 h-3" /> {formatDateTime(lead.received_at)}
                        </div>

                        {lead.form_data && Object.keys(lead.form_data).length > 0 && (
                          <LeadFormDataView formData={lead.form_data as Record<string, any>} />
                        )}

                        {/* Vínculos quando aceito */}
                        {s === "aceito" && (lead.client_name || lead.deal_id) && (
                          <div className="mt-2 text-xs space-y-1 pt-2 border-t">
                            {lead.client_name && (
                              <p>
                                <span className="text-muted-foreground">{t("client")}:</span>{" "}
                                <span className="font-medium">{lead.client_name}</span>
                              </p>
                            )}
                            {lead.deal_id && (
                              <p>
                                <span className="text-muted-foreground">{t("deal")}:</span>{" "}
                                <span className="font-medium">#{lead.deal_id}</span>
                              </p>
                            )}
                            {lead.accepted_by_user_name && (
                              <p className="text-muted-foreground">
                                {t("acceptedBy")}: {lead.accepted_by_user_name}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Ações apenas para leads novos */}
                        {s === "novo" && (
                          <div className="flex gap-2 mt-auto pt-3 border-t">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleAccept(lead.id)}
                              disabled={actingLeadId === lead.id}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {t("accept")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-red-600 hover:text-red-700"
                              onClick={() => handleDiscard(lead.id)}
                              disabled={actingLeadId === lead.id}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              {t("discard")}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}

          {/* === Integrações (admin) === */}
          {isAdmin && (
            <TabsContent value="integrations" className="mt-4">
              <IntegrationsTab
                onOpenCreate={() => {
                  setEditingSource(undefined)
                  setIsSourceOpen(true)
                }}
                onOpenEdit={(s) => {
                  setEditingSource(s)
                  setIsSourceOpen(true)
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {isAdmin && (
        <LeadSourceDialog
          open={isSourceOpen}
          onOpenChange={(open) => {
            setIsSourceOpen(open)
            if (!open) setEditingSource(undefined)
          }}
          source={editingSource}
        />
      )}
    </div>
  )
}

// ===========================================================================
// Aba "Integrações" — apenas admin
// ===========================================================================

interface IntegrationsTabProps {
  onOpenCreate: () => void
  onOpenEdit: (source: LeadSource) => void
}

function IntegrationsTab({ onOpenCreate, onOpenEdit }: IntegrationsTabProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [sources, setSources] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.leads.sources.list()
      setSources(result.data)
    } catch (error) {
      console.error("Error loading lead sources:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  // Recarrega quando o dialog fechar (re-render quando volta)
  // (alternativa simples ao callback formal)
  useEffect(() => {
    const interval = setInterval(fetchSources, 5000)
    return () => clearInterval(interval)
  }, [fetchSources])

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDeleteLeadSource"))) return
    try {
      await api.leads.sources.delete(id)
      toast({ title: t("success"), description: t("leadSourceDeletedSuccess") })
      fetchSources()
    } catch (error) {
      toast({
        title: t("error"),
        description: t("leadSourceDeleteError"),
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (s: LeadSource) => {
    try {
      await api.leads.sources.update(s.id, {
        status: s.status === "active" ? "paused" : "active",
      })
      fetchSources()
    } catch (error) {
      toast({ title: t("error"), description: t("leadSourceUpdateError"), variant: "destructive" })
    }
  }

  const baseUrl = window.location.origin
  const webhookUrl = (token: string) => `${baseUrl}/api/leads/webhook/${token}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: t("copied"), description: text })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("integrationsDescription")}</p>
        <Button onClick={onOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newIntegration")}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t("loading")}…</div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <SettingsIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>{t("noIntegrationsYet")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{s.name}</h3>
                      <Badge variant="outline">{s.type}</Badge>
                      <Badge
                        className={
                          s.status === "active"
                            ? "bg-emerald-500 hover:bg-emerald-500 text-white border-0"
                            : "bg-slate-400 hover:bg-slate-400 text-white border-0"
                        }
                      >
                        {s.status === "active" ? t("active") : t("paused")}
                      </Badge>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{t("webhookUrl")}:</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-[11px] flex-1 truncate">
                          {webhookUrl(s.webhook_token)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(webhookUrl(s.webhook_token))}
                          title={t("copy")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {s.last_lead_at && (
                        <p className="text-muted-foreground">
                          {t("lastLeadReceived")}: {new Date(s.last_lead_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(s)}
                    >
                      {s.status === "active" ? t("pause") : t("activate")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onOpenEdit(s)}>
                      {t("edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Diálogo de novo / editar fonte de leads
// ===========================================================================

interface LeadSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: LeadSource
}

function LeadSourceDialog({ open, onOpenChange, source }: LeadSourceDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [type, setType] = useState<LeadSourceType>("meta")
  const [verifyToken, setVerifyToken] = useState("")
  const [pageAccessToken, setPageAccessToken] = useState("")
  const [formId, setFormId] = useState("")
  const [appSecret, setAppSecret] = useState("")
  const [pageId, setPageId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (source) {
        setName(source.name)
        setType(source.type)
        setVerifyToken(source.config?.verify_token ?? "")
        setPageAccessToken(source.config?.page_access_token ?? "")
        setFormId(source.config?.form_id ?? "")
        setAppSecret(source.config?.app_secret ?? "")
        setPageId(source.config?.page_id ?? "")
      } else {
        setName("")
        setType("meta")
        setVerifyToken("")
        setPageAccessToken("")
        setFormId("")
        setAppSecret("")
        setPageId("")
      }
    }
  }, [open, source])

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("error"), description: t("nameRequired"), variant: "destructive" })
      return
    }
    const config = type === "meta"
      ? {
          verify_token: verifyToken.trim() || null,
          page_access_token: pageAccessToken.trim() || null,
          form_id: formId.trim() || null,
          app_secret: appSecret.trim() || null,
          page_id: pageId.trim() || null,
        }
      : null
    try {
      setSaving(true)
      if (source) {
        await api.leads.sources.update(source.id, { name: name.trim(), config })
      } else {
        await api.leads.sources.create({ name: name.trim(), type, config })
      }
      toast({ title: t("success"), description: t("leadSourceSavedSuccess") })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("leadSourceSaveError"),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{source ? t("editIntegration") : t("newIntegration")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source_name">
              {t("name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="source_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("integrationNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_type">{t("type")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as LeadSourceType)}
              disabled={!!source}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">Meta (Facebook / Instagram)</SelectItem>
                <SelectItem value="webhook_generic">{t("webhookGeneric")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "meta" && (
            <>
              <div className="bg-muted p-3 rounded text-xs space-y-1">
                <p className="font-medium">{t("metaSetupHelp")}</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>{t("metaSetupStep1")}</li>
                  <li>{t("metaSetupStep2")}</li>
                  <li>{t("metaSetupStep3")}</li>
                  <li>{t("metaSetupStep4")}</li>
                </ol>
                {source?.webhook_token && (
                  <p className="pt-2 border-t mt-2">
                    <span className="text-muted-foreground">URL do webhook (cole na Meta):</span>
                    <code className="block bg-background px-2 py-1 rounded mt-1 text-[11px] break-all">
                      {window.location.origin}/api/leads/webhook/{source.webhook_token}
                    </code>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify_token">
                  Verify Token <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="verify_token"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="invente uma string segura (use a mesma na Meta)"
                />
                <p className="text-xs text-muted-foreground">
                  String que você escolhe e cola IGUAL no campo "Verify Token" do webhook na Meta.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page_access_token">
                  Page Access Token <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="page_access_token"
                  rows={3}
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                  placeholder="EAAG..."
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Token de longa duração da Page (Graph API Explorer ou System User).
                  Necessário pro BRM fazer fetch dos detalhes do lead via Graph API.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app_secret">App Secret</Label>
                <Input
                  id="app_secret"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="opcional mas recomendado"
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  App Secret do seu app Meta (Configurações → Básico). Quando preenchido,
                  o BRM valida X-Hub-Signature-256 em cada webhook — evita falsificação.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="page_id">Page ID</Label>
                  <Input
                    id="page_id"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form_id">Form ID</Label>
                  <Input
                    id="form_id"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="opcional"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===========================================================================
// LeadFormDataView — exibe form_data de forma estruturada
// ===========================================================================
//
// Separa o objeto em 3 blocos:
//   1) Meta (campanha/ad/form)  — canto superior, badges compactas
//   2) Respostas do formulário  — pares chave/valor legíveis
//   3) Debug bruto (opcional)   — colapsado, só se houver campos desconhecidos
//
// Rótulos são humanizados (full_name → "Nome completo", etc). Se vier um
// campo desconhecido, mostra o nome bruto capitalizado.

interface LeadFormDataViewProps {
  formData: Record<string, any>
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nome completo",
  first_name: "Primeiro nome",
  last_name: "Sobrenome",
  name: "Nome",
  nome: "Nome",
  email: "Email",
  "e-mail": "Email",
  phone: "Telefone",
  phone_number: "Telefone",
  telefone: "Telefone",
  celular: "Celular",
  city: "Cidade",
  cidade: "Cidade",
  state: "Estado",
  estado: "Estado",
  address: "Endereço",
  endereco: "Endereço",
  company: "Empresa",
  empresa: "Empresa",
  job_title: "Cargo",
  message: "Mensagem",
  mensagem: "Mensagem",
  budget: "Orçamento",
  orcamento: "Orçamento",
}

function humanize(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function LeadFormDataView({ formData }: LeadFormDataViewProps) {
  const { t } = useTranslation()

  // Extrai o _meta (info de campanha/ad da Meta Lead Ads) — populado pelo
  // MetaLeadProvider quando o BRM faz fetch da Graph API.
  const meta = (formData._meta || {}) as Record<string, any>
  const hasMeta = Object.keys(meta).length > 0

  // Campos "conhecidos" do formulário (todos exceto _meta e keys internos)
  const formFields = Object.entries(formData).filter(
    ([k]) => k !== "_meta" && k !== "meta_raw" && k !== "_fetch_pending" && !k.startsWith("_")
  )

  const leadgenId = meta.leadgen_id || formData.leadgen_id
  const formatMetaDate = (t: any): string | null => {
    if (!t) return null
    try {
      const d = new Date(t)
      if (Number.isNaN(d.getTime())) return null
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(d)
    } catch {
      return null
    }
  }

  return (
    <div className="mt-2 pt-2 border-t space-y-2">
      {/* Bloco Meta (campanha/ad) — só aparece se veio via Meta Lead Ads */}
      {hasMeta && (
        <div className="text-xs space-y-1 bg-muted/40 p-2 rounded">
          <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
            {t("origin") || "Origem"}
          </div>
          <div className="flex flex-wrap gap-1">
            {meta.campaign_id && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {t("campaign") || "Campanha"}: {meta.campaign_id}
              </Badge>
            )}
            {meta.adset_id && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {t("adset") || "Conjunto"}: {meta.adset_id}
              </Badge>
            )}
            {meta.ad_id && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {t("ad") || "Anúncio"}: {meta.ad_id}
              </Badge>
            )}
            {meta.form_id && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {t("form") || "Form"}: {meta.form_id}
              </Badge>
            )}
            {meta.is_organic === true && (
              <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700">
                {t("organic") || "Orgânico"}
              </Badge>
            )}
            {meta.is_organic === false && (
              <Badge className="text-[10px] bg-blue-600 hover:bg-blue-700">
                {t("paid") || "Pago"}
              </Badge>
            )}
          </div>
          {meta.created_time && (
            <p className="text-muted-foreground text-[10px]">
              {t("submittedAt") || "Enviado em"}: {formatMetaDate(meta.created_time)}
            </p>
          )}
          {leadgenId && (
            <a
              href={`https://www.facebook.com/ads/manager/lead_center/leads/${leadgenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-[10px] inline-block"
            >
              {t("viewOnMeta") || "Ver no Meta Ads Manager →"}
            </a>
          )}
        </div>
      )}

      {/* Bloco Respostas do formulário */}
      {formFields.length > 0 && (
        <div className="text-xs space-y-1">
          <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
            {t("formResponses") || "Respostas do formulário"}
          </div>
          <div className="space-y-0.5">
            {formFields.map(([key, value]) => {
              const displayValue = value === null || value === undefined
                ? "—"
                : typeof value === "object"
                ? JSON.stringify(value)
                : String(value)
              return (
                <div key={key} className="grid grid-cols-[minmax(80px,auto)_1fr] gap-2 text-[11px]">
                  <span className="text-muted-foreground">{humanize(key)}:</span>
                  <span className="font-medium break-all">{displayValue}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Debug: dados brutos (colapsado) — útil quando algo desconhecido chega */}
      {(formData._fetch_pending || formData.meta_raw) && (
        <details className="text-[10px]">
          <summary className="cursor-pointer text-muted-foreground">
            {t("rawPayload") || "Payload bruto"}
          </summary>
          <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto max-h-32">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

