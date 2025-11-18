import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ProductService } from '../../services/product-service.js'
import { ProductRepository } from '../../repositories/product-repository.js'
import { Product, ProductImage } from '../../types/index.js'

// Mock the ProductRepository
jest.mock('../../repositories/product-repository.js')

const MockedProductRepository = ProductRepository as jest.MockedClass<typeof ProductRepository>

describe('ProductService', () => {
  let productService: ProductService
  let mockProductRepository: jest.Mocked<ProductRepository>

  beforeEach(() => {
    mockProductRepository = new MockedProductRepository() as jest.Mocked<ProductRepository>
    productService = new ProductService(mockProductRepository)
    jest.clearAllMocks()
  })

  describe('getAllProducts', () => {
    const mockProducts: Product[] = [
      {
        id: 1,
        name: 'Test Product',
        price: '100.00',
        type: 'Software',
        description: 'Test product description',
        has_thumbnail: true
      },
      {
        id: 2,
        name: 'Another Product',
        price: '200.00',
        type: 'Hardware',
        description: 'Another product description',
        has_thumbnail: false
      }
    ]

    it('should return all products with filters', async () => {
      // Arrange
      mockProductRepository.findAll.mockResolvedValue(mockProducts)
      const filters = { search: 'test', type: 'Software' }

      // Act
      const result = await productService.getAllProducts(filters)

      // Assert
      expect(result.data).toEqual(mockProducts)
      expect(result.total).toBe(2)
      expect(mockProductRepository.findAll).toHaveBeenCalledWith(filters)
    })

    it('should handle repository errors', async () => {
      // Arrange
      mockProductRepository.findAll.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(productService.getAllProducts({})).rejects.toThrow('Internal server error')
    })
  })

  describe('createProduct', () => {
    const newProductData = {
      name: 'New Product',
      price: '300.00',
      type: 'Services',
      description: 'New product description'
    }

    const createdProduct: Product = {
      id: 3,
      ...newProductData,
      has_thumbnail: false
    }

    it('should create a new product', async () => {
      // Arrange
      mockProductRepository.create.mockResolvedValue(createdProduct)

      // Act
      const result = await productService.createProduct(newProductData)

      // Assert
      expect(result).toEqual(createdProduct)
      expect(mockProductRepository.create).toHaveBeenCalledWith(newProductData)
    })

    it('should handle repository errors', async () => {
      // Arrange
      mockProductRepository.create.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(productService.createProduct(newProductData)).rejects.toThrow('Internal server error')
    })
  })

  describe('deleteProduct', () => {
    const mockProduct: Product = {
      id: 1,
      name: 'Test Product',
      price: '100.00',
      type: 'Software',
      description: 'Test product description'
    }

    it('should delete product and return image paths', async () => {
      // Arrange
      const imagePaths = ['products/1/image1.jpg', 'products/1/image2.jpg']
      mockProductRepository.findById.mockResolvedValue(mockProduct)
      mockProductRepository.getProductImagePaths.mockResolvedValue(imagePaths)
      mockProductRepository.delete.mockResolvedValue(true)

      // Act
      const result = await productService.deleteProduct(1)

      // Assert
      expect(result.success).toBe(true)
      expect(result.imagePaths).toEqual(imagePaths)
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1)
      expect(mockProductRepository.getProductImagePaths).toHaveBeenCalledWith(1)
      expect(mockProductRepository.delete).toHaveBeenCalledWith(1)
    })

    it('should throw error when product not found', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(productService.deleteProduct(999)).rejects.toThrow('Product not found')
    })
  })

  describe('addProductImage', () => {
    const mockProduct: Product = {
      id: 1,
      name: 'Test Product',
      price: '100.00',
      type: 'Software',
      description: 'Test product description'
    }

    const mockImage: ProductImage = {
      id: 1,
      product_id: 1,
      image_url: 'products/1/image.jpg',
      display_order: 1,
      is_thumbnail: true,
      alt_text: 'Test image'
    }

    it('should add product image successfully', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(mockProduct)
      mockProductRepository.getImageCountAndMaxOrder.mockResolvedValue({ count: 0, maxOrder: 0 })
      mockProductRepository.hasThumbnail.mockResolvedValue(false)
      mockProductRepository.addProductImage.mockResolvedValue(mockImage)

      // Act
      const result = await productService.addProductImage(1, 'products/1/image.jpg', 'Test image')

      // Assert
      expect(result.success).toBe(true)
      expect(result.image).toEqual(mockImage)
      expect(result.message).toBe('Image uploaded successfully')
      expect(mockProductRepository.addProductImage).toHaveBeenCalledWith(1, 'products/1/image.jpg', 1, true, 'Test image')
    })

    it('should throw error when product not found', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(productService.addProductImage(999, 'image.jpg', 'alt')).rejects.toThrow('Product not found')
    })
  })

  describe('getProductImages', () => {
    const mockProduct: Product = {
      id: 1,
      name: 'Test Product',
      price: '100.00',
      type: 'Software',
      description: 'Test product description'
    }

    const mockImages: ProductImage[] = [
      {
        id: 1,
        product_id: 1,
        image_url: 'products/1/image1.jpg',
        display_order: 1,
        is_thumbnail: true,
        alt_text: 'Image 1'
      },
      {
        id: 2,
        product_id: 1,
        image_url: 'products/1/image2.jpg',
        display_order: 2,
        is_thumbnail: false,
        alt_text: 'Image 2'
      }
    ]

    it('should return product images', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(mockProduct)
      mockProductRepository.getProductImages.mockResolvedValue(mockImages)

      // Act
      const result = await productService.getProductImages(1)

      // Assert
      expect(result.images).toEqual(mockImages)
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1)
      expect(mockProductRepository.getProductImages).toHaveBeenCalledWith(1)
    })

    it('should throw error when product not found', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(productService.getProductImages(999)).rejects.toThrow('Product not found')
    })
  })
})
