import s3Service from './s3-service.js'
import localStorageService from './local-storage-service.js'

/**
 * Common interface shared by S3Service and LocalStorageService.
 * Defined here (not exported from the implementations) so both modules
 * remain independent and TypeScript can infer a clean public contract.
 */
export interface StorageFileData {
  body: any
  contentType: string
  contentLength: number
  lastModified: Date
}

export interface DeleteResults {
  success: string[]
  failed: string[]
}

export interface IStorageService {
  generateFilePath(originalFilename: string, productId: number): string
  uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    contentType: string,
    productId: number
  ): Promise<string>
  getFile(filePath: string): Promise<StorageFileData>
  fileExists(filePath: string): Promise<boolean>
  deleteFile(filePath: string): Promise<boolean>
  deleteMultipleFiles(filePaths: string[]): Promise<DeleteResults>
  deleteProductFiles(imagePaths: string[]): Promise<boolean>
  generateMultipleFilePaths(
    files: Array<{ originalFilename: string }>,
    productId: number
  ): string[]
  validateFile(filename: string, mimetype: string, size: number): boolean
}

/**
 * Storage facade.
 *
 * Selects between S3 and local filesystem based on STORAGE_MODE env var.
 * - STORAGE_MODE=local  -> uses LocalStorageService (development, no AWS needed)
 * - otherwise           -> uses S3Service (production, AWS S3 or MinIO)
 *
 * Both services share IStorageService, so the rest of the codebase
 * imports `storageService` and is agnostic to the actual backend.
 */
const storageMode = (process.env.STORAGE_MODE || 'cloud').toLowerCase()

const storageService: IStorageService =
  storageMode === 'local'
    ? (localStorageService as IStorageService)
    : (s3Service as IStorageService)

if (storageMode === 'local') {
  console.log('[storage] Using LOCAL filesystem storage (development mode)')
} else {
  console.log('[storage] Using S3 storage')
}

export default storageService
