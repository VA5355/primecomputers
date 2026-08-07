// src/services/ProductService.ts
import { ProductRepository } from "../repositories/product.repository.js";
import { CategoryRepository } from "../repositories/category.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { CloudinaryWorkerService } from "../workers/cloudinaryWorker.js";
import { CreateProductDto } from "../types/index.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";
import braintree from "braintree";
import dotenv from "dotenv";
import { Logger } from "../utils/logger.js";
import { Order } from "@getbrevo/brevo";
import { photo } from "../controllers/product.controller.js";
import { emailService } from "./email.service.js";

dotenv.config();

const workerService = new CloudinaryWorkerService();

// Braintree Gateway Configuration
const gateway = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox, // Change to Production for live
    merchantId: process.env.BRAINTREE_MERCHANT_ID!,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY!,
});

export interface ProductFilters {
    categories?: string[];  // Now supports multiple categories
    category?: string;      // Keep for backward compatibility
    priceMin?: number;
    priceMax?: number;
    keyword?: string;
}

export interface ProductPhoto {
    path: string;
    size: number;
    type: string;
    name: string;
}

export class ProductService {
    private productRepository: ProductRepository;
    private categoryRepository: CategoryRepository;
    private orderRepository: OrderRepository;
    private logger: Logger;

    constructor() {
        this.productRepository = new ProductRepository();
        this.categoryRepository = new CategoryRepository();
        this.orderRepository = new OrderRepository();
        this.logger = new Logger('ProductService');
    }

    // Business Logic: Create Product with Photo Upload
    async createProduct(
        productData: CreateProductDto & { [key: string]: any },
        photo?: ProductPhoto
    ): Promise<any> {
        this.logger.methodEntry('createProduct', { name: productData.name, hasPhoto: !!photo });
        const timer = this.logger.startTimer('Create Product');

        const { name, description, price, categoryId, quantity, shipping } = productData;

        // Business Logic: Validate product data
        this.logger.debug('Validating product data', { name });
        const validationError = this.validateProductData(productData);
        if (validationError) {
            this.logger.warn('Product validation failed', { name, error: validationError });
            throw new Error(validationError);
        }

        // Business Logic: Validate category exists
        this.logger.debug('Validating category', { categoryId });
        const categoryExists = await this.categoryRepository.findById(categoryId);
        if (!categoryExists) {
            this.logger.error('Category not found', new Error('Category not found'), { categoryId });
            throw new Error("Category not found");
        }

        // Business Logic: Generate unique slug
        const baseSlug = slugify(name, { lower: true });
        const slug = await this.generateUniqueSlug(baseSlug);
        this.logger.debug('Generated unique slug', { name, slug });

        // Business Logic: Handle photo upload
        let photoPath: string | undefined;
        let photoContentType: string | undefined;

        if (photo) {
            this.logger.debug('Processing photo upload', { size: photo.size, type: photo.type });
            const photoValidation = this.validatePhoto(photo);
            if (photoValidation) {
                this.logger.warn('Photo validation failed', { error: photoValidation });
                throw new Error(photoValidation);
            }

            const photoResult = await this.saveProductPhoto(photo, slug);
            console.log("photoResult  "+photoResult);
            if(photoResult !== undefined){
                  if(photoResult.path !== undefined){
                     console.log("photoResult path "+photoResult.path);
                      photoPath = photoResult.path;
                  }
            }
            else {
                 console.log("photo not saved to server path  " );
                photoPath = photo.path;
                     console.log("photo  path  set as  " +photoPath);
            }
           
            photoContentType = photo.type;
            this.logger.debug('Photo saved successfully', { path: photoPath });
        }

        // Business Logic: Get category for relation
        this.logger.debug('Fetching category entity', { categoryId });
        const categoryEntity = await this.categoryRepository.findById(categoryId);
        if (!categoryEntity) {
            this.logger.error('Category entity not found', new Error('Category not found'), { categoryId });
            throw new Error("Category not found");
        }

        // Business Logic: Create product
        this.logger.debug('Creating product in database', { name, slug, price, quantity });
        const product = await this.productRepository.createProduct({
            name: name.trim(),
            slug,
            description: description.trim(),
            price: typeof price === 'string' ? parseFloat(price) : price,
            quantity: typeof quantity === 'string' ? parseInt(quantity) : quantity,
            shipping: typeof shipping === 'string' ? shipping === "true" : Boolean(shipping),
            categoryId: categoryId,
            category: categoryEntity,
            sold: 0, // Default value
            photoPath,
            photoContentType,
        });

            // 3. Dispatch background task to Cloudinary worker
        workerService.enqueueUpload({
        productId: product.id,
        localRelativePath: photoPath!!,
        slug: product.slug,
        });


        this.logger.info('Product created successfully', { productId: product.id, name: product.name, slug: product.slug });
        timer();
        this.logger.methodExit('createProduct', { productId: product.id });

        return product;
    }

