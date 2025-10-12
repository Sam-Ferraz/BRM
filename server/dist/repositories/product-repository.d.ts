import { BaseRepository } from './base-repository.js';
import { Product, ProductImage, QueryFilters } from '../types/index.js';
export declare class ProductRepository extends BaseRepository {
    findAll(filters?: QueryFilters): Promise<Product[]>;
    findById(id: number): Promise<Product | null>;
    create(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'has_thumbnail'>): Promise<Product>;
    update(id: number, product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'has_thumbnail'>): Promise<Product | null>;
    delete(id: number): Promise<boolean>;
    getCount(): Promise<number>;
    getProductImages(productId: number): Promise<ProductImage[]>;
    getProductImagePaths(productId: number): Promise<string[]>;
    addProductImage(productId: number, imageUrl: string, displayOrder: number, isThumbnail: boolean, altText: string): Promise<ProductImage>;
    updateProductImage(imageId: number, productId: number, updates: Partial<Pick<ProductImage, 'is_thumbnail' | 'display_order' | 'alt_text'>>): Promise<ProductImage | null>;
    deleteProductImage(imageId: number, productId: number): Promise<ProductImage | null>;
    getImageCountAndMaxOrder(productId: number): Promise<{
        count: number;
        maxOrder: number;
    }>;
    hasThumbnail(productId: number): Promise<boolean>;
    findImageById(imageId: number, productId: number): Promise<ProductImage | null>;
    getThumbnailImage(productId: number): Promise<ProductImage | null>;
}
