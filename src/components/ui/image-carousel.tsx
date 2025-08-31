"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { api, type ProductImage } from '@/lib/api-client'

interface ImageCarouselProps {
  productId: number
  images: ProductImage[]
  className?: string
  showThumbnails?: boolean
  autoplay?: boolean
  onClick?: (imageIndex: number) => void
}

interface FullscreenCarouselProps {
  productId: number
  images: ProductImage[]
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageCarousel({
  productId,
  images,
  className,
  showThumbnails = true,
  autoplay = false,
  onClick
}: ImageCarouselProps) {
  const options: EmblaOptionsType = { loop: true, duration: 0 }
  const plugins = autoplay ? [Autoplay({ delay: 4000 })] : []
  
  const [emblaRef, emblaApi] = useEmblaCarousel(options, plugins)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

  const onInit = useCallback((emblaApi: any) => {
    setScrollSnaps(emblaApi.scrollSnapList())
  }, [])

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    onInit(emblaApi)
    onSelect(emblaApi)
    emblaApi.on('reInit', onInit)
    emblaApi.on('select', onSelect)
  }, [emblaApi, onInit, onSelect])

  if (!images || images.length === 0) {
    return (
      <div className={cn("relative bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="text-muted-foreground">No images available</div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Main carousel */}
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="flex-[0_0_100%] min-w-0 relative cursor-pointer"
              onClick={() => onClick?.(index)}
            >
              <img
                src={api.products.getImageUrl(productId, image.id)}
                alt={image.alt_text || `Product image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder.svg'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/90 hover:bg-white"
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/90 hover:bg-white"
            onClick={() => emblaApi?.scrollNext()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors",
                index === selectedIndex ? "border-primary" : "border-muted"
              )}
              onClick={() => scrollTo(index)}
            >
              <img
                src={api.products.getImageUrl(productId, image.id)}
                alt={image.alt_text || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder.svg'
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Dots indicator (when thumbnails are hidden) */}
      {!showThumbnails && images.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === selectedIndex ? "bg-primary" : "bg-muted"
              )}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FullscreenCarousel({
  productId,
  images,
  initialIndex,
  open,
  onOpenChange
}: FullscreenCarouselProps) {
  const options: EmblaOptionsType = { loop: true, startIndex: initialIndex, duration: 0 }
  const [emblaRef, emblaApi] = useEmblaCarousel(options)
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    onSelect(emblaApi)
    emblaApi.on('select', onSelect)
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (emblaApi && open) {
      emblaApi.scrollTo(initialIndex)
    }
  }, [emblaApi, initialIndex, open])

  if (!images || images.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-lg w-full h-[90vh] p-0 bg-black">
        <div className="relative h-full flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Image counter */}
          <div className="absolute left-4 top-4 z-10 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Main carousel */}
          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {images.map((image, index) => (
                <div key={image.id} className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center">
                  <img
                    src={api.products.getImageUrl(productId, image.id)}
                    alt={image.alt_text || `Product image ${index + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder.svg'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={() => emblaApi?.scrollPrev()}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={() => emblaApi?.scrollNext()}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Bottom thumbnails */}
          {images.length > 1 && (
            <div className="p-4 bg-black/80">
              <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors",
                      index === selectedIndex ? "border-white" : "border-white/30"
                    )}
                    onClick={() => emblaApi?.scrollTo(index)}
                  >
                    <img
                      src={api.products.getImageUrl(productId, image.id)}
                      alt={image.alt_text || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder.svg'
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}