// src/controllers/razorpay.controller.ts
import { Request, Response } from "express";
import { RazorPayService } from "../services/razorpay.service.js";
import { AuthService } from "../services/auth.service.js";
import { Logger } from "../utils/logger.js";

// Dependency Injection: Single service instance
const razorpayService = new RazorPayService();
const logger = new Logger('RazorPayController');
const authService = new AuthService();
export const create = async (req: Request, res: Response): Promise<void> => {
     const userIdGlobal = (req as any).user.id;
    logger.methodEntry('create', { name: req.body.name });
    const timer = logger.startTimer('Create RazorPay');

    try {
        const { name } = req.body;
        const { cart } =  req.body;
        const { deliveryInfo } =  req.body;
         let debReqBody = JSON.stringify( req.body)
        logger.debug(' request body ::  ', { debReqBody });
        let debName = JSON.stringify(name)
        logger.debug('Creating razorpay name::  ', { debName });
         let debDeliveryInfo = JSON.stringify(deliveryInfo)
            logger.debug(' deliveryInfo :: ', { debDeliveryInfo });
         let debCart = JSON.stringify(cart)
            logger.debug(' cart ::   ', { debCart });
        // Controller Responsibility: Basic validation
        if (!name) {
            logger.warn('RazorPay creation failed - name required');
            res.json({ error: "RazorPay name is required" });
            return;
        }
        if (!cart ) {
            logger.warn('RazorPay creation failed - cart required');
            res.json({ error: "RazorPay cart is required" });
            return;
        }
        if (!deliveryInfo) {
            logger.warn('RazorPay creation failed - deliveryInfo required');
            res.json({ error: "RazorPay deliveryInfo is required" });
            return;
        }
        let dynamicNounce = '';
        if(cart !==undefined && cart !== null){  //&& Array.isArray(cart)&& cart.length > 0
         /* for(let i =0 ; i < cart.length ; i++  ){
            let firstCartElement =  cart[i]; 
            for(const  field  of firstCartElement ){
                if (cart[field] !==undefined &&   cart[field]?.trim() !== undefined && field === 'slug') {
                    dynamicNounce =dynamicNounce+ cart[field]?.trim()  +","
                }
 
            }
          }
           logger.debug('  razorpay  Nounce for  razororder', { dynamicNounce });
           */
            // 1. Ensure cart is parsed if it's passed as a JSON string
            const cartItems = typeof cart === 'string' ? JSON.parse(cart) : cart;

            let dynamicNounce = "";

            if (Array.isArray(cartItems) && cartItems.length > 0) {
            for (let i = 0; i < cartItems.length; i++) {
                const item = cartItems[i];
                
                // Safely check if 'slug' exists and is a non-empty string
                if (item && typeof item.slug === 'string' && item.slug.trim() !== '') {
                dynamicNounce += item.slug.trim() + ",";
                }
            }

            logger.debug('razorpay Nounce for razororder', { dynamicNounce });
            }
            /* BETER ADVANCED */
            /*        const cartItems = typeof cart === 'string' ? JSON.parse(cart) : cart;
                    if (Array.isArray(cartItems) && cartItems.length > 0) {
                    // Collect all slugs, trim them, filter out empty ones, and join with commas
                    const dynamicNounce = cartItems
                        .map(item => item?.slug?.trim())
                        .filter(Boolean)
                        .join(",") + ",";
                    logger.debug('razorpay Nounce for razororder', { dynamicNounce });
                    }
            */



        }
        let dynamicUser  = ''; 
        /*
        sameple 
        {
            fullName: auth?.user?.name || '',
            email: auth?.user?.email || '',
            phone: auth?.user?.phone || '',
            address: auth?.user?.address || '',
            city: '',
            postalCode: '',
            country: 'United States'
        } 
        */
        if (deliveryInfo !== undefined ) {
            
            dynamicUser = deliveryInfo.email 
            logger.debug('  razorpay User for  razororder', { dynamicUser });
        }
        // Controller Responsibility: Delegate to service
         if(cart !==undefined && Array.isArray(cart)&& cart.length > 0){
           if (deliveryInfo !== undefined &&  deliveryInfo.email !==undefined && 
                  deliveryInfo.phone !== undefined 
               ) {

            logger.debug('Calling razorpay service to create razororder', { name });
            let paymethodNounce = dynamicNounce !== '' ? dynamicNounce :  'RazorButton';
            let str = Array.from({length: 10}, () => Math.floor(Math.random() * 10)).join('');
            let userId =   userIdGlobal ? userIdGlobal :(  dynamicUser !== ''? dynamicUser : 'user_'+str ) ;
            const razorpay = await razorpayService.createRazorOrder(name ,cart,paymethodNounce  , userId  );
             if(razorpay !== undefined && razorpay !==null){
                logger.info('RazorPay created successfully', { razorpayId: razorpay?.id || '', name: razorpay?.name || '' });
                            timer();

                            // Controller Responsibility: Return response
                            res.json(razorpay); 
               logger.methodExit('create', { success: true, razorpayId: razorpay?.id || '' });
             }  
             else {
                  logger.error('RazorPay creation failed',  { name: req.body.name });
                  res.status(400).json({ error: 'Razor Order placement failed, Please try after sometime ' });
                    logger.methodExit('create', { success: false, error: 'Razor Order placement failed, Please try after sometime ' });
             }   
           
               }
          else {
             logger.info('RazorPay creation failed',  { name: 'Delivery Info missing ' });
          }
        }
        else {
             logger.info('RazorPay creation failed',  { name: 'Delivery Cart  missing ' });
        }

       
    } catch (error: any) {
        logger.error('RazorPay creation failed', error, { name: req.body.name });
        res.status(400).json({ error: error.message });
        logger.methodExit('create', { success: false, error: error.message });
    }
};
/*
export const update = async (req: Request, res: Response): Promise<void> => {
    const { razorpayId } = req.params;
    logger.methodEntry('update', { razorpayId, name: req.body.name });
    const timer = logger.startTimer('Update RazorPay');

    try {
        const { name } = req.body;
        logger.debug('Updating razorpay', { razorpayId, name });

        // Controller Responsibility: Basic validation
        if (!name) {
            logger.warn('RazorPay update failed - name required', { razorpayId });
            res.json({ error: "RazorPay name is required" });
            return;
        }

        // Controller Responsibility: Delegate to service
        logger.debug('Calling razorpay service to update', { razorpayId, name });
        const razorpay = await razorpayService.updateRazorPay(razorpayId, name);

        logger.info('RazorPay updated successfully', { razorpayId: razorpay.id, name: razorpay.name });
        timer();

        // Controller Responsibility: Return response
        res.json(razorpay);
        logger.methodExit('update', { success: true, razorpayId: razorpay.id });
    } catch (error: any) {
        logger.error('RazorPay update failed', error, { razorpayId, name: req.body.name });
        res.status(400).json({ error: error.message });
        logger.methodExit('update', { success: false, error: error.message });
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    const { razorpayId } = req.params;
    logger.methodEntry('remove', { razorpayId });
    const timer = logger.startTimer('Delete RazorPay');

    try {
        logger.debug('Deleting razorpay', { razorpayId });

        // Controller Responsibility: Delegate to service
        const removed = await razorpayService.deleteRazorPay(razorpayId);

        logger.info('RazorPay deleted successfully', { razorpayId });
        timer();

        // Controller Responsibility: Return response
        res.json(removed);
        logger.methodExit('remove', { success: true, razorpayId });
    } catch (error: any) {
        logger.error('RazorPay deletion failed', error, { razorpayId });
        res.status(400).json({ error: error.message });
        logger.methodExit('remove', { success: false, error: error.message });
    }
};
*/
export const getOrders = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.id;
    logger.methodEntry('getOrders', { userId });
    const timer = logger.startTimer('Fetch User Orders');

    try {
        // Controller Responsibility: Delegate to service
        logger.debug('Fetching user razor pay orders', { userId });
       // const orders = await authService.getUserOrders(userId);
       // const orders = await authService.getUserOrders(userId);
        const orders = await razorpayService.getUserRazorOrders(userId);

        logger.info('User razor pay orders fetched', { userId, orderCount: orders.length });
        timer();

        // Controller Responsibility: Return response
        res.json(orders);
        logger.methodExit('getOrders', { success: true, count: orders.length });
    } catch (error: any) {
        // Controller Responsibility: Error handling
        logger.error('Failed to fetch user orders', error, { userId });
        res.status(500).json({ error: "Failed to fetch orders" });
        logger.methodExit('getOrders', { success: false, error: error.message });
    }
};
export const list = async (req: Request, res: Response): Promise<void> => {
    logger.methodEntry('list');
    const timer = logger.startTimer('List Categories');

    try {
        logger.debug('Fetching all categories');

        // Controller Responsibility: Delegate to service
        const categories = await razorpayService.getAllCategories();

        logger.info('Categories fetched', { count: categories.length });
        timer();

        // Controller Responsibility: Return response
        res.json(categories);
        logger.methodExit('list', { success: true, count: categories.length });
    } catch (error: any) {
        logger.error('Failed to fetch categories', error);
        res.status(500).json({ error: "Failed to fetch categories" });
        logger.methodExit('list', { success: false, error: error.message });
    }
};
/*
export const read = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    logger.methodEntry('read', { slug });
    const timer = logger.startTimer('Read RazorPay');

    try {
        logger.debug('Fetching razorpay by slug', { slug });

        // Controller Responsibility: Delegate to service
        const razorpay = await razorpayService.getRazorPayBySlug(slug);

        logger.info('RazorPay fetched', { razorpayId: razorpay.id, slug });
        timer();

        // Controller Responsibility: Return response
        res.json(razorpay);
        logger.methodExit('read', { success: true, razorpayId: razorpay.id });
    } catch (error: any) {
        logger.error('Failed to fetch razorpay', error, { slug });
        res.status(400).json({ error: error.message });
        logger.methodExit('read', { success: false, error: error.message });
    }
};

export const productsByRazorPay = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    logger.methodEntry('productsByRazorPay', { slug });
    const timer = logger.startTimer('Get Products by RazorPay');

    try {
        logger.debug('Fetching products for razorpay', { slug });

        // Controller Responsibility: Delegate to service
        const result = await razorpayService.getRazorPayWithProducts(slug);

        logger.info('Products fetched for razorpay', {
            razorpayId: result.razorpay.id,
            slug,
            productCount: result.products.length
        });
        timer();

        // Controller Responsibility: Return response
        res.json(result);
        logger.methodExit('productsByRazorPay', {
            success: true,
            razorpayId: result.razorpay.id,
            productCount: result.products.length
        });
    } catch (error: any) {
        logger.error('Failed to fetch products by razorpay', error, { slug });
        res.status(400).json({ error: error.message });
        logger.methodExit('productsByRazorPay', { success: false, error: error.message });
    }
   
}; */