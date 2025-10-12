interface S3FileData {
    body: any;
    contentType: string;
    contentLength: number;
    lastModified: Date;
}
interface DeleteResults {
    success: string[];
    failed: string[];
}
declare class S3Service {
    private bucketName;
    private s3Client;
    constructor();
    /**
     * Generate a unique filename for the uploaded file
     */
    generateFilePath(originalFilename: string, productId: number): string;
    /**
     * Upload file to S3
     */
    uploadFile(fileBuffer: Buffer, originalFilename: string, contentType: string, productId: number): Promise<string>;
    /**
     * Get file from S3
     */
    getFile(filePath: string): Promise<S3FileData>;
    /**
     * Check if file exists in S3
     */
    fileExists(filePath: string): Promise<boolean>;
    /**
     * Delete file from S3
     */
    deleteFile(filePath: string): Promise<boolean>;
    /**
     * Delete multiple files from S3
     */
    deleteMultipleFiles(filePaths: string[]): Promise<DeleteResults>;
    /**
     * Delete all files for a specific product
     */
    deleteProductFiles(imagePaths: string[]): Promise<boolean>;
    /**
     * Generate multiple unique filenames for batch upload
     */
    generateMultipleFilePaths(files: Array<{
        originalFilename: string;
    }>, productId: number): string[];
    /**
     * Validate file type and size
     */
    validateFile(filename: string, mimetype: string, size: number): boolean;
}
declare const _default: S3Service;
export default _default;
