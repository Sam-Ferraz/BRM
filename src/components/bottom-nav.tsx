import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  Briefcase, Users, Package, HeadphonesIcon, ClipboardCheck, FileSignature, FileCheck2,
  Key, MessageCircle, Inbox, Store, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  Home as HomeIcon,
} from "lucide-react"
import { api, type DashboardStats } from "@/lib/api-client"

/**
 * BottomNav — barra de módulos fixa no rodapé, presente em TODAS as páginas
 * autenticadas. Widgets rolam horizontal via swipe/drag/setas.
 *
 * Design: badges nordeste com contadores vindos de /api/dashboard/stats
 * (fetch único quando o componente monta — reusado entre páginas).
 *
 * Setas laterais aparecem como "opção B" quando swipe/drag falha; usam
 * apenas listener de scroll simples (sem ResizeObserver) pra evitar
 * overhead / loops de re-render.
 */

type ModuleItem = {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  countKey?: keyof DashboardStats
}

const MODULES: ModuleItem[] = [
  { path: "/dashboard",    label: "Home",         icon: HomeIcon },
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

// Módulo de estado compartilhado — a nav aparece em várias páginas mas fetcha
// stats só uma vez por sessão (cache de módulo em memória).
let statsCache: DashboardStats | null = null

export function BottomNav() {
  const [stats, setStats] = useState<DashboardStats | null>(statsCache)
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

  // Recalcula setas somente em scroll do usuário (SEM ResizeObserver — evita
  // loops que causaram lentidão no experimento anterior). Fazemos check
  // inicial no mount uma vez.
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    return () => {
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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollNav("left")}
          aria-label="Rolar para a esquerda"
          className="absolute left-0 top-0 bottom-0 z-10 px-2 flex items-center justify-center text-[#0c343d] hover:bg-accent/60 transition-colors"
          style={{ background: "linear-gradient(to right, hsl(var(--card)) 65%, transparent)" }}
        >
          <ChevronLeft className="w-6 h-6" />
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
        className="overflow-x-auto cursor-grab select-none brm-bottom-nav"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          scrollbarWidth: "none",
        }}
      >
        <style>{`.brm-bottom-nav::-webkit-scrollbar { display: none; }`}</style>
        <div className="flex items-stretch gap-2 md:gap-4 px-3 py-3 min-w-max md:justify-center">
          {MODULES.map((m) => {
            const Icon = m.icon
            const count = m.countKey && stats ? Number(stats[m.countKey] || 0) : 0
            const showBadge = count > 0
            return (
              <Link
                key={m.path}
                to={m.path}
                className="relative shrink-0 flex flex-col items-center gap-1 min-w-[76px] md:min-w-[86px] px-2 py-1 rounded-lg text-[#0c343d] hover:bg-accent transition-colors"
              >
                <div className="relative">
                  <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.75} />
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
  )
}
