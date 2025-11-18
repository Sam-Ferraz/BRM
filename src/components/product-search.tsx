"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { api, type Product } from "@/lib/api-client"
import { ProductForm } from "@/components/forms/product-form"

interface ProductSearchProps {
  value?: string
  onSelect: (productName: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ProductSearch({
  value,
  onSelect,
  placeholder,
  disabled,
  className,
}: ProductSearchProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [showProductForm, setShowProductForm] = useState(false)
  const [productFormLoading, setProductFormLoading] = useState(false)
  const commandListRef = useRef<HTMLDivElement>(null)

  const loadProducts = useCallback(async (search?: string) => {
    try {
      setLoading(true)
      const response = await api.products.getAll(search ? { search } : {})
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadProducts()
    }
  }, [open, loadProducts])

  // Enable mouse wheel scrolling by adding wheel event handling
  useEffect(() => {
    if (!open) return

    const timeoutId = setTimeout(() => {
      const commandList = commandListRef.current
      if (commandList) {
        // Force enable scroll behavior
        commandList.style.overflowY = 'auto'
        commandList.style.overscrollBehavior = 'contain'
        
        const handleWheel = (e: WheelEvent) => {
          if (commandList.contains(e.target as Node)) {
            // Allow native scrolling by not preventing default
            e.stopPropagation()
          }
        }
        
        commandList.addEventListener('wheel', handleWheel, { passive: true })
        return () => commandList.removeEventListener('wheel', handleWheel)
      }
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [open])

  const handleSearch = useCallback(
    (search: string) => {
      setSearchValue(search)
      if (search.trim()) {
        loadProducts(search)
      } else {
        loadProducts()
      }
    },
    [loadProducts]
  )

  const handleCreateNew = () => {
    if (searchValue.trim()) {
      setOpen(false)
      setShowProductForm(true)
    }
  }

  const handleProductFormSubmit = useCallback(async (productData: Omit<Product, "id">) => {
    try {
      setProductFormLoading(true)
      console.log('Creating product with data:', productData)
      const newProduct = await api.products.create(productData)
      console.log('Product created successfully:', newProduct)
      
      // Update the selected product immediately
      onSelect(newProduct.name)
      
      // Close the product form and clear search
      setShowProductForm(false)
      setSearchValue("")
      
      // Refresh the products list for next time
      loadProducts()
    } catch (error) {
      console.error('Error creating product:', error)
      // Don't rethrow the error to prevent it from bubbling up
    } finally {
      setProductFormLoading(false)
    }
  }, [onSelect, loadProducts])

  const handleProductFormClose = (open: boolean) => {
    setShowProductForm(open)
    if (!open) {
      setSearchValue("")
      // Small delay to prevent focus issues
      setTimeout(() => {
        // Optionally refocus on the search trigger
      }, 100)
    }
  }

  const handleSelectProduct = (productName: string) => {
    onSelect(productName)
    setOpen(false)
    setSearchValue("")
  }

  const displayValue = value || ""
  const showCreateNew = searchValue.trim() && 
    !products.some(product => product.name.toLowerCase() === searchValue.toLowerCase())

  const propertyTypeLabelMap: Record<string, string> = {
    apartment: 'propertyTypeApartment',
    house: 'propertyTypeHouse',
    penthouse: 'propertyTypePenthouse',
    land: 'propertyTypeLand',
    studio: 'propertyTypeStudio',
    flat: 'propertyTypeFlat',
  }

  const getTypeLabel = (type?: string) => {
    if (!type) return ''
    const key = propertyTypeLabelMap[type]
    return key ? t(key) : type
  }

  const categoryLabelMap: Record<string, string> = {
    'off-plan': 'propertyCategoryOffPlan',
    'completed': 'propertyCategoryCompleted',
  }

  const getCategoryLabel = (category?: string) => {
    if (!category) return ''
    const key = categoryLabelMap[category]
    return key ? t(key) : category
  }

  return (
    <div>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {displayValue || placeholder || t('selectProduct')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchProducts')}
            value={searchValue}
            onValueChange={handleSearch}
          />
          <CommandList ref={commandListRef} className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ overscrollBehavior: 'contain' }}>
            {loading && (
              <CommandEmpty>{t('loading')}</CommandEmpty>
            )}
            {!loading && showCreateNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('createNewProduct')}: "{searchValue}"
                </CommandItem>
              </CommandGroup>
            )}
            {!loading && products.length > 0 && (
              <CommandGroup>
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => handleSelectProduct(product.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === product.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {(product.type || product.category || product.price) && (
                        <div className="text-sm text-muted-foreground">
                          {[
                            getTypeLabel(product.type),
                            getCategoryLabel(product.category),
                            product.price,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!loading && !showCreateNew && products.length === 0 && (
              <CommandEmpty>{t('noProductsFound')}</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    {showProductForm && (
      <ProductForm
        initialName={searchValue.trim()}
        open={showProductForm}
        onOpenChange={handleProductFormClose}
        onSubmit={handleProductFormSubmit}
        loading={productFormLoading}
      />
    )}
    </div>
  )
}
