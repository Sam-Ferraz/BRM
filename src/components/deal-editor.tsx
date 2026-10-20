/**
 * DealEditor — conteúdo de edição de Negócio (tabs Informações + Histórico
 * de atendimento) sem wrapper de Dialog.
 *
 * Usado em dois lugares:
 *   1. Dentro do <DealForm> como conteúdo do modal (fluxo antigo em /negocios)
 *   2. Inline na seção A da HomePage (layout WhatsApp)
 *
 * A ideia é que TODO o comportamento de edição, timeline, sub-modal de
 * atendimento e submit do form fica ISOLADO aqui. O caller só decide onde
 * renderizar (modal ou inline).
 *
 * Estratégia dual-mode:
 *   - Se onSubmit for passado → modo edit form completo (fields + timeline)
 *   - defaultTab controla qual aba aparece primeiro (default: history)
 */
import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, MessageCircle, Phone } from "lucide-react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ClientSearch } from "@/components/client-search"
import { ProductSearch } from "@/components/product-search"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DealAppointmentsTimeline } from "@/components/deal-appointments-timeline"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { FollowUpForm } from "@/components/forms/followup-form"
import { useToast } from "@/hooks/use-toast"
import type { Deal, Client, Appointment } from "@/lib/api-client"
import { api } from "@/lib/api-client"
import { getCurrentDateForForm } from "@/lib/datetime"
import { useTimezone } from "@/hooks/use-timezone"

export interface DealEditorProps {
  deal?: Deal
  onSubmit: (data: Omit<Deal, "id"> | Partial<Deal>) => void
  loading?: boolean
  /** Qual aba abre primeiro. Default 'history' pra ficar tipo WhatsApp. */
  defaultTab?: "info" | "history"
  /** Callback opcional quando um atendimento é criado (pra pai atualizar contadores). */
  onAppointmentCreated?: () => void
  /** Se true, esconde o footer com botões Salvar/Cancelar (pra caller custom). */
  hideFooter?: boolean
  /** Callback quando o usuário clica em cancelar (só quando hideFooter=false). */
  onCancel?: () => void
}

