import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  FileSignature,
  Upload,
  Trash2,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Users as UsersIcon,
  Scale,
} from "lucide-react"
import {
  api,
  type ContractWithDetails,
  type ContractStatus,
  type ContractDocument,
  type ContractDocumentType,
} from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

/**
 * ContractsPage — módulo Contrato (etapa entre Proposta e Venda).
 *
 * Abas por status: Docs pendentes | Jurídico | Rejeitados jurídico |
 *                  Aguardando gestor | Rejeitados gestor | Aprovados
 *
 * Admin/manager tem toggle "Ver time" pra listar contratos de todos os
 * corretores. Corretor (broker) só vê os próprios.
 */

const STATUS_LABELS: Record<ContractStatus, string> = {
  pending_docs: "Docs pendentes",
  awaiting_legal: "Jurídico",
  legal_rejected: "Rejeitados jurídico",
  awaiting_manager: "Aguardando gestor",
  manager_rejected: "Rejeitados gestor",
  approved: "Aprovados",
}

const STATUS_BADGE: Record<ContractStatus, string> = {
  pending_docs: "bg-amber-100 text-amber-800 border-amber-200",
  awaiting_legal: "bg-blue-100 text-blue-800 border-blue-200",
  legal_rejected: "bg-red-100 text-red-800 border-red-200",
  awaiting_manager: "bg-purple-100 text-purple-800 border-purple-200",
  manager_rejected: "bg-red-100 text-red-800 border-red-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

function formatCurrencyBRL(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—"
  const n = typeof v === "string" ? parseFloat(v) : v
  if (isNaN(n)) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(d?: string | null): string {
  if (!d) return "—"
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(d))
  } catch {
    return "—"
  }
}

