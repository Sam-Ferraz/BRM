import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import { createReadStream } from 'fs'

interface StorageFileData {
  body: any
  contentType: string
  contentLength: number
  lastModified: Date
}

interface DeleteResults {
  success: string[]
  failed: string[]
}

/**
 * Local filesystem implementation of storage service.
 * Mirrors the S3Service interface so it can be a drop-in replacement
 * for development.
 *
 * Files are stored under LOCAL_STORAGE_PATH (default: ./uploads)
 * preserving the same path structure as S3 keys: products/{id}/files/{uuid}.ext
 */
class LocalStorageService {
  private basePath: string

  constructor() {
    // Resolve to absolute path relative to project root (cwd at server start)
    this.basePath = path.resolve(process.env.LOCAL_STORAGE_PATH || './uploads')
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true })
  }

  private getAbsolutePath(filePath: string): string {
    // filePath is in S3-style format: products/123/files/uuid.jpg
    return path.join(this.basePath, filePath)
  }

  private getContentTypeFromExtension(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    }
    return map[ext] || 'application/octet-stream'
  }

  /**
   * Generate a unique filename for the uploaded file
   */
  generateFilePath(originalFilename: string, productId: number): string {
    const fileExtension = path.extname(originalFilename).toLowerCase()
    const uniqueFilename = `${uuidv4()}${fileExtension}`
    return `products/${productId}/files/${uniqueFilename}`
  }

  /**
   * Upload (save) file to local disk
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    contentType: string,
    productId: number
  ): Promise<string> {
    try {
      const filePath = this.generateFilePath(originalFilename, productId)
      const absPath = this.getAbsolutePath(filePath)

      await this.ensureDir(path.dirname(absPath))
      await fs.writeFile(absPath, fileBuffer)

      console.log(`File saved locally: ${filePath}`)
      return filePath
    } catch (error) {
      console.error('Error saving file locally:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get file from local disk
   */
  async getFile(filePath: string): Promise<StorageFileData> {
    try {
      const absPath = this.getAbsolutePath(filePath)
      const stat = await fs.stat(absPath)

      return {
        body: createReadStream(absPath),
        contentType: this.getContentTypeFromExtension(filePath),
        contentLength: stat.size,
        lastModified: stat.mtime
      }
    } catch (error: any) {
      console.error('Error getting file from disk:', error)
      if (error.code === 'ENOENT') {
        throw new Error('File not found')
      }
      throw new Error(`Failed to get file: ${error.message}`)
    }
  }

  /**
   * Check if file exists on local disk
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const absPath = this.getAbsolutePath(filePath)
      await fs.access(absPath)
      return true
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false
      }
      console.error('Error checking file existence:', error)
      throw new Error(`Failed to check file existence: ${error.message}`)
    }
  }

  /**
   * Delete file from local disk
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const absPath = this.getAbsolutePath(filePath)
      await fs.unlink(absPath)
      console.log(`File deleted locally: ${filePath}`)
      return true
    } catch (error: any) {
      // If file doesn't exist, treat as already deleted (idempotent)
      if (error.code === 'ENOENT') {
        return true
      }
      console.error('Error deleting file from disk:', error)
      return false
    }
  }

  /**
   * Delete multiple files from local disk
   */
  async deleteMultipleFiles(filePaths: string[]): Promise<DeleteResults> {
    const results: DeleteResults = { success: [], failed: [] }

    for (const filePath of filePaths) {
      try {
        const success = await this.deleteFile(filePath)
        if (success) {
          results.success.push(filePath)
        } else {
          results.failed.push(filePath)
        }
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error)
        results.failed.push(filePath)
      }
    }

    return results
  }

  /**
   * Delete all files for a specific product
   */
  async deleteProductFiles(imagePaths: string[]): Promise<boolean> {
    if (!imagePaths || imagePaths.length === 0) {
      return true
    }

    try {
      const results = await this.deleteMultipleFiles(imagePaths)
      console.log(`Deleted ${results.success.length} files successfully (local)`)
      if (results.failed.length > 0) {
        console.warn(`Failed to delete ${results.failed.length} files:`, results.failed)
      }
      return results.failed.length === 0
    } catch (error) {
      console.error('Error deleting product files:', error)
      return false
    }
  }

  /**
   * Generate multiple unique filenames for batch upload
   */
  generateMultipleFilePaths(files: Array<{ originalFilename: string }>, productId: number): string[] {
    return files.map(file => this.generateFilePath(file.originalFilename, productId))
  }

  /**
   * Validate file type and size (same rules as S3Service)
   */
  validateFile(filename: string, mimetype: string, size: number): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ]
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

    if (!allowedTypes.includes(mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.')
    }

    const extension = path.extname(filename).toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      throw new Error('Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.')
    }

    const maxSize = 20 * 1024 * 1024 // 20MB
    if (size > maxSize) {
      throw new Error('File size too large. Maximum allowed size is 20MB.')
    }

    return true
  }
}

export default new LocalStorageService()
