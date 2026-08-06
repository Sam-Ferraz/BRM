import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  MessageCircle,
  Plus,
  Phone,
  CheckCheck,
  Check,
  AlertCircle,
  Send,
  LinkIcon,
  Unlink,
  UserCircle2,
} from "lucide-react"
import {
  api,
  type ConversationWithDetails,
  type Message,
  type WhatsAppSession,
  type WhatsAppProviderState,
} from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

/**
 * ChatPage — interface estilo WhatsApp Web:
 *   • Coluna esquerda: lista de conversas (preview + unread badge)
 *   • Coluna direita: histórico de mensagens + input para responder
 *
 * Visibilidade: admin vê todas as conversas; corretor só as próprias
 * (filtragem feita no backend pelo ChatService).
 */
export default function ChatPage() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()

  const [session, setSession] = useState<WhatsAppSession | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConversation, setCurrentConversation] = useState<ConversationWithDetails | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Carrega sessão WhatsApp do usuário logado
  const fetchSession = useCallback(async () => {
    try {
      const result = await api.whatsapp.getSession()
      setSession(result.data)
    } catch (error) {
      console.error("Error fetching whatsapp session:", error)
    } finally {
      setSessionLoaded(true)
    }
  }, [])

  // Carrega lista de conversas
  const fetchConversations = useCallback(async () => {
    try {
      setConversationsLoading(true)
      const result = await api.chat.listConversations()
      setConversations(result.data)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("chatLoadError"),
        variant: "destructive",
      })
    } finally {
      setConversationsLoading(false)
    }
  }, [toast, t])

  // Carrega histórico de uma conversa
  const fetchConversation = useCallback(
    async (id: number) => {
      try {
        const result = await api.chat.getConversation(id)
        setCurrentConversation(result.conversation)
        setMessages(result.messages)
      } catch (error) {
        toast({
          title: t("error"),
          description: t("chatLoadError"),
          variant: "destructive",
        })
      }
    },
    [toast, t]
  )

  useEffect(() => {
    fetchSession()
    fetchConversations()
  }, [fetchSession, fetchConversations])

  useEffect(() => {
    if (selectedId !== null) {
      fetchConversation(selectedId)
    } else {
      setCurrentConversation(null)
      setMessages([])
    }
  }, [selectedId, fetchConversation])

  // Auto-scroll ao chegar mensagem nova
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!draft.trim() || !selectedId) return
    try {
      setSending(true)
      const result = await api.chat.sendMessage(selectedId, draft.trim())
      setMessages((prev) => [...prev, result.data])
      setDraft("")
      // Atualiza preview na lista de conversas
      fetchConversations()
    } catch (error) {
      toast({
        title: t("error"),
        description: t("chatSendError"),
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const formatTime = (iso?: string | null): string => {
    if (!iso) return ""
    try {
      const date = new Date(iso)
      const locale = i18n.language === "en-US" ? "en-US" : i18n.language === "es-ES" ? "es-ES" : "pt-BR"
      return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch {
      return ""
    }
  }

  const formatDateLine = (iso?: string | null): string => {
    if (!iso) return ""
    try {
      const date = new Date(iso)
      const locale = i18n.language === "en-US" ? "en-US" : i18n.language === "es-ES" ? "es-ES" : "pt-BR"
      return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    } catch {
      return ""
    }
  }

  const getInitials = (name?: string | null, fallback?: string): string => {
    const source = (name || fallback || "?").trim()
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Ícone que reflete o status da mensagem outbound
  const renderStatusIcon = (status: Message["status"]) => {
    if (status === "failed") return <AlertCircle className="w-3 h-3 text-red-500" />
    if (status === "read") return <CheckCheck className="w-3 h-3 text-sky-500" />
    if (status === "delivered") return <CheckCheck className="w-3 h-3 text-muted-foreground" />
    return <Check className="w-3 h-3 text-muted-foreground" />
  }

  const isConnected = session?.status === "connected"
  const isAdmin = user?.role === "admin"

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
            <div className="flex items-center gap-2">
              {/* Estado da conexão */}
              {sessionLoaded && (
                <Badge
                  className={
                    isConnected
                      ? "bg-emerald-500 hover:bg-emerald-500 text-white border-0"
                      : "bg-slate-400 hover:bg-slate-400 text-white border-0"
                  }
                >
                  {isConnected ? (
                    <>
                      <LinkIcon className="w-3 h-3 mr-1" /> {session?.phone_number}
                    </>
                  ) : (
                    <>
                      <Unlink className="w-3 h-3 mr-1" /> {t("whatsappNotConnected")}
                    </>
                  )}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsConnectOpen(true)}>
                {isConnected ? t("manageWhatsapp") : t("connectWhatsapp")}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsNewConversationOpen(true)}
                disabled={!isConnected}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("newConversation")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5" />
          <h2 className="text-xl font-semibold">{t("chat")}</h2>
          {isAdmin && (
            <Badge variant="outline" className="ml-2">
              {t("chatAdminView")}
            </Badge>
          )}
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[600px]">
            {/* === Coluna esquerda: lista de conversas === */}
            <div className="border-r flex flex-col">
              <div className="p-3 border-b">
                <p className="text-sm font-medium text-foreground">{t("conversations")}</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversationsLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {t("loading")}…
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {t("noConversationsYet")}
                  </div>
                ) : (
                  conversations.map((c) => {
                    const isSelected = c.id === selectedId
                    const displayName = c.client_name || c.contact_name || c.contact_phone
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left p-3 flex items-start gap-3 border-b hover:bg-muted/60 transition-colors ${
                          isSelected ? "bg-muted" : ""
                        }`}
                      >
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                            {getInitials(displayName, c.contact_phone)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{displayName}</p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatTime(c.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">
                              {c.last_message_direction === "outbound" && (
                                <span className="text-muted-foreground">{t("you")}: </span>
                              )}
                              {c.last_message_preview || (
                                <span className="italic">{t("noMessagesYet")}</span>
                              )}
                            </p>
                            {c.unread_count > 0 && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-0 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px]">
                                {c.unread_count}
                              </Badge>
                            )}
                          </div>
                          {isAdmin && c.owner_user_name && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <UserCircle2 className="w-3 h-3" />
                              {c.owner_user_name}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* === Coluna direita: janela de chat ===
                min-h-0 e overflow-hidden garantem que o flex-1 do historico
                de mensagens (abaixo) fique confinado — sem isso o scroll do
                historico "empurra" o header pra fora e ele fica cortado
                pelo header pai do BRM. */}
            <div className="flex flex-col bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/20 min-h-0 overflow-hidden">
              {currentConversation ? (
                <>
                  {/* Header da conversa — shrink-0 pra nao ser espremido pelo historico */}
                  <div className="shrink-0 p-3 border-b bg-card/80 backdrop-blur-sm flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                        {getInitials(
                          currentConversation.client_name || currentConversation.contact_name,
                          currentConversation.contact_phone
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {currentConversation.client_name ||
                          currentConversation.contact_name ||
                          currentConversation.contact_phone}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {currentConversation.contact_phone}
                        {currentConversation.client_id && (
                          <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1.5">
                            {t("linkedToClient")}
                          </Badge>
                        )}
                      </p>
                    </div>
                    {isAdmin && currentConversation.owner_user_name && (
                      <Badge variant="outline" className="text-[10px]">
                        <UserCircle2 className="w-3 h-3 mr-1" />
                        {currentConversation.owner_user_name}
                      </Badge>
                    )}
                  </div>

                  {/* Histórico de mensagens */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        {t("noMessagesYet")}
                      </div>
                    ) : (
                      messages.map((m, idx) => {
                        const isOutbound = m.direction === "outbound"
                        const prev = messages[idx - 1]
                        const sameDay =
                          prev &&
                          new Date(prev.sent_at || "").toDateString() ===
                            new Date(m.sent_at || "").toDateString()
                        return (
                          <div key={m.id}>
                            {!sameDay && (
                              <div className="flex justify-center my-2">
                                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                  {formatDateLine(m.sent_at)}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                                  isOutbound
                                    ? "bg-emerald-500 text-white"
                                    : "bg-card border border-border text-foreground"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                                <div
                                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                    isOutbound ? "text-emerald-100" : "text-muted-foreground"
                                  }`}
                                >
                                  <span>{formatTime(m.sent_at)}</span>
                                  {isOutbound && renderStatusIcon(m.status)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input para responder */}
                  <div className="p-3 border-t bg-card flex items-end gap-2">
                    <Textarea
                      rows={1}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder={t("typeAMessage")}
                      className="flex-1 resize-none min-h-[40px] max-h-[120px]"
                      disabled={!isConnected || sending}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!draft.trim() || !isConnected || sending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                /* Sem conversa selecionada */
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <MessageCircle className="w-12 h-12 opacity-30" />
                  <p className="text-sm">{t("selectConversation")}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <WhatsAppConnectDialog
        open={isConnectOpen}
        onOpenChange={setIsConnectOpen}
        session={session}
        onSaved={() => {
          fetchSession()
          setIsConnectOpen(false)
        }}
        onDisconnected={() => {
          fetchSession()
          setIsConnectOpen(false)
        }}
      />

      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onCreated={(conversationId) => {
          setIsNewConversationOpen(false)
          setSelectedId(conversationId)
          fetchConversations()
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Diálogo de conexão / desconexão do WhatsApp
// ---------------------------------------------------------------------------

interface WhatsAppConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: WhatsAppSession | null
  onSaved: () => void
  onDisconnected: () => void
}

function WhatsAppConnectDialog({
  open,
  onOpenChange,
  session,
  onSaved,
  onDisconnected,
}: WhatsAppConnectDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  // Estado vindo do backend (provider Baileys). O usuário aciona "start", o
  // backend abre o socket e nós fazemos polling até receber QR ou conectar.
  const [providerState, setProviderState] = useState<WhatsAppProviderState>({ status: 'idle' })
  const [starting, setStarting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Inicia o pareamento ao abrir o dialog (apenas se ainda não há sessão).
  useEffect(() => {
    if (!open) {
      stopPolling()
      setProviderState({ status: 'idle' })
      return
    }
    if (session?.status === 'connected') {
      setProviderState({ status: 'connected', phoneNumber: session.phone_number, displayName: session.display_name })
      return
    }
    // Sem sessão conectada → dispara start e começa polling
    startPairing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.status])

  // Encerra polling ao desmontar
  useEffect(() => () => stopPolling(), [])

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function startPairing() {
    try {
      setStarting(true)
      const result = await api.whatsapp.start()
      setProviderState(result.data)
      // Polling a cada 2s; para quando conectar
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const next = await api.whatsapp.getState()
          setProviderState(next.data)
          if (next.data.status === 'connected') {
            stopPolling()
            toast({ title: t('success'), description: t('whatsappConnectedSuccess') })
            onSaved()
          }
        } catch (error) {
          console.error('Polling whatsapp state failed:', error)
        }
      }, 2000)
    } catch (error) {
      toast({
        title: t('error'),
        description: t('whatsappConnectError'),
        variant: 'destructive',
      })
    } finally {
      setStarting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm(t('confirmDisconnectWhatsapp'))) return
    try {
      setDisconnecting(true)
      await api.whatsapp.disconnect()
      stopPolling()
      toast({ title: t('success'), description: t('whatsappDisconnectedSuccess') })
      onDisconnected()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('whatsappDisconnectError'),
        variant: 'destructive',
      })
    } finally {
      setDisconnecting(false)
    }
  }

  const isConnected = providerState.status === 'connected' || session?.status === 'connected'
  const phoneShown = providerState.phoneNumber || session?.phone_number || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isConnected ? t('manageWhatsapp') : t('connectWhatsapp')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-1">
          {/* Já conectado — independente do provider, mostra resumo + opção desconectar */}
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">{t('whatsappConnectedSuccess')}</p>
                {phoneShown && <p className="text-xs text-muted-foreground">{phoneShown}</p>}
                {session?.provider === 'cloud_api' && (
                  <Badge variant="secondary">Cloud API (Meta)</Badge>
                )}
              </div>
            </div>
          ) : (
            // Não conectado — duas abas: Cloud API (recomendado) e Baileys (legado)
            <Tabs defaultValue="cloud_api" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cloud_api">Cloud API (Meta)</TabsTrigger>
                <TabsTrigger value="baileys">WhatsApp Web</TabsTrigger>
              </TabsList>

              {/* Cloud API */}
              <TabsContent value="cloud_api" className="space-y-3 pt-4">
                <CloudApiForm
                  onSaved={() => {
                    onSaved()
                  }}
                />
              </TabsContent>

              {/* Baileys (legado) */}
              <TabsContent value="baileys" className="space-y-3 pt-4">
                <p className="text-xs text-muted-foreground">{t('whatsappConnectHelp')}</p>
                {providerState.status === 'pending_qr' && providerState.qrCode ? (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <img
                      src={providerState.qrCode}
                      alt="QR Code WhatsApp"
                      className="w-60 h-60 border rounded"
                    />
                    <p className="text-xs text-muted-foreground text-center max-w-[300px]">
                      {t('scanQrInstructions')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">
                      {starting || providerState.status === 'idle'
                        ? t('startingWhatsapp')
                        : t('connectingWhatsapp')}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isConnected && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-red-600 hover:text-red-700"
            >
              {t('disconnect')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Sub-form da Cloud API — coleta as 6 credenciais BYOK e chama /connect.
// ---------------------------------------------------------------------------

function CloudApiForm({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    phone_number: '',
    display_name: '',
    phone_number_id: '',
    access_token: '',
    app_secret: '',
    verify_token: '',
    business_account_id: '',
  })

  // URL do webhook que o usuário deve colar no Meta Business Manager
  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`

  async function handleConnect() {
    if (!form.phone_number || !form.phone_number_id || !form.access_token || !form.app_secret || !form.verify_token) {
      toast({ title: t('error'), description: 'Preencha os campos obrigatórios (*)', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      await api.whatsapp.cloudApiConnect({
        phone_number: form.phone_number.trim(),
        display_name: form.display_name.trim() || null,
        phone_number_id: form.phone_number_id.trim(),
        access_token: form.access_token.trim(),
        app_secret: form.app_secret.trim(),
        verify_token: form.verify_token.trim(),
        business_account_id: form.business_account_id.trim() || null,
      })
      toast({ title: t('success'), description: 'WhatsApp Cloud API conectado' })
      onSaved()
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : 'Erro ao conectar',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
        <p className="font-medium">Antes de conectar, configure o webhook na Meta:</p>
        <p>
          <span className="text-muted-foreground">URL do webhook:</span>{' '}
          <code className="bg-background px-1 py-0.5 rounded text-[11px]">{webhookUrl}</code>
        </p>
        <p>
          <span className="text-muted-foreground">Verify Token:</span> qualquer string que você escolher (cole abaixo
          também).
        </p>
        <p className="text-muted-foreground">
          Inscreva-se nos eventos: <code>messages</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Telefone (E.164) *</Label>
          <Input
            placeholder="+554799887766"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Nome de exibição</Label>
          <Input
            placeholder="Imobiliária X"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Phone Number ID *</Label>
        <Input
          placeholder="123456789012345"
          value={form.phone_number_id}
          onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
        />
      </div>

      <div>
        <Label className="text-xs">Access Token (permanente) *</Label>
        <Textarea
          rows={3}
          placeholder="EAAG..."
          value={form.access_token}
          onChange={(e) => setForm({ ...form, access_token: e.target.value })}
          className="font-mono text-xs"
        />
      </div>

      <div>
        <Label className="text-xs">App Secret *</Label>
        <Input
          type="password"
          placeholder="********"
          value={form.app_secret}
          onChange={(e) => setForm({ ...form, app_secret: e.target.value })}
          className="font-mono text-xs"
        />
      </div>

      <div>
        <Label className="text-xs">Verify Token (mesma string usada no webhook) *</Label>
        <Input
          placeholder="meu_token_secreto_2026"
          value={form.verify_token}
          onChange={(e) => setForm({ ...form, verify_token: e.target.value })}
        />
      </div>

      <div>
        <Label className="text-xs">Business Account ID (opcional)</Label>
        <Input
          placeholder="123456789012345"
          value={form.business_account_id}
          onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
        />
      </div>

      <Button onClick={handleConnect} disabled={saving} className="w-full">
        {saving ? 'Conectando...' : 'Conectar Cloud API'}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Diálogo para iniciar uma conversa nova
// ---------------------------------------------------------------------------

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (conversationId: number) => void
}

function NewConversationDialog({ open, onOpenChange, onCreated }: NewConversationDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [contactPhone, setContactPhone] = useState("")
  const [contactName, setContactName] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setContactPhone("")
      setContactName("")
      setMessage("")
    }
  }, [open])

  const handleStart = async () => {
    if (!contactPhone.trim()) {
      toast({ title: t("error"), description: t("phoneRequired"), variant: "destructive" })
      return
    }
    if (!message.trim()) {
      toast({ title: t("error"), description: t("messageRequired"), variant: "destructive" })
      return
    }
    try {
      setSaving(true)
      const result = await api.chat.startConversation({
        contact_phone: contactPhone.trim(),
        contact_name: contactName.trim() || null,
        message: message.trim(),
      })
      toast({ title: t("success"), description: t("chatStartedSuccess") })
      onCreated(result.conversation.id)
    } catch (error) {
      toast({
        title: t("error"),
        description: t("chatStartError"),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("newConversation")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_phone">
              {t("contactPhone")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contact_phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+55 48 9 9999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_name">{t("contactName")}</Label>
            <Input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t("optional")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">
              {t("firstMessage")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("typeAMessage")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleStart} disabled={saving}>
            {saving ? t("saving") : t("start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
