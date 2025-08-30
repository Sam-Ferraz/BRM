"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Badge } from "@/components/ui/badge"
import { ImageCarousel, FullscreenCarousel } from "@/components/ui/image-carousel"
import { Upload, X, Image as ImageIcon, Star, Trash2, Eye } from "lucide-react"
import { api, type Product, type ProductImage } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface ProductFormProps {
  product?: Product
  initialName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Product, "id"> | Partial<Product>) => void
  loading?: boolean
  onProductUpdated?: (product: Product) => void
}

export function ProductForm({ product, initialName, open, onOpenChange, onSubmit, loading, onProductUpdated }: ProductFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    price: null as number | null,
    category: "",
    stock: 0,
    description: "",
  })
  
  // Image management state
  const [images, setImages] = useState<ProductImage[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [fullscreenCarousel, setFullscreenCarousel] = useState<{ open: boolean; initialIndex: number }>({ open: false, initialIndex: 0 })

  const loadProductImages = async (productId: number) => {
    try {
      const result = await api.products.getImages(productId)
      setImages(result.images)
    } catch (error) {
      console.error('Error loading product images:', error)
    }
  }

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || null,
        category: product.category || "",
        stock: product.stock || 0,
        description: product.description || "",
      })
      setShowImageUpload(true)
      loadProductImages(product.id)
    } else {
      setFormData({
        name: initialName || "",
        price: null,
        category: "",
        stock: 0,
        description: "",
      })
      setShowImageUpload(false)
      setImages([])
    }
    
    // Reset image state when dialog opens/closes
    setImageUploading(false)
  }, [product, initialName, open])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 20 * 1024 * 1024 // 20MB

    const validFiles: File[] = []

    // Validate each file
    selectedFiles.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t('error'),
          description: `Invalid file type for ${file.name}. Only JPEG, PNG, WebP, and GIF images are allowed.`,
          variant: "destructive",
        })
        return
      }

      if (file.size > maxSize) {
        toast({
          title: t('error'),
          description: `File ${file.name} is too large. Maximum allowed size is 20MB.`,
          variant: "destructive",
        })
        return
      }

      validFiles.push(file)
    })

    if (validFiles.length === 0) return

    // Auto-upload immediately after validation
    if (product) {
      try {
        setImageUploading(true)
        
        let result
        if (validFiles.length === 1) {
          // Single upload
          result = await api.products.uploadImage(product.id, validFiles[0], validFiles[0].name)
          toast({
            title: t('success'),
            description: result.message || 'Image uploaded successfully',
          })
        } else {
          // Multiple upload
          result = await api.products.uploadMultipleImages(product.id, validFiles)
          
          if (result.errors && result.errors.length > 0) {
            toast({
              title: 'Partial Upload',
              description: `${result.uploaded} of ${result.total} images uploaded successfully. ${result.errors.length} failed.`,
              variant: "default",
            })
          } else {
            toast({
              title: t('success'),
              description: result.message || `${result.uploaded} images uploaded successfully`,
            })
          }
        }
        
        // Reload images
        await loadProductImages(product.id)
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
      } catch (error) {
        console.error('Error uploading images:', error)
        toast({
          title: t('error'),
          description: error instanceof Error ? error.message : 'Failed to upload images',
          variant: "destructive",
        })
      } finally {
        setImageUploading(false)
      }
    }
  }


  const handleImageDelete = async (imageId: number) => {
    if (!product) return

    try {
      setImageUploading(true)
      const result = await api.products.deleteImage(product.id, imageId)
      
      toast({
        title: t('success'),
        description: result.message || 'Image deleted successfully',
      })
      
      // Reload images
      await loadProductImages(product.id)
      
    } catch (error) {
      console.error('Error deleting image:', error)
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : 'Failed to delete image',
        variant: "destructive",
      })
    } finally {
      setImageUploading(false)
    }
  }

  const handleSetThumbnail = async (imageId: number) => {
    if (!product) return

    try {
      setImageUploading(true)
      const result = await api.products.updateImage(product.id, imageId, { is_thumbnail: true })
      
      toast({
        title: t('success'),
        description: result.message || 'Thumbnail updated successfully',
      })
      
      // Reload images
      await loadProductImages(product.id)
      
    } catch (error) {
      console.error('Error updating thumbnail:', error)
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : 'Failed to update thumbnail',
        variant: "destructive",
      })
    } finally {
      setImageUploading(false)
    }
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSubmit(formData)
  }

  const openFullscreenCarousel = (index: number) => {
    setFullscreenCarousel({ open: true, initialIndex: index })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{product ? t('editProduct') : t('newProduct')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Product Information */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  tabIndex={1}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{t('price')}</Label>
                  <CurrencyInput
                    id="price"
                    value={formData.price}
                    onChange={(price) => setFormData({ ...formData, price })}
                    tabIndex={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">
                    {t('stock')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
                    required
                    tabIndex={4}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">{t('category')}</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  tabIndex={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  tabIndex={5}
                />
              </div>
            </div>
            
            {/* Image Management Section */}
            {showImageUpload && product && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Product Images</Label>
                  <Badge variant="secondary">{images.length} image{images.length !== 1 ? 's' : ''}</Badge>
                </div>
                
                {/* Current Images Display */}
                {images.length > 0 && (
                  <div className="space-y-4">
                    {/* Carousel Preview */}
                    <div className="w-full">
                      <ImageCarousel
                        productId={product.id}
                        images={images}
                        className="h-32"
                        showThumbnails={false}
                        onClick={openFullscreenCarousel}
                      />
                    </div>
                    
                    {/* Image Management Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {images.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border">
                            <img
                              src={api.products.getImageUrl(product.id, image.id)}
                              alt={image.alt_text || `Image ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openFullscreenCarousel(index)}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/placeholder.svg'
                              }}
                            />
                          </div>
                          
                          {/* Image Controls */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => openFullscreenCarousel(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {!image.is_thumbnail && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSetThumbnail(image.id)}
                                disabled={imageUploading}
                                className="h-8 w-8 p-0"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleImageDelete(image.id)}
                              disabled={imageUploading}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Thumbnail Badge */}
                          {image.is_thumbnail && (
                            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                              <Star className="w-3 h-3 mr-1" />
                              Thumbnail
                            </Badge>
                          )}
                          
                          {/* Display Order */}
                          <Badge variant="secondary" className="absolute top-2 right-2">
                            #{image.display_order}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Image Upload Section */}
                <div className="space-y-4 border-t pt-4">
                  <Label>Add New Images</Label>
                  
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="w-full h-24 border-dashed border-2 hover:border-primary"
                    >
                      <div className="flex flex-col items-center gap-2">
                        {imageUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="text-sm">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Click to select and upload images
                            </span>
                            <span className="text-xs text-muted-foreground">
                              JPG, PNG, WebP, GIF (max 20MB each)
                            </span>
                          </>
                        )}
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            </form>
          </div>
          
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} tabIndex={6}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} tabIndex={7} form="product-form">
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Carousel */}
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