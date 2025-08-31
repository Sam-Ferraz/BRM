import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

class S3Service {
  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'sa1-brm-data'
    
    // Configure S3 client for both AWS S3 and MinIO
    const clientConfig = {
      region: process.env.AWS_REGION || 'us-east-1'
    }

    // Only provide credentials if explicitly set (for MinIO/local development)
    // In production ECS, use IAM task role (no explicit credentials needed)
    if (process.env.AWS_ACCESS_KEY_ID || process.env.S3_ENDPOINT) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
      }
    }

    // Add endpoint for MinIO (local development)
    if (process.env.S3_ENDPOINT) {
      clientConfig.endpoint = process.env.S3_ENDPOINT
      clientConfig.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'
    }

    this.s3Client = new S3Client(clientConfig)
  }

  /**
   * Generate a unique filename for the uploaded file
   * @param {string} originalFilename - Original file name
   * @param {number} productId - Product ID
   * @returns {string} S3 key path
   */
  generateFilePath(originalFilename, productId) {
    const fileExtension = path.extname(originalFilename).toLowerCase()
    const uniqueFilename = `${uuidv4()}${fileExtension}`
    return `products/${productId}/files/${uniqueFilename}`
  }

  /**
   * Upload file to S3
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalFilename - Original filename
   * @param {string} contentType - MIME type
   * @param {number} productId - Product ID
   * @returns {Promise<string>} S3 key path
   */
  async uploadFile(fileBuffer, originalFilename, contentType, productId) {
    try {
      const filePath = this.generateFilePath(originalFilename, productId)
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          'original-filename': originalFilename,
          'product-id': productId.toString(),
          'upload-date': new Date().toISOString()
        }
      })

      await this.s3Client.send(command)
      console.log(`File uploaded successfully: ${filePath}`)
      return filePath
    } catch (error) {
      console.error('Error uploading file to S3:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  }

  /**
   * Get file from S3
   * @param {string} filePath - S3 key path
   * @returns {Promise<{body: ReadableStream, contentType: string, contentLength: number}>}
   */
  async getFile(filePath) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      })

      const response = await this.s3Client.send(command)
      return {
        body: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified
      }
    } catch (error) {
      console.error('Error getting file from S3:', error)
      if (error.name === 'NoSuchKey') {
        throw new Error('File not found')
      }
      throw new Error(`Failed to get file: ${error.message}`)
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} filePath - S3 key path
   * @returns {Promise<boolean>}
   */
  async fileExists(filePath) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      })
      
      await this.s3Client.send(command)
      return true
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false
      }
      console.error('Error checking file existence:', error)
      throw new Error(`Failed to check file existence: ${error.message}`)
    }
  }

  /**
   * Delete file from S3
   * @param {string} filePath - S3 key path
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filePath) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      })

      await this.s3Client.send(command)
      console.log(`File deleted successfully: ${filePath}`)
      return true
    } catch (error) {
      console.error('Error deleting file from S3:', error)
      // Don't throw error for delete operations to avoid breaking product deletion
      return false
    }
  }

  /**
   * Delete multiple files from S3
   * @param {string[]} filePaths - Array of S3 key paths to delete
   * @returns {Promise<{success: string[], failed: string[]}>} Results
   */
  async deleteMultipleFiles(filePaths) {
    const results = { success: [], failed: [] }
    
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
   * @param {string[]} imagePaths - Array of image paths to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteProductFiles(imagePaths) {
    if (!imagePaths || imagePaths.length === 0) {
      return true
    }

    try {
      const results = await this.deleteMultipleFiles(imagePaths)
      console.log(`Deleted ${results.success.length} files successfully`)
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
   * @param {Array} files - Array of files with originalFilename
   * @param {number} productId - Product ID
   * @returns {Array} Array of S3 key paths
   */
  generateMultipleFilePaths(files, productId) {
    return files.map(file => this.generateFilePath(file.originalFilename, productId))
  }

  /**
   * Validate file type and size
   * @param {string} filename - Original filename
   * @param {string} mimetype - MIME type
   * @param {number} size - File size in bytes
   * @returns {boolean} Is valid
   */
  validateFile(filename, mimetype, size) {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif'
    ]

    // Allowed file extensions
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

    // Check MIME type
    if (!allowedTypes.includes(mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.')
    }

    // Check file extension
    const extension = path.extname(filename).toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      throw new Error('Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.')
    }

    // Check file size (20MB max)
    const maxSize = 20 * 1024 * 1024 // 20MB in bytes
    if (size > maxSize) {
      throw new Error('File size too large. Maximum allowed size is 20MB.')
    }

    return true
  }
}

export default new S3Service()