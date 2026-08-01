// src/services/RazorPayService.ts
//import { RazorOrderRepository } from "../repositories/razor.repository.js";
import Razorpay from 'razorpay';

import { ProductRepository } from "../repositories/product.repository.js";
import { CreateCategoryDto } from "../types/index.js";
import slugify from "slugify";
import { Logger } from "../utils/logger.js";
import { RazorPayRepository } from "../repositories/razorpay.repository.js";
import { UserRepository } from "../repositories/user.repository.js";

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export class RazorPayService {
    private razorOrderRepository: RazorPayRepository;
    private productRepository: ProductRepository;
    private logger: Logger;

    constructor() {
        this.razorOrderRepository = new RazorPayRepository();
        this.productRepository = new ProductRepository();
        this.logger = new Logger('RazorPayService');
    }

    // Business Logic: Create RazorOrder with Auto Slug
    async createRazorOrder(name: string ,  cart: any[],paymethodNounce:string ,    userId: string): Promise<any> {
        this.logger.methodEntry('createRazorOrder', { name });
        const timer = this.logger.startTimer('Create RazorOrder');
    
         let razorOrder =undefined;
          let mergedRazorOrder =undefined;
        // Business Logic: Validate RazorOrder name
        this.logger.debug('Validating RazorOrder name', { name });
        let validationError = this.validateRazorOrderName(name);
        if (validationError) {
            this.logger.warn('RazorOrder validation failed', { name, error: validationError });
            throw new Error(validationError);
        }

         // Business Logic: Validate RazorOrder name
        this.logger.debug('Validating RazorOrder userId', { userId });
          validationError = this.validateRazorOrderName(name);
        if (validationError) {
            this.logger.warn('RazorOrder validation failed', { name, error: validationError });
            throw new Error(validationError);
        }

        // Business Logic: Sanitize and generate slug
        const sanitizedName = name.trim();
        const slug = slugify(sanitizedName, { lower: true });
        this.logger.debug('Generated slug for razorOrder', { sanitizedName, slug });

        // Business Logic: Check if razororder already exists
        this.logger.debug('Checking if razorOrder name exists', { sanitizedName });
       try { 

            const existingRazorOrder = await this.razorOrderRepository.findByName(sanitizedName);
            if (existingRazorOrder) {
                this.logger.warn('RazorOrder creation failed - name already exists', { name: sanitizedName });
                throw new Error("RazorOrder already exists");
            }
            // Business Logic: Check if slug already exists
                    this.logger.debug('Checking if slug exists', { slug });
                    const existingSlug = await this.razorOrderRepository.findBySlug(slug);
                    if (existingSlug) {
                        this.logger.warn('RazorOrder creation failed - slug already exists', { slug });
                        throw new Error("RazorOrder with similar name already exists");
                    }
        } catch (error: any) {
               this.logger.error('RazorPay validation for order :: finding existing order failed ', error, { name: error.message });
              // res.status(400).json({ error: error.message });
         //  this.logger.methodExit('create', { success: false, error: error.message });
          }  
  
          // IF EXISTING order is not able to find with razor order name or slut trt making attempt to create order 
          // if failes send undefined order which is controller put accros to TRY after some time 
          
      try { 

      
        // Business Logic: Calculate total amount
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        // Business Logic: Create razorOrder
        this.logger.debug('Creating razorOrder', { name: sanitizedName, slug });
        // Business Logic: Process Razor payment
            const result = await Promise.resolve({
                amount: total.toFixed(2),
                paymentMethodNonce: paymethodNounce,
                options: {
                    submitForSettlement: true,
                },
            });
        // Business Logic: Create order (repository will handle relations)
          const productIds = cart.map(item => item.id);
        // Get buyer for the order relation
          const userRepository = new UserRepository();
           const buyer = await userRepository.findById(userId);
        /**{
            name: sanitizedName,
            slug
        }
           
         */
         razorOrder = await this.razorOrderRepository.createOrder({
                    payment: result,
                    buyer: buyer as any,
                    buyerId: userId, // Add missing property
                    status: "Processing" as any,
                },
                productIds);
        await this.razorOrderRepository.save(razorOrder);
         //IMMEDIATELY CREATE RAZOR ORDER 
         // 2. Create actual Razorpay Order API call
        const razorpayOrder = await instance.orders.create({
          amount: Math.round( total.toFixed(2) * 100), // in paise
           currency: "INR",
              receipt: razorOrder.id.slice(0, 40), // Pass DB ID as receipt reference
            notes: {
        internal_order_id: razorOrder.id,
          },
          });
          mergedRazorOrder = {  razorOrder ,  razorpayOrder }




         this.logger.info('RazorOrder created successfully', { razorOrderId: razorOrder.id, name: razorOrder.buyer, slug: razorOrder.payment });
        timer();
        this.logger.methodExit('createRazorOrder', { razorOrderId: razorOrder.id });


        } catch (error2:any) {
           this.logger.error('RazorOrder created Failed to database', error2 as Error);
           
         }
         // this may retuen undedfined so in controller accordinly adress undefined 
        return mergedRazorOrder ; // razorOrder;
    }

    // Business Logic: Update RazorOrder
    async updateRazorOrder(razorOrderId: string, name: string): Promise<any> {
        this.logger.methodEntry('updateRazorOrder', { razorOrderId, name });
        const timer = this.logger.startTimer('Update RazorOrder');

        // Business Logic: Validate
        this.logger.debug('Validating razorOrder name', { razorOrderId, name });
        const validationError = this.validateRazorOrderName(name);
        if (validationError) {
            this.logger.warn('RazorOrder update validation failed', { razorOrderId, name, error: validationError });
            throw new Error(validationError);
        }

        // Business Logic: Check if razorOrder exists
        this.logger.debug('Checking if razorOrder exists', { razorOrderId });
        const existingRazorOrder = await this.razorOrderRepository.findById(razorOrderId);
        if (!existingRazorOrder) {
            this.logger.error('RazorOrder not found for update', new Error('RazorOrder not found'), { razorOrderId });
            throw new Error("RazorOrder not found");
        }

        // Business Logic: Generate new slug
        const sanitizedName = name.trim();
        const slug = slugify(sanitizedName, { lower: true });
        this.logger.debug('Generated new slug', { razorOrderId, sanitizedName, slug });

        // Business Logic: Check if another razorOrder has this name (exclude current)
        this.logger.debug('Checking for name conflicts', { razorOrderId, sanitizedName });
        const nameConflict = await this.razorOrderRepository.findByName(sanitizedName);
        if (nameConflict && nameConflict.id !== razorOrderId) {
            this.logger.warn('RazorOrder update failed - name conflict', { razorOrderId, name: sanitizedName, conflictId: nameConflict.id });
            throw new Error("RazorOrder name already exists");
        }

        // Business Logic: Update razorOrder
        this.logger.debug('Updating razorOrder', { razorOrderId, name: sanitizedName, slug });
       /** {
            sanitizedName,
            slug
        } */
            const updated = await this.razorOrderRepository.update(razorOrderId, existingRazorOrder);

        this.logger.info('RazorOrder updated successfully', { razorOrderId, name: updated?.buyer, payment: updated?.payment });
        timer();
        this.logger.methodExit('updateRazorOrder', { razorOrderId });

        return updated;
    }

    // Business Logic: Delete RazorOrder with Dependency Check
    async deleteRazorOrder(razorOrderId: string): Promise<any> {
        this.logger.methodEntry('deleteRazorOrder', { razorOrderId });
        const timer = this.logger.startTimer('Delete RazorOrder');

        // Business Logic: Check if razorOrder exists
        this.logger.debug('Checking if razorOrder exists', { razorOrderId });
        const razorOrder = await this.razorOrderRepository.findById(razorOrderId);
        if (!razorOrder) {
            this.logger.error('RazorOrder not found for deletion', new Error('RazorOrder not found'), { razorOrderId });
            throw new Error("RazorOrder not found");
        }

        /**  NOT REQUIRED for ORDERS 
        // Business Logic: Check if razorOrder has products
        this.logger.debug('Checking for associated products', { razorOrderId });
        const products = await this.productRepository.findByRazorOrder(razorOrderId);
        if (products.length > 0) {
            this.logger.warn('Cannot delete razorOrder with products', { razorOrderId, productCount: products.length });
            throw new Error(`Cannot delete razorOrder. It has ${products.length} products associated with it.`);
        }
        **/
        // Business Logic: Delete razorOrder
        this.logger.debug('Deleting razorOrder', { razorOrderId });
        const deleted = await this.razorOrderRepository.delete(razorOrderId);
        if (!deleted) {
            this.logger.error('Failed to delete razorOrder', new Error('Delete failed'), { razorOrderId });
            throw new Error("Failed to delete razorOrder");
        }

        this.logger.info('RazorOrder deleted successfully', { razorOrderId, buyerId: razorOrder.buyerId });
        timer();
        this.logger.methodExit('deleteRazorOrder', { razorOrderId });

        return razorOrder;
    }
  
          // Business Logic: Get User Razor Pay Orders
    async getUserRazorOrders(userId: string) {
        this.logger.methodEntry('getUserRazorOrders', { userId });
        const timer = this.logger.startTimer('Get User Razor Pay Orders');

        this.logger.debug('Fetching razor pay orders for user', { userId });
        const orders = await this.razorOrderRepository.findByUser(userId);

        this.logger.info('User  Razor Pay  orders retrieved', { userId, orderCount: orders.length });
        timer();
        this.logger.methodExit('getUserRazorOrders', { userId, count: orders.length });

        return orders;
    }


    // Business Logic: Get All Categories
    async getAllCategories(): Promise<any[]> {
        this.logger.methodEntry('getAllCategories');
        const timer = this.logger.startTimer('Get All Categories');

        this.logger.debug('Fetching all categories');
        const categories = await this.razorOrderRepository.findAll();

        this.logger.info('Categories retrieved', { count: categories.length });
        timer();
        this.logger.methodExit('getAllCategories', { count: categories.length });

        return categories;
    }

    // Business Logic: Get RazorOrder by Slug
    async getRazorOrderBySlug(slug: string): Promise<any> {
        this.logger.methodEntry('getRazorOrderBySlug', { slug });
        const timer = this.logger.startTimer('Get RazorOrder by Slug');

        this.logger.debug('Fetching razorOrder by slug', { slug });
        const razorOrder = await this.razorOrderRepository.findBySlug(slug);
        if (!razorOrder) {
            this.logger.warn('RazorOrder not found by slug', { slug });
            throw new Error("RazorOrder not found");
        }

        this.logger.info('RazorOrder retrieved by slug', { razorOrderId: razorOrder.id, slug });
        timer();
        this.logger.methodExit('getRazorOrderBySlug', { razorOrderId: razorOrder.id });

        return razorOrder;
    }

    // Business Logic: Get RazorOrder with Products
    /* NOT REQUIRED 
    async getRazorOrderWithProducts(slug: string): Promise<{ razorOrder: any; products: any[] }> {
        this.logger.methodEntry('getRazorOrderWithProducts', { slug });
        const timer = this.logger.startTimer('Get RazorOrder with Products');

        // Business Logic: Get razorOrder
        this.logger.debug('Fetching razorOrder by slug', { slug });
        const razorOrder = await this.razorOrderRepository.findBySlug(slug);
        if (!razorOrder) {
            this.logger.warn('RazorOrder not found for products query', { slug });
            throw new Error("RazorOrder not found");
        }

        // Business Logic: Get products in razorOrder
        this.logger.debug('Fetching products for razorOrder', { razorOrderId: razorOrder.id });
        const products = await this.productRepository.findByRazorOrder(razorOrder.id);

        this.logger.info('RazorOrder with products retrieved', {
            razorOrderId: razorOrder.id,
            slug,
            productCount: products.length
        });
        timer();
        this.logger.methodExit('getRazorOrderWithProducts', {
            razorOrderId: razorOrder.id,
            productCount: products.length
        });

        return {
            razorOrder,
            products
        };
    }
        */
    /** 
    // Business Logic: Get Categories with Product Count
    async getCategoriesWithCount(): Promise<any[]> {
        this.logger.methodEntry('getCategoriesWithCount');
        const timer = this.logger.startTimer('Get Categories with Count');

        this.logger.debug('Fetching categories with product count');
        const categories = await this.razorOrderRepository.findAllWithProductCount();

        this.logger.info('Categories with count retrieved', { razorOrderCount: categories.length });
        timer();
        this.logger.methodExit('getCategoriesWithCount', { count: categories.length });

        return categories;
    }
 */
    // Private Business Logic: Validation
    private validateRazorOrderName(name: string): string | null {
        this.logger.debug('Validating razorOrder name', { name });

        if (!name || !name.trim()) {
            this.logger.debug('Validation failed: Name is required');
            return "RazorOrder name is required";
        }

        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            this.logger.debug('Validation failed: Name too short', { length: trimmedName.length });
            return "RazorOrder name must be at least 2 characters";
        }

        if (trimmedName.length > 32) {
            this.logger.debug('Validation failed: Name too long', { length: trimmedName.length });
            return "RazorOrder name must be less than 32 characters";
        }

        // Allow letters, numbers, spaces, and common symbols
        const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s&\-'.()]+$/;
        if (!nameRegex.test(trimmedName)) {
            this.logger.debug('Validation failed: Invalid characters', { name: trimmedName });
            return "RazorOrder name contains invalid characters";
        }

        this.logger.debug('RazorOrder name validation passed', { name: trimmedName });
        return null;
    }
}