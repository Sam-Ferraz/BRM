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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {leads.map((lead) => {
                    const displayName = lead.name || lead.email || lead.phone || `Lead #${lead.id}`
                    const initials = getInitials(displayName)
                    const isTest = isTestLead(lead)
                    return (
                    <Card key={lead.id} className="flex flex-col overflow-hidden">
                      <CardHeader className="pb-3 bg-muted/30 border-b">
                        <div className="flex items-start gap-3">
                          {/* Avatar com iniciais */}
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base leading-tight truncate">
                                {displayName}
                              </CardTitle>
                              {isTest && (
                                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 bg-amber-50">
                                  Teste
                                </Badge>
                              )}
                            </div>
                            {lead.source_name && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {lead.source_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-3 text-sm pt-4">
                        {/* Contato: bloco com ícones alinhados */}
                        <div className="space-y-1.5">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <a href={`mailto:${lead.email}`} className="truncate hover:underline">{lead.email}</a>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 shrink-0" /> {formatDateTime(lead.received_at)}
                          </div>
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
                    )
                  })}
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
  const [appId, setAppId] = useState("")
  const [saving, setSaving] = useState(false)
  const [tokenMeta, setTokenMeta] = useState<{ upgraded?: boolean; page_name?: string; upgraded_at?: string } | null>(null)

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
        setAppId(source.config?.app_id ?? "")
        setTokenMeta(source.config?._token_meta ?? null)
      } else {
        setName("")
        setType("meta")
        setVerifyToken("")
        setPageAccessToken("")
        setFormId("")
        setAppSecret("")
        setPageId("")
        setAppId("")
        setTokenMeta(null)
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
          app_id: appId.trim() || null,
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
      // Extrai mensagem específica do backend quando disponível (ex.: erro de upgrade de token)
      const msg =
        error instanceof Error
          ? error.message
          : (typeof error === "string" ? error : t("leadSourceSaveError"))
      toast({
        title: t("error"),
        description: msg,
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
                  Access Token <span className="text-red-500">*</span>
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
                  Cole aqui o <strong>User Access Token</strong> gerado no Graph API Explorer.
                  O BRM converte automaticamente pra Page Token permanente (que nunca expira).
                  Se colar um Page Token temporário, o BRM avisa e pede pra colar o User Token.
                </p>
                {tokenMeta?.upgraded && (
                  <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-2 py-1.5">
                    ✓ Token da Page <strong>{tokenMeta.page_name}</strong> permanente
                    (não expira). Atualizado em{" "}
                    {tokenMeta.upgraded_at ? new Date(tokenMeta.upgraded_at).toLocaleString("pt-BR") : "—"}.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="app_id">
                    App ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="app_id"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1023122900334406"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page_id">
                    Page ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="page_id"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="121870564181434"
                  />
                </div>
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

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">Recepção de leads</p>
                <p>
                  Esta integração recebe leads de <strong>TODOS os formulários</strong> ativos
                  da Página <code className="bg-white px-1 rounded">{pageId || "(configure Page ID)"}</code>.
                  Se o cliente criar novos formulários no Ads Manager, os leads deles caem aqui automaticamente
                  — sem precisar mexer no BRM.
                </p>
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

/**
 * Pega as 2 primeiras letras significativas do nome pra avatar.
 * "João da Silva" → "JS"; "lenon@lenon.com.br" → "LE"; "Lead #42" → "L4"
 */
function getInitials(str: string): string {
  const clean = str.trim()
  if (!clean) return "?"
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

/**
 * Detecta se o lead veio de dummy data do Lead Ads Testing Tool do Meta.
 * Testes vêm com valores tipo "<test lead: dummy data for full_name>".
 */
function isTestLead(lead: { name?: string | null; email?: string | null; form_data?: any }): boolean {
  if (typeof lead.name === "string" && lead.name.startsWith("<test lead:")) return true
  if (typeof lead.email === "string" && lead.email.includes("@meta.com")) return true
  if (lead.form_data && typeof lead.form_data === "object") {
    for (const v of Object.values(lead.form_data)) {
      if (typeof v === "string" && v.startsWith("<test lead:")) return true
    }
  }
  return false
}

/**
 * Se o valor é um dummy do teste do Meta ("<test lead: dummy data for X>"),
 * devolve "—" pra não poluir a UI. Caso contrário mantém o valor original.
 */
function cleanTestPlaceholder(v: string): string {
  if (v.startsWith("<test lead:") && v.endsWith(">")) return "—"
  return v
}

/**
 * Transforma valores enum-like ("whatsapp_comprar_na_planta") em texto com
 * espaços ("whatsapp comprar na planta") pra quebrar bonito na linha e ficar
 * legível. Não mexe em emails, telefones nem texto normal.
 * Detecta enum quando o valor não tem espaço nem @ nem . nem + e tem underscore.
 */
function humanizeValue(v: string): string {
  if (!v) return v
  // Preserva emails, telefones, URLs, texto normal
  if (/[\s@+]/.test(v) || v.includes("://")) return v
  // Se contém underscore e é claramente um enum (só letras/dígitos/underscore),
  // substitui underscores por espaços pra permitir quebra natural
  if (/_/.test(v) && /^[\w\d_-]+$/.test(v)) {
    return v.replace(/_/g, " ")
  }
  return v
}

function LeadFormDataView({ formData }: LeadFormDataViewProps) {
  const { t } = useTranslation()

  // Extrai o _meta (info de campanha/ad da Meta Lead Ads) — populado pelo
  // MetaLeadProvider quando o BRM faz fetch da Graph API.
  const meta = (formData._meta || {}) as Record<string, any>
  const hasMeta = Object.keys(meta).length > 0

  // Campos "conhecidos" do formulário (todos exceto _meta e keys internos)
  const formFields = Object.entries(formData)
    .filter(
      ([k]) => k !== "_meta" && k !== "meta_raw" && k !== "_fetch_pending" && !k.startsWith("_")
    )
    // Não repete email/telefone/nome no bloco de "Respostas" — eles já estão
    // no header do card (contato).
    .filter(([k]) => !["email", "e-mail", "phone", "phone_number", "telefone", "celular", "full_name", "name", "nome"].includes(k))

  const leadgenId = meta.leadgen_id || formData.leadgen_id

  return (
    <div className="space-y-3">
      {/* Bloco Origem — Meta Lead Ads (chip único de status + link) */}
      {hasMeta && (
        <div className="flex items-center justify-between gap-2 py-2 border-t border-dashed">
          <div className="flex items-center gap-2">
            {meta.is_organic === true ? (
              <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700 border-0">
                Orgânico
              </Badge>
            ) : meta.is_organic === false ? (
              <Badge className="text-[10px] bg-blue-600 hover:bg-blue-700 border-0">
                Anúncio pago
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Meta Lead Ads
              </Badge>
            )}
            {meta.form_id && (
              <span className="text-[10px] text-muted-foreground font-mono">
                Form #{String(meta.form_id).slice(-6)}
              </span>
            )}
          </div>
          {leadgenId && (
            <a
              href={`https://www.facebook.com/ads/manager/lead_center/leads/${leadgenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-[10px] flex items-center gap-0.5 whitespace-nowrap"
              title="Abrir no Meta Ads Manager"
            >
              Abrir no Meta ↗
            </a>
          )}
        </div>
      )}

      {/* Bloco Respostas do formulário — lista vertical (label pequeno em cima, valor abaixo) */}
      {formFields.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Respostas do formulário
          </div>
          <dl className="space-y-2">
            {formFields.map(([key, value]) => {
              const raw = value === null || value === undefined
                ? "—"
                : typeof value === "object"
                ? JSON.stringify(value)
                : String(value)
              const displayValue = humanizeValue(cleanTestPlaceholder(raw))
              return (
                <div key={key}>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {humanize(key)}
                  </dt>
                  <dd
                    className="text-sm text-foreground whitespace-pre-wrap"
                    style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {displayValue}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}

      {/* Debug: dados brutos (colapsado) — útil quando algo desconhecido chega */}
      {(formData._fetch_pending || formData.meta_raw) && (
        <details className="text-[10px] pt-2 border-t">
          <summary className="cursor-pointer text-muted-foreground select-none">
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

