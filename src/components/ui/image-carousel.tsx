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
  // Modo apresentação: passa um intervalo em ms para auto-avançar entre fotos
  autoplayDelayMs?: number
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
  onOpenChange,
  autoplayDelayMs,
}: FullscreenCarouselProps) {
  const options: EmblaOptionsType = { loop: true, startIndex: initialIndex, duration: 0 }
  // Plugin de autoplay condicional — só ativa em "modo apresentação"
  const plugins = autoplayDelayMs ? [Autoplay({ delay: autoplayDelayMs, stopOnInteraction: false })] : []
  const [emblaRef, emblaApi] = useEmblaCarousel(options, plugins)
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

  // Pede ao navegador a tela cheia real (cobre a barra de tarefas do SO).
  // Disparado pela interação do usuário ao abrir a apresentação.
  useEffect(() => {
    if (!open) return
    const el = document.documentElement
    const isFs = () => Boolean(document.fullscreenElement)
    if (!isFs() && el.requestFullscreen) {
      el.requestFullscreen().catch(() => undefined)
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined)
      }
    }
  }, [open])

  if (!images || images.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-none w-screen h-screen p-0 bg-black border-0 rounded-none sm:rounded-none"
        style={{ width: '100vw', height: '100vh', maxWidth: 'none' }}
      >
        <div className="relative h-full w-full flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 sm:right-4 sm:top-4 z-20 text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full h-10 w-10 sm:h-12 sm:w-12"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>

          {/* Image counter */}
          <div className="absolute left-2 top-2 sm:left-4 sm:top-4 z-20 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Main carousel */}
          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {images.map((image, index) => (
                <div key={image.id} className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center p-4 sm:p-8">
                  <img
                    src={api.products.getImageUrl(productId, image.id)}
                    alt={image.alt_text || `Product image ${index + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
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
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full h-12 w-12 sm:h-14 sm:w-14 transition-all duration-200 hover:scale-110"
                onClick={() => emblaApi?.scrollPrev()}
              >
                <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 backdrop-blur-sm bg-black/30 rounded-full h-12 w-12 sm:h-14 sm:w-14 transition-all duration-200 hover:scale-110"
                onClick={() => emblaApi?.scrollNext()}
              >
                <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
              </Button>
            </>
          )}

          {/* Bottom thumbnails */}
          {images.length > 1 && (
            <div className="p-2 sm:p-4 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm">
              <div className="flex gap-2 sm:gap-3 justify-center overflow-x-auto max-w-full scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    className={cn(
                      "flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105",
                      index === selectedIndex 
                        ? "border-white shadow-lg shadow-white/20 scale-110" 
                        : "border-white/30 hover:border-white/60"
                    )}
                    onClick={() => emblaApi?.scrollTo(index)}
                  >
                    <img
                      src={api.products.getImageUrl(productId, image.id)}
                      alt={image.alt_text || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover transition-opacity duration-200 hover:opacity-80"
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