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
import { Upload, X, Image } from "lucide-react"
import { api, type Product } from "@/lib/api-client"
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
    price: "",
    category: "",
    stock: 0,
    description: "",
  })
  
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || "",
        category: product.category || "",
        stock: product.stock || 0,
        description: product.description || "",
      })
      setShowImageUpload(true) // Show image upload section for existing products
    } else {
      setFormData({
        name: initialName || "",
        price: "",
        category: "",
        stock: 0,
        description: "",
      })
      setShowImageUpload(false) // Hide image upload for new products until created
    }
    
    // Reset image state when dialog opens/closes
    setImageFile(null)
    setImagePreview(null)
    setImageUploading(false)
  }, [product, initialName, open])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('error'),
        description: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
        variant: "destructive",
      })
      return
    }

    // Validate file size (20MB)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: t('error'),
        description: 'File size too large. Maximum allowed size is 20MB.',
        variant: "destructive",
      })
      return
    }

    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = async () => {
    if (!imageFile || !product) return

    try {
      setImageUploading(true)
      const result = await api.products.uploadImage(product.id, imageFile)
      
      toast({
        title: t('success'),
        description: result.message || 'Image uploaded successfully',
      })
      
      // Update the product data
      if (onProductUpdated) {
        onProductUpdated(result.product)
      }
      
      // Reset image state
      setImageFile(null)
      setImagePreview(null)
      
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: "destructive",
      })
    } finally {
      setImageUploading(false)
    }
  }

  const handleImageRemove = async () => {
    if (!product) return

    try {
      setImageUploading(true)
      const result = await api.products.deleteImage(product.id)
      
      toast({
        title: t('success'),
        description: result.message || 'Image deleted successfully',
      })
      
      // Update the product data
      if (onProductUpdated) {
        onProductUpdated(result.product)
      }
      
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

  const clearImageSelection = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? t('editProduct') : t('newProduct')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="category">{t('category')}</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              tabIndex={3}
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
          
          {/* Image Upload Section - Only show for existing products */}
          {showImageUpload && (
            <div className="space-y-4 border-t pt-4">
              <Label>Product Image</Label>
              
              {/* Current Image Display */}
              {product?.image_url && !imagePreview && (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={api.products.getImageUrl(product.id)}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleImageRemove}
                      disabled={imageUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 bg-white"
                      onClick={clearImageSelection}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={imageUploading}
                      size="sm"
                    >
                      {imageUploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearImageSelection}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Upload Button/Drag Area */}
              {!imagePreview && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
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
                            Click to select image or drag and drop
                          </span>
                          <span className="text-xs text-muted-foreground">
                            JPG, PNG, WebP, GIF (max 20MB)
                          </span>
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} tabIndex={6}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} tabIndex={7}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}