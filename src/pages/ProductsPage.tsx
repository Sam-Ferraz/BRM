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
import { ArrowLeft, Plus, Pencil, Trash2, Search, Image, Package, Eye, EyeOff } from "lucide-react"
import { api, type Product } from "@/lib/api-client"
import { ProductForm } from "@/components/forms/product-form"
import { useToast } from "@/hooks/use-toast"
import { PropertyCodeBadge } from "@/components/property-code-badge"

export default function ProductsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  
  const { toast } = useToast()

  // Check for auto-open dialog from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      setEditingProduct(undefined)
      // Remove the query parameter after opening
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('new')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.products.getAll(filters)
      setProducts(result.data)
    } catch (error) {
      toast({
        title: t('error'),
        description: t('productLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleCreate = async (data: Omit<Product, "id">) => {
    try {
      setFormLoading(true)
      const created = await api.products.create(data)
      toast({
        title: t('success'),
        description: t('productCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchProducts()
      return created
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

  const handleUpdate = async (data: Partial<Product>) => {
    if (!editingProduct) return

    try {
      setFormLoading(true)
      await api.products.update(editingProduct.id, data)
      toast({
        title: t('success'),
        description: t('productUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingProduct(undefined)
      fetchProducts()
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
      await api.products.delete(id)
      toast({
        title: t('success'),
        description: t('productDeletedSuccess'),
      })
      fetchProducts()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('productDeleteError'),
        variant: "destructive",
      })
    }
  }

  // Liga/desliga a flag available_for_sale do imóvel. Quando false, ele
  // some da Vitrine. Usa endpoint dedicado pra não precisar mandar o
  // produto inteiro no PUT.
  const handleToggleAvailability = async (product: Product) => {
    const nextValue = !(product.available_for_sale ?? true)
    try {
      await api.products.setAvailability(product.id, nextValue)
      toast({
        title: t('success'),
        description: nextValue ? t('productNowVisibleInShowcase') : t('productHiddenFromShowcase'),
      })
      fetchProducts()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('productUpdateError'),
        variant: 'destructive',
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

  const typeLabelMap: Record<string, string> = {
    apartment: 'propertyTypeApartment',
    house: 'propertyTypeHouse',
    penthouse: 'propertyTypePenthouse',
    land: 'propertyTypeLand',
    studio: 'propertyTypeStudio',
    flat: 'propertyTypeFlat',
  }

  const getTypeLabel = (value?: string) => {
    if (!value) return '-'
    const key = typeLabelMap[value]
    return key ? t(key) : value
  }

  const categoryLabelMap: Record<string, string> = {
    'off-plan': 'propertyCategoryOffPlan',
    'completed': 'propertyCategoryCompleted',
  }

  const getCategoryLabel = (value?: string) => {
    if (!value) return '-'
    const key = categoryLabelMap[value]
    return key ? t(key) : value
  }



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
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t('productsManagement')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchProducts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingProducts')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Código</TableHead>
                    <TableHead>{t('image')}</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      {t('name')} {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("price")}
                    >
                      {t('price')} {sortBy === "price" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("type")}
                    >
                      {t('propertyType')} {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("category")}
                    >
                      {t('propertyCategory')} {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingProduct(product)
                        setIsFormOpen(true)
                      }}
                    >
                      <TableCell>
                        <PropertyCodeBadge id={product.id} />
                      </TableCell>
                      <TableCell className="w-16">
                        <div 
                          className="w-12 h-12 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity overflow-hidden bg-muted flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingProduct(product)
                            setIsFormOpen(true)
                          }}
                        >
                          {product.has_thumbnail ? (
                            <img
                              src={api.products.getThumbnailUrl(product.id, product.updated_at)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                // Show fallback icon
                                const parent = target.parentElement
                                if (parent && !parent.querySelector('.fallback-icon')) {
                                  const icon = document.createElement('div')
                                  icon.className = 'fallback-icon'
                                  icon.innerHTML = '<svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4 16 4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path></svg>'
                                  parent.appendChild(icon)
                                }
                              }}
                              onLoad={(e) => {
                                // Remove fallback icon if image loads successfully
                                const target = e.target as HTMLImageElement
                                const parent = target.parentElement
                                const fallback = parent?.querySelector('.fallback-icon')
                                if (fallback) {
                                  fallback.remove()
                                }
                              }}
                            />
                          ) : (
                            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 16 4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                            </svg>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        {product.price ? 
                          new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                      }).format(product.price) 
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{getTypeLabel(product.type)}</TableCell>
                  <TableCell>{getCategoryLabel(product.category)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingProduct(product)
                              setIsFormOpen(true)
                            }}
                            title={t('edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {/* Visibilidade na Vitrine — toggle direto */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleAvailability(product)
                            }}
                            className={product.available_for_sale === false ? 'text-slate-400' : 'text-emerald-600 hover:text-emerald-700'}
                            title={product.available_for_sale === false ? t('showInShowcase') : t('hideFromShowcase')}
                          >
                            {product.available_for_sale === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(product.id)
                            }}
                            className="text-red-600 hover:text-red-700"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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

      <ProductForm
        product={editingProduct}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingProduct(undefined)
        }}
        onSubmit={editingProduct ? handleUpdate : handleCreate}
        loading={formLoading}
        onProductUpdated={(updatedProduct) => {
          // Update the products list with the updated product
          setProducts(prev => 
            prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
          )
          // Update the editing product if it's the same one
          if (editingProduct?.id === updatedProduct.id) {
            setEditingProduct(updatedProduct)
          }
        }}
      />
    </div>
  )
}
