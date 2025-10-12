import multer from 'multer'
import { Request, Response, NextFunction } from 'express'
import s3Service from '../services/s3-service.js'

// Configure multer to store files in memory (not on disk)
// We'll upload directly to S3 from memory
const storage = multer.memoryStorage()

// File filter to validate uploads
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Validate the file using our S3 service
    s3Service.validateFile(file.originalname, file.mimetype, 0) // Size will be checked later
    cb(null, true)
  } catch (error) {
    cb(error as Error)
  }
}

// Configure multer with options
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit per file
    files: 10, // Allow up to 10 files per request
  }
})

// Middleware for single file upload
export const uploadSingle = upload.single('image')

// Middleware for multiple file uploads
export const uploadMultiple = upload.array('images', 10) // Support up to 10 files

// Error handling middleware for multer errors
export const handleUploadErrors = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({ 
          error: 'File size too large. Maximum allowed size is 20MB.' 
        })
        return
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({ 
          error: 'Too many files. Maximum 10 files are allowed.' 
        })
        return
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({ 
          error: 'Unexpected field name. Use "image" as the field name.' 
        })
        return
      default:
        res.status(400).json({ 
          error: `Upload error: ${error.message}` 
        })
        return
    }
  } else if (error) {
    // Custom validation errors from fileFilter
    res.status(400).json({ 
      error: error.message 
    })
    return
  }
  
  next()
}

export default { uploadSingle, uploadMultiple, handleUploadErrors }