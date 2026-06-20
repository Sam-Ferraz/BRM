import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  Store,
  ImageOff,
  Bed,
  Bath,
  Car,
  Ruler,
  Star,
  MapPin,
  Play,
} from "lucide-react"
import { api, type Product, type ProductImage } from "@/lib/api-client"
import { ProductForm } from "@/components/forms/product-form"
import { FullscreenCarousel } from "@/components/ui/image-carousel"
import { useToast } from "@/hooks/use-toast"

// "Vitrine" não é uma entidade própria — é apenas uma forma visual de mostrar
// os imóveis (products) cadastrados. Esta página consome /api/products e
// reaproveita o ProductForm para editar.

const PROPERTY_TYPES = [
  { value: "all", labelKey: "allTypes" },
  { value: "apartment", labelKey: "propertyTypeApartment" },
  { value: "house", labelKey: "propertyTypeHouse" },
  { value: "penthouse", labelKey: "propertyTypePenthouse" },
  { value: "land", labelKey: "propertyTypeLand" },
  { value: "studio", labelKey: "propertyTypeStudio" },
  { value: "flat", labelKey: "propertyTypeFlat" },
]

const PROPERTY_CATEGORIES = [
  { value: "all", labelKey: "allCategories" },
  { value: "off-plan", labelKey: "propertyCategoryOffPlan" },
  { value: "completed", labelKey: "propertyCategoryCompleted" },
]

const propertyTypeLabel = (value: string | null | undefined, t: (k: string) => string): string | null => {
  if (!value) return null
  const opt = PROPERTY_TYPES.find((o) => o.value === value)
  return opt ? t(opt.labelKey) : value
}

