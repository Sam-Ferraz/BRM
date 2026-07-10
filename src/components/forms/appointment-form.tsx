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
import type { Appointment } from "@/lib/api-client"
import { api } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { getCurrentDateTimeForForm, convertFromAppToLocal, convertFromLocalToApp } from "@/lib/datetime"
import { ProductSearch } from "@/components/product-search"
import { DealCodeSearch } from "@/components/deal-code-search"
import { AnsweredStatusToggle } from "@/components/ui/answered-status-toggle"
import { Checkbox } from "@/components/ui/checkbox"
import { useTimezone } from "@/hooks/use-timezone"
import { useToast } from "@/hooks/use-toast"
import { AudioRecorder } from "@/components/audio-recorder"
import { extractDealCodeFromText, formatDealCode } from "@/lib/deal-code"
import { format } from "date-fns"

interface AppointmentFormProps {
  appointment?: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Appointment, "id"> | Partial<Appointment>, followUpData?: { next_action: string; next_action_date: string }) => void
  loading?: boolean
}

export function AppointmentForm({ appointment, open, onOpenChange, onSubmit, loading }: AppointmentFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const currentTimezone = useTimezone()
  const { date: currentDate, time: currentTime } = useMemo(
    () => getCurrentDateTimeForForm(currentTimezone),
    [currentTimezone]
  )
  const currentDateTime = useMemo(() => `${currentDate}T${currentTime}`, [currentDate, currentTime])
  const [formData, setFormData] = useState({
    scheduled_datetime: currentDateTime,
    description: "",
    client: "",
    type: "chat" as "chat" | "call" | "in_person" | "visit",
    answered: undefined as boolean | undefined,
    property_name: "",
    deal_id: null as number | null,
    audio_url: null as string | null,
  })
  const [selectedClientPhone, setSelectedClientPhone] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const { toast } = useToast()

  // Follow-up fields (optional)
  const [includeFollowUp, setIncludeFollowUp] = useState(false)
  const [followUpData, setFollowUpData] = useState({
    next_action: "",
    next_action_date: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    // Clear errors when form opens/closes or changes mode
    setErrors({})

    if (appointment) {
      // Convert datetime from database to form format (YYYY-MM-DDTHH:mm)
      let formattedDateTime = currentDateTime

      if (appointment.scheduled_datetime) {
        // Convert from stored timezone to user's configured timezone for form input
        formattedDateTime = convertFromAppToLocal(appointment.scheduled_datetime, currentTimezone)
      }

      setFormData({
        scheduled_datetime: formattedDateTime,
        description: appointment.description || "",
        client: appointment.client || "",
        type: (appointment.type || "chat") as "chat" | "call" | "in_person" | "visit",
        answered: appointment.answered,
        property_name: appointment.property_name || "",
        deal_id: appointment.deal_id ?? null,
        audio_url: appointment.audio_url ?? null,
      })
      setSelectedClientPhone(null)
      setIncludeFollowUp(false)
    } else {
      setFormData({
        scheduled_datetime: currentDateTime,
        description: "",
        client: "",
        type: "chat" as "chat" | "call" | "in_person" | "visit",
        answered: undefined,
        property_name: "",
        deal_id: null,
        audio_url: null,
      })
      setSelectedClientPhone(null)
      setIncludeFollowUp(false)
      setFollowUpData({
        next_action: "",
        next_action_date: format(new Date(), 'yyyy-MM-dd'),
      })
    }
  }, [appointment, currentDateTime, open, currentTimezone])
  
  // Update datetime format when timezone changes
  useEffect(() => {
    if (appointment?.scheduled_datetime) {
      const formattedDateTime = convertFromAppToLocal(appointment.scheduled_datetime, currentTimezone)
      setFormData(prev => ({ ...prev, scheduled_datetime: formattedDateTime }))
    }
  }, [currentTimezone, appointment?.scheduled_datetime])

  useEffect(() => {
    if (formData.type !== 'visit' && formData.property_name) {
      setFormData(prev => ({ ...prev, property_name: "" }))
    }
  }, [formData.type])

  useEffect(() => {
    if (!formData.client) {
      setSelectedClientPhone(null)
      return
    }

    if (selectedClientPhone !== null) {
      return
    }

    let isMounted = true

    const fetchClientPhone = async () => {
      try {
        const response = await api.clients.getAll({ search: formData.client })
        const matchedClient = response.data.find((client) => client.name === formData.client)
        if (isMounted) {
          setSelectedClientPhone(matchedClient?.phone ?? '')
        }
      } catch (error) {
        console.error('Error fetching client phone:', error)
        if (isMounted) {
          setSelectedClientPhone('')
        }
      }
    }

    fetchClientPhone()

    return () => {
      isMounted = false
    }
  }, [formData.client, selectedClientPhone])

  // Rotina de gravação: quando o corretor termina de gravar, sobe o áudio
  // pro backend em paralelo e usa a transcrição pra preencher a descrição.
  // Se o corretor mencionou o código do negócio no áudio (ex: "atendimento
  // do N zero zero um"), auto-vinculamos o deal_id.
  const handleRecordingFinish = async ({
    audioBlob,
    transcript,
  }: {
    audioBlob: Blob
    transcript: string
  }) => {
    // 1. Preenche a descrição com o transcript (concatena se já havia texto)
    if (transcript) {
      setFormData((prev) => ({
        ...prev,
        description: prev.description
          ? `${prev.description.trim()}\n\n${transcript}`
          : transcript,
      }))
    }

    // 2. Auto-detecção do código do Negócio no transcript (só se ainda não
    //    tem vínculo manual, pra não sobrescrever intenção explícita)
    if (transcript && formData.deal_id == null) {
      const detected = extractDealCodeFromText(transcript)
      if (detected != null) {
        setFormData((prev) => ({ ...prev, deal_id: detected }))
        toast({
          title: `Negócio ${formatDealCode(detected)} detectado`,
          description: "Vinculei automaticamente pelo código falado no áudio.",
        })
      }
    }

    // 3. Sobe o áudio pro backend
    setUploadingAudio(true)
    try {
      const res = await api.appointments.uploadAudio(audioBlob)
      setFormData((prev) => ({ ...prev, audio_url: res.data.url }))
    } catch (err) {
      console.warn("[AppointmentForm] falha no upload do áudio:", err)
      toast({
        title: "Áudio não foi salvo",
        description: "A transcrição continua válida — o atendimento vai ser criado sem o arquivo de áudio.",
        variant: "destructive",
      })
    } finally {
      setUploadingAudio(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setErrors({})

    // Validate required fields
    const newErrors: { [key: string]: string } = {}

    if (formData.deal_id == null) {
      newErrors.deal_id = 'Selecione o negócio vinculado'
    }

    if (!formData.client.trim()) {
      newErrors.client = t('clientRequired') || 'Client is required'
    }

    if (formData.answered === undefined) {
      newErrors.answered = t('answeredStatusRequired') || 'Response status is required'
    }

    if (formData.type === 'visit' && !formData.property_name.trim()) {
      newErrors.property_name = t('productRequired') || 'Property is required'
    }

    // Validate follow-up fields if enabled
    if (includeFollowUp) {
      if (!followUpData.next_action.trim()) {
        newErrors.next_action = t('nextActionRequired') || 'Next action is required'
      }
      if (!followUpData.next_action_date) {
        newErrors.next_action_date = t('nextActionDateRequired') || 'Next action date is required'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Convert datetime from user's configured timezone to app timezone before sending to server
    const dataToSubmit = {
      ...formData,
      property_name: formData.type === 'visit' ? formData.property_name : null,
      scheduled_datetime: convertFromLocalToApp(formData.scheduled_datetime, currentTimezone),
      deal_id: formData.deal_id ?? null,
      audio_url: formData.audio_url ?? null,
    }

    // Pass follow-up data if enabled
    onSubmit(dataToSubmit, includeFollowUp ? followUpData : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] max-h-[90vh] flex flex-col"
        {...(isMobile && {
          onOpenAutoFocus: (e) => e.preventDefault()
        })}
      >
        <DialogHeader>
          <DialogTitle>{appointment ? t('editAppointment') : t('newAppointment')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-1">
        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          {/* Rotina de gravação — só na criação. Na edição o áudio já existe
              (mostrado como player se houver) e não faz sentido gravar de novo. */}
          {!appointment && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <AudioRecorder onFinish={handleRecordingFinish} disabled={loading} />
              {uploadingAudio && (
                <p className="mt-2 text-xs text-muted-foreground">Enviando áudio...</p>
              )}
              {formData.audio_url && !uploadingAudio && (
                <p className="mt-2 text-xs text-green-700">Áudio anexado ao atendimento.</p>
              )}
            </div>
          )}
          {appointment?.audio_url && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Áudio do atendimento
              </p>
              <audio controls src={appointment.audio_url} className="w-full" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="scheduled_datetime">
              {t('dateTime')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="scheduled_datetime"
              type="datetime-local"
              value={formData.scheduled_datetime}
              onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
              required
              {...(!isMobile && { tabIndex: 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              {...(!isMobile && { tabIndex: 2 })}
            />
          </div>
          {/* Negócio — OBRIGATÓRIO. Selecionar o Negócio auto-preenche o
              Cliente e o Telefone (derivados, readonly), e o Imóvel quando o
              atendimento é visita. */}
          <div className="space-y-2">
            <Label htmlFor="deal_code">
              Negócio <span className="text-red-500">*</span>
            </Label>
            <DealCodeSearch
              value={formData.deal_id}
              onChange={(dealId) => setFormData((prev) => ({ ...prev, deal_id: dealId }))}
              onDealSelect={(deal) => {
                if (!deal) {
                  // Deal desvinculado → limpa derivados
                  setFormData((prev) => ({ ...prev, client: "", property_name: "" }))
                  setSelectedClientPhone(null)
                  return
                }
                setFormData((prev) => ({
                  ...prev,
                  client: deal.client,
                  // Se o Negócio tem imóvel amarrado e o atendimento é visita, aproveita.
                  property_name: prev.type === "visit" && deal.property_name
                    ? deal.property_name
                    : prev.property_name,
                }))
                setSelectedClientPhone(deal.client_phone ?? "")
              }}
              invalid={!!errors.deal_id}
            />
            {errors.deal_id ? (
              <p className="text-sm text-red-500">{errors.deal_id}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cole o código (ex: N0001) ou busque pelo nome do cliente — o Cliente e o Telefone vêm do Negócio.
              </p>
            )}
          </div>
          {/* Cliente + Telefone só aparecem quando ha Negocio vinculado. Ambos
              readonly (bg-muted) — valores derivados do Deal, sem edição manual. */}
          {formData.deal_id != null && (
            <>
              <div className="space-y-2">
                <Label htmlFor="client">{t('client')}</Label>
                <Input
                  id="client"
                  value={formData.client || "—"}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_phone">{t('phone')}</Label>
                <Input
                  id="client_phone"
                  value={selectedClientPhone || t('noPhoneAvailable')}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="type">{t('type')}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData(prev => ({
                  ...prev,
                  type: value as any,
                  property_name: value === 'visit' ? prev.property_name : ""
                }))
              }
            >
              <SelectTrigger {...(!isMobile && { tabIndex: 3 })}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">{t('chatType')}</SelectItem>
                <SelectItem value="call">{t('callType')}</SelectItem>
                <SelectItem value="in_person">{t('inPersonType')}</SelectItem>
              <SelectItem value="visit">{t('visitType')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.type === 'visit' && (
            <div className="space-y-2">
              <Label htmlFor="property_name">
                {t('product')} <span className="text-red-500">*</span>
              </Label>
              <ProductSearch
                value={formData.property_name}
                onSelect={(productName) => setFormData({ ...formData, property_name: productName })}
                placeholder={t('selectProduct')}
                className={`w-full ${errors.property_name ? 'ring-2 ring-red-500' : ''}`}
              />
              {errors.property_name && (
                <p className="text-sm text-red-500">{errors.property_name}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="answered">
              {t('answeredStatus')} <span className="text-red-500">*</span>
            </Label>
            <AnsweredStatusToggle
              value={formData.answered}
              onChange={(answered) => setFormData({ ...formData, answered })}
              className="w-full"
            />
            {errors.answered && (
              <p className="text-sm text-red-500">{errors.answered}</p>
            )}
          </div>

          {/* Follow-up section - only for new appointments */}
          {!appointment && (
            <>
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_followup"
                    checked={includeFollowUp}
                    onCheckedChange={(checked) => setIncludeFollowUp(checked === true)}
                  />
                  <Label
                    htmlFor="include_followup"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t('includeFollowUp')}
                  </Label>
                </div>
              </div>

              {includeFollowUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="next_action">
                      {t('nextAction')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="next_action"
                      value={followUpData.next_action}
                      onChange={(e) => setFollowUpData({ ...followUpData, next_action: e.target.value })}
                      rows={3}
                      placeholder={t('nextAction')}
                      className={errors.next_action ? 'ring-2 ring-red-500' : ''}
                    />
                    {errors.next_action && (
                      <p className="text-sm text-red-500">{errors.next_action}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="next_action_date">
                      {t('nextActionDate')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="next_action_date"
                      type="date"
                      value={followUpData.next_action_date}
                      onChange={(e) => setFollowUpData({ ...followUpData, next_action_date: e.target.value })}
                      className={errors.next_action_date ? 'ring-2 ring-red-500' : ''}
                    />
                    {errors.next_action_date && (
                      <p className="text-sm text-red-500">{errors.next_action_date}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} {...(!isMobile && { tabIndex: 5 })}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} {...(!isMobile && { tabIndex: 6 })}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