export function DealEditor({
  deal,
  onSubmit,
  loading,
  defaultTab = "history",
  onAppointmentCreated,
  hideFooter,
  onCancel,
}: DealEditorProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentTimezone = useTimezone()
  const { toast } = useToast()
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false)
  const [newFollowUpOpen, setNewFollowUpOpen] = useState(false)
  const [creatingFollowUp, setCreatingFollowUp] = useState(false)
  const [creatingAppointment, setCreatingAppointment] = useState(false)
  const [timelineReloadKey, setTimelineReloadKey] = useState(0)
  const currentDate = useMemo(() => getCurrentDateForForm(currentTimezone), [currentTimezone])

  type ClientOriginValue = Exclude<Deal['client_origin'], null | undefined>
  type PurposeValue = Exclude<Deal['purpose'], null | undefined>
  type DealTypeValue = Exclude<Deal['deal_type'], null | undefined>
  type DealStatusValue = Deal['status']

  type DealFormState = {
    origin_date: string
    description: string
    client: string
    client_phone: string
    client_origin: ClientOriginValue
    purpose: PurposeValue
    deal_type: DealTypeValue
    gsv: string
    property_name: string
    status: DealStatusValue
  }

  const [formData, setFormData] = useState<DealFormState>({
    origin_date: currentDate,
    description: "",
    client: "",
    client_phone: "",
    client_origin: "online_lead",
    purpose: "investment",
    deal_type: "purchase",
    gsv: "",
    property_name: "",
    status: "service_warm",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setErrors({})
    if (deal) {
      setFormData({
        origin_date: deal.origin_date?.split("T")[0] || currentDate,
        description: deal.description || "",
        client: deal.client || "",
        client_phone: deal.client_phone || "",
        client_origin: (deal.client_origin as ClientOriginValue) || "online_lead",
        purpose: (deal.purpose as PurposeValue) || "investment",
        deal_type: (deal.deal_type as DealTypeValue) || "purchase",
        gsv: String(deal.gsv || ""),
        property_name: deal.property_name || "",
        status: deal.status,
      })
    } else {
      setFormData({
        origin_date: currentDate,
        description: "",
        client: "",
        client_phone: "",
        client_origin: "online_lead",
        purpose: "investment",
        deal_type: "purchase",
        gsv: "",
        property_name: "",
        status: "service_warm",
      })
    }
  }, [deal, currentDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const newErrors: Record<string, string> = {}
    if (!formData.origin_date) newErrors.origin_date = t("originDateRequired") || "Data é obrigatória"
    if (!formData.client.trim()) newErrors.client = t("clientRequired") || "Cliente é obrigatório"
    if (!formData.gsv || parseFloat(formData.gsv) <= 0) newErrors.gsv = t("gsvRequired") || "VGV é obrigatório"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({
      client: formData.client.trim(),
      origin_date: formData.origin_date,
      description: formData.description.trim() || undefined,
      client_phone: formData.client_phone.trim() || undefined,
      client_origin: formData.client_origin,
      purpose: formData.purpose,
      deal_type: formData.deal_type,
      gsv: formData.gsv,
      property_name: formData.property_name.trim() || undefined,
      status: formData.status,
    })
  }

  const handleCreateAppointmentFromTimeline = async (data: Omit<Appointment, "id"> | Partial<Appointment>) => {
    setCreatingAppointment(true)
    try {
      await api.appointments.create(data as Omit<Appointment, "id">)
      toast({ title: "Atendimento registrado" })
      setNewAppointmentOpen(false)
      setTimelineReloadKey((k) => k + 1)
      onAppointmentCreated?.()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao criar atendimento",
        variant: "destructive",
      })
    } finally {
      setCreatingAppointment(false)
    }
  }

  // Cria follow-up avulso dentro do contexto do negocio aberto. Nao vincula
  // a atendimento especifico (appointment_id=null) — o FollowUpForm continua
  // suportando esse caso (usa client_name como ancora).
  const handleCreateFollowUpFromDeal = async (data: any) => {
    setCreatingFollowUp(true)
    try {
      await api.followUps.create({
        appointment_id: data.appointment_id ?? null,
        client_name: data.client_name,
        next_action: data.next_action,
        next_action_date: data.next_action_date,
        completed: !!data.completed,
      })
      toast({ title: "Follow-up registrado" })
      setNewFollowUpOpen(false)
      setTimelineReloadKey((k) => k + 1)
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao criar follow-up",
        variant: "destructive",
      })
    } finally {
      setCreatingFollowUp(false)
    }
  }

  const statusOptions: { value: DealStatusValue; label: string }[] = [
    { value: "service_cold", label: t("dealStatusServiceCold") },
    { value: "service_mild", label: t("dealStatusServiceMild") },
    { value: "service_warm", label: t("dealStatusServiceWarm") },
    { value: "visit_foreseen_cold", label: t("dealStatusVisitForeseenCold") },
    { value: "visit_foreseen_mild", label: t("dealStatusVisitForeseenMild") },
    { value: "visit_foreseen_warm", label: t("dealStatusVisitForeseenWarm") },
    { value: "visit_done_cold", label: t("dealStatusVisitDoneCold") },
    { value: "visit_done_mild", label: t("dealStatusVisitDoneMild") },
    { value: "visit_done_warm", label: t("dealStatusVisitDoneWarm") },
    { value: "proposal", label: t("dealStatusProposal") },
    { value: "sold", label: t("dealStatusSold") },
    { value: "discarded_no_profile", label: t("dealStatusDiscardedNoProfile") },
    { value: "discarded_no_interest", label: t("dealStatusDiscardedNoInterest") },
    { value: "discarded_competitor", label: t("dealStatusDiscardedCompetitor") },
    { value: "discarded_error", label: t("dealStatusDiscardedError") },
  ]

  const formContent = (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-1 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="origin_date">{t("originDate")}</Label>
          <Input
            id="origin_date"
            type="date"
            value={formData.origin_date}
            onChange={(e) => setFormData({ ...formData, origin_date: e.target.value })}
          />
          {errors.origin_date && <p className="text-sm text-destructive">{errors.origin_date}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="client">{t("client")}</Label>
          <ClientSearch
            value={formData.client}
            onSelect={(name) => setFormData({ ...formData, client: name })}
            onClientSelect={(c: Client) => {
              setFormData((prev) => ({
                ...prev,
                client: c.name,
                client_phone: c.phone || prev.client_phone,
              }))
            }}
          />
          {errors.client && <p className="text-sm text-destructive">{errors.client}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_phone">{t("clientPhone")}</Label>
          <Input
            id="client_phone"
            value={formData.client_phone}
            onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_origin">{t("clientOrigin")}</Label>
          <Select
            value={formData.client_origin}
            onValueChange={(v) => setFormData({ ...formData, client_origin: v as ClientOriginValue })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online_lead">{t("clientOriginOnlineLead")}</SelectItem>
              <SelectItem value="own_portfolio">{t("clientOriginOwnPortfolio")}</SelectItem>
              <SelectItem value="duty_shift">{t("clientOriginDutyShift")}</SelectItem>
              <SelectItem value="referral">{t("clientOriginReferral")}</SelectItem>
              <SelectItem value="street_client">{t("clientOriginStreetClient")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">{t("purpose")}</Label>
          <Select
            value={formData.purpose}
            onValueChange={(v) => setFormData({ ...formData, purpose: v as PurposeValue })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="investment">{t("purposeInvestment")}</SelectItem>
              <SelectItem value="recreation">{t("purposeRecreation")}</SelectItem>
              <SelectItem value="both">{t("purposeBoth")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deal_type">{t("dealType")}</Label>
          <Select
            value={formData.deal_type}
            onValueChange={(v) => setFormData({ ...formData, deal_type: v as DealTypeValue })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchase">{t("dealTypePurchase")}</SelectItem>
              <SelectItem value="purchase_exchange">{t("dealTypePurchaseExchange")}</SelectItem>
              <SelectItem value="exchange">{t("dealTypeExchange")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gsv">{t("gsv")}</Label>
          <CurrencyInput value={formData.gsv} onChange={(v) => setFormData({ ...formData, gsv: v })} />
          {errors.gsv && <p className="text-sm text-destructive">{errors.gsv}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="property_name">{t("property")}</Label>
          <ProductSearch
            value={formData.property_name}
            onSelect={(name) => setFormData({ ...formData, property_name: name })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("status")}</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as DealStatusValue })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Se o negocio vem de Lead online, mostra o snapshot bruto do lead
            (readonly) ACIMA do campo Descricao. lead_data e persistido pelo
            webhook/importacao e nao pode ser editado pelo corretor. */}
        {deal?.client_origin === "online_lead" && deal?.lead_data && (
          <div className="space-y-2">
            <Label htmlFor="lead_data">Lead</Label>
            <Textarea
              id="lead_data"
              rows={5}
              value={deal.lead_data}
              readOnly
              className="bg-muted resize-none font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Dados originais recebidos pelo webhook do Meta (nome, email, telefone e respostas do formulário).
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Título ou observações do negócio"
          />
        </div>
      </div>

      {!hideFooter && (
        <div className="flex justify-end gap-2 pt-3 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? t("saving") : t("save")}
          </Button>
        </div>
      )}
    </form>
  )

  return (
    <>
      {deal ? (
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
          {/* Barra acima das tabs: Novo atendimento + Chat WA + Ligacao */}
          <div className="flex items-center gap-2 shrink-0 mb-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setNewAppointmentOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Registrar atendimento
            </Button>
            {/* Novo follow-up — cria follow-up avulso vinculado ao cliente do deal */}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setNewFollowUpOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo follow-up
            </Button>
            {/* Chat WhatsApp — abre a conversa do cliente dentro do modulo /chat
                (antes abria wa.me externo; agora mantem o atendimento no BRM) */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              title={deal.client_phone ? `Abrir chat com ${deal.client_phone}` : "Sem telefone cadastrado"}
              disabled={!deal.client_phone}
              onClick={() => {
                if (!deal.client_phone) return
                const params = new URLSearchParams({
                  phone: deal.client_phone,
                  name: deal.client || "",
                })
                navigate(`/chat?${params.toString()}`)
              }}
            >
              {/* SVG oficial do WhatsApp em monocromatico — currentColor segue o text do Button */}
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </Button>
            {/* Ligacao — abre discador do dispositivo (tel:) */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              title={deal.client_phone ? `Ligar para ${deal.client_phone}` : "Sem telefone cadastrado"}
              disabled={!deal.client_phone}
              onClick={() => {
                if (!deal.client_phone) return
                const digits = deal.client_phone.replace(/\D/g, "")
                if (digits.length < 10) return
                window.location.href = `tel:+${digits}`
              }}
            >
              <Phone className="w-4 h-4" />
            </Button>
          </div>
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="history" className="flex-1">Histórico de atendimento</TabsTrigger>
            <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
          </TabsList>
          <TabsContent
            value="history"
            className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden overflow-hidden flex flex-col"
          >
            <DealAppointmentsTimeline
              dealId={deal.id}
              clientName={deal.client}
              onAddAppointment={() => setNewAppointmentOpen(true)}
              reloadKey={timelineReloadKey}
            />
          </TabsContent>
          <TabsContent
            value="info"
            className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden flex flex-col"
          >
            {formContent}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">{formContent}</div>
      )}

      {deal && (
        <AppointmentForm
          open={newAppointmentOpen}
          onOpenChange={setNewAppointmentOpen}
          onSubmit={handleCreateAppointmentFromTimeline}
          loading={creatingAppointment}
          defaultDealId={deal.id}
        />
      )}

      {deal && (
        <FollowUpForm
          open={newFollowUpOpen}
          onOpenChange={setNewFollowUpOpen}
          onSubmit={handleCreateFollowUpFromDeal}
          loading={creatingFollowUp}
          /* Passa um appointment sintetico so pra pre-preencher e travar o
             cliente (o form usa Boolean(appointment) pra lockar o campo). */
          appointment={{ client: deal.client } as any}
        />
      )}
    </>
  )
}
