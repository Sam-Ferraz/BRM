import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Home, Trash2 } from "lucide-react"
import { api, type Product } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { ProductForm } from "@/components/forms/product-form"

/**
 * Gerencia as unidades filhas de um Empreendimento.
 *
 * Renderizado dentro do ProductForm quando o imovel sendo editado e do
 * type='enterprise'. Cada unidade e um Product normal com parent_product_id
 * apontando pro empreendimento pai — podem ter tipos variados (apartment,
 * penthouse, studio, etc) dentro do mesmo empreendimento.
 *
 * Fluxo de criacao: o botao "+ Nova unidade" abre outro ProductForm
 * (aninhado via Radix Dialog) ja com parentProductId pre-preenchido. Ao
 * salvar, a unidade e criada e aparece na lista.
 */

interface EnterpriseUnitsManagerProps {
  enterpriseId: number
}

export function EnterpriseUnitsManager({ enterpriseId }: EnterpriseUnitsManagerProps) {
  const { toast } = useToast()
  const [units, setUnits] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [newUnitOpen, setNewUnitOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.products.getAll({ parentProductId: enterpriseId })
      setUnits(res.data || [])
    } catch (err) {
      console.warn("[EnterpriseUnitsManager] falha ao buscar unidades:", err)
      setUnits([])
    } finally {
      setLoading(false)
    }
  }, [enterpriseId])

  useEffect(() => {
    load()
  }, [load])

  const handleCreateUnit = async (data: any) => {
    setCreating(true)
    try {
      await api.products.create({ ...data, parent_product_id: enterpriseId } as Omit<Product, "id">)
      toast({ title: "Unidade criada" })
      setNewUnitOpen(false)
      await load()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao criar unidade",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateUnit = async (data: any) => {
    if (!editingUnit) return
    setCreating(true)
    try {
      await api.products.update(editingUnit.id, { ...data, parent_product_id: enterpriseId })
      toast({ title: "Unidade atualizada" })
      setEditingUnit(null)
      await load()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao atualizar unidade",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Remover esta unidade do empreendimento? A unidade sera excluida.")) return
    setDeletingId(id)
    try {
      await api.products.delete(id)
      toast({ title: "Unidade removida" })
      await load()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao remover unidade",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3 border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Home className="w-4 h-4" />
          Unidades do empreendimento
          <Badge variant="secondary" className="ml-1">{units.length}</Badge>
        </h3>
        <Button type="button" size="sm" variant="outline" onClick={() => setNewUnitOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nova unidade
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Carregando...</div>
      ) : units.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            Nenhuma unidade cadastrada ainda.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setNewUnitOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Cadastrar a primeira
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {units.map((u) => (
            <li
              key={u.id}
              className="rounded-lg border bg-card p-3 flex items-start justify-between gap-3 shadow-sm"
            >
              <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => setEditingUnit(u)}
              >
                <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {u.type && <span>{u.type}</span>}
                  {u.bedrooms != null && <span>• {u.bedrooms} quartos</span>}
                  {u.price != null && (
                    <span className="font-semibold text-foreground">
                      • R$ {Number(u.price).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 shrink-0"
                disabled={deletingId === u.id}
                onClick={() => handleDelete(u.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {newUnitOpen && (
        <ProductForm
          open={newUnitOpen}
          onOpenChange={setNewUnitOpen}
          onSubmit={handleCreateUnit}
          loading={creating}
          parentProductId={enterpriseId}
        />
      )}

      {editingUnit && (
        <ProductForm
          product={editingUnit}
          open={!!editingUnit}
          onOpenChange={(open) => {
            if (!open) setEditingUnit(null)
          }}
          onSubmit={handleUpdateUnit}
          loading={creating}
          parentProductId={enterpriseId}
        />
      )}
    </div>
  )
}