    // Business Logic: Update Product
    async updateProduct(
        productId: string,
        productData: Partial<CreateProductDto & { [key: string]: any }>,
        photo?: ProductPhoto
    ): Promise<any> {
        this.logger.methodEntry('updateProduct', { productId, hasPhoto: !!photo, fields: Object.keys(productData) });
        const timer = this.logger.startTimer('Update Product');

        // Business Logic: Check if product exists
        this.logger.debug('Checking if product exists', { productId });
        const existingProduct = await this.productRepository.findById(productId);
        if (!existingProduct) {
            this.logger.error('Product not found for update', new Error('Product not found'), { productId });
            throw new Error("Product not found");
        }

        // Business Logic: Validate updated data
        if (Object.keys(productData).length > 0) {
            this.logger.debug('Validating update data', { productId, fields: Object.keys(productData) });
            const validationError = this.validateProductData(productData, false);
            if (validationError) {
                this.logger.warn('Update validation failed', { productId, error: validationError });
                throw new Error(validationError);
            }
        }

        // Business Logic: Handle slug regeneration if name changed
        let slug = existingProduct.slug;
        if (productData.name && productData.name !== existingProduct.name) {
            this.logger.debug('Regenerating slug for name change', { oldName: existingProduct.name, newName: productData.name });
            const baseSlug = slugify(productData.name, { lower: true });
            slug = await this.generateUniqueSlug(baseSlug, productId);
            this.logger.debug('New slug generated', { productId, slug });
        }

        // Business Logic: Handle photo update
        let photoPath = existingProduct.photoPath;
        let photoContentType = existingProduct.photoContentType;

        if (photo) {
            this.logger.debug('Processing photo update', { productId, size: photo.size, type: photo.type });
            const photoValidation = this.validatePhoto(photo);
            if (photoValidation) {
                this.logger.warn('Photo validation failed during update', { productId, error: photoValidation });
                throw new Error(photoValidation);
            }

            // Remove old photo
            if (existingProduct.photoPath) {
                this.logger.debug('Removing old photo', { productId, oldPath: existingProduct.photoPath });
                await this.removeProductPhoto(existingProduct.photoPath);
            }

            // Save new photo
            const photoResult = await this.saveProductPhoto(photo, slug);
            photoPath = photoResult.path;
            photoContentType = photo.type;
        }

        // Business Logic: Update product
        const updateData = {
            ...productData,
            slug,
            photoPath,
            photoContentType,
        };

        return await this.productRepository.update(productId, updateData);
    }

    // Business Logic: Delete Product
    async deleteProduct(productId: string): Promise<any> {
        const product = await this.productRepository.findById(productId);
        if (!product) {
            throw new Error("Product not found");
        }

        // Business Logic: Remove photo file
        if (product.photoPath) {
            await this.removeProductPhoto(product.photoPath);
        }

        // Business Logic: Delete product
        const deleted = await this.productRepository.delete(productId);
        if (!deleted) {
            throw new Error("Failed to delete product");
        }

        return product;
    }

    // Business Logic: Get All Products
    async getAllProducts(): Promise<any[]> {
        return await this.productRepository.findAllWithCategory();
    }

    // Business Logic: Get Product by Slug
    async getProductBySlug(slug: string): Promise<any> {
        const product = await this.productRepository.findBySlug(slug);
        if (!product) {
            throw new Error("Product not found");
        }
        return product;
    }