export default function ContractsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager"

  const [tab, setTab] = useState<ContractStatus>("pending_docs")
  const [contracts, setContracts] = useState<ContractWithDetails[]>([])
  const [counts, setCounts] = useState<Record<ContractStatus, number>>({
    pending_docs: 0,
    awaiting_legal: 0,
    legal_rejected: 0,
    awaiting_manager: 0,
    manager_rejected: 0,
    approved: 0,
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [viewAll, setViewAll] = useState(false)

  const [selectedContract, setSelectedContract] =
    useState<ContractWithDetails | null>(null)

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const [list, cs] = await Promise.all([
        api.contracts.list({
          status: tab,
          search,
          viewAll: isAdminOrManager && viewAll,
        }),
        api.contracts.getCounts(isAdminOrManager && viewAll),
      ])
      setContracts(list.data)
      setCounts(cs.data)
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao carregar contratos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [tab, search, viewAll, isAdminOrManager, toast])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Link>
            </Button>
            {isAdminOrManager && (
              <Button
                size="sm"
                variant={viewAll ? "default" : "outline"}
                onClick={() => setViewAll(!viewAll)}
                title="Ver contratos de todo o time"
              >
                <UsersIcon className="w-4 h-4 mr-2" />
                {viewAll ? "Time (todos)" : "Meus"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Contratos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou imóvel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as ContractStatus)}>
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto">
                {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
                  <TabsTrigger key={s} value={s} className="text-xs px-1.5 py-2 flex-col gap-0.5">
                    <span>{STATUS_LABELS[s]}</span>
                    <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                      {counts[s]}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
                <TabsContent key={s} value={s} className="mt-4">
                  {loading ? (
                    <div className="text-center py-16 text-muted-foreground">Carregando...</div>
                  ) : contracts.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">
                      Nenhum contrato nesta etapa.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {contracts.map((c) => (
                        <ContractCard
                          key={c.id}
                          contract={c}
                          onOpen={() => setSelectedContract(c)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {selectedContract && (
        <ContractDetailDialog
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onChanged={() => {
            setSelectedContract(null)
            fetchList()
          }}
        />
      )}
    </div>
  )
}

// ===========================================================================
// ContractCard — resumo do contrato na lista
// ===========================================================================

function ContractCard({
  contract,
  onOpen,
}: {
  contract: ContractWithDetails
  onOpen: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="text-left w-full rounded-lg border bg-card p-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{contract.deal_client || `Deal #${contract.deal_id}`}</h4>
          {contract.deal_property_name && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {contract.deal_property_name}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] shrink-0 ${STATUS_BADGE[contract.status]}`}
        >
          {STATUS_LABELS[contract.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Valor</p>
          <p className="font-semibold" style={{ color: "#0c343d" }}>
            {formatCurrencyBRL(contract.final_value ?? contract.proposal_value)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Docs anexados</p>
          <p className="font-semibold">
            {contract.documents_count ?? 0}
            {(contract.contract_files_count ?? 0) > 0 && (
              <span className="text-emerald-600 ml-1">
                (+contrato)
              </span>
            )}
          </p>
        </div>
      </div>

      {contract.broker_name && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Corretor: {contract.broker_name}
        </p>
      )}
    </button>
  )
}

// ===========================================================================
// ContractDetailDialog — abre o contrato, mostra docs, permite upload/aprovação
// ===========================================================================

function ContractDetailDialog({
  contract,
  onClose,
  onChanged,
}: {
  contract: ContractWithDetails
  onClose: () => void
  onChanged: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager"

  const [documents, setDocuments] = useState<ContractDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rejectNotes, setRejectNotes] = useState("")
  const [showLegalReject, setShowLegalReject] = useState(false)
  const [showManagerReject, setShowManagerReject] = useState(false)

  const clientDocs = useMemo(() => documents.filter((d) => d.doc_type === "client_doc"), [documents])
  const contractFiles = useMemo(() => documents.filter((d) => d.doc_type === "contract"), [documents])

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.contracts.listDocuments(contract.id)
      setDocuments(res.data)
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao carregar documentos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [contract.id, toast])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleUpload = async (docType: ContractDocumentType) => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      await api.contracts.uploadDocument(contract.id, file, docType)
      toast({ title: "Documento anexado" })
      if (fileInputRef.current) fileInputRef.current.value = ""
      fetchDocs()
    } catch (err) {
      toast({
        title: "Erro no upload",
        description: err instanceof Error ? err.message : "Falha",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId: number) => {
    if (!confirm("Remover este documento?")) return
    try {
      await api.contracts.deleteDocument(contract.id, docId)
      toast({ title: "Documento removido" })
      fetchDocs()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha",
        variant: "destructive",
      })
    }
  }

  const runAction = async (fn: () => Promise<any>, successMsg: string) => {
    try {
      setBusy(true)
      await fn()
      toast({ title: successMsg })
      onChanged()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  // Regras de ação por status
  const status = contract.status
  const canUploadClientDoc = status === "pending_docs" || status === "legal_rejected"
  const canUploadContract = status === "awaiting_legal" && isAdminOrManager
  const canSubmitLegal = status === "pending_docs"
  const canResubmitLegal = status === "legal_rejected"
  const canLegalReview = status === "awaiting_legal" && isAdminOrManager
  const canManagerReview = status === "awaiting_manager" && isAdminOrManager

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Contrato — {contract.deal_client || `Deal #${contract.deal_id}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-1 space-y-4">
          {/* Info geral */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Imóvel</p>
              <p className="font-medium">{contract.deal_property_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="font-semibold" style={{ color: "#0c343d" }}>
                {formatCurrencyBRL(contract.final_value ?? contract.proposal_value)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className={`text-xs ${STATUS_BADGE[contract.status]}`}>
                {STATUS_LABELS[contract.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criado</p>
              <p className="text-sm">{formatDate(contract.created_at)}</p>
            </div>
          </div>

          {/* Feedback do jurídico/gestor se houver */}
          {contract.legal_notes && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
              <p className="font-semibold text-amber-900 text-xs mb-1 flex items-center gap-1">
                <Scale className="w-3 h-3" /> Jurídico
              </p>
              <p className="text-amber-800 whitespace-pre-wrap">{contract.legal_notes}</p>
              {contract.legal_reviewer_name && (
                <p className="text-[10px] text-amber-700 mt-1">
                  Por {contract.legal_reviewer_name} em {formatDate(contract.legal_reviewed_at)}
                </p>
              )}
            </div>
          )}
          {contract.manager_notes && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
              <p className="font-semibold text-blue-900 text-xs mb-1">Gestor</p>
              <p className="text-blue-800 whitespace-pre-wrap">{contract.manager_notes}</p>
              {contract.manager_reviewer_name && (
                <p className="text-[10px] text-blue-700 mt-1">
                  Por {contract.manager_reviewer_name} em {formatDate(contract.manager_reviewed_at)}
                </p>
              )}
            </div>
          )}

          {/* Documentos do cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documentos do cliente
                <span className="text-xs text-muted-foreground">({clientDocs.length})</span>
              </h4>
            </div>
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : clientDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum documento anexado ainda.</p>
            ) : (
              <ul className="space-y-1">
                {clientDocs.map((d) => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    canDelete={canUploadClientDoc}
                    onDelete={() => handleDelete(d.id)}
                  />
                ))}
              </ul>
            )}
            {canUploadClientDoc && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={() => handleUpload("client_doc")}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  Anexar documento
                </Button>
              </div>
            )}
          </div>

          {/* Contrato (jurídico anexa) */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Contrato final
                <span className="text-xs text-muted-foreground">({contractFiles.length})</span>
              </h4>
            </div>
            {contractFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">Contrato ainda não anexado pelo jurídico.</p>
            ) : (
              <ul className="space-y-1">
                {contractFiles.map((d) => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    canDelete={canUploadContract}
                    onDelete={() => handleDelete(d.id)}
                  />
                ))}
              </ul>
            )}
            {canUploadContract && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="file"
                  className="hidden"
                  id={`contract-upload-${contract.id}`}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    try {
                      setUploading(true)
                      await api.contracts.uploadDocument(contract.id, f, "contract")
                      toast({ title: "Contrato anexado" })
                      e.target.value = ""
                      fetchDocs()
                    } catch (err) {
                      toast({
                        title: "Erro no upload",
                        description: err instanceof Error ? err.message : "Falha",
                        variant: "destructive",
                      })
                    } finally {
                      setUploading(false)
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    document.getElementById(`contract-upload-${contract.id}`)?.click()
                  }
                  disabled={uploading}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  Anexar contrato final
                </Button>
              </div>
            )}
          </div>

          {/* Formulários inline de rejeição */}
          {showLegalReject && (
            <div className="pt-2 border-t space-y-2">
              <p className="text-sm font-medium">Motivo da rejeição (jurídico)</p>
              <Textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="Explique o que precisa ser ajustado..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || !rejectNotes.trim()}
                  onClick={() =>
                    runAction(
                      () => api.contracts.legalReject(contract.id, rejectNotes),
                      "Contrato rejeitado — corretor deve revisar"
                    )
                  }
                >
                  Confirmar rejeição
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLegalReject(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {showManagerReject && (
            <div className="pt-2 border-t space-y-2">
              <p className="text-sm font-medium">Motivo da rejeição (gestor)</p>
              <Textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="Explique o que precisa ser ajustado..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || !rejectNotes.trim()}
                  onClick={() =>
                    runAction(
                      () => api.contracts.managerReject(contract.id, rejectNotes),
                      "Contrato rejeitado pelo gestor"
                    )
                  }
                >
                  Confirmar rejeição
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowManagerReject(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {canSubmitLegal && (
            <Button
              disabled={busy || clientDocs.length === 0}
              onClick={() =>
                runAction(
                  () => api.contracts.submitToLegal(contract.id),
                  "Enviado pro jurídico"
                )
              }
            >
              <Send className="w-4 h-4 mr-2" /> Enviar pro Jurídico
            </Button>
          )}
          {canResubmitLegal && (
            <Button
              disabled={busy}
              onClick={() =>
                runAction(
                  () => api.contracts.resubmitToLegal(contract.id),
                  "Reenviado pro jurídico"
                )
              }
            >
              <Send className="w-4 h-4 mr-2" /> Reenviar pro Jurídico
            </Button>
          )}
          {canLegalReview && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setShowLegalReject(true)}
              >
                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                Rejeitar (jurídico)
              </Button>
              <Button
                disabled={busy || contractFiles.length === 0}
                onClick={() =>
                  runAction(
                    () => api.contracts.legalApprove(contract.id),
                    "Aprovado pelo jurídico — vai pro gestor"
                  )
                }
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aprovar (jurídico)
              </Button>
            </>
          )}
          {canManagerReview && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setShowManagerReject(true)}
              >
                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                Rejeitar (gestor)
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  runAction(
                    () => api.contracts.managerApprove(contract.id),
                    "Aprovado pelo gestor — Venda criada"
                  )
                }
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aprovar (gestor)
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DocRow({
  doc,
  canDelete,
  onDelete,
}: {
  doc: ContractDocument
  canDelete: boolean
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs">
      <a
        href={doc.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 truncate text-primary hover:underline"
      >
        {doc.filename}
      </a>
      {canDelete && (
        <button
          className="p-1 rounded hover:bg-red-100 shrink-0"
          onClick={onDelete}
          title="Remover"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
        </button>
      )}
    </li>
  )
}
