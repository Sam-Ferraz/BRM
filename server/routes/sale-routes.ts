import { Request, Response, Router } from 'express'
import multer from 'multer'
import { SaleService } from '../services/sale-service.js'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js'
import storageService from '../services/storage-service.js'
import { SaleStatus } from '../types/index.js'

/**
 * Upload de contrato em PDF — middleware customizado por estar restrito a
 * application/pdf (até 30.000KB ≈ 30MB). Fica isolado pra não interferir
 * com o middleware de imagens que é usado pelo módulo Produtos.
 */
const uploadContract = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30_000 * 1024 }, // 30.000 KB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('O contrato deve ser um arquivo PDF'))
      return
    }
    cb(null, true)
  },
}).single('contract')

export function createSaleRoutes(saleService: SaleService): Router {
  const router = Router()

  // GET /api/sales — lista com filtros opcionais (status, search, range de data)
  router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const status = (req.query.status as SaleStatus | 'all' | undefined) || 'all'
      const search = req.query.search as string | undefined
      const createdFrom = req.query.createdFrom as string | undefined
      const createdTo = req.query.createdTo as string | undefined
      const result = await saleService.listAll({ status, search, createdFrom, createdTo })
      res.json(result)
    } catch (error) {
      console.error('Error in get sales route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // GET /api/sales/:id
  router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const sale = await saleService.findById(id)
      res.json(sale)
    } catch (error) {
      if (error instanceof Error && error.message === 'Sale not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error in get sale route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PATCH /api/sales/:id — atualiza dados editáveis (sale_date)
  router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const userId = req.user!.userId
      const { sale_date } = req.body
      const updated = await saleService.updateDetails(id, userId, { sale_date })
      res.json(updated)
    } catch (error) {
      if (error instanceof Error && error.message === 'Sale not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error in patch sale route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /api/sales/:id/contract — upload PDF do contrato
  router.post('/:id/contract', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
    uploadContract(req as any, res as any, async (uploadErr: any) => {
      if (uploadErr) {
        res.status(400).json({ error: uploadErr.message || 'Upload error' })
        return
      }
      try {
        const id = parseInt(req.params.id)
        const userId = req.user!.userId
        const file = (req as any).file as Express.Multer.File | undefined
        if (!file) {
          res.status(400).json({ error: 'Arquivo de contrato é obrigatório' })
          return
        }
        // Reutiliza o storage existente — salva em pasta contracts/<sale-id>/.
        const filePath = await storageService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          id
        )
        const updated = await saleService.updateDetails(id, userId, {
          contract_url: filePath,
          contract_filename: file.originalname,
        })
        res.json(updated)
      } catch (error) {
        if (error instanceof Error && error.message === 'Sale not found') {
          res.status(404).json({ error: error.message })
          return
        }
        console.error('Error in upload contract route:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })
  })

  // POST /api/sales/:id/approve
  router.post('/:id/approve', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const userId = req.user!.userId
      const { notes } = req.body || {}
      const updated = await saleService.approve(id, userId, notes)
      res.json(updated)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Sale not found') {
          res.status(404).json({ error: error.message })
          return
        }
        if (error.message.startsWith('Cannot') ||
            error.message.startsWith('Sale date') ||
            error.message.startsWith('Contract')) {
          res.status(400).json({ error: error.message })
          return
        }
      }
      console.error('Error in approve sale route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // DELETE /api/sales/:id — exclui a venda permanentemente
  router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const result = await saleService.deleteSale(id)
      res.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === 'Sale not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error in delete sale route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /api/sales/:id/reject
  router.post('/:id/reject', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id)
      const userId = req.user!.userId
      const { notes } = req.body || {}
      const updated = await saleService.reject(id, userId, notes)
      res.json(updated)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Sale not found') {
          res.status(404).json({ error: error.message })
          return
        }
        if (error.message.startsWith('Cannot')) {
          res.status(400).json({ error: error.message })
          return
        }
      }
      console.error('Error in reject sale route:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
