import { useState, useEffect, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react"
import { api, type Produto } from "@/lib/api-client"
import { ProdutoForm } from "@/components/forms/produto-form"
import { useToast } from "@/hooks/use-toast"

export default function ProdutosPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("Todos")
  const [estoqueFilter, setEstoqueFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | undefined>()
  
  const { toast } = useToast()

  // Check for auto-open dialog from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      setEditingProduto(undefined)
      // Remove the query parameter after opening
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('new')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchProdutos = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (categoriaFilter !== "Todos") filters.categoria = categoriaFilter
      if (estoqueFilter !== "Todos") filters.estoque = estoqueFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.produtos.getAll(filters)
      setProdutos(result.data)
    } catch (error) {
      toast({
        title: t('error'),
        description: t('productLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, categoriaFilter, estoqueFilter, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchProdutos()
  }, [fetchProdutos])

  const handleCreate = async (data: Omit<Produto, "id">) => {
    try {
      setFormLoading(true)
      await api.produtos.create(data)
      toast({
        title: t('success'),
        description: t('productCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchProdutos()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('productCreateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data: Partial<Produto>) => {
    if (!editingProduto) return

    try {
      setFormLoading(true)
      await api.produtos.update(editingProduto.id, data)
      toast({
        title: t('success'),
        description: t('productUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingProduto(undefined)
      fetchProdutos()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('productUpdateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteProduct'))) return

    try {
      await api.produtos.delete(id)
      toast({
        title: t('success'),
        description: t('productDeletedSuccess'),
      })
      fetchProdutos()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('productDeleteError'),
        variant: "destructive",
      })
    }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const getEstoqueStatus = (estoque: number) => {
    if (estoque === 0) {
      return <Badge variant="destructive">{t('outOfStock')}</Badge>
    } else if (estoque <= 10) {
      return <Badge variant="secondary">{t('lowStock')}</Badge>
    }
    return <Badge variant="default">{t('inStock')}</Badge>
  }

  const categorias = [
    { value: "Todos", label: t('allCategories') },
    { value: "Eletrônicos", label: "Eletrônicos" },
    { value: "Casa", label: "Casa" },
    { value: "Esportes", label: "Esportes" },
    { value: "Livros", label: "Livros" }
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild className="mr-4">
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Link>
              </Button>
              <h1 className="text-xl font-semibold text-foreground">{t('productsTitle')}</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newProduct')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('productsManagement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchProducts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('category')} />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estoqueFilter} onValueChange={setEstoqueFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('stock')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">{t('allCategories')}</SelectItem>
                  <SelectItem value="Em Estoque">{t('inStock')}</SelectItem>
                  <SelectItem value="Baixo Estoque">{t('lowStock')}</SelectItem>
                  <SelectItem value="Sem Estoque">{t('outOfStock')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingProducts')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("nome")}
                    >
                      {t('name')} {sortBy === "nome" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("preco")}
                    >
                      {t('price')} {sortBy === "preco" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("categoria")}
                    >
                      {t('category')} {sortBy === "categoria" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("estoque")}
                    >
                      {t('stock')} {sortBy === "estoque" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.nome}</TableCell>
                      <TableCell>{produto.preco}</TableCell>
                      <TableCell>{produto.categoria}</TableCell>
                      <TableCell>{produto.estoque}</TableCell>
                      <TableCell>{getEstoqueStatus(produto.estoque)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingProduto(produto)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(produto.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {produtos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('noProductsFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ProdutoForm
        produto={editingProduto}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingProduto(undefined)
        }}
        onSubmit={editingProduto ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}