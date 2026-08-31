import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Briefcase, Users, Package, HeadphonesIcon, ClipboardCheck, FileSignature, FileCheck2,
  Key, MessageCircle, Inbox, Store, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  Home as HomeIcon, Eye, Settings, LogOut, Building,
} from "lucide-react"
import { api, type DashboardStats } from "@/lib/api-client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/hooks/use-auth"

/**
 * BottomNav — barra fixa no rodape com widgets AGRUPADOS.
 *
 * 6 widgets principais:
 *   1. Inicio (link direto)
 *   2. Negocios (grupo → Negocios, Atendimentos, Follow-ups, Propostas, Contratos, Vendas)
 *   3. Clientes (grupo → Clientes, Leads)
 *   4. Vitrine (grupo → Vitrine, Imoveis)
 *   5. BI (grupo → BI, Agenda)
 *   6. Chat (link direto)
 *
 * Grupos abrem popover PRA CIMA com sub-items em coluna vertical. A ordem
 * na config e "de baixo pra cima" (primeiro item da array aparece no topo
 * do popover — mais alto na tela, mais longe do widget clicado).
 *
 * Cache de stats em memoria (variavel de modulo) — evita re-fetch ao trocar
 * de pagina dentro da mesma sessao.
 */

type CountKey = keyof DashboardStats

type SubItem = {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  countKey?: CountKey
}

type NavEntry =
  | { kind: "link"; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; path: string; countKey?: CountKey }
  | { kind: "group"; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: SubItem[] }

const NAV: NavEntry[] = [
  { kind: "link", label: "Início", icon: HomeIcon, path: "/dashboard" },
  {
    kind: "group",
    label: "Negócios",
    icon: Briefcase,
    // Ordem "de baixo pra cima": Negócios aparece no topo do popover,
    // Vendas mais próximo do widget (base do popover).
    children: [
      { label: "Vendas",      path: "/sales",        icon: Key,            countKey: "totalSales" },
      { label: "Contratos",   path: "/contracts",    icon: FileCheck2,     countKey: "totalContracts" },
      { label: "Propostas",   path: "/proposals",    icon: FileSignature,  countKey: "totalProposals" },
      { label: "Follow-ups",  path: "/follow-ups",   icon: ClipboardCheck, countKey: "totalFollowUps" },
      { label: "Atendimentos", path: "/appointments", icon: HeadphonesIcon, countKey: "totalAppointments" },
      { label: "Negócios",    path: "/deals",        icon: Briefcase,      countKey: "totalDeals" },
    ],
  },
  {
    kind: "group",
    label: "Clientes",
    icon: Users,
    children: [
      { label: "Leads",    path: "/leads",   icon: Inbox, countKey: "newLeads" },
      { label: "Clientes", path: "/clients", icon: Users, countKey: "totalClients" },
    ],
  },
  {
    kind: "group",
    label: "Imóveis",
    icon: Building,
    children: [
      { label: "Imóveis", path: "/products",     icon: Package, countKey: "totalProducts" },
      { label: "Vitrine", path: "/sales-agenda", icon: Store,   countKey: "totalShowcaseProducts" },
    ],
  },
  {
    kind: "group",
    label: "Inteligência",
    icon: Eye,
    children: [
      { label: "Agenda", path: "/agenda",    icon: CalendarDays },
      { label: "BI",     path: "/analytics", icon: BarChart3 },
    ],
  },
  { kind: "link", label: "Chat", icon: MessageCircle, path: "/chat", countKey: "pendingChatAndCalls" },
  { kind: "link", label: "Config.", icon: Settings, path: "/settings" },
]

let statsCache: DashboardStats | null = null

/** Soma contadores de um grupo (usado como badge do grupo). */
function sumGroupCount(children: SubItem[], stats: DashboardStats | null): number {
  if (!stats) return 0
  let total = 0
  for (const c of children) {
    if (c.countKey) total += Number(stats[c.countKey] || 0)
  }
  return total
}

