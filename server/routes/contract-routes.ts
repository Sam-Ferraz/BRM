import { Response, Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { ContractService } from '../services/contract-service.js'
import { ContractStatus, ContractDocumentType } from '../types/index.js'
import { authenticateToken, requireAccount, AuthenticatedRequest } from '../middleware/auth.js'

/**
 * /api/contracts — módulo Contrato.
 *
 * Nota sobre roles enquanto o módulo Usuários não volta:
 *   • Corretor  (broker)  — só vê próprios contratos (filtrado no listAll)
 *   • Jurídico  (admin ou manager) — vê todos, pode aprovar/rejeitar na
 *     etapa "awaiting_legal"
 *   • Gestor    (admin ou manager) — vê todos, aprova/rejeita na etapa
 *     "awaiting_manager"
 *
 * Quando module Usuários voltar, adicionaremos role 'legal' dedicada.
 */
export function createContractRoutes(service: ContractService): Router {
  const router = Router()

  // Storage local pra anexos de contrato (docs + contrato final).
  // Padrão: server/dist/../../uploads/contracts/<contractId>/
  const uploadsBase = path.resolve(
    process.env.LOCAL_STORAGE_PATH || './uploads',
    'contracts'
  )
  if (!fs.existsSync(uploadsBase)) fs.mkdirSync(uploadsBase, { recursive: true })

  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const contractId = (req as any).params?.id || 'unknown'
      const dir = path.join(uploadsBase, String(contractId))
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (_req, file, cb) => {
      // Nome único: timestamp-nome_saneado
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${safeName}`)
    },
  })
  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB por arquivo
  })

  // ---------- Listagens ----------

  router.get('/', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const status = req.query.status as ContractStatus | 'all' | undefined
      const search = req.query.search as string | undefined
      const viewAll = req.query.viewAll === '1'
      const role = req.user!.role
      const canSeeAll = (role === 'admin' || role === 'manager') && viewAll
      const userId = canSeeAll ? undefined : req.user!.userId

      const result = await service.list(accountId, { status, search, userId })
      res.json(result)
    } catch (error) {
      console.error('Error listing contracts:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/counts', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const role = req.user!.role
      const viewAll = req.query.viewAll === '1'
      const canSeeAll = (role === 'admin' || role === 'manager') && viewAll
      const counts = await service.getCounts(accountId, canSeeAll ? undefined : req.user!.userId)
      res.json({ data: counts })
    } catch (error) {
      console.error('Error getting contract counts:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const contract = await service.getById(accountId, parseInt(req.params.id))
      res.json({ data: contract })
    } catch (error) {
      if (error instanceof Error && error.message === 'Contract not found') {
        res.status(404).json({ error: error.message })
        return
      }
      console.error('Error getting contract:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/:id/documents', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const docs = await service.listDocuments(accountId, parseInt(req.params.id))
      res.json({ data: docs })
    } catch (error) {
      console.error('Error listing contract documents:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // ---------- Upload de anexos ----------

  router.post(
    '/:id/documents',
    authenticateToken,
    requireAccount,
    upload.single('file'),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const accountId = req.user!.accountId
        const contractId = parseInt(req.params.id)
        const docType = (req.body.doc_type as ContractDocumentType) || 'client_doc'
        const file = (req as any).file as Express.Multer.File | undefined
        if (!file) {
          res.status(400).json({ error: 'file is required' })
          return
        }

        // URL relativa servida via /uploads/... (express.static do server/index.ts)
        const relPath = path.relative(
          path.resolve(process.env.LOCAL_STORAGE_PATH || './uploads'),
          file.path
        )
        const fileUrl = `/uploads/${relPath.replace(/\\/g, '/')}`

        const doc = await service.addDocument(accountId, {
          contract_id: contractId,
          uploader_id: req.user!.userId,
          doc_type: docType,
          filename: file.originalname,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.mimetype,
          notes: req.body.notes,
        })
        res.status(201).json({ data: doc })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro'
        res.status(400).json({ error: msg })
      }
    }
  )

  router.delete('/:contractId/documents/:documentId', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const ok = await service.removeDocument(accountId, parseInt(req.params.documentId))
      res.json({ success: ok })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      res.status(400).json({ error: msg })
    }
  })

  // ---------- Transições de status ----------

  router.post('/:id/submit-legal', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const updated = await service.submitToLegal(accountId, parseInt(req.params.id))
      res.json({ data: updated })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      res.status(400).json({ error: msg })
    }
  })

  router.post('/:id/resubmit-legal', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user!.accountId
      const updated = await service.resubmitToLegal(accountId, parseInt(req.params.id))
      res.json({ data: updated })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      res.status(400).json({ error: msg })
    }
  })

  router.post('/:id/legal-approve', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      res.status(403).json({ error: 'forbidden' }); return
    }
    try {
      const accountId = req.user!.accountId
      const updated = await service.legalApprove(accountId, {
        contractId: parseInt(req.params.id),
        reviewerId: req.user!.userId,
        notes: req.body?.notes,
      })
      res.json({ data: updated })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      res.status(400).json({ error: msg })
    }
  })

  router.post('/:id/legal-reject', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      res.status(403).json({ error: 'forbidden' }); return
    }
    try {
      const accountId = req.user!.accountId
      const updated = await service.legalReject(accountId, {
        contractId: parseInt(req.params.id),
        reviewerId: req.user!.userId,
        notes: req.body?.notes,
      })
      res.json({ data: updated })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      res.status(400).json({ error: msg })
    }
  })

  router.post('/:id/manager-approve', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      res.status(403).json({ error: 'forbidden' }); return
    }
    try {
      const accountId = req.user!.accountId
      const updated = await service.managerApprove(accountId, {
        contractId: parseInt(req.params.id),
        reviewerId: req.user!.userId,
        notes: req.body?.notes,
        finalValue: req.body?.final_value,
      })
      res.json({ data: updated })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      res.status(400).json({ error: msg })
    }
  })

  router.post('/:id/manager-reject', authenticateToken, requireAccount, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      res.status(403).json({ error: 'forbidden' }); return
    }
    try {
      const accountId = req.user!.accountId
      const updated = await service.managerReject(accountId, {
        contractId: parseInt(req.params.id),
        reviewerId: req.user!.userId,
        notes: req.body?.notes,
      })
      res.json({ data: updated })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro'
      res.status(400).json({ error: msg })
    }
  })

  return router
}
