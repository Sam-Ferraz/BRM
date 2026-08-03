/**
 * HomePage — layout no estilo WhatsApp:
 *
 *   C (sidebar de módulos, ~64px)  |  B (lista de negócios, ~340px)  |  A (editor do deal aberto)
 *
 * Comportamento:
 *  - Coluna C: ícones verticais dos módulos. Clique navega pra página do módulo.
 *  - Coluna B: lista de Negócios do corretor, ordenados por updated_at DESC.
 *    Item selecionado abre em A.
 *  - Coluna A: DealEditor com aba padrão "Histórico de atendimento" mostrando
 *    timeline dos atendimentos. Aba secundária "Informações" tem o form.
 *
 * Mobile: pilha vertical — na primeira carga mostra só B; ao selecionar,
 * mostra A com botão de "voltar". C vira drawer no header.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Briefcase, Users, Package, HeadphonesIcon, ClipboardCheck, FileSignature, FileCheck2,
  Key, MessageCircle, Inbox, Store, BarChart3, CalendarDays, Settings, LogOut, Search,
  Menu, ArrowLeft, Home as HomeIcon, Plus, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useAccount } from "@/hooks/use-account"
import { useToast } from "@/hooks/use-toast"
import { api, type Deal, type DashboardStats } from "@/lib/api-client"
import { DealEditor } from "@/components/deal-editor"
import { DealCodeBadge } from "@/components/deal-code-badge"
import { cn } from "@/lib/utils"

/**
 * Módulos que aparecem na coluna C. Ordem escolhida por importância no dia
 * a dia do corretor. Cada item vira só um link — clique redireciona pra
 * página do módulo (que continua com layout tradicional).
 */
/**
 * Cada módulo tem um `countKey` que mapeia pro campo correspondente em
 * DashboardStats. Assim reusamos os mesmos contadores do home antigo,
 * mas agora renderizados como badge discreto no canto de cada ícone.
 * Módulos sem countKey (ex: Agenda, BI) não mostram badge.
 */
type ModuleItem = {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  countKey?: keyof DashboardStats
}

const MODULES: ModuleItem[] = [
  { path: "/deals",        label: "Negócios",     icon: Briefcase,      countKey: "totalDeals" },
  { path: "/appointments", label: "Atendimentos", icon: HeadphonesIcon, countKey: "totalAppointments" },
  { path: "/follow-ups",   label: "Follow-ups",   icon: ClipboardCheck, countKey: "totalFollowUps" },
  { path: "/agenda",       label: "Agenda",       icon: CalendarDays },
  { path: "/chat",         label: "Chat",         icon: MessageCircle,  countKey: "pendingChatAndCalls" },
  { path: "/leads",        label: "Leads",        icon: Inbox,          countKey: "newLeads" },
  { path: "/proposals",    label: "Propostas",    icon: FileSignature,  countKey: "totalProposals" },
  { path: "/contracts",    label: "Contratos",    icon: FileCheck2,     countKey: "totalContracts" },
  { path: "/sales",        label: "Vendas",       icon: Key,            countKey: "totalSales" },
  { path: "/clients",      label: "Clientes",     icon: Users,          countKey: "totalClients" },
  { path: "/products",     label: "Imóveis",      icon: Package,        countKey: "totalProducts" },
  { path: "/sales-agenda", label: "Vitrine",      icon: Store,          countKey: "totalShowcaseProducts" },
  { path: "/analytics",    label: "BI",           icon: BarChart3 },
]

const STATUS_LABEL: Record<string, string> = {
  service_cold: "Atendimento", service_mild: "Atendimento", service_warm: "Atendimento",
  visit_foreseen_cold: "Agendamento", visit_foreseen_mild: "Agendamento", visit_foreseen_warm: "Agendamento",
  visit_done_cold: "Apresentação", visit_done_mild: "Apresentação", visit_done_warm: "Apresentação",
  proposal: "Proposta", sold: "Vendido",
  discarded_no_profile: "Descartado", discarded_no_interest: "Descartado",
  discarded_competitor: "Descartado", discarded_error: "Descartado",
}
const STATUS_COLOR: Record<string, string> = {
  service_cold: "bg-blue-100 text-blue-800",
  service_mild: "bg-yellow-100 text-yellow-800",
  service_warm: "bg-orange-100 text-orange-800",
  visit_foreseen_cold: "bg-blue-100 text-blue-800",
  visit_foreseen_mild: "bg-yellow-100 text-yellow-800",
  visit_foreseen_warm: "bg-orange-100 text-orange-800",
  visit_done_cold: "bg-blue-100 text-blue-800",
  visit_done_mild: "bg-yellow-100 text-yellow-800",
  visit_done_warm: "bg-orange-100 text-orange-800",
  proposal: "bg-purple-100 text-purple-800",
  sold: "bg-green-100 text-green-800",
}

