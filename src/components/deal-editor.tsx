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
import { Plus, MessageCircle, Phone, CalendarDays, Key, FileSignature } from "lucide-react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ClientSearch } from "@/components/client-search"
import { ProductSearch } from "@/components/product-search"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DealAppointmentsTimeline } from "@/components/deal-appointments-timeline"
import { DealFollowUpsList } from "@/components/deal-followups-list"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { FollowUpForm } from "@/components/forms/followup-form"
import { ProposalForm } from "@/components/forms/proposal-form"
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
  // Pre-tipo do atendimento ao abrir o form via botoes '+ Agendamento' ou '+ Visita'
  // da barra de acoes. undefined = usa o default do form (chat).
  const [appointmentDefaultType, setAppointmentDefaultType] = useState<
    "chat" | "call" | "in_person" | "visit" | "schedule" | undefined
  >(undefined)
  const [newFollowUpOpen, setNewFollowUpOpen] = useState(false)
  const [newProposalOpen, setNewProposalOpen] = useState(false)
  const [creatingFollowUp, setCreatingFollowUp] = useState(false)
  const [creatingAppointment, setCreatingAppointment] = useState(false)
  const [creatingProposal, setCreatingProposal] = useState(false)
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
    pipeline_id: string
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
    status: "service",
    pipeline_id: "",
  })
  const [pipelines, setPipelines] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    api.pipelines
      .list()
      .then((r) => setPipelines((r.data || []).map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setPipelines([]))
  }, [])
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
        pipeline_id: deal.pipeline_id != null ? String(deal.pipeline_id) : "",
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
        status: "service",
        pipeline_id: "",
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
      pipeline_id: formData.pipeline_id ? parseInt(formData.pipeline_id, 10) : undefined,
    } as any)
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

  // Cria proposta vinculada ao negocio aberto (defaultDealId pre-seleciona no form).
  const handleCreateProposalFromDeal = async (data: any) => {
    setCreatingProposal(true)
    try {
      await api.proposals.create(data)
      toast({ title: "Proposta registrada" })
      setNewProposalOpen(false)
      setTimelineReloadKey((k) => k + 1)
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao criar proposta",
        variant: "destructive",
      })
    } finally {
      setCreatingProposal(false)
    }
  }

  // Helpers para os botoes '+ Agendamento' e '+ Visita' da barra: setam o
  // tipo pre-selecionado antes de abrir o form.
  const openAppointmentWithType = (type: "schedule" | "visit") => {
    setAppointmentDefaultType(type)
    setNewAppointmentOpen(true)
  }

  const statusOptions: { value: DealStatusValue; label: string }[] = [
    { value: "service", label: t("dealStatusService") },
    { value: "visit_foreseen", label: t("dealStatusVisitForeseen") },
    { value: "visit_done", label: t("dealStatusVisitDone") },
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
              <SelectItem value="online_lead">{t("onlineLead")}</SelectItem>
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

        {/* Funil (pipeline) — permite transferir o deal entre funis. Se so
            ha 1 funil, esconde pra nao confundir. */}
        {pipelines.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="pipeline">Funil</Label>
            <Select
              value={formData.pipeline_id}
              onValueChange={(v) => setFormData({ ...formData, pipeline_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funil" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mudar o funil transfere este negócio pra outra lista. O histórico de atendimentos preserva.
            </p>
          </div>
        )}

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
          <Label htmlFor="description">{t("dealTitle")}</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={50}
            placeholder="Ex: Apartamento 2 suítes frente mar"
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
          {/* Barra acima das tabs:
                Esquerda: icones de contato rapido (chat, ligacao)
                Direita:  botoes de registro — Agendamento/Visita/Proposta (secundarios)
                          + Follow-up (primario, cor escura) */}
          <div className="flex items-center gap-2 shrink-0 mb-2 flex-wrap">
            {/* Chat — abre a conversa do cliente dentro do modulo /chat. Icone
                MessageCircle alinhado ao icon usado na bottom-nav do modulo. */}
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
              <MessageCircle className="w-4 h-4" />
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
            {/* Spacer empurra o grupo de registros para a direita */}
            <div className="flex-1" />
            {/* + Follow-up — cor primaria (escura), primeiro da sequencia de registros */}
            <Button
              type="button"
              size="sm"
              onClick={() => setNewFollowUpOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Follow-up
            </Button>
            {/* + Agendamento — cria atendimento ja com tipo 'schedule'.
                Layout: [simbolo tematico] [+] [palavra] — o '+' fica entre o
                widget e o texto, imediatamente a esquerda da palavra. */}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openAppointmentWithType("schedule")}
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              <Plus className="w-4 h-4 mr-1.5" />
              Agendamento
            </Button>
            {/* + Visita — cria atendimento ja com tipo 'visit' */}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openAppointmentWithType("visit")}
            >
              <Key className="w-4 h-4 mr-1" />
              <Plus className="w-4 h-4 mr-1.5" />
              Visita
            </Button>
            {/* + Proposta — abre ProposalForm com o Negocio ja selecionado */}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setNewProposalOpen(true)}
            >
              <FileSignature className="w-4 h-4 mr-1" />
              <Plus className="w-4 h-4 mr-1.5" />
              Proposta
            </Button>
          </div>
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="history" className="flex-1">Histórico de atendimento</TabsTrigger>
            <TabsTrigger value="followup" className="flex-1">Follow-up</TabsTrigger>
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
            value="followup"
            className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden overflow-hidden flex flex-col"
          >
            <DealFollowUpsList
              dealId={deal.id}
              onAddFollowUp={() => setNewFollowUpOpen(true)}
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
          onOpenChange={(open) => {
            setNewAppointmentOpen(open)
            // Limpa o tipo pre-selecionado quando o form fecha, pra proxima
            // abertura (ex: pelo botao da timeline) comecar do default.
            if (!open) setAppointmentDefaultType(undefined)
          }}
          onSubmit={handleCreateAppointmentFromTimeline}
          loading={creatingAppointment}
          defaultDealId={deal.id}
          defaultType={appointmentDefaultType}
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

      {deal && (
        <ProposalForm
          open={newProposalOpen}
          onOpenChange={setNewProposalOpen}
          onSubmit={handleCreateProposalFromDeal}
          loading={creatingProposal}
          defaultDealId={deal.id}
        />
      )}
    </>
  )
}
