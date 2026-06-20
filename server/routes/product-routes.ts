import { Request, Response, Router } from 'express'
import { ProductService } from '../services/index.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'
import storageService from '../services/storage-service.js'
import { uploadSingle, uploadMultiple, handleUploadErrors } from '../middleware/upload.js'

export function createProductRoutes(productService: ProductService): Router {
  const router = Router()

  // Public endpoint to get products (hardcoded response for security and testing)
  router.get('/public', (req: Request, res: Response): void => {
    const hardcodedResponse = {
      "data": [
        {
          "id": 7,
          "name": "AAAA",
          "type": "asd",
          "category": "completed",
          "description": "sdsa",
          "created_at": "2025-08-13T19:41:31.563Z",
          "updated_at": "2025-08-31T11:42:39.643Z",
          "price": "200.00",
          "has_thumbnail": true
        },
        {
          "id": 6,
          "name": "Backup Automático",
          "type": "Infraestrutura",
          "category": "completed",
          "description": "Sistema de backup automático",
          "created_at": "2025-08-10T09:36:04.950Z",
          "updated_at": "2025-08-30T19:46:49.297Z",
          "price": null,
          "has_thumbnail": true
        },
        {
          "id": 2,
          "name": "Consultoria Premium",
          "type": "Serviços",
          "category": "completed",
          "description": "Consultoria especializada em TI",
          "created_at": "2025-08-10T09:36:04.950Z",
          "updated_at": "2025-08-10T09:36:04.950Z",
          "price": null,
          "has_thumbnail": true
        },
        {
          "id": 4,
          "name": "Suporte Técnico",
          "type": "Serviços",
          "category": "completed",
          "description": "Suporte técnico 24/7",
          "created_at": "2025-08-10T09:36:04.950Z",
          "updated_at": "2025-08-10T09:36:04.950Z",
          "price": null,
          "has_thumbnail": false
        },
        {
          "id": 1,
          "name": "Software ERP Basic",
          "type": "Software",
          "category": "completed",
          "description": "Sistema básico de gestão empresarial",
          "created_at": "2025-08-10T09:36:04.950Z",
          "updated_at": "2025-08-30T19:46:09.585Z",
          "price": null,
          "has_thumbnail": false
        },
        {
          "id": 3,
          "name": "Hosting Cloud Pro",
          "type": "Infraestrutura",
          "category": "completed",
          "description": "Hospedagem em nuvem profissional",
          "created_at": "2025-08-10T09:36:04.950Z",
          "updated_at": "2025-08-10T09:36:04.950Z",
          "price": null,
          "has_thumbnail": false
        },
        {
          "id": 5,
          "name": "Website Custom",
          "type": "Desenvolvimento",
          "category": "completed",
          "description": "Website personalizado",
          "created_at": "2025-08-10T09:36:04.950Z",
          "updated_at": "2025-08-10T09:36:04.950Z",
          "price": null,
          "has_thumbnail": false
        }
      ],
      "total": 7
    }
    
    res.json(hardcodedResponse)
  })

  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const filters = {
        search: req.query.search as string,
        type: req.query.type as string,
        category: req.query.category as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }
      
      const result = await productService.getAllProducts(filters)
      res.json(result)
    } catch (error) {
      console.error('Error in get products route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, price, type, category, description } = req.body
      const product = await productService.createProduct({ name, price, type, category, description })
      res.json(product)
    } catch (error) {
      console.error('Error in create product route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const { name, price, type, category, description } = req.body
      const product = await productService.updateProduct(id, { name, price, type, category, description })
      res.json(product)
    } catch (error) {
      console.error('Error in update product route:', error)
      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Toggle de visibilidade na Vitrine (sem precisar mandar o produto inteiro)
  router.patch('/:id/availability', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const { available_for_sale } = req.body
      if (typeof available_for_sale !== 'boolean') {
        res.status(400).json({ error: 'available_for_sale (boolean) is required' })
        return
      }
      const product = await productService.setAvailability(id, available_for_sale)
      res.json(product)
    } catch (error) {
      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      console.error('Error in patch availability route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await productService.deleteProduct(id)
      
      // Clean up storage files if they exist
      if (result.imagePaths.length > 0) {
        try {
          await storageService.deleteProductFiles(result.imagePaths)
        } catch (s3Error) {
          console.error('Error deleting images from S3:', s3Error)
          // Don't fail the product deletion if image cleanup fails
        }
      }
      
      res.json({ success: true })
    } catch (error) {
      console.error('Error in delete product route:', error)
      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Product Images routes

  // Get all images for a product
  router.get('/:id/images', async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await productService.getProductImages(id)
      res.json(result)
    } catch (error) {
      console.error('Error in get product images route:', error)
      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Upload new image for a product
  router.post('/:id/images', authenticateToken, uploadSingle, handleUploadErrors, async (req: any, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const { alt_text } = req.body
      
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' })
        return
      }
      
      // Upload new image to storage
      const filePath = await storageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        id
      )
      
      const result = await productService.addProductImage(id, filePath, alt_text || req.file.originalname)
      res.json(result)
    } catch (error) {
      console.error('Error in upload product image route:', error)
      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
    }
  })

  // Upload multiple images for a product
  router.post('/:id/images/bulk', authenticateToken, uploadMultiple, handleUploadErrors, async (req: any, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      
      if (!req.files || req.files.length === 0) {
        res.status(400).json({ error: 'No image files provided' })
        return
      }
      
      const uploadPromises = req.files.map(async (file: Express.Multer.File) => {
        const filePath = await storageService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          id
        )
        return { url: filePath, altText: file.originalname }
      })
      
      const imageData = await Promise.all(uploadPromises)
      const result = await productService.addMultipleProductImages(id, imageData)
      res.json(result)
    } catch (error) {
      console.error('Error in bulk upload product images route:', error)
      if (error instanceof Error && error.message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
    }
  })

  // Get individual image file
  router.get('/:id/images/:imageId', async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const imageId = parseInt(req.params.imageId)
      
      const image = await productService.getProductImage(id, imageId)
      
      // Stream image from storage
      const fileData = await storageService.getFile(image.image_url)
      
      // Set appropriate headers
      res.set({
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.contentLength.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Last-Modified': fileData.lastModified.toUTCString()
      })
      
      // Stream the file
      fileData.body.pipe(res)
    } catch (error) {
      console.error('Error in get product image route:', error)
      if (error instanceof Error && (error.message === 'Image not found' || error.message === 'File not found')) {
        res.status(404).json({ error: 'Image not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Update image (set as thumbnail, change order, update alt text)
  router.put('/:id/images/:imageId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const imageId = parseInt(req.params.imageId)
      const { is_thumbnail, display_order, alt_text } = req.body
      
      const result = await productService.updateProductImage(id, imageId, {
        is_thumbnail,
        display_order,
        alt_text
      })
      
      res.json(result)
    } catch (error) {
      console.error('Error in update product image route:', error)
      if (error instanceof Error && (error.message === 'Image not found' || error.message === 'No updates provided')) {
        res.status(404).json({ error: error.message })
        return
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
    }
  })

  // Delete individual image
  router.delete('/:id/images/:imageId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const imageId = parseInt(req.params.imageId)
      
      const result = await productService.deleteProductImage(id, imageId)
      
      // Delete from storage
      try {
        await storageService.deleteFile(result.image.image_url)
      } catch (s3Error) {
        console.error('Error deleting image from S3:', s3Error)
        // Don't fail the deletion if S3 cleanup fails
      }
      
      res.json(result)
    } catch (error) {
      console.error('Error in delete product image route:', error)
      if (error instanceof Error && error.message === 'Image not found') {
        res.status(404).json({ error: 'Image not found' })
        return
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
    }
  })

  // Get product thumbnail URL (for quick access)
  router.get('/:id/thumbnail', async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const thumbnail = await productService.getProductThumbnail(id)
      
      // Stream image from storage
      const fileData = await storageService.getFile(thumbnail.image_url)
      
      // Set appropriate headers
      res.set({
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.contentLength.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Last-Modified': fileData.lastModified.toUTCString()
      })
      
      // Stream the file
      fileData.body.pipe(res)
    } catch (error) {
      console.error('Error in get product thumbnail route:', error)
      if (error instanceof Error && (error.message === 'No thumbnail found' || error.message === 'File not found')) {
        res.status(404).json({ error: 'Thumbnail not found' })
        return
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
