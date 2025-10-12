export class ProductService {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async getAllProducts(filters) {
        try {
            const products = await this.productRepository.findAll(filters);
            return {
                data: products,
                total: products.length
            };
        }
        catch (error) {
            console.error('Error fetching products:', error);
            throw new Error('Internal server error');
        }
    }
    async createProduct(productData) {
        try {
            return await this.productRepository.create(productData);
        }
        catch (error) {
            console.error('Error creating product:', error);
            throw new Error('Internal server error');
        }
    }
    async updateProduct(id, productData) {
        try {
            const updatedProduct = await this.productRepository.update(id, productData);
            if (!updatedProduct) {
                throw new Error('Product not found');
            }
            return updatedProduct;
        }
        catch (error) {
            console.error('Error updating product:', error);
            if (error instanceof Error && error.message === 'Product not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async deleteProduct(id) {
        try {
            // Check if product exists
            const product = await this.productRepository.findById(id);
            if (!product) {
                throw new Error('Product not found');
            }
            // Get all product images before deletion
            const imagePaths = await this.productRepository.getProductImagePaths(id);
            // Delete from database (CASCADE will handle product_images)
            const deleted = await this.productRepository.delete(id);
            if (!deleted) {
                throw new Error('Product not found');
            }
            return { success: true, imagePaths };
        }
        catch (error) {
            console.error('Error deleting product:', error);
            if (error instanceof Error && error.message === 'Product not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async getProductImages(productId) {
        try {
            // Check if product exists
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }
            const images = await this.productRepository.getProductImages(productId);
            return { images };
        }
        catch (error) {
            console.error('Error getting product images:', error);
            if (error instanceof Error && error.message === 'Product not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async addProductImage(productId, imageUrl, altText) {
        try {
            // Check if product exists
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }
            // Get current image count and check if there's a thumbnail
            const { count, maxOrder } = await this.productRepository.getImageCountAndMaxOrder(productId);
            const hasThumbnail = await this.productRepository.hasThumbnail(productId);
            // Set as thumbnail if it's the first image
            const isFirstImage = !hasThumbnail;
            const displayOrder = maxOrder + 1;
            const image = await this.productRepository.addProductImage(productId, imageUrl, displayOrder, isFirstImage, altText);
            return {
                success: true,
                image,
                message: 'Image uploaded successfully'
            };
        }
        catch (error) {
            console.error('Error uploading product image:', error);
            if (error instanceof Error && error.message === 'Product not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async addMultipleProductImages(productId, imageData) {
        try {
            // Check if product exists
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }
            // Get current image count and max order
            const { count, maxOrder } = await this.productRepository.getImageCountAndMaxOrder(productId);
            let hasThumbnail = await this.productRepository.hasThumbnail(productId);
            const uploadedImages = [];
            const errors = [];
            // Process each image
            for (let i = 0; i < imageData.length; i++) {
                const { url, altText } = imageData[i];
                try {
                    // Set as thumbnail if it's the first image and no thumbnail exists
                    const isFirstImage = !hasThumbnail && uploadedImages.length === 0;
                    const displayOrder = maxOrder + i + 1;
                    const image = await this.productRepository.addProductImage(productId, url, displayOrder, isFirstImage, altText);
                    uploadedImages.push(image);
                    if (isFirstImage)
                        hasThumbnail = true;
                }
                catch (error) {
                    console.error(`Error uploading image ${altText}:`, error);
                    errors.push({
                        filename: altText,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            return {
                success: true,
                uploaded: uploadedImages.length,
                total: imageData.length,
                images: uploadedImages,
                errors,
                message: `Successfully uploaded ${uploadedImages.length} out of ${imageData.length} images`
            };
        }
        catch (error) {
            console.error('Error uploading product images:', error);
            if (error instanceof Error && error.message === 'Product not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async getProductImage(productId, imageId) {
        try {
            const image = await this.productRepository.findImageById(imageId, productId);
            if (!image) {
                throw new Error('Image not found');
            }
            return image;
        }
        catch (error) {
            console.error('Error getting product image:', error);
            if (error instanceof Error && error.message === 'Image not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async updateProductImage(productId, imageId, updates) {
        try {
            const updatedImage = await this.productRepository.updateProductImage(imageId, productId, updates);
            if (!updatedImage) {
                throw new Error('Image not found');
            }
            return {
                success: true,
                image: updatedImage,
                message: 'Image updated successfully'
            };
        }
        catch (error) {
            console.error('Error updating product image:', error);
            if (error instanceof Error && (error.message === 'Image not found' || error.message === 'No updates provided')) {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async deleteProductImage(productId, imageId) {
        try {
            const deletedImage = await this.productRepository.deleteProductImage(imageId, productId);
            if (!deletedImage) {
                throw new Error('Image not found');
            }
            return {
                success: true,
                image: deletedImage,
                message: 'Image deleted successfully'
            };
        }
        catch (error) {
            console.error('Error deleting product image:', error);
            if (error instanceof Error && error.message === 'Image not found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
    async getProductThumbnail(productId) {
        try {
            const thumbnail = await this.productRepository.getThumbnailImage(productId);
            if (!thumbnail) {
                throw new Error('No thumbnail found');
            }
            return thumbnail;
        }
        catch (error) {
            console.error('Error getting product thumbnail:', error);
            if (error instanceof Error && error.message === 'No thumbnail found') {
                throw error;
            }
            throw new Error('Internal server error');
        }
    }
}
