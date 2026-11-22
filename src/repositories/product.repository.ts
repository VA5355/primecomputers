// src/repositories/ProductRepository.ts
import { FindOptionsWhere, Between, Like } from "typeorm";
import { BaseRepository } from "./base.repository.js";
import { Product } from "../entities/product.entity";
import { IProduct } from "../types/index.js";

export class ProductRepository extends BaseRepository<Product> {
    constructor() {
        super(Product);
    }

    // Product-specific queries matching your Mongoose patterns
    async findBySlug(slug: string): Promise<Product | null> {
        return this.findOne({ slug } as FindOptionsWhere<Product>);
    }

    async findByCategory(categoryId: string): Promise<Product[]> {
        return this.find({
            where: { categoryId } as FindOptionsWhere<Product>,
            relations: ["category"]
        });
    }

    async findByCategories(categoryIds: string[]): Promise<Product[]> {
        if (categoryIds.length === 0) {
            return [];
        }

        return this.repository
            .createQueryBuilder("product")
            .leftJoinAndSelect("product.category", "category")
            .where("product.categoryId IN (:...categoryIds)", { categoryIds })
            .getMany();
    }

    // Industry Standard: Search with ILIKE for case-insensitive search
    async searchByName(searchTerm: string): Promise<Product[]> {
        return this.repository
            .createQueryBuilder("product")
            .leftJoinAndSelect("product.category", "category")
            .where("product.name ILIKE :searchTerm", { searchTerm: `%${searchTerm}%` })
            .getMany();
    }

    async findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
        return this.find({
            where: {
                price: Between(minPrice, maxPrice)
            } as FindOptionsWhere<Product>,
            relations: ["category"]
        });
    }

    // Featured products (high sold count)
    async findFeatured(limit: number = 10): Promise<Product[]> {
        return this.repository
            .createQueryBuilder("product")
            .leftJoinAndSelect("product.category", "category")
            .orderBy("product.sold", "DESC")
            .limit(limit)
            .getMany();
    }

    // Always include category (matches Mongoose populate)
    async findAllWithCategory(): Promise<Product[]> {
        return this.find({
            relations: ["category"]
        });
    }

    async findByIdWithCategory(id: string): Promise<Product | null> {
        return this.repository.findOne({
            where: { id },
            relations: ["category"]
        });
    }

    // Update quantity (for inventory management)
    async updateQuantity(id: string, quantity: number): Promise<Product | null> {
        return this.update(id, { quantity } as Partial<Product>);
    }

    /**
     * Appends one or more photo URLs to the existing PostgreSQL TEXT[] array atomically.
     * @param id Product ID
     * @param newPhotos Single photo string or an array of photo strings to append
     * @param allowDuplicates Whether to allow duplicate URLs in the array (default: false)
     */
    async updatePhotos(
        id: string,
        newPhotos: string | string[],
        allowDuplicates: boolean = false
    ): Promise<Product | null> {
        // Normalize input to always be a clean array of non-empty strings
        const photosToAdd = (Array.isArray(newPhotos) ? newPhotos : [newPhotos])
            .map((url) => url?.trim())
            .filter((url): url is string => Boolean(url));

        this.logger.query("updatePhotos", { id, count: photosToAdd.length });
        const timer = this.logger.startTimer("updatePhotos");

        try {
            // 1. Validate inputs
            if (!id) {
                throw new Error("Product ID is required to update photos.");
            }

            // If nothing valid was passed, simply return the current product state
            if (photosToAdd.length === 0) {
                this.logger.debug("updatePhotos skipped: no valid photos provided", { id });
                return await this.findById(id);
            }

            // 2. Build atomic PostgreSQL update query
            // COALESCE ensures safety even if a legacy row somehow had NULL
            // PostgreSQL '||' concatenates the existing array with :newPhotos
            const updateExpression = allowDuplicates
                ? () => `COALESCE(photos, '{}') || :newPhotos`
                : () => `ARRAY(SELECT DISTINCT unnest(COALESCE(photos, '{}') || :newPhotos))`;

            const result = await this.repository
                .createQueryBuilder()
                .update(Product)
                .set({
                    photos: updateExpression,
                })
                .where("id = :id", { id })
                .setParameter("newPhotos", photosToAdd)
                .execute();

            // 3. Check if the product actually existed
            if (!result.affected || result.affected === 0) {
                this.logger.debug("updatePhotos failed: product not found", { id });
                return null;
            }

            // 4. Fetch and return the updated product
            const updatedProduct = await this.findById(id);
            this.logger.debug("updatePhotos result", {
                id,
                success: !!updatedProduct,
                totalPhotos: updatedProduct?.photos?.length ?? 0,
            });

            return updatedProduct;

        } catch (error: any) {
            // Log detailed error context before re-throwing for your service/controller layer
            this.logger.error("Error in updatePhotos", {
                id,
                photosToAdd,
                message: error?.message,
                code: error?.code, // Captures PostgreSQL error codes (e.g., 22P02 for invalid UUID)
                stack: error?.stack,
            });

            // Handle specific PostgreSQL invalid UUID syntax error cleanly if needed
            if (error?.code === "22P02") {
                throw new Error(`Invalid Product ID format: ${id}`);
            }

            throw new Error(`Failed to update product photos: ${error?.message || "Unknown database error"}`);
        } finally {
            // Ensures timer always stops even if an exception is thrown
            timer();
        }
    }



    // Increment sold count (when order completed)
    async incrementSold(id: string, quantity: number): Promise<Product | null> {
        await this.repository
            .createQueryBuilder()
            .update(Product)
            .set({
                sold: () => `sold + ${quantity}`,
                quantity: () => `quantity - ${quantity}`
            })
            .where("id = :id", { id })
            .execute();

        return this.findByIdWithCategory(id);
    }

    // Create product
    async createProduct(productData: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
        const product = this.repository.create(productData);
        return this.save(product);
    }

    // Check if slug exists
    async slugExists(slug: string): Promise<boolean> {
        const count = await this.repository.count({
            where: { slug } as FindOptionsWhere<Product>
        });
        return count > 0;
    }

    // Filter products with inventory
    async findInStock(): Promise<Product[]> {
        return this.repository
            .createQueryBuilder("product")
            .leftJoinAndSelect("product.category", "category")
            .where("product.quantity > 0")
            .getMany();
    }
}