    // Business Logic: Get Product by ID
    async getProductById(id: string): Promise<any> {
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new Error("Product not found");
        }
        return product;
    }

    // Business Logic: Search Products with Filters
    async searchProducts(
        filters: ProductFilters,
        page: number = 1,
        limit: number = 10
    ): Promise<{ products: any[]; total: number; page: number; limit: number }> {
        let products: any[] = [];

        if (filters.keyword) {
            products = await this.productRepository.searchByName(filters.keyword);
        } else if (filters.categories && filters.categories.length > 0) {
            // Handle multiple categories
            products = await this.productRepository.findByCategories(filters.categories);
        } else if (filters.category) {
            // Backward compatibility for single category
            products = await this.productRepository.findByCategory(filters.category);
        } else {
            const result = await this.productRepository.findWithPagination(page, limit);
            return {
                products: result.data,
                total: result.total,
                page: result.page,
                limit: result.limit
            };
        }

        // Business Logic: Apply price filters
        if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
            products = products.filter(product => {
                const price = parseFloat(product.price);
                if (filters.priceMin !== undefined && price < filters.priceMin) return false;
                if (filters.priceMax !== undefined && price > filters.priceMax) return false;
                return true;
            });
        }

        // Business Logic: Pagination
        const total = products.length;
        const startIndex = (page - 1) * limit;
        const paginatedProducts = products.slice(startIndex, startIndex + limit);

        return {
            products: paginatedProducts,
            total,
            page,
            limit
        };
    }

    // Business Logic: Get Products Count
    async getProductsCount(): Promise<number> {
        return await this.productRepository.count();
    }

    // Business Logic: Get Related Products
    async getRelatedProducts(productId: string, categoryId: string, limit: number = 4): Promise<any[]> {
        const relatedProducts = await this.productRepository.findByCategory(categoryId);
        
        // Business Logic: Exclude the current product and limit results
        return relatedProducts
            .filter(product => product.id !== productId)
            .slice(0, limit);
    }

    // Business Logic: Get Braintree Token
    async getBraintreeToken(): Promise<string> {
        try {
            const response = await gateway.clientToken.generate({});
            return response.clientToken;
        } catch (error) {
            throw new Error("Failed to generate payment token");
        }
    }

    // Business Logic: Process Payment and Create Order
    async processPayment(
        nonce: string,
        cart: any[],
        userId: string
    ): Promise<{ order: any; transaction: any }> {
         this.logger.methodEntry('processPayment', { nonce: nonce, cart: !!cart });
        const timer = this.logger.startTimer('Start processPayment');
        try {
            // Business Logic: Calculate total amount
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            console.log()
            // Business Logic: Process Braintree payment
             this.logger.debug('Processing cart ', { cart });
             this.logger.debug('  cart total ', { total });
            const result = await gateway.transaction.sale({
                amount: total.toFixed(2),
                paymentMethodNonce: nonce,
                options: {
                    submitForSettlement: true,
                },
            });
              this.logger.debug('  Processed result ', { result });
            if (!result.success) {
                throw new Error(result.message || "Payment failed");
            }

            // Business Logic: Create order (repository will handle relations)
            const productIds = cart.map(item => item.id);
            
            // Get buyer for the order relation
            const userRepository = new UserRepository();
            const buyer = await userRepository.findById(userId);
            
            if (!buyer) {
                throw new Error("User not found");
            }
            
            const order = await this.orderRepository.createOrder(
                {
                    payment: result,
                    buyer: buyer as any,
                    buyerId: userId, // Add missing property
                    status: "Processing" as any,
                },
                productIds
            );
                 this.logger.debug('  Processed order ', { order });
            // Business Logic: Update product quantities
            for (const item of cart) {
                await this.productRepository.incrementSold(item.id, item.quantity);
            }

            // Business Logic: Send confirmation email (optional)
            await this.sendOrderConfirmationEmail(order, buyer.email);
             this.logger.debug('  Processed transaction ', { order ,
                transaction: result.transaction});
            return {
                order,
                transaction: result.transaction,
            };
        } catch (error: any) {
            throw new Error(`Payment processing failed: ${error.message}`);
        }
    }
    /**
     * Safely maps the TypeORM Order entity to the structure required by EmailService
     * and triggers Brevo transaction email non-blocking.
     * 
     * @param order - The persisted TypeORM Order entity with buyer and products preloaded.
     * @param userEmail - Optional override email address (falls back to order.buyer.email).
     */
    async   sendOrderConfirmationEmail(order:  any, userEmail?: string): Promise<void> {
        const recipientEmail = userEmail || order?.email;

        if (!recipientEmail) {
            logger.warn("Skipped order confirmation email: Recipient email is missing.", { orderId: order.id });
            return;
        }

        try {
            // Calculate total amount from eager-loaded products or payment payload safely
            const total = order?.amount || 
                (order.products || []).reduce((acc:any, p:any) => acc + (Number(p.price) || 0) * (p.quantity || 1), 0);

            // Map TypeORM entity into the payload expected by EmailService
            const orderDetails = {
                orderId: order.id,
                total: total.toFixed(2),
                products: (order.products || []).map((product: any) => ({
                    name: product.name || "Product Item",
                    quantity: product.quantity || 1,
                    price: (Number(product.price) || 0).toFixed(2),
                })),
            };

            // Dispatch email via Brevo Service
            await emailService.sendOrderConfirmation(recipientEmail, orderDetails);

            logger.info("Order confirmation email process finished", {
                orderId: order.id,
                to: recipientEmail,
            });
        } catch (error) {
            // Log cleanly without throwing so payment/order completion is never broken
            logger.error("Error occurred while sending order confirmation email", error as Error, {
                orderId: order.id,
                to: recipientEmail,
            });
        }
    }
    // Private Business Logic: Photo Management
   /* private async saveProductPhoto(photo: ProductPhoto, slug: string): Promise<{ path: string }> {
        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), "uploads", "products");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = path.extname(photo.name || ".jpg");
        const filename = `${slug}-${timestamp}${extension}`;
        const filePath = path.join(uploadsDir, filename);

        // Copy photo to uploads directory
        fs.copyFileSync(photo.path, filePath);

        return { path: `uploads/products/${filename}` };
    }*/

    // Private Business Logic: Photo Management  VERSION 1 
 /*   private async saveProductPhoto(photo: ProductPhoto, slug: string): Promise<{ path: string }> {
    // 1. Ensure target directory inside 'public/uploads/products' exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

       const timestamp = Date.now();
    const extension = path.extname(photo.name || ".jpg");
    const filename = `${slug}-${timestamp}${extension}`;
    const destinationPath = path.join(uploadsDir, filename);

    // 2. Validate source file exists before operating on it
    if (!photo.path || !fs.existsSync(photo.path)) {
       //throw new Error(`Temp file from upload not found at path: ${photo.path}`);
       // dont thrpw exceptipn as the file is uplaoded to the public/uploads/products by the name upload_524cdb6fd2f27f31443e0f6787be9f57.png
       // just rename it as with slug passed in 
         // 3. Generate unique filename
  

    // 4. Safely move/copy file across drives/folders
    try {
        // Preferred: Move the file directly from temp to public upload folder
       // fs.renameSync(photo.path, destinationPath);
         fs.copyFileSync(photo.path, destinationPath);
    } catch (err: any) {
        // Fallback for cross-partition or cross-drive moves (EXDEV error)
        if (err.code === 'EXDEV') {
            fs.copyFileSync(photo.path, destinationPath);
            fs.unlinkSync(photo.path); // Clean up original temp file
        } else {
            throw err;
        }
    }

    }
  
    // 5. Return relative web URL path suitable for static serving
    return { path: `/uploads/products/${filename}` };
    }
 */  
    // Private Business Logic: Photo Management     VERSION 2
 /*   private async saveProductPhoto(photo: ProductPhoto, slug: string): Promise<{ path: string }> {
        // 1. Ensure target directory inside 'public/uploads/products' exists
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // --- CRITICAL FIX: Resolve photo.path to an absolute file system path ---
        const sourcePath = path.isAbsolute(photo.path)
            ? photo.path
            : path.join(process.cwd(), photo.path.startsWith('/') ? `public${photo.path}` : photo.path);

        // 2. Validate source file exists at the absolute path
        if (!sourcePath || !fs.existsSync(sourcePath)) {
            throw new Error(`Temp file from upload not found at resolved 10.54 update path: ${sourcePath}`);
        }

        // 3. Generate unique filename
        const timestamp = Date.now();
        const extension = path.extname(photo.name || ".jpg");
        const filename = `${slug}-${timestamp}${extension}`;
        const destinationPath = path.join(uploadsDir, filename);

        // 4. If source and destination are the same file, skip copying/renaming
        if (sourcePath === destinationPath) {
            return { path: `/uploads/products/${filename}` };
        }

        // 5. Safely move/copy file across drives/folders
        try {
            fs.renameSync(sourcePath, destinationPath);
        } catch (err: any) {
            if (err.code === 'EXDEV') {
                fs.copyFileSync(sourcePath, destinationPath);
                fs.unlinkSync(sourcePath); // Clean up original temp file
            } else {
                throw err;
            }
        }

        // 6. Return relative web URL path suitable for static serving
        return { path: `/uploads/products/${filename}` };
    }

    */
   // Private Business Logic: Photo Management
    private async saveProductPhoto(photo: ProductPhoto, slug: string): Promise<{ path: string }> {
    // 1. Ensure target directory inside 'public/uploads/products' exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 2. Extract just the filename from photo.path (handles Windows & Linux path separators)
    const rawFileName = path.basename(photo.path);

    // 3. Construct absolute source path where express-formidable originally saved it
    // Checks if formidable saved it inside public/uploads/products or system root
    let sourcePath = path.resolve(process.cwd(), "public", "uploads", "products", rawFileName);

    if (!fs.existsSync(sourcePath)) {
        // Fallback: check if formidable saved it at root uploads/products/
        sourcePath = path.resolve(process.cwd(), "uploads", "products", rawFileName);
    }

    // 4. Validate source file exists on disk
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Temp file from upload not found on disk at: ${sourcePath}`);
    }

    // 5. Generate unique destination filename
    const timestamp = Date.now();
    const extension = path.extname(photo.name || rawFileName || ".jpg");
    const filename = `${slug}-${timestamp}${extension}`;
    const destinationPath = path.join(uploadsDir, filename);

    // 6. If source and destination are already identical, return path
    if (sourcePath === destinationPath) {
        return { path: `/uploads/products/${filename}` };
    }

    // 7. Safely move/copy file across drives/folders
    try {
        fs.renameSync(sourcePath, destinationPath);
    } catch (err: any) {
        if (err.code === 'EXDEV') {
            fs.copyFileSync(sourcePath, destinationPath);
            fs.unlinkSync(sourcePath); // Clean up original temp file
        } else {
            throw err;
        }
    }

    // 8. Return relative web URL path suitable for static serving
    return { path: `/uploads/products/${filename}` };
   }

    private async removeProductPhoto(photoPath: string): Promise<void> {
        try {
            const fullPath = path.join(process.cwd(), photoPath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (error) {
            console.log("Warning: Could not remove photo file:", error);
        }
    }

    // Private Business Logic: Validation
    private validateProductData(data: any, isCreate: boolean = true): string | null {
        if (isCreate || data.name !== undefined) {
            if (!data.name || !data.name.trim()) {
                return "Product name is required";
            }
            if (data.name.trim().length > 160) {
                return "Product name must be less than 160 characters";
            }
        }

        if (isCreate || data.description !== undefined) {
            if (!data.description || !data.description.trim()) {
                return "Product description is required";
            }
            if (data.description.trim().length > 2000) {
                return "Product description must be less than 2000 characters";
            }
        }

        if (isCreate || data.price !== undefined) {
            const price = parseFloat(data.price);
            if (isNaN(price) || price <= 0) {
                return "Valid price is required";
            }
            if (price > 999999.99) {
                return "Price too high";
            }
        }

        if (isCreate || data.quantity !== undefined) {
            const quantity = parseInt(data.quantity);
            if (isNaN(quantity) || quantity < 0) {
                return "Valid quantity is required";
            }
        }

        if (isCreate || data.categoryId !== undefined) {
            if (!data.categoryId) {
                return "Category is required";
            }
        }

        return null;
    }

    private validatePhoto(photo: ProductPhoto): string | null {
        if (!photo) return null;

        if (photo.size > 1000000) {
            return "Image should be less than 1MB in size";
        }

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(photo.type)) {
            return "Only JPEG, PNG and GIF images are allowed";
        }

        return null;
    }

    private async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const existing = await this.productRepository.findBySlug(slug);
            if (!existing || (excludeId && existing.id === excludeId)) {
                break;
            }
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }
}