export default function SalesAgendaPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()

  // Modo apresentação: dialog full-screen com as fotos passando em slide automático
  const [presentingProductId, setPresentingProductId] = useState<number | null>(null)
  const [presentingImages, setPresentingImages] = useState<ProductImage[]>([])
  const [presentingLoading, setPresentingLoading] = useState(false)

  const { toast } = useToast()

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      if (searchTerm) filters.search = searchTerm
      if (typeFilter !== "all") filters.type = typeFilter
      if (categoryFilter !== "all") filters.category = categoryFilter
      const result = await api.products.getAll(filters)
      // Vitrine = somente imóveis marcados como disponíveis (toggle do "olho"
      // na página de Imóveis). O backend não filtra ainda, então filtramos aqui.
      setProducts(result.data.filter(p => p.available_for_sale !== false))
    } catch (error) {
      toast({
        title: t("error"),
        description: t("productLoadError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, typeFilter, categoryFilter, toast, t])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleUpdate = async (data: Partial<Product>) => {
    if (!editingProduct) return
    try {
      setFormLoading(true)
      await api.products.update(editingProduct.id, data)
      toast({ title: t("success"), description: t("productUpdatedSuccess") })
      setIsFormOpen(false)
      setEditingProduct(undefined)
      fetchProducts()
    } catch (error) {
      toast({ title: t("error"), description: t("productUpdateError"), variant: "destructive" })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDeleteProduct"))) return
    try {
      await api.products.delete(id)
      toast({ title: t("success"), description: t("productDeletedSuccess") })
      fetchProducts()
    } catch (error) {
      toast({ title: t("error"), description: t("productDeleteError"), variant: "destructive" })
    }
  }

  // Abre o modo apresentação — busca as fotos do imóvel e abre o carrossel
  // fullscreen com autoplay (slide automático a cada 4 segundos).
  const handlePresent = async (productId: number) => {
    try {
      setPresentingLoading(true)
      const result = await api.products.getImages(productId)
      if (!result.images || result.images.length === 0) {
        toast({ title: t("info"), description: t("noPhotosToPresent") })
        return
      }
      setPresentingImages(result.images)
      setPresentingProductId(productId)
    } catch (error) {
      toast({ title: t("error"), description: t("presentationLoadError"), variant: "destructive" })
    } finally {
      setPresentingLoading(false)
    }
  }

  // Formata BRL; aceita string (NUMERIC do Postgres) ou number
  const formatCurrency = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === "") return "—"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "—"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  // Badge "Disponível"/"Indisponível" baseado em available_for_sale
  const getAvailabilityBadge = (available: boolean | undefined) => {
    if (available === false) {
      return (
        <Badge className="bg-slate-500 hover:bg-slate-500 text-white border-0">
          {t("unavailable")}
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-0">
        {t("available")}
      </Badge>
    )
  }

  // Renderiza item da linha de especificações apenas se tiver valor — evita
  // poluir cards de imóveis com cadastro incompleto.
  const renderSpec = (icon: React.ReactNode, value: string | number | null | undefined, label: string) => {
    if (value === null || value === undefined || value === "" || value === 0) return null
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground" title={label}>
        {icon}
        <span className="font-medium text-foreground">{value}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backButton")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho do módulo */}
        <div className="flex items-center gap-2 mb-6">
          <Store className="w-5 h-5" />
          <h2 className="text-xl font-semibold">{t("salesAgenda")}</h2>
        </div>

        {/* Barra de busca + filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchProducts")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t("propertyType")} />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t("propertyCategory")} />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_CATEGORIES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grade da vitrine */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">{t("loadingProducts")}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">{t("noProductsFound")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const location = [product.neighborhood, product.city].filter(Boolean).join(" · ")
              const areaLabel = product.total_area
                ? `${product.total_area} m²`
                : product.private_area
                ? `${product.private_area} m²`
                : null
              const typeLabel = propertyTypeLabel(product.type, t)

              return (
                <Card
                  key={product.id}
                  className="group relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                  onClick={() => {
                    setEditingProduct(product)
                    setIsFormOpen(true)
                  }}
                >
                  {/* Foto de capa */}
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                    {product.has_thumbnail ? (
                      <img
                        src={api.products.getThumbnailUrl(product.id, product.updated_at)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                        <ImageOff className="w-10 h-10" />
                        <span className="text-xs mt-2">{t("noImageAvailable")}</span>
                      </div>
                    )}

                    {/* Disponibilidade — canto superior direito */}
                    <div className="absolute top-3 right-3">
                      {getAvailabilityBadge(product.available_for_sale)}
                    </div>

                    {/* Tipo do imóvel — canto superior esquerdo */}
                    {typeLabel && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="bg-white/90 text-foreground backdrop-blur-sm">
                          {typeLabel}
                        </Badge>
                      </div>
                    )}

                    {/* Ações que aparecem no hover */}
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/95 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProduct(product)
                          setIsFormOpen(true)
                        }}
                        title={t("edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/95 hover:bg-white text-emerald-600 hover:text-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePresent(product.id)
                        }}
                        disabled={presentingLoading}
                        title={t("presentation")}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/95 hover:bg-white text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(product.id)
                        }}
                        title={t("delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col gap-2">
                    {/* Nome do imóvel */}
                    <h3 className="font-semibold text-base line-clamp-1">{product.name}</h3>

                    {/* Localização */}
                    {location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </p>
                    )}

                    {/* Preço */}
                    <p className="text-xl font-bold text-foreground mt-1">
                      {formatCurrency(product.price)}
                    </p>

                    {/* Especificações com ícones */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-auto pt-2 border-t">
                      {renderSpec(<Bed className="w-3.5 h-3.5" />, product.bedrooms, t("bedrooms"))}
                      {renderSpec(<Star className="w-3.5 h-3.5" />, product.suites, t("suites"))}
                      {renderSpec(<Bath className="w-3.5 h-3.5" />, product.bathrooms, t("bathrooms"))}
                      {renderSpec(<Car className="w-3.5 h-3.5" />, product.parking_spots, t("parkingSpots"))}
                      {renderSpec(<Ruler className="w-3.5 h-3.5" />, areaLabel, t("totalArea"))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <ProductForm
        product={editingProduct}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingProduct(undefined)
        }}
        onSubmit={handleUpdate}
        loading={formLoading}
      />

      {/* Modo apresentação — navegação manual (sem autoplay), em tela cheia
          real do navegador (cobre a barra de tarefas do SO via Fullscreen API). */}
      {presentingProductId !== null && (
        <FullscreenCarousel
          productId={presentingProductId}
          images={presentingImages}
          initialIndex={0}
          open={presentingProductId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPresentingProductId(null)
              setPresentingImages([])
            }
          }}
        />
      )}
    </div>
  )
}
