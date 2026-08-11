// src/services/BharatPeService.ts
import { ProductRepository } from "../repositories/product.repository.js";
import slugify from "slugify";
import { Logger } from "../utils/logger.js";
import { BharatPeRepository } from "../repositories/bharatpe.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { BharatPeClient } from "../utils/bharatpeClient.js";
import { CategoryRepository } from "../repositories/category.repository.js";
import { AxiosError } from "axios";

export class BharatPeService {
    private bharatPeOrderRepository: BharatPeRepository;
        private categoryRepository: CategoryRepository;
    private productRepository: ProductRepository;
    private userRepository: UserRepository;
    private bharatPeClient: BharatPeClient;
    private logger: Logger;

    constructor() {
        this.bharatPeOrderRepository = new BharatPeRepository();
        this.productRepository = new ProductRepository();
        this.userRepository = new UserRepository();
        this.bharatPeClient = new BharatPeClient();
        this.logger = new Logger('BharatPeService');
    }

    async createBharatPeOrder(name: string,payload:any, cart: any[], paymethodNonce: string, userId: string): Promise<any> {
        this.logger.methodEntry('createBharatPeOrder', { name, userId });
        const timer = this.logger.startTimer('Create BharatPeOrder');

        // 1. Validation
        const validationError = this.validateBharatPeOrderName(name);
        if (validationError) {
            this.logger.warn('BharatPeOrder validation failed', { name, error: validationError });
            throw new Error(validationError);
        }
        let dbOrderGlobal = undefined;
        // Business Logic: Sanitize and generate slug
        const sanitizedName = name.trim();
        const slug = slugify(sanitizedName, { lower: true });
        this.logger.debug('Generated slug for BharatPeOrder', { sanitizedName, slug });

        // Business Logic: Check if BharatPeOrder already exists
        this.logger.debug('Checking if BharatPeOrder name exists', { sanitizedName });
        try { 

            const existingbharatPeOrder = await this.bharatPeOrderRepository.findByName(sanitizedName);
            if (existingbharatPeOrder) {
                this.logger.warn('bharatPeOrder creation failed - name already exists', { name: sanitizedName });
                throw new Error("bharatPeOrder already exists");
            }
            // Business Logic: Check if slug already exists
                    this.logger.debug('Checking if slug exists', { slug });
                    const existingSlug = await this.bharatPeOrderRepository.findBySlug(slug);
                    if (existingSlug) {
                        this.logger.warn('bharatPeOrder creation failed - slug already exists', { slug });
                        throw new Error("bharatPeOrder with similar name already exists");
                    }
        } catch (error: any) {
                this.logger.error('bharatPePay validation for order :: finding existing order failed ', error, { name: error.message });
                // res.status(400).json({ error: error.message });
            //  this.logger.methodExit('create', { success: false, error: error.message });
            }  

        // 2. Compute Cart Total
      //  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
       // const productIds = cart.map(item => item.id);


        try {


             // Business Logic: Calculate total amount
                    //    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                     //   note item.quantity is the total quantity in the Stock , so take the cartQuantity if not 1 
                        let total = cart.reduce((sum, item) => sum + (item.price * (item.cartQuantity || 1)), 0);
                         total = payload?.amount  !==undefined  ? payload.amount : total;
                        // Business Logic: Create razorOrder
                        this.logger.debug('Creating razorOrder', { name: sanitizedName, slug });
                        // Business Logic: Process Razor payment
                            const result = await Promise.resolve({
                                amount: total.toFixed(2),
                                paymentMethodNonce: paymethodNonce,
                                options: {
                                    submitForSettlement: true,
                                },
                            });
                        // Business Logic: Create order (repository will handle relations)
                          const productIds = cart.map(item => item.id);
            // 3. Fetch Buyer
            const buyer = await this.userRepository.findById(userId);

            // 4. Save Database Order
            const dbOrder = await this.bharatPeOrderRepository.createOrder({
                payment: { amount: total.toFixed(2), nonce: paymethodNonce },
                buyer: buyer as any,
                buyerId: userId,
                status: "Processing" as any,
            }, productIds);

            dbOrderGlobal = Object.assign({}  , dbOrder);

            // 1. Ensure amount format is decimal standard (Rupees, not Paise)
              const formattedAmount = Number(total.toFixed(2));

           // 2. Ensure customer_mobile meets 10-digit requirements
               const validMobile =  "9999999999";  // (buyer?.mobile && buyer.phone.length === 10)             ? buyer.phone             : "9999999999";    
                        
                        // Get buyer for the order relation
              //            const userRepository = new UserRepository();
               //            const buyer = await userRepository.findById(userId);
                        /**{
                            name: sanitizedName,
                            slug
                        }
                           
                         */
               /*          razorOrder = await this.razorOrderRepository.createOrder({
                                    payment: result,
                                    buyer: buyer as any,
                                    buyerId: userId, // Add missing property
                                    status: "Processing" as any,
                                },
                                productIds);
                        await this.razorOrderRepository.save(razorOrder);
                    */     //IMMEDIATELY CREATE RAZOR ORDER 
                         // 2. Create actual Razorpay Order API call
             /*           const razorpayOrder = await instance.orders.create({
                          amount: Math.round( total.toFixed(2) * 100), // in paise
                           currency: "INR",
                              receipt: razorOrder.id.slice(0, 40), // Pass DB ID as receipt reference
                            notes: {
                        internal_order_id: razorOrder.id,
                          },
                          });
                          mergedRazorOrder = {  razorOrder ,  razorpayOrder }
                
                */



            // 5. Invoke BharatPe Gateway Endpoint via HTTP Client
            const bharatPeOrderNew = await this.bharatPeClient.createOrder({
                key: process.env.VYAPAR_PROD_KEY || '',
                p_info: `BharatPe_${dbOrder.id.slice(0, 8)}`,
                //JSON.stringify({  paymethodNonce , internal_order_id: dbOrder.id }), 
                customer_name:buyer?.name || 'primecomputer customer',
                 customer_mobile:  validMobile,
                customer_email: buyer?.email ||  "john@example.com",
                 callback_url: process.env.VYAPARGATEWAY_BASE_URL  || "https://primecomputernetwork.com/vyaparcallback",
                redirect_url:process.env.VYAPARGATEWAY_BASE_URL  || "https://primecomputernetwork.com/vyaparbharatpesuccess",
                amount: formattedAmount  , // Math.round(total * 100), // in paise
               /* currency: "INR",
                receipt: dbOrder.id.slice(0, 40),
                notes: { internal_order_id: dbOrder.id },   */
                client_txn_id: dbOrder.id
            });

            const mergedBharatPeOrder = { bharatPeOrder: dbOrder, bharatPeOrderNew };

            this.logger.info('BharatPeOrder created successfully', { dbOrderId: dbOrder.id });
            timer();
            this.logger.methodExit('createBharatPeOrder', { dbOrderId: dbOrder.id });

            return mergedBharatPeOrder;

        } catch (error: any) {
            this.logger.error('BharatPeOrder creation failed', error);
            //throw new Error(`Failed to process BharatPe Order: ${error.message}`);
            let gatewayErrorDetails = error.message;

            if (error instanceof AxiosError && error.response) {
                // Extract third-party gateway validation failure response
                gatewayErrorDetails = JSON.stringify(error.response.data);
                this.logger.error('Vyapar Gateway 422 Payload Validation Details:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }

            // Graceful Return: Inform client that local DB order succeeded, but Gateway is degraded
            return {
                success: false,
                isGatewayError: true,
                bharatPeOrder: dbOrderGlobal,
                message: "Order registered locally. Payment gateway provider rejected processing parameters.",
                gatewayError: gatewayErrorDetails
            };
        }
    }

    // Business Logic: Get All Categories
    async getAllCategories(): Promise<any[]> {
        this.logger.methodEntry('getAllCategories');
        const timer = this.logger.startTimer('Get All Categories');

        this.logger.debug('Fetching all categories');
        const categories = await this.categoryRepository.findAll();

        this.logger.info('Categories retrieved', { count: categories.length });
        timer();
        this.logger.methodExit('getAllCategories', { count: categories.length });

        return categories;
    }

    // Business Logic: Get Category by Slug
    async getCategoryBySlug(slug: string): Promise<any> {
        this.logger.methodEntry('getCategoryBySlug', { slug });
        const timer = this.logger.startTimer('Get Category by Slug');

        this.logger.debug('Fetching category by slug', { slug });
        const category = await this.categoryRepository.findBySlug(slug);
        if (!category) {
            this.logger.warn('Category not found by slug', { slug });
            throw new Error("Category not found");
        }

        this.logger.info('Category retrieved by slug', { categoryId: category.id, slug });
        timer();
        this.logger.methodExit('getCategoryBySlug', { categoryId: category.id });

        return category;
    }
    private validateBharatPeOrderName(name: string): string | null {
        if (!name || !name.trim()) return "Order name is required";
        if (name.trim().length < 2) return "Order name must be at least 2 characters";
        return null;
    }
}
