"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Badge } from "@/components/ui/badge"
import { ImageCarousel, FullscreenCarousel } from "@/components/ui/image-carousel"
import { Upload, Star, Trash2, Eye } from "lucide-react"
import { api, type Product, type ProductImage, type ProductStatus } from "@/lib/api-client"
import { useMobileDetection } from "@/lib/mobile-utils"
import { useToast } from "@/hooks/use-toast"

interface ProductFormProps {
  product?: Product
  initialName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Product, "id"> | Partial<Product>) => void | Promise<void> | Promise<Product | void>
  loading?: boolean
  onProductUpdated?: (product: Product) => void
}

export function ProductForm({ product, initialName, open, onOpenChange, onSubmit, loading, onProductUpdated }: ProductFormProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetection()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  type PropertyTypeValue = 'apartment' | 'house' | 'penthouse' | 'land' | 'studio' | 'flat'
  type PropertyCategoryValue = 'off-plan' | 'completed'

  const propertyTypeOptions: { value: PropertyTypeValue; label: string }[] = [
    { value: 'apartment', label: t('propertyTypeApartment') },
    { value: 'house', label: t('propertyTypeHouse') },
    { value: 'penthouse', label: t('propertyTypePenthouse') },
    { value: 'land', label: t('propertyTypeLand') },
    { value: 'studio', label: t('propertyTypeStudio') },
    { value: 'flat', label: t('propertyTypeFlat') },
  ]

  const propertyCategoryOptions: { value: PropertyCategoryValue; label: string }[] = [
    { value: 'off-plan', label: t('propertyCategoryOffPlan') },
    { value: 'completed', label: t('propertyCategoryCompleted') },
  ]

  const emptyForm = {
    name: "",
    price: null as number | null,
    type: "apartment" as PropertyTypeValue,
    category: "off-plan" as PropertyCategoryValue,
    description: "",
    capture_date: "",
    capturer: "",
    payment_condition: "",
    exchange_car: false,
    exchange_property: false,
    exclusivity: false,
    bedrooms: "" as string | number,
    suites: "" as string | number,
    parking_spots: "" as string | number,
    bathrooms: "" as string | number,
    total_area: "",
    private_area: "",
    condo_fee: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "Brasil",
    available_for_sale: true,
    status: "available" as ProductStatus,
  }

  const [users, setUsers] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    api.users.list().then((list) => setUsers(list)).catch(() => {})
  }, [])

  const [formData, setFormData] = useState(emptyForm)
  // Controla o modo do select de Captador: false = predefinido (Nenhum/usuário),
  // true = modo "Outro" (mostra Input livre). Detectado automaticamente ao
  // editar produto cujo capturer não bate com nenhum usuário cadastrado.
  const [capturerOtherMode, setCapturerOtherMode] = useState(false)
  const [images, setImages] = useState<ProductImage[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [fullscreenCarousel, setFullscreenCarousel] = useState<{ open: boolean; initialIndex: number }>({ open: false, initialIndex: 0 })
  // Fotos selecionadas ANTES do produto existir (modo novo imóvel).
  // São enviadas ao S3 logo após a criação do produto no handleSubmit.
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const loadProductImages = async (productId: number) => {
    try {
      const result = await api.products.getImages(productId)
      setImages(result.images)
    } catch (error) {
      console.error('Error loading product images:', error)
    }
  }

  // Quando carrega produto existente OU lista de usuários muda, recalcula se o
  // captador atual é "Outro" (= valor preenchido mas não bate com nenhum usuário).
  useEffect(() => {
    const capturer = product?.capturer || formData.capturer
    if (capturer && users.length > 0) {
      setCapturerOtherMode(!users.some(u => u.name === capturer))
    } else {
      setCapturerOtherMode(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.capturer, users.length])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || null,
        type: (product.type as PropertyTypeValue) || "apartment",
        category: (product.category as PropertyCategoryValue) || "off-plan",
        description: product.description || "",
        capture_date: product.capture_date ? String(product.capture_date).split('T')[0] : "",
        capturer: product.capturer || "",
        payment_condition: product.payment_condition || "",
        exchange_car: product.exchange_car || false,
        exchange_property: product.exchange_property || false,
        exclusivity: product.exclusivity || false,
        bedrooms: product.bedrooms ?? "",
        suites: product.suites ?? "",
        parking_spots: product.parking_spots ?? "",
        bathrooms: product.bathrooms ?? "",
        total_area: product.total_area || "",
        private_area: product.private_area || "",
        condo_fee: product.condo_fee || "",
        address: product.address || "",
        neighborhood: product.neighborhood || "",
        city: product.city || "",
        state: product.state || "",
        country: product.country || "Brasil",
        available_for_sale: product.available_for_sale !== false,
        status: (product.status || (product.available_for_sale === false ? 'inactive' : 'available')) as ProductStatus,
      })
      setShowImageUpload(true)
      loadProductImages(product.id)
    } else {
      setFormData({ ...emptyForm, name: initialName || "" })
      setShowImageUpload(true) // mostra seção de fotos também no modo novo
      setImages([])
    }
    setImageUploading(false)
    setPendingFiles([])
  }, [product, initialName, open])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 20 * 1024 * 1024
    const currentCount = images.length + pendingFiles.length
    const validFiles: File[] = []

    selectedFiles.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast({ title: t('error'), description: `Tipo inválido: ${file.name}`, variant: "destructive" })
        return
      }
      if (file.size > maxSize) {
        toast({ title: t('error'), description: `Arquivo muito grande: ${file.name}`, variant: "destructive" })
        return
      }
      if (currentCount + validFiles.length >= 10) {
        toast({ title: t('error'), description: 'Limite de 10 fotos atingido', variant: "destructive" })
        return
      }
      validFiles.push(file)
    })

    if (validFiles.length === 0) return

    // Limpa input pra permitir re-selecionar os mesmos arquivos
    if (fileInputRef.current) fileInputRef.current.value = ''

    // Modo NOVO imóvel: acumula localmente, upload ocorre no submit
    if (!product) {
      setPendingFiles((prev) => [...prev, ...validFiles])
      return
    }

    // Modo EDIÇÃO: upload imediato (comportamento anterior)
    try {
      setImageUploading(true)
      if (validFiles.length === 1) {
        await api.products.uploadImage(product.id, validFiles[0], validFiles[0].name)
        toast({ title: t('success'), description: 'Foto enviada com sucesso' })
      } else {
        const result = await api.products.uploadMultipleImages(product.id, validFiles)
        toast({ title: t('success'), description: `${result.uploaded} fotos enviadas` })
      }
      await loadProductImages(product.id)
    } catch (error) {
      toast({ title: t('error'), description: 'Falha ao enviar fotos', variant: "destructive" })
    } finally {
      setImageUploading(false)
    }
  }

  const handlePendingRemove = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImageDelete = async (imageId: number) => {
    if (!product) return
    try {
      setImageUploading(true)
      await api.products.deleteImage(product.id, imageId)
      toast({ title: t('success'), description: 'Foto removida' })
      await loadProductImages(product.id)
    } catch (error) {
      toast({ title: t('error'), description: 'Falha ao remover foto', variant: "destructive" })
    } finally {
      setImageUploading(false)
    }
  }

  const handleSetThumbnail = async (imageId: number) => {
    if (!product) return
    try {
      setImageUploading(true)
      await api.products.updateImage(product.id, imageId, { is_thumbnail: true })
      toast({ title: t('success'), description: 'Capa atualizada' })
      await loadProductImages(product.id)
    } catch (error) {
      toast({ title: t('error'), description: 'Falha ao atualizar capa', variant: "destructive" })
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Modo edição: fluxo original (upload de fotos é imediato)
    if (product || pendingFiles.length === 0) {
      onSubmit(formData)
      return
    }

    // Modo novo COM fotos pendentes: precisa do id retornado pelo onSubmit
    try {
      setImageUploading(true)
      const created = await onSubmit(formData)
      if (created && typeof created === 'object' && 'id' in created) {
        try {
          await api.products.uploadMultipleImages(created.id, pendingFiles)
          toast({ title: t('success'), description: `${pendingFiles.length} foto(s) enviada(s)` })
        } catch {
          toast({
            title: t('error'),
            description: 'Imóvel criado, mas houve falha no upload das fotos. Tente novamente na edição.',
            variant: 'destructive',
          })
        }
      }
    } finally {
      setImageUploading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[800px] max-h-[95vh] flex flex-col"
          {...(isMobile && { onOpenAutoFocus: (e) => e.preventDefault() })}
        >
          <DialogHeader>
            <DialogTitle>{product ? t('editProduct') : t('newProduct')}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-1">
            <form id="product-form" onSubmit={handleSubmit} className="space-y-4 pb-4">

              {/* Identificação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">{t('propertyType')}</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as PropertyTypeValue })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {propertyTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{t('propertyCategory')}</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as PropertyCategoryValue })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {propertyCategoryOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capture_date">Data de Captação</Label>
                  <Input id="capture_date" type="date" value={formData.capture_date} onChange={(e) => setFormData({ ...formData, capture_date: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capturer">Captador</Label>
                  <Select
                    value={capturerOtherMode ? "other" : (formData.capturer || "none")}
                    onValueChange={(v) => {
                      if (v === "other") {
                        setCapturerOtherMode(true)
                        setFormData({ ...formData, capturer: "" })
                      } else {
                        setCapturerOtherMode(false)
                        setFormData({ ...formData, capturer: v === "none" ? "" : v })
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o captador" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                      ))}
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {capturerOtherMode && (
                    <Input
                      placeholder="Nome do captador"
                      value={formData.capturer}
                      onChange={(e) => setFormData({ ...formData, capturer: e.target.value })}
                      autoFocus
                    />
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="payment_condition">Condição de Pagamento</Label>
                  <Input id="payment_condition" value={formData.payment_condition} onChange={(e) => setFormData({ ...formData, payment_condition: e.target.value })} />
                </div>
              </div>

              {/* Permuta + Exclusividade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Aceita permuta por automóvel?</Label>
                  <Select value={formData.exchange_car ? "sim" : "nao"} onValueChange={(v) => setFormData({ ...formData, exchange_car: v === "sim" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aceita permuta por imóvel?</Label>
                  <Select value={formData.exchange_property ? "sim" : "nao"} onValueChange={(v) => setFormData({ ...formData, exchange_property: v === "sim" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Exclusividade?</Label>
                  <Select value={formData.exclusivity ? "sim" : "nao"} onValueChange={(v) => setFormData({ ...formData, exclusivity: v === "sim" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Características */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Quartos</Label>
                  <Input id="bedrooms" type="number" min="0" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value === "" ? "" : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suites">Suítes</Label>
                  <Input id="suites" type="number" min="0" value={formData.suites} onChange={(e) => setFormData({ ...formData, suites: e.target.value === "" ? "" : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parking_spots">Vagas</Label>
                  <Input id="parking_spots" type="number" min="0" value={formData.parking_spots} onChange={(e) => setFormData({ ...formData, parking_spots: e.target.value === "" ? "" : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input id="bathrooms" type="number" min="0" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value === "" ? "" : Number(e.target.value) })} />
                </div>
              </div>

              {/* Áreas e valores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_area">Área Total (m²)</Label>
                  <Input id="total_area" type="number" step="0.01" min="0" value={formData.total_area} onChange={(e) => setFormData({ ...formData, total_area: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="private_area">Área Privativa (m²)</Label>
                  <Input id="private_area" type="number" step="0.01" min="0" value={formData.private_area} onChange={(e) => setFormData({ ...formData, private_area: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condo_fee">Condomínio (R$)</Label>
                  <Input id="condo_fee" type="number" step="0.01" min="0" value={formData.condo_fee} onChange={(e) => setFormData({ ...formData, condo_fee: e.target.value })} />
                </div>
              </div>

              {/* Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input id="neighborhood" value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Município</Label>
                  <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input id="country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                </div>
              </div>

              {/* Status do imóvel + Preço.
                  Status substitui o antigo 'Disponível para venda?' boolean.
                  available_for_sale ainda existe e é sincronizado: status
                  'available' → true, 'inactive'/'sold' → false. 'sold' é
                  setado automaticamente quando uma venda do imóvel é aprovada
                  no módulo Vendas — pode ser ajustado manualmente também. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status do imóvel</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({
                      ...formData,
                      status: v as ProductStatus,
                      available_for_sale: v === 'available',
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="sold">Vendido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">{t('price')}</Label>
                  <CurrencyInput id="price" value={formData.price} onChange={(price) => setFormData({ ...formData, price })} />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>

              {/* Fotos */}
              {showImageUpload && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Fotos</Label>
                    <Badge variant="secondary">{images.length + pendingFiles.length}/10 fotos</Badge>
                  </div>

                  {!product && pendingFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      As fotos serão enviadas ao salvar o imóvel.
                    </p>
                  )}

                  {/* Fotos já salvas (modo edição) */}
                  {product && images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {images.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border">
                            <img
                              src={api.products.getImageUrl(product.id, image.id)}
                              alt={image.alt_text || `Foto ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setFullscreenCarousel({ open: true, initialIndex: index })}
                              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg' }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button type="button" size="sm" variant="secondary" onClick={() => setFullscreenCarousel({ open: true, initialIndex: index })} className="h-7 w-7 p-0">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!image.is_thumbnail && (
                              <Button type="button" size="sm" variant="secondary" onClick={() => handleSetThumbnail(image.id)} disabled={imageUploading} className="h-7 w-7 p-0">
                                <Star className="h-3 w-3" />
                              </Button>
                            )}
                            <Button type="button" size="sm" variant="destructive" onClick={() => handleImageDelete(image.id)} disabled={imageUploading} className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {image.is_thumbnail && (
                            <Badge className="absolute top-1 left-1 text-xs py-0">Capa</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fotos pendentes (ainda não enviadas ao servidor) */}
                  {pendingFiles.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {pendingFiles.map((file, index) => {
                        const previewUrl = URL.createObjectURL(file)
                        return (
                          <div key={`pending-${index}`} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden border">
                              <img
                                src={previewUrl}
                                alt={`Pendente ${index + 1}`}
                                className="w-full h-full object-cover"
                                onLoad={() => URL.revokeObjectURL(previewUrl)}
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handlePendingRemove(index)}
                              disabled={imageUploading}
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Badge variant="outline" className="absolute bottom-1 left-1 text-xs py-0 bg-background/80">
                              Pendente
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {(images.length + pendingFiles.length) < 10 && (
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={imageUploading} className="w-full h-20 border-dashed border-2 hover:border-primary">
                        <div className="flex flex-col items-center gap-1">
                          {imageUploading ? (
                            <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div><span className="text-sm">Enviando...</span></>
                          ) : (
                            <><Upload className="h-5 w-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Clique para adicionar fotos (máx. 10)</span></>
                          )}
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </form>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={loading} form="product-form">{loading ? t('saving') : t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FullscreenCarousel
        productId={product?.id || 0}
        images={images}
        initialIndex={fullscreenCarousel.initialIndex}
        open={fullscreenCarousel.open}
        onOpenChange={(open) => setFullscreenCarousel({ ...fullscreenCarousel, open })}
      />
    </>
  )
}
