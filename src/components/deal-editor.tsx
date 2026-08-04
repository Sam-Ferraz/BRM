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
  const currentTimezone = useTimezone()
  const { toast } = useToast()
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false)
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

        <div className="space-y-2">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              Novo atendimento
            </Button>
            {/* Chat WhatsApp — abre wa.me em nova aba */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              title={deal.client_phone ? `WhatsApp ${deal.client_phone}` : "Sem telefone cadastrado"}
              disabled={!deal.client_phone}
              onClick={() => {
                if (!deal.client_phone) return
                const digits = deal.client_phone.replace(/\D/g, "")
                if (digits.length < 10) return
                window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer")
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
    </>
  )
}