export function BottomNav() {
  const [stats, setStats] = useState<DashboardStats | null>(statsCache)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const navRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ startX: number; startScrollLeft: number; moved: boolean } | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    if (statsCache) return
    let cancelled = false
    api.dashboard.getStats()
      .then((data) => {
        if (cancelled) return
        statsCache = data
        setStats(data)
      })
      .catch((err) => console.warn("[BottomNav] falha ao buscar stats:", err))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    // rAF garante que o scrollWidth ja esta calculado apos o layout inicial
    requestAnimationFrame(check)
    // Re-checa em resize/rotate (mobile) — sem ResizeObserver pra evitar loop
    window.addEventListener("resize", check)
    el.addEventListener("scroll", check, { passive: true })
    return () => {
      window.removeEventListener("resize", check)
      el.removeEventListener("scroll", check)
    }
  }, [stats])

  const onNavMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
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
  const onNavMouseUp = useCallback(() => {
    const el = navRef.current
    if (el) el.style.cursor = "grab"
    setTimeout(() => { dragRef.current = null }, 0)
  }, [])
  const onNavLinkClickCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (dragRef.current?.moved) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])
  const scrollNav = useCallback((dir: "left" | "right") => {
    const el = navRef.current
    if (!el) return
    const amount = Math.max(200, el.clientWidth * 0.6)
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }, [])

  const renderBadge = (count: number) => {
    if (count <= 0) return null
    return (
      <span
        className="absolute -top-2 -right-3 min-w-[20px] h-[20px] px-1.5 rounded-full text-white text-[11px] font-semibold flex items-center justify-center leading-none ring-2 ring-card whitespace-nowrap"
        style={{ backgroundColor: "#0c343d" }}
      >
        {count}
      </span>
    )
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t brm-zoom-web-b"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        overscrollBehavior: "contain",
        touchAction: "pan-x",
      }}
    >
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollNav("left")}
          aria-label="Rolar para a esquerda"
          className="absolute left-0 top-0 bottom-0 z-10 px-2 flex items-center justify-center text-[#0c343d] hover:bg-accent/60 transition-colors"
          style={{ background: "linear-gradient(to right, hsl(var(--card)) 65%, transparent)" }}
        >
          <ChevronLeft className="w-9 h-9" strokeWidth={2.5} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollNav("right")}
          aria-label="Rolar para a direita"
          className="absolute right-0 top-0 bottom-0 z-10 px-2 flex items-center justify-center text-[#0c343d] hover:bg-accent/60 transition-colors"
          style={{ background: "linear-gradient(to left, hsl(var(--card)) 65%, transparent)" }}
        >
          <ChevronRight className="w-9 h-9" strokeWidth={2.5} />
        </button>
      )}
      <nav
        ref={navRef}
        onMouseDown={onNavMouseDown}
        onMouseMove={onNavMouseMove}
        onMouseUp={onNavMouseUp}
        onMouseLeave={onNavMouseUp}
        onClickCapture={onNavLinkClickCapture}
        className="overflow-x-auto cursor-grab select-none brm-bottom-nav"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-x",
          scrollbarWidth: "none",
        }}
      >
        <style>{`.brm-bottom-nav::-webkit-scrollbar { display: none; }`}</style>
        <div className="flex items-stretch gap-3 md:gap-6 px-3 py-5 min-w-max md:justify-center">
          {NAV.map((entry) => {
            const Icon = entry.icon
            if (entry.kind === "link") {
              const count = entry.countKey && stats ? Number(stats[entry.countKey] || 0) : 0
              return (
                <Link
                  key={entry.path}
                  to={entry.path}
                  className="relative shrink-0 flex flex-col items-center gap-1.5 min-w-[86px] md:min-w-[96px] px-2 py-1.5 rounded-lg text-[#0c343d] hover:bg-accent transition-colors"
                >
                  <div className="relative">
                    <Icon className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.75} />
                    {renderBadge(count)}
                  </div>
                  <span className="text-[14px] md:text-[15px] font-medium leading-tight whitespace-nowrap">{entry.label}</span>
                </Link>
              )
            }
            // Grupo — abre popover com sub-items
            const totalCount = sumGroupCount(entry.children, stats)
            return (
              <Popover
                key={entry.label}
                open={openGroup === entry.label}
                onOpenChange={(v) => setOpenGroup(v ? entry.label : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative shrink-0 flex flex-col items-center gap-1.5 min-w-[86px] md:min-w-[96px] px-2 py-1.5 rounded-lg text-[#0c343d] hover:bg-accent transition-colors"
                  >
                    <div className="relative">
                      <Icon className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.75} />
                      {renderBadge(totalCount)}
                    </div>
                    <span className="text-[14px] md:text-[15px] font-medium leading-tight whitespace-nowrap">{entry.label}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="center"
                  sideOffset={8}
                  className="p-1 w-48 brm-popover-up"
                >
                  <div className="flex flex-col">
                    {entry.children.map((child) => {
                      const ChildIcon = child.icon
                      const count = child.countKey && stats ? Number(stats[child.countKey] || 0) : 0
                      return (
                        <button
                          key={child.path}
                          type="button"
                          onClick={() => {
                            setOpenGroup(null)
                            navigate(child.path)
                          }}
                          className="relative flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-[#0c343d] transition-colors"
                        >
                          <ChildIcon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                          <span className="flex-1 text-left">{child.label}</span>
                          {count > 0 && (
                            <span
                              className="min-w-[20px] h-[20px] px-1 rounded-full text-white text-[10px] font-semibold flex items-center justify-center leading-none"
                              style={{ backgroundColor: "#0c343d" }}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}
          {/* Widget Sair — nao e Link, chama logout() */}
          <button
            type="button"
            onClick={logout}
            className="relative shrink-0 flex flex-col items-center gap-1.5 min-w-[86px] md:min-w-[96px] px-2 py-1.5 rounded-lg text-[#0c343d] hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <div className="relative">
              <LogOut className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.75} />
            </div>
            <span className="text-[14px] md:text-[15px] font-medium leading-tight whitespace-nowrap">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
