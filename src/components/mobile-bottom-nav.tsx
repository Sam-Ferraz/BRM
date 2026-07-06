import { NavLink } from "react-router-dom"
import { LayoutDashboard, CalendarDays, Inbox, Briefcase, Settings } from "lucide-react"

/**
 * MobileBottomNav — barra de navegação fixa embaixo, só visível em telas
 * menores que `md` (< 768px). Padrão iOS/Android pra apps.
 *
 * Escolhi 5 destinos que cobrem o dia-a-dia do corretor:
 *   Dashboard (visão geral) | Agenda | Leads | Negócios | Perfil
 *
 * Se o corretor precisa acessar módulos secundários (Clientes, Imóveis, etc.)
 * usa o Dashboard como "hub" — todos os cards estão lá.
 *
 * IMPORTANTE: o conteúdo das páginas precisa ter padding-bottom pra não ficar
 * escondido atrás da barra. Aplicado globalmente via `pb-16 md:pb-0` no body
 * (ver index.css) — só em mobile.
 */
const ITEMS = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { path: "/agenda", icon: CalendarDays, label: "Agenda" },
  { path: "/leads", icon: Inbox, label: "Leads" },
  { path: "/deals", icon: Briefcase, label: "Negócios" },
  { path: "/settings", icon: Settings, label: "Ajustes" },
] as const

export function MobileBottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom"
      aria-label="Navegação principal"
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.path} className="flex-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