/**
 * Extrai as iniciais do nome do cliente pra usar no avatar (max 2 letras).
 * Ex: "Débora Quagliato Aires Caetano" → "DC" ; "Felipe" → "F"
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?"
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(n)) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatRelative(dateStr: string | Date | undefined): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffHours < 1) return "agora há pouco"
  if (diffHours < 24) return `${Math.floor(diffHours)}h`
  if (diffDays < 7) return `${Math.floor(diffDays)}d`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const { account } = useAccount()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [mobilePanel, setMobilePanel] = useState<"list" | "editor">("list")
  const [stats, setStats] = useState<DashboardStats | null>(null)

  // Contadores dos módulos (mesmos do home antigo) — badge discreto no ícone
  useEffect(() => {
    let cancelled = false
    api.dashboard.getStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((err) => console.warn("[HomePage] falha ao buscar stats:", err))
    return () => {
      cancelled = true
    }
  }, [])

  const loadDeals = useCallback(async () => {
    try {
      const res = await api.deals.getAll({ sortBy: "updated_at", sortOrder: "desc" })
      setDeals(res.data)
      // Auto-seleciona o primeiro deal se ainda não há um selecionado
      if (res.data.length > 0) {
        setSelectedId((prev) => prev ?? res.data[0].id)
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao carregar negócios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals
    const q = search.toLowerCase()
    return deals.filter(
      (d) =>
        d.client.toLowerCase().includes(q) ||
        (d.property_name && d.property_name.toLowerCase().includes(q)) ||
        (d.client_phone && d.client_phone.includes(q)),
    )
  }, [deals, search])

  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === selectedId) || null,
    [deals, selectedId],
  )

  const handleUpdate = async (data: Partial<Deal>) => {
    if (!selectedDeal) return
    try {
      await api.deals.update(selectedDeal.id, data)
      toast({ title: "Negócio atualizado" })
      loadDeals()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao atualizar",
        variant: "destructive",
      })
    }
  }

  const handleSelect = (id: number) => {
    setSelectedId(id)
    setMobilePanel("editor")
  }

  // Bottom nav — mouse drag horizontal (touch já funciona nativo via overflow-x-auto)
  // No mobile, o browser cuida do momentum scroll. No desktop, precisamos
  // implementar o "grab and drag" manualmente pra dar a mesma sensacao de roleta.
  const navRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ startX: number; startScrollLeft: number; moved: boolean } | null>(null)
  // Estado das setas de rolagem (opcao B pra quando o swipe/drag falha)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  // Atualiza setas quando a nav monta ou o conteudo muda (stats carrega tarde)
  useEffect(() => {
    updateArrows()
    const el = navRef.current
    if (!el) return
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    window.addEventListener("resize", updateArrows)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      ro.disconnect()
      window.removeEventListener("resize", updateArrows)
    }
  }, [updateArrows, stats])

  const scrollNav = useCallback((dir: "left" | "right") => {
    const el = navRef.current
    if (!el) return
    const amount = Math.max(200, el.clientWidth * 0.6)
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }, [])

  const onNavMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Nao interfere quando o click e em cima de um Link filho — deixa passar
    // pra navegar. Se arrastar horizontal >5px, cancelamos a navegacao no click.
    if (e.button !== 0) return
    const el = navRef.current
    if (!el) return
    dragRef.current = { startX: e.pageX, startScrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = "grabbing"
  }, [])

  const onNavMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const st = dragRef.current
    const el = navRef.current
    if (!st || !el) return
    const dx = e.pageX - st.startX
    if (Math.abs(dx) > 5) st.moved = true
    el.scrollLeft = st.startScrollLeft - dx
  }, [])

  const onNavMouseUp = useCallback((_e: React.MouseEvent<HTMLElement>) => {
    const el = navRef.current
    if (el) el.style.cursor = "grab"
    // Deixa dragRef.current NULL depois de um tick pra o handler de click do
    // Link poder checar `moved` antes de a navegacao acontecer.
    setTimeout(() => {
      dragRef.current = null
    }, 0)
  }, [])

  // Se o usuario arrastou, cancela a navegacao do click no Link filho
  const onNavLinkClickCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (dragRef.current?.moved) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex">
      {/* ============================================================ */}
      {/* Coluna B — lista de Negócios                                  */}
      {/* Sidebar vertical C foi removida — modulos vao na bottom nav   */}
      {/* pra desktop E mobile, seguindo o padrao WhatsApp mobile.       */}
      {/* ============================================================ */}
      <aside
        className={cn(
          "shrink-0 w-full md:w-[340px] flex-col border-r bg-card",
          mobilePanel === "list" ? "flex" : "hidden md:flex",
        )}
      >
        {/* Header da lista B — simples: só título + busca (atalhos moveram pro header A) */}
        <div className="shrink-0 p-3 border-b space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-base">Negócios</h2>
            <Link to="/deals?new=true" title="Novo negócio">
              <Button size="sm" variant="ghost">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, imóvel, telefone..."
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Lista scrollável — padding-bottom extra em mobile pra bottom nav não cortar último item */}
        <div className="flex-1 overflow-y-auto pb-20">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : filteredDeals.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {search ? "Nenhum negócio encontrado" : "Você ainda não tem negócios"}
            </div>
          ) : (
            filteredDeals.map((deal) => {
              const isSelected = deal.id === selectedId
              return (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => handleSelect(deal.id)}
                  className={cn(
                    "w-full text-left p-3 border-b hover:bg-accent transition-colors flex gap-3 items-start",
                    isSelected && "bg-accent",
                  )}
                >
                  {/* Avatar circular — cor da marca #0c343d, iniciais do cliente em branco */}
                  <div
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: "#0c343d" }}
                    title={deal.client}
                  >
                    {getInitials(deal.client)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{deal.client}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {deal.property_name || "—"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] text-muted-foreground">
                          {formatRelative(deal.updated_at)}
                        </div>
                        <DealCodeBadge id={deal.id} readOnly className="text-[9px] mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <span className="text-xs font-semibold">{formatCurrency(deal.gsv)}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-4 px-1 border-0",
                          STATUS_COLOR[deal.status] || "bg-slate-100 text-slate-800",
                        )}
                      >
                        {STATUS_LABEL[deal.status] || deal.status}
                      </Badge>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* Coluna A — editor do deal aberto                              */}
      {/* ============================================================ */}
      <section
        className={cn(
          "flex-1 flex-col overflow-hidden bg-muted/30 pb-20",
          mobilePanel === "editor" ? "flex" : "hidden md:flex",
        )}
      >
        {selectedDeal ? (
          <>
            {/* Header estilo WhatsApp: avatar + nome + código à esquerda,
                atalhos Home/Config/Sair à direita (igual imagem alvo) */}
            <header className="shrink-0 p-3 bg-card border-b flex items-center gap-3">
              <button
                className="md:hidden p-1 rounded hover:bg-accent"
                onClick={() => setMobilePanel("list")}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {/* Avatar do cliente aberto */}
              <div
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: "#0c343d" }}
              >
                {getInitials(selectedDeal.client)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-base truncate">{selectedDeal.client}</h1>
                  <DealCodeBadge id={selectedDeal.id} readOnly />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedDeal.property_name || "Sem imóvel vinculado"}
                  {selectedDeal.client_phone && ` · ${selectedDeal.client_phone}`}
                </p>
              </div>
              {/* Atalhos no canto direito — Home, Configurações, Sair */}
              <div className="shrink-0 flex items-center gap-1">
                <Link
                  to="/dashboard-legacy"
                  title="Home"
                  className="p-2 rounded-full hover:bg-accent text-[#0c343d]"
                >
                  <HomeIcon className="w-5 h-5" />
                </Link>
                <Link
                  to="/settings"
                  title="Configurações"
                  className="p-2 rounded-full hover:bg-accent text-[#0c343d]"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <button
                  onClick={logout}
                  title="Sair"
                  className="p-2 rounded-full hover:bg-red-50 text-[#0c343d] hover:text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Editor: Tabs Histórico (default) + Informações */}
            <div className="flex-1 min-h-0 overflow-hidden p-4">
              <div className="h-full max-w-4xl mx-auto bg-card rounded-lg border p-4 flex flex-col">
                <DealEditor
                  deal={selectedDeal}
                  onSubmit={handleUpdate}
                  defaultTab="history"
                  onAppointmentCreated={loadDeals}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header vazio — mantém os atalhos Home/Config/Sair mesmo sem deal aberto */}
            <header className="shrink-0 p-3 bg-card border-b flex items-center justify-end gap-1">
              <Link to="/dashboard-legacy" title="Home" className="p-2 rounded-full hover:bg-accent text-[#0c343d]">
                <HomeIcon className="w-5 h-5" />
              </Link>
              <Link to="/settings" title="Configurações" className="p-2 rounded-full hover:bg-accent text-[#0c343d]">
                <Settings className="w-5 h-5" />
              </Link>
              <button onClick={logout} title="Sair" className="p-2 rounded-full hover:bg-red-50 text-[#0c343d] hover:text-red-600">
                <LogOut className="w-5 h-5" />
              </button>
            </header>
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <Briefcase className="w-14 h-14 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  Selecione um negócio na lista pra ver o histórico de atendimento.
                </p>
              </div>
            </div>
          </>

        )}
      </section>

      {/* ============================================================ */}
      {/* Bottom nav — VALE PRA DESKTOP E MOBILE                        */}
      {/* Widgets no rodapé, cada um com nome abaixo. Scroll horizontal */}
      {/* garante que caiba em telas estreitas; em desktop os itens se  */}
      {/* distribuem justificados no espaço disponível.                 */}
      {/* ============================================================ */}
      {/* Wrapper fixo pra segurar a nav + as setas laterais (opcao B pro drag) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Seta esquerda */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollNav("left")}
            aria-label="Rolar para a esquerda"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full px-2 flex items-center justify-center text-[#0c343d] hover:bg-accent/60 transition-colors"
            style={{
              background: "linear-gradient(to right, hsl(var(--card)) 60%, transparent)",
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {/* Seta direita */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollNav("right")}
            aria-label="Rolar para a direita"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full px-2 flex items-center justify-center text-[#0c343d] hover:bg-accent/60 transition-colors"
            style={{
              background: "linear-gradient(to left, hsl(var(--card)) 60%, transparent)",
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      <nav
        ref={navRef}
        onMouseDown={onNavMouseDown}
        onMouseMove={onNavMouseMove}
        onMouseUp={onNavMouseUp}
        onMouseLeave={onNavMouseUp}
        onClickCapture={onNavLinkClickCapture}
        className="overflow-x-auto cursor-grab select-none"
        style={{
          // Momentum scroll no iOS/mobile (Safari respeita, resto ignora)
          WebkitOverflowScrolling: "touch",
          // Efeito "roleta": cada item encaixa no ponto ao terminar de arrastar
          scrollSnapType: "x proximity",
          // Nao propaga o scroll horizontal pra pagina (evita "bounce" da URL bar)
          overscrollBehaviorX: "contain",
          // Some com a scrollbar visual — o gesto substitui o feedback
          scrollbarWidth: "none",
        }}
      >
        <style>{`
          /* Esconde scrollbar no WebKit (Chrome/Safari) */
          nav::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="flex items-stretch gap-2 md:gap-4 px-3 py-3 min-w-max md:justify-center">
          {MODULES.map((m) => {
            const Icon = m.icon
            const count = m.countKey && stats ? Number(stats[m.countKey] || 0) : 0
            const showBadge = count > 0
            return (
              <Link
                key={m.path}
                to={m.path}
                style={{ scrollSnapAlign: "center" }}
                className="relative shrink-0 flex flex-col items-center gap-1 min-w-[76px] md:min-w-[86px] px-2 py-1 rounded-lg text-[#0c343d] hover:bg-accent transition-colors"
              >
                <div className="relative">
                  <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.75} />
                  {/* Badge nordeste com contador */}
                  {showBadge && (
                    <span
                      className="absolute -top-2 -right-3 min-w-[20px] h-[20px] px-1 rounded-full text-white text-[11px] font-semibold flex items-center justify-center leading-none ring-2 ring-card"
                      style={{ backgroundColor: "#0c343d" }}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </div>
                <span className="text-[11px] md:text-[12px] font-medium leading-tight whitespace-nowrap">{m.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      </div>
    </div>
  )
}
