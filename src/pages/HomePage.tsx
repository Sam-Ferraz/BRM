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
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Briefcase, Users, Package, HeadphonesIcon, ClipboardCheck, FileSignature, FileCheck2,
  Key, MessageCircle, Inbox, Store, BarChart3, CalendarDays, Settings, LogOut, Search,
  Menu, ArrowLeft, Home as HomeIcon, Plus,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useAccount } from "@/hooks/use-account"
import { useToast } from "@/hooks/use-toast"
import { api, type Deal } from "@/lib/api-client"
import { DealEditor } from "@/components/deal-editor"
import { DealCodeBadge } from "@/components/deal-code-badge"
import { cn } from "@/lib/utils"

/**
 * Módulos que aparecem na coluna C. Ordem escolhida por importância no dia
 * a dia do corretor. Cada item vira só um link — clique redireciona pra
 * página do módulo (que continua com layout tradicional).
 */
const MODULES: { path: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { path: "/deals",        label: "Negócios",     icon: Briefcase },
  { path: "/appointments", label: "Atendimentos", icon: HeadphonesIcon },
  { path: "/follow-ups",   label: "Follow-ups",   icon: ClipboardCheck },
  { path: "/agenda",       label: "Agenda",       icon: CalendarDays },
  { path: "/chat",         label: "Chat",         icon: MessageCircle },
  { path: "/leads",        label: "Leads",        icon: Inbox },
  { path: "/proposals",    label: "Propostas",    icon: FileSignature },
  { path: "/contracts",    label: "Contratos",    icon: FileCheck2 },
  { path: "/sales",        label: "Vendas",       icon: Key },
  { path: "/clients",      label: "Clientes",     icon: Users },
  { path: "/products",     label: "Imóveis",      icon: Package },
  { path: "/sales-agenda", label: "Vitrine",      icon: Store },
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex">
      {/* ============================================================ */}
      {/* Coluna C — módulos                                            */}
      {/* Contorno na cor da marca (#0c343d) + widgets com efeito 3D    */}
      {/* ============================================================ */}
      <aside
        className={cn(
          "shrink-0 w-16 flex-col items-center bg-card",
          "hidden md:flex",
        )}
        style={{
          borderRight: "2px solid #0c343d",
          boxShadow: "inset -1px 0 0 rgba(12,52,61,0.15)",
        }}
      >
        <Link
          to="/dashboard-legacy"
          className="w-11 h-11 mt-3 mb-2 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 hover:-translate-y-0.5"
          style={{
            backgroundColor: "#0c343d",
            boxShadow:
              "0 4px 6px -1px rgba(12,52,61,0.35), 0 2px 4px -1px rgba(12,52,61,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
          title={account?.name || "Home"}
        >
          <HomeIcon className="w-5 h-5" />
        </Link>
        <div className="h-px w-8 bg-[#0c343d]/20 my-2" />
        <nav className="flex-1 flex flex-col gap-1.5 py-2 overflow-y-auto w-full items-center">
          {MODULES.map((m) => {
            const Icon = m.icon
            return (
              <Link
                key={m.path}
                to={m.path}
                title={m.label}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[#0c343d] bg-white transition-all hover:scale-105 hover:-translate-y-0.5 hover:text-white hover:bg-[#0c343d]"
                style={{
                  boxShadow:
                    "0 2px 4px rgba(12,52,61,0.15), 0 1px 2px rgba(12,52,61,0.10), inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                <Icon className="w-5 h-5" />
              </Link>
            )
          })}
        </nav>
        <div className="w-full flex flex-col items-center gap-1.5 py-2 border-t border-[#0c343d]/20">
          <Link
            to="/settings"
            title="Configurações"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#0c343d] bg-white transition-all hover:scale-105 hover:-translate-y-0.5 hover:text-white hover:bg-[#0c343d]"
            style={{
              boxShadow:
                "0 2px 4px rgba(12,52,61,0.15), 0 1px 2px rgba(12,52,61,0.10), inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            <Settings className="w-5 h-5" />
          </Link>
          <button
            title="Sair"
            onClick={logout}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#0c343d] bg-white transition-all hover:scale-105 hover:-translate-y-0.5 hover:text-white hover:bg-red-600"
            style={{
              boxShadow:
                "0 2px 4px rgba(12,52,61,0.15), 0 1px 2px rgba(12,52,61,0.10), inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* Coluna B — lista de Negócios                                  */}
      {/* ============================================================ */}
      <aside
        className={cn(
          "shrink-0 w-full md:w-[340px] flex-col border-r bg-card",
          mobilePanel === "list" ? "flex" : "hidden md:flex",
        )}
      >
        {/* Header da lista */}
        <div className="shrink-0 p-3 border-b space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Menu mobile — abre drawer com módulos */}
              <button
                className="md:hidden p-2 rounded hover:bg-accent"
                onClick={() => {
                  const modulePath = prompt("Ir para módulo: /deals, /appointments, /clients, etc")
                  if (modulePath) navigate(modulePath)
                }}
                title="Módulos"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-base">Negócios</h2>
            </div>
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

        {/* Lista scrollável */}
        <div className="flex-1 overflow-y-auto">
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
          "flex-1 flex-col overflow-hidden bg-muted/30",
          mobilePanel === "editor" ? "flex" : "hidden md:flex",
        )}
      >
        {selectedDeal ? (
          <>
            {/* Header estilo WhatsApp: avatar + nome do cliente + código + botão voltar (mobile) */}
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
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <Briefcase className="w-14 h-14 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                Selecione um negócio na lista pra ver o histórico de atendimento.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
