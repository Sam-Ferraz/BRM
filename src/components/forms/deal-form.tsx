"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ClientSearch } from "@/components/client-search"
import { ProductSearch } from "@/components/product-search"
import { DealCodeBadge } from "@/components/deal-code-badge"
import { DealLabelsInline } from "@/components/deal-labels-inline"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DealAppointmentsTimeline } from "@/components/deal-appointments-timeline"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { useToast } from "@/hooks/use-toast"
import type { Deal, Client, Appointment } from "@/lib/api-client"
import { api } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { getCurrentDateForForm } from "@/lib/datetime"
import { useTimezone } from "@/hooks/use-timezone"

interface DealFormProps {
  deal?: Deal
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Deal, "id"> | Partial<Deal>) => void
  loading?: boolean
}

export function DealForm({ deal, open, onOpenChange, onSubmit, loading }: DealFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const currentTimezone = useTimezone()
  const { toast } = useToast()
  // Sub-modal pra "Novo atendimento" a partir da Timeline
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false)
  const [creatingAppointment, setCreatingAppointment] = useState(false)
  // Incrementa pra forçar re-fetch da Timeline após criar novo atendimento
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
      let formattedDate = currentDate
      if (deal.origin_date) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(deal.origin_date)) {
          formattedDate = deal.origin_date
        } else {
          const parsedDate = new Date(deal.origin_date)
          if (!isNaN(parsedDate.getTime())) {
            formattedDate = parsedDate.toISOString().split('T')[0]
          }
        }
      }

      setFormData({
        origin_date: formattedDate,
        description: deal.description || "",
        client: deal.client || "",
        client_phone: deal.client_phone || "",
        client_origin: (deal.client_origin || 'online_lead') as ClientOriginValue,
        purpose: (deal.purpose || 'investment') as PurposeValue,
        deal_type: (deal.deal_type || 'purchase') as DealTypeValue,
        gsv: deal.gsv || "",
        property_name: deal.property_name || "",
        status: (deal.status || 'service_warm') as DealStatusValue,
      })
    } else {
      setFormData({
        origin_date: currentDate,
        description: "",
        client: "",
        client_phone: "",
        client_origin: 'online_lead',
        purpose: 'investment',
        deal_type: 'purchase',
        gsv: "",
        property_name: "",
        status: 'service_warm',
      })
    }
  }, [deal, open, currentDate])

  useEffect(() => {
    if (!formData.client || formData.client_phone) {
      return
    }

    let isMounted = true

    // Fallback: quando o cliente foi digitado direto (sem passar pelo
    // onClientSelect do ClientSearch), busca via API pra preencher
    // telefone E origem automaticamente — ambos read-only no form.
    const fetchClientData = async () => {
      try {
        const response = await api.clients.getAll({ search: formData.client })
        const matchedClient = response.data.find((client: Client) => client.name === formData.client)
        if (isMounted && matchedClient) {
          setFormData(prev => ({
            ...prev,
            client_phone: matchedClient.phone || '',
            client_origin: (matchedClient.origin || prev.client_origin) as ClientOriginValue,
          }))
        }
      } catch (error) {
        console.error('Error fetching client data:', error)
      }
    }

    fetchClientData()

    return () => {
      isMounted = false
    }
  }, [formData.client, formData.client_phone])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const newErrors: Record<string, string> = {}

    if (!formData.origin_date) {
      newErrors.origin_date = t('originDate') || 'Origin date is required'
    }

    if (!formData.client.trim()) {
      newErrors.client = t('clientRequired') || 'Client is required'
    }

    const gsvValue = typeof formData.gsv === 'string' ? formData.gsv : String(formData.gsv || '')
    if (!gsvValue.trim()) {
      newErrors.gsv = `${t('gsv') || 'GSV'} is required`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
  }

  const clientOriginOptions: { value: ClientOriginValue; label: string }[] = [
    { value: 'online_lead', label: t('onlineLead') },
    { value: 'own_portfolio', label: t('clientBase') || t('ownPortfolio') },
    { value: 'duty_shift', label: t('dutyShift') },
    { value: 'referral', label: t('referral') },
    { value: 'street_client', label: t('streetClient') },
  ]

  const purposeOptions: { value: PurposeValue; label: string }[] = [
    { value: 'investment', label: t('purposeInvestment') },
    { value: 'recreation', label: t('purposeRecreation') },
    { value: 'both', label: t('purposeBoth') },
  ]

  const dealTypeOptions: { value: DealTypeValue; label: string }[] = [
    { value: 'purchase', label: t('dealTypePurchase') },
    { value: 'purchase_exchange', label: t('dealTypePurchaseExchange') },
    { value: 'exchange', label: t('dealTypeExchange') },
  ]

  const statusOptions: { value: DealStatusValue; label: string }[] = [
    { value: 'service_cold', label: t('dealStatusServiceCold') },
    { value: 'service_mild', label: t('dealStatusServiceMild') },
    { value: 'service_warm', label: t('dealStatusServiceWarm') },
    { value: 'visit_foreseen_cold', label: t('dealStatusVisitForeseenCold') },
    { value: 'visit_foreseen_mild', label: t('dealStatusVisitForeseenMild') },
    { value: 'visit_foreseen_warm', label: t('dealStatusVisitForeseenWarm') },
    { value: 'visit_done_cold', label: t('dealStatusVisitDoneCold') },
    { value: 'visit_done_mild', label: t('dealStatusVisitDoneMild') },
    { value: 'visit_done_warm', label: t('dealStatusVisitDoneWarm') },
    { value: 'proposal', label: t('dealStatusProposal') },
    { value: 'sold', label: t('dealStatusSold') },
    { value: 'discarded_no_profile', label: t('dealStatusDiscardedNoProfile') },
    { value: 'discarded_no_interest', label: t('dealStatusDiscardedNoInterest') },
    { value: 'discarded_competitor', label: t('dealStatusDiscardedCompetitor') },
    { value: 'discarded_error', label: t('dealStatusDiscardedError') },
  ]

  // Handler pra criar atendimento a partir da Timeline. Chama a API, dá toast
  // e força re-fetch da lista da Timeline. O AppointmentForm cuida do upload
  // do áudio e da validação.
  const handleCreateAppointmentFromTimeline = async (data: Omit<Appointment, "id"> | Partial<Appointment>) => {
    setCreatingAppointment(true)
    try {
      await api.appointments.create(data as Omit<Appointment, "id">)
      toast({ title: "Atendimento registrado" })
      setNewAppointmentOpen(false)
      setTimelineReloadKey((k) => k + 1)
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

  // Conteúdo do form em si — extraído em variável pra reutilizar dentro e fora
  // das Tabs (edição vs criação de Deal).
  //
  // Layout: form é flex column full-height; a área do meio rola sozinha, o
  // DialogFooter fica fixo no rodapé. Segue a convenção OBRIGATÓRIA do
  // CLAUDE.md pra Dialog/Form scrollable.
  const formContent = (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="origin_date">
              {t('originDate')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="origin_date"
              type="date"
              value={formData.origin_date}
              onChange={(e) => setFormData({ ...formData, origin_date: e.target.value })}
              required
            />
            {errors.origin_date && (
              <p className="text-sm text-red-500">{errors.origin_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">{t('client')}</Label>
            <ClientSearch
              value={formData.client}
              onSelect={(clientName) => {
                setFormData({ ...formData, client: clientName, client_phone: '' })
              }}
              onClientSelect={(client: Client) => {
                // Preenche telefone E origem automaticamente do cliente
                // selecionado — ambos ficam read-only no form do negócio.
                setFormData(prev => ({
                  ...prev,
                  client_phone: client.phone || '',
                  client_origin: (client.origin || prev.client_origin) as ClientOriginValue,
                }))
              }}
              placeholder={t('selectClient')}
              className={`w-full ${errors.client ? 'ring-2 ring-red-500' : ''}`}
            />
            {errors.client && (
              <p className="text-sm text-red-500">{errors.client}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_phone">{t('clientPhone')}</Label>
            <Input
              id="client_phone"
              value={formData.client_phone}
              placeholder={t('noPhoneAvailable') || ''}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_origin">{t('clientOrigin')}</Label>
            <Input
              id="client_origin"
              value={clientOriginOptions.find(o => o.value === formData.client_origin)?.label || ''}
              placeholder={t('selectClient')}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">{t('purpose')}</Label>
            <Select
              value={formData.purpose}
              onValueChange={(value) => setFormData({ ...formData, purpose: value as PurposeValue })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {purposeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal_type">{t('dealType')}</Label>
            <Select
              value={formData.deal_type}
              onValueChange={(value) => setFormData({ ...formData, deal_type: value as DealTypeValue })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dealTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gsv">
              {t('gsv')} <span className="text-red-500">*</span>
            </Label>
            <CurrencyInput
              id="gsv"
              value={formData.gsv}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  gsv: typeof value === 'string' ? value : (value !== undefined && value !== null ? String(value) : '')
                })
              }
              required
            />
            {errors.gsv && (
              <p className="text-sm text-red-500">{errors.gsv}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_name">{t('property')}</Label>
            <ProductSearch
              value={formData.property_name}
              onSelect={(propertyName) => setFormData({ ...formData, property_name: propertyName })}
              placeholder={t('selectProduct')}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as DealStatusValue })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

      </div>
      <DialogFooter className="pt-2 shrink-0">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  )

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={deal ? "sm:max-w-[820px] max-h-[90vh] flex flex-col" : "sm:max-w-[620px] max-h-[90vh] flex flex-col"}
        {...(isMobile && {
          onOpenAutoFocus: (e) => e.preventDefault()
        })}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{deal ? t('editDeal') : t('newDeal')}</span>
            {deal && <DealCodeBadge id={deal.id} />}
            {deal && <DealLabelsInline dealId={deal.id} compact />}
          </DialogTitle>
        </DialogHeader>
        {deal ? (
          // Modo edição: Tabs (Informações + Histórico de atendimento)
          <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Histórico de atendimento</TabsTrigger>
            </TabsList>
            <TabsContent
              value="info"
              className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden flex flex-col"
            >
              {formContent}
            </TabsContent>
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
          </Tabs>
        ) : (
          // Modo criação: sem tabs — só o form (o próprio form já cuida do scroll interno)
          <div className="flex-1 min-h-0 flex flex-col">
            {formContent}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Sub-modal de novo atendimento — abre com deal_id pré-preenchido */}
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
