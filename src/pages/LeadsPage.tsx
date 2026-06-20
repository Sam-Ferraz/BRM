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

  const [isManualOpen, setIsManualOpen] = useState(false)
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
            <Button size="sm" onClick={() => setIsManualOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("newManualLead")}
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
                          <details className="text-xs mt-1">
                            <summary className="cursor-pointer text-muted-foreground">
                              {t("formDataPreview")}
                            </summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto max-h-32">
                              {JSON.stringify(lead.form_data, null, 2)}
                            </pre>
                          </details>
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

      <ManualLeadDialog
        open={isManualOpen}
        onOpenChange={setIsManualOpen}
        onCreated={() => {
          fetchLeads()
          fetchCounts()
        }}
      />

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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (source) {
        setName(source.name)
        setType(source.type)
        setVerifyToken(source.config?.verify_token ?? "")
        setPageAccessToken(source.config?.page_access_token ?? "")
        setFormId(source.config?.form_id ?? "")
      } else {
        setName("")
        setType("meta")
        setVerifyToken("")
        setPageAccessToken("")
        setFormId("")
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{source ? t("editIntegration") : t("newIntegration")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify_token">{t("verifyToken")}</Label>
                <Input
                  id="verify_token"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder={t("optional")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="page_access_token">{t("pageAccessToken")}</Label>
                <Input
                  id="page_access_token"
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                  placeholder={t("optional")}
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form_id">{t("formId")}</Label>
                <Input
                  id="form_id"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder={t("optional")}
                />
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
// Diálogo para cadastro manual de Lead
// ===========================================================================

interface ManualLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function ManualLeadDialog({ open, onOpenChange, onCreated }: ManualLeadDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setPhone("")
      setNotes("")
    }
  }, [open])

  const handleSave = async () => {
    if (!name.trim() && !email.trim() && !phone.trim()) {
      toast({ title: t("error"), description: t("leadMinFieldRequired"), variant: "destructive" })
      return
    }
    try {
      setSaving(true)
      await api.leads.createManual({
        name: name.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      })
      toast({ title: t("success"), description: t("leadCreatedSuccess") })
      onCreated()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("leadCreateError"),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("newManualLead")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead_name">{t("name")}</Label>
            <Input id="lead_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead_email">{t("email")}</Label>
            <Input id="lead_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead_phone">{t("phone")}</Label>
            <Input id="lead_phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead_notes">{t("notes")}</Label>
            <Textarea id="lead_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
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
