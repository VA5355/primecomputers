// src/controllers/bharatPe.controller.ts
import { Request, Response } from "express";
import { BharatPeService } from "../services/bharatpe.service.js";
import { AuthService } from "../services/auth.service.js";
import { Logger } from "../utils/logger.js";

// Dependency Injection: Single service instance
const bharatPeService = new BharatPeService();
const logger = new Logger('BharatPeController');
const authService = new AuthService();
export const create = async (req: Request, res: Response): Promise<void> => {
     const userIdGlobal = (req as any).user.id;
    logger.methodEntry('create', { name: req.body.name });
    const timer = logger.startTimer('Create BharatPe');

    try {
        const { name } = req.body;
        const { cart } =  req.body;
        const { deliveryInfo } =  req.body;
         let debReqBody = JSON.stringify( req.body)
        logger.debug(' request body ::  ', { debReqBody });
        let debName = JSON.stringify(name)
        logger.debug('Creating bharatPe name::  ', { debName });
         let debDeliveryInfo = JSON.stringify(deliveryInfo)
            logger.debug(' deliveryInfo :: ', { debDeliveryInfo });
         let debCart = JSON.stringify(cart)
            logger.debug(' cart ::   ', { debCart });
        // Controller Responsibility: Basic validation
        if (!name) {
            logger.warn('BharatPe creation failed - name required');
            res.json({ error: "BharatPe name is required" });
            return;
        }
        if (!cart ) {
            logger.warn('BharatPe creation failed - cart required');
            res.json({ error: "BharatPe cart is required" });
            return;
        }
        if (!deliveryInfo) {
            logger.warn('BharatPe creation failed - deliveryInfo required');
            res.json({ error: "BharatPe deliveryInfo is required" });
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
           logger.debug('  bharatPe  Nounce for  bharatpeorder', { dynamicNounce });
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

            logger.debug('bharatPe Nounce for bharatpeorder', { dynamicNounce });
            }
            /* BETER ADVANCED */
            /*        const cartItems = typeof cart === 'string' ? JSON.parse(cart) : cart;
                    if (Array.isArray(cartItems) && cartItems.length > 0) {
                    // Collect all slugs, trim them, filter out empty ones, and join with commas
                    const dynamicNounce = cartItems
                        .map(item => item?.slug?.trim())
                        .filter(Boolean)
                        .join(",") + ",";
                    logger.debug('bharatPe Nounce for bharatpeorder', { dynamicNounce });
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
            logger.debug('  bharatPe User for  bharatpeorder', { dynamicUser });
        }
        // Controller Responsibility: Delegate to service
         if(cart !==undefined && Array.isArray(cart)&& cart.length > 0){
           if (deliveryInfo !== undefined &&  deliveryInfo.email !==undefined && 
                  deliveryInfo.phone !== undefined 
               ) {

            logger.debug('Calling bharatPe service to create bharatpeorder', { name });
            let paymethodNounce = dynamicNounce !== '' ? dynamicNounce :  'BharatPeButton';
            let str = Array.from({length: 10}, () => Math.floor(Math.random() * 10)).join('');
            let userId =   userIdGlobal ? userIdGlobal :(  dynamicUser !== ''? dynamicUser : 'user_'+str ) ;
            const bharatPe = await bharatPeService.createBharatPeOrder(name ,cart,paymethodNounce  , userId  );
             if(bharatPe !== undefined && bharatPe !==null){
                logger.info('BharatPe created successfully', { bharatPeId: bharatPe?.id || '', name: bharatPe?.name || '' });
                            timer();

                            // Controller Responsibility: Return response
                            res.json(bharatPe); 
               logger.methodExit('create', { success: true, bharatPeId: bharatPe?.id || '' });
             }  
             else {
                  logger.error('BharatPe creation failed',  { name: req.body.name });
                  res.status(400).json({ error: 'BharatPe Order placement failed, Please try after sometime ' });
                    logger.methodExit('create', { success: false, error: 'BharatPe Order placement failed, Please try after sometime ' });
             }   
           
               }
          else {
             logger.info('BharatPe creation failed',  { name: 'Delivery Info missing ' });
          }
        }
        else {
             logger.info('BharatPe creation failed',  { name: 'Delivery Cart  missing ' });
        }

       
    } catch (error: any) {
        logger.error('BharatPe creation failed', error, { name: req.body.name });
        res.status(400).json({ error: error.message });
        logger.methodExit('create', { success: false, error: error.message });
    }
};
/*
export const update = async (req: Request, res: Response): Promise<void> => {
    const { bharatPeId } = req.params;
    logger.methodEntry('update', { bharatPeId, name: req.body.name });
    const timer = logger.startTimer('Update BharatPe');

    try {
        const { name } = req.body;
        logger.debug('Updating bharatPe', { bharatPeId, name });

        // Controller Responsibility: Basic validation
        if (!name) {
            logger.warn('BharatPe update failed - name required', { bharatPeId });
            res.json({ error: "BharatPe name is required" });
            return;
        }

        // Controller Responsibility: Delegate to service
        logger.debug('Calling bharatPe service to update', { bharatPeId, name });
        const bharatPe = await bharatPeService.updateBharatPe(bharatPeId, name);

        logger.info('BharatPe updated successfully', { bharatPeId: bharatPe.id, name: bharatPe.name });
        timer();

        // Controller Responsibility: Return response
        res.json(bharatPe);
        logger.methodExit('update', { success: true, bharatPeId: bharatPe.id });
    } catch (error: any) {
        logger.error('BharatPe update failed', error, { bharatPeId, name: req.body.name });
        res.status(400).json({ error: error.message });
        logger.methodExit('update', { success: false, error: error.message });
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    const { bharatPeId } = req.params;
    logger.methodEntry('remove', { bharatPeId });
    const timer = logger.startTimer('Delete BharatPe');

    try {
        logger.debug('Deleting bharatPe', { bharatPeId });

        // Controller Responsibility: Delegate to service
        const removed = await bharatPeService.deleteBharatPe(bharatPeId);

        logger.info('BharatPe deleted successfully', { bharatPeId });
        timer();

        // Controller Responsibility: Return response
        res.json(removed);
        logger.methodExit('remove', { success: true, bharatPeId });
    } catch (error: any) {
        logger.error('BharatPe deletion failed', error, { bharatPeId });
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
        logger.debug('Fetching user bharat pe orders', { userId });
       // const orders = await authService.getUserOrders(userId);
       // const orders = await authService.getUserOrders(userId);
        const orders = await authService.getUserOrders(userId);

        logger.info('User bharat pe orders fetched', { userId, orderCount: orders.length });
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
        const categories = await bharatPeService.getAllCategories();

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
    const timer = logger.startTimer('Read BharatPe');

    try {
        logger.debug('Fetching bharatPe by slug', { slug });

        // Controller Responsibility: Delegate to service
        const bharatPe = await bharatPeService.getBharatPeBySlug(slug);

        logger.info('BharatPe fetched', { bharatPeId: bharatPe.id, slug });
        timer();

        // Controller Responsibility: Return response
        res.json(bharatPe);
        logger.methodExit('read', { success: true, bharatPeId: bharatPe.id });
    } catch (error: any) {
        logger.error('Failed to fetch bharatPe', error, { slug });
        res.status(400).json({ error: error.message });
        logger.methodExit('read', { success: false, error: error.message });
    }
};

export const productsByBharatPe = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    logger.methodEntry('productsByBharatPe', { slug });
    const timer = logger.startTimer('Get Products by BharatPe');

    try {
        logger.debug('Fetching products for bharatPe', { slug });

        // Controller Responsibility: Delegate to service
        const result = await bharatPeService.getBharatPeWithProducts(slug);

        logger.info('Products fetched for bharatPe', {
            bharatPeId: result.bharatPe.id,
            slug,
            productCount: result.products.length
        });
        timer();

        // Controller Responsibility: Return response
        res.json(result);
        logger.methodExit('productsByBharatPe', {
            success: true,
            bharatPeId: result.bharatPe.id,
            productCount: result.products.length
        });
    } catch (error: any) {
        logger.error('Failed to fetch products by bharatPe', error, { slug });
        res.status(400).json({ error: error.message });
        logger.methodExit('productsByBharatPe', { success: false, error: error.message });
    }
   
}; */