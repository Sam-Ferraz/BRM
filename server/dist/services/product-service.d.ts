import { ProductRepository } from '../repositories/index.js';
import { Product, ProductImage, QueryFilters, ApiResponse } from '../types/index.js';
export declare class ProductService {
    private productRepository;
    constructor(productRepository: ProductRepository);
    getAllProducts(filters: QueryFilters): Promise<ApiResponse<Product[]>>;
    createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'has_thumbnail'>): Promise<Product>;
    updateProduct(id: number, productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'has_thumbnail'>): Promise<Product>;
    deleteProduct(id: number): Promise<{
        success: boolean;
        imagePaths: string[];
    }>;
    getProductImages(productId: number): Promise<{
        images: ProductImage[];
    }>;
    addProductImage(productId: number, imageUrl: string, altText: string): Promise<{
        success: boolean;
        image: ProductImage;
        message: string;
    }>;
    addMultipleProductImages(productId: number, imageData: Array<{
        url: string;
        altText: string;
    }>): Promise<{
        success: boolean;
        uploaded: number;
        total: number;
        images: ProductImage[];
        errors: Array<{
            filename: string;
            error: string;
        }>;
        message: string;
    }>;
    getProductImage(productId: number, imageId: number): Promise<ProductImage>;
    updateProductImage(productId: number, imageId: number, updates: Partial<Pick<ProductImage, 'is_thumbnail' | 'display_order' | 'alt_text'>>): Promise<{
        success: boolean;
        image: ProductImage;
        message: string;
    }>;
    deleteProductImage(productId: number, imageId: number): Promise<{
        success: boolean;
        image: ProductImage;
        message: string;
    }>;
    getProductThumbnail(productId: number): Promise<ProductImage>;
}
