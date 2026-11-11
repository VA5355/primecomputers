// src/services/BharatPeService.ts
import { ProductRepository } from "../repositories/product.repository.js";
import slugify from "slugify";
import { Logger } from "../utils/logger.js";
import { BharatPeRepository } from "../repositories/bharatpe.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { BharatPeClient } from "../utils/bharatpeClient.js";
import { CategoryRepository } from "../repositories/category.repository.js";
import axios from "axios";
import { AxiosError } from "axios";
//import { emailService } from "./email.service.js";
import { EmailService } from "./email.service.js";
import { CreateGatewayPaymentRequest, GatewayPaymentResult, GatewayPaymentStatus, GatewayStatusResult } from "../types/payment.types.js";


 
interface OrderProduct {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    quantity: number;
    sold: number;
    photoData: string | null;
    photoPath: string | null;
    photoContentType: string | null;
    shipping: boolean;
    categoryId: string;
    createdAt: string;
    updatedAt: string;

    category?: {
        id: string;
        name: string;
        slug: string;
    };
}

interface OrderPayment {
    nonce: string;
    amount: string;
}

interface OrderBuyer {
    id: string;
    name: string;
    email: string;
    address: string | null;
    role: number;
}

interface OrderDetails {
    id: string;

    payment: OrderPayment;

    buyerId: string;

    status: string;

    createdAt: string;

    updatedAt: string;

    products: OrderProduct[];

    buyer: OrderBuyer;
}
// IMPORTED from the payment.types.ts 
/* 
export interface CreateGatewayPaymentRequest {
    neonOrderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
}
export interface GatewayPaymentResult {
    gatewayOrderId: string;
    clientTxnId: string;
    status: "PENDING" | "FAILED";
    qrCode: string | null;
    paymentUrl: string | null;
    expiresAt: Date | null;
}
*/

interface VyaparCreateResponse {
    status: boolean;
    msg?: string;
    message?: string;

    data?: {
        order_id: string;
        client_txn_id: string;
        amount: number;
        currency?: string;
        status?: string;

         payment_url?: string;
        qr_code?: string;
        upi_string?: string;
        expires_at?: string;
        upi_intent?: Record<string, string>;
    };
}

interface VyaparStatusResponse {
    status?: boolean;
    msg?: string;
    message?: string;

    data?: {
        order_id?: string;
        client_txn_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        payment_status?: string;
        order_status?: string;
        paid_at?: string;
    };
}
  async function  createPayment(
        request: CreateGatewayPaymentRequest
    ): Promise<GatewayPaymentResult> {

        // 1. Generate or receive a unique transaction reference.
        // 2. Call the existing BharatPe/Vyapaar create-payment API.
        // 3. Validate the gateway response.
        // 4. Extract QR code/payment URL.
        // 5. Return normalized payment details.

        throw new Error("Implement using existing gateway API contract");
    }

    async function checkPaymentStatus(
        clientTxnId: string,
        gatewayOrderId: string
    ) {

        // Call the actual Vyapaar status-check API.
        // Normalize the returned status.
        // Do not treat an unrecognized response as SUCCESS.

        /*

        These are method contracts, not replacement implementations. We need your existing bharatpe.service.ts and its
         actual gateway request/response format before writing the real API calls. I do not want to invent gateway parameters 
         or give you code that generates an invalid QR.
        What exactly should be returned to Flutter?
        For example, the Node.js API could return:
        {
        "success": true,
        "message": "Payment request created",
        "data": {
            "supabaseOrderId": "SUPABASE-ORDER-UUID",
            "neonOrderId": "NEON-ORDER-UUID",
            "paymentStatus": "PENDING",
            "gateway": "BHARATPE",
            "qrCode": "GATEWAY_RETURNED_QR_DATA",
            "paymentUrl": null,
            "amount": 2499,
            "currency": "INR",
            "expiresAt": "2026-11-09T06:00:00.000Z"
        }
        }
        The qrCode field must contain the actual QR data or image returned by your gateway, in the format its API specifies.
         It might be a UPI string, a hosted image URL, or a Base64 image. Flutter should render it according to that format.
        Do not generate a new, unrelated UPI QR code from the amount and merchant UPI ID. It must represent the gateway payment
         request so that the payment can be reconciled against the correct transaction.
        2.4 repositories/bharatpe.repository.ts

        */

        throw new Error("Implement using existing gateway API contract");




    }

function checktoexist() {
   //  checkPaymentStatus('dfrbfgb','aoiaoagb');

}
  

export function getEmailImageUrl(
  originalUrl: string  | null | undefined,
  width = 300,
  quality = 75
): string {
  if (!originalUrl) {
    return "";
  }

  return originalUrl.replace(
    "/image/upload/",
    `/image/upload/c_limit,w_${width},q_${quality},f_jpg/`
  );
}

/*
 * Generate the email HTML.
 */
const generateOrderEmailHtmlOld = (
    orderDetails: OrderDetails
): string => {

    const productsHtml =
        orderDetails.products
            .map((product: OrderProduct) => {

                const imageHtml =
                    (product.photoPath
                        ?`<div style=\"margin: 10px 0;\"">" 
                            "  <img src=\"${getEmailImageUrl(product.photoPath)}\"" 
                           "          alt=\"${product.name}\"" 
                           "          style=" 
                           "              width: 150px;"
                          "               max-width: 100%;"
                            "              height: auto;"  
                             "             display: block;"  
                              "            border: 0;\"" 
                           "/>" 
                           "    </div>"+
                        `
                        : "");

                return ` <li style="margin-bottom: 15px;">

                        <div>
                            <strong>
                                ${product.name}
                            </strong>
                        </div>

                        <div>
                            Quantity:
                            ${product.quantity}
                        </div>

                        <div>
                            Price:
                            $${product.price}
                        </div>

                        ${imageHtml}

                    </li>
                `;
            })
            .join("");

    const htmlContent = `
        <!DOCTYPE html>

        <html>
            <head>
                <meta charset="UTF-8">

                <title>
                    Order Confirmation
                </title>
            </head>

            <body
                style="
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #333333;
                    background-color: #ffffff;
                "
            >

                <div
                    style="
                        max-width: 700px;
                        margin: 0 auto;
                    "
                >

                    <h2>
                        Thank you for your order!
                    </h2>

                    <p>
                        Your order
                        <strong>
                            #${orderDetails.id}
                        </strong>
                        has been confirmed.
                    </p>

                    <h3>
                        Order Details:
                    </h3>

                    <ul>
                        ${productsHtml}
                    </ul>

                    <p>
                        <strong>
                            Total:
                            $${orderDetails.payment.amount}
                        </strong>
                    </p>

                    <p>
                        We'll send you another email
                        when your order ships.
                    </p>

                    <br />

                    <p>
                        Best regards,<br />
                        Prime Computer &amp; Network Team
                    </p>

                </div>

            </body>
        </html>
    `;

    return htmlContent;
};
/*
 * Generate the email HTML.
 */
const generateOrderEmailHtml = (
    orderDetails: OrderDetails
): string => {

   const productsHtml = orderDetails.products
  .map((product) => {

    const imageUrl = getEmailImageUrl(product?.photoPath, 300, 75);

    return `
      <li style="margin-bottom:20px;">

        <strong>${product.name}</strong>

        <br />

        Quantity: ${product.quantity}

        <br />

        Price: $${product.price}

        ${
          imageUrl
            ? `
              <br />

              <img
                src="${imageUrl}"
                alt="${product.name}"
                width="300"
                style="
                  display:block;
                  width:300px;
                  max-width:100%;
                  height:auto;
                  border:0;
                  margin-top:10px;
                "
              />
            `
            : ""
        }

      </li>
    `;
  })
  .join("");

    const htmlContent = `
        <!DOCTYPE html>

        <html>
            <head>
                <meta charset="UTF-8">

                <title>
                    Order Confirmation
                </title>
            </head>

            <body
                style="
                    margin: 0;
                    padding: 2px;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #333333;
                    background-color: #ffffff;
                "
            >

                <div
                    style="
                        max-width: 700px;
                        margin: 0 auto;
                    "
                >

                    <h2>
                        Thank you for your order!
                    </h2>

                    <p>
                        Your order
                        <strong>
                            #${orderDetails.id}
                        </strong>
                        has been confirmed.
                    </p>

                    <h3>
                        Order Details:
                    </h3>

                    <ul>
                        ${productsHtml}
                    </ul>

                    <p>
                        <strong>
                            Total:
                            $${orderDetails.payment.amount}
                        </strong>
                    </p>

                     

                    <br />

                    <p>
                        Best regards,<br />
                        Prime Computer &amp; Network Team
                    </p>

                </div>

            </body>
        </html>
    `;

    return htmlContent;
};

 


export class BharatPeService {
    private bharatPeOrderRepository: BharatPeRepository;
        private categoryRepository: CategoryRepository;
    private productRepository: ProductRepository;
    private userRepository: UserRepository;
    private bharatPeClient: BharatPeClient;
    private emService: EmailService;
    private logger: Logger;

        private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor() {
        this.bharatPeOrderRepository = new BharatPeRepository();
        this.productRepository = new ProductRepository();
        this.userRepository = new UserRepository();
        this.bharatPeClient = new BharatPeClient();
        this.emService = new EmailService();
        this.logger = new Logger('BharatPeService');
         this.baseUrl = (
            process.env.VYAPARGATEWAY_BASE_URL ??
            "https://vyapargateway.com"
        ).replace(/\/+$/, "");

        const apiKey = process.env.VYAPARGATEWAY_API_KEY;

        if (!apiKey) {
            throw new Error(
                "VYAPARGATEWAY_API_KEY is missing"
            );
        }

        this.apiKey = apiKey;
        
    }
      private get headers(): HeadersInit {
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-Key": this.apiKey
        };
    }
     private paiseToRupees(amountPaise: number): string {

        if (
            !Number.isSafeInteger(amountPaise) ||
            amountPaise <= 0
        ) {
            throw new Error("Invalid payment amount");
        }

        const rupees = Math.floor(amountPaise / 100);
        const paise = amountPaise % 100;

        return `${rupees}.${String(paise).padStart(2, "0")}`;
    }

    private normalizeStatus(value?: string): GatewayPaymentStatus {

        const status = String(value ?? "")
            .trim()
            .toUpperCase();

        switch (status) {
            case "SUCCESS":
            case "PAID":
            case "COMPLETED":
            case "TXN_SUCCESS":
                return "SUCCESS";

            case "FAILED":
            case "FAILURE":
            case "TXN_FAILURE":
                return "FAILED";

            case "EXPIRED":
                return "EXPIRED";

            case "CANCELLED":
            case "CANCELED":
                return "CANCELLED";

            case "PENDING":
            case "PROCESSING":
            case "INITIATED":
                return "PENDING";

            default:
                return "UNKNOWN";
        }
    }
 /**
     * Create a dynamic UPI payment order.
     *
     * Called only after the Neon order has been saved
     * and the amount has been calculated from trusted data.
     */
    async createPayment(
        request: CreateGatewayPaymentRequest
    ): Promise<GatewayPaymentResult> {

         
        if (!request.clientTxnId) {
            throw new Error("clientTxnId is required");
        }

        const amount = this.paiseToRupees(
            request.amountPaise
        );

        const url = `${this.baseUrl}/api/v1/create_order`;

        const body = {
            client_txn_id: request.clientTxnId,

            amount,

            p_info: request.description,

            customer_name: request.customer?.name,
            customer_email: request.customer?.email,
            customer_mobile: request.customer?.mobile,

            redirect_url: request.redirectUrl,
            callback_url: request.callbackUrl
        };

        let response: Response;

        try {
              console.log("[BHARATPE] Initiating gateway request:", {
                method: "POST",
                hostname: new URL(url).hostname,
                timestamp: new Date().toISOString(), requestbody: JSON.stringify(body)
            });
            response = await fetch(url, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(15000)
            });

        } catch (error :any) {
                  console.error("[BHARATPE] Gateway network failure:", {
                    name: error?.name,
                    message: error?.message,
                    cause: error?.cause
                        ? {
                            name: error.cause.name,
                            message: error.cause.message,
                            code: error.cause.code,
                            errno: error.cause.errno,
                            syscall: error.cause.syscall,
                            hostname: error.cause.hostname
                        }
                        : null,
                    stack: error?.stack
                });
            // Network timeout is an UNKNOWN gateway outcome.
            // Do not generate a new clientTxnId on retry.
            throw new Error(
                `Gateway create request failed: ${
                    error instanceof Error
                        ? error.message
                        : "Unknown network error"
                }`
            );
        }

        const payload = await response.json() as VyaparCreateResponse;

        if (!response.ok) {
            throw new Error(
                `Gateway HTTP error ${response.status}: ${
                    payload.msg ?? payload.message ?? "Payment creation failed"
                }`
            );
        }

        if (payload.status !== true || !payload.data) {
            throw new Error(
                payload.msg ??
                payload.message ??
                "Gateway rejected payment creation"
            );
        }

        const data = payload.data;

        if (
            !data.order_id ||
            data.client_txn_id !== request.clientTxnId
        ) {
            throw new Error(
                "Gateway response does not match the local transaction"
            );
        }

        if (
            data.amount !== undefined &&
            Math.round(Number(data.amount) * 100) !== request.amountPaise
        ) {
            throw new Error(
                "Gateway returned an unexpected payment amount"
            );
        }

        return {
            success: true,

            gatewayOrderId: data.order_id,
            clientTxnId: data.client_txn_id,

            amount: Number(data.amount),
            currency: "INR",

            paymentUrl: data.payment_url,
            qrCode: data.qr_code,
            upiString: data.upi_string,

            expiresAt: data.expires_at
                ? new Date(data.expires_at)
                : undefined,

            rawResponse: payload
        };
    }
       /**
     * Verify payment status with VyaparGateway.
     *
     * This method must be called from the backend,
     * never directly from Flutter.
     */
    async checkPaymentStatus(
        clientTxnId: string,
        gatewayOrderId: string
    ): Promise<GatewayStatusResult> {

        if (!clientTxnId || !gatewayOrderId) {
            throw new Error(
                "Both clientTxnId and gatewayOrderId are required"
            );
        }

        const url = `${this.baseUrl}/api/v1/check_order_status`;

        const body = {
            order_id: gatewayOrderId,
            client_txn_id: clientTxnId
        };

        const response = await fetch(url, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000)
        });

        const payload = await response.json() as VyaparStatusResponse;

        if (!response.ok) {
            throw new Error(
                `Gateway status HTTP error: ${response.status}`
            );
        }

        if (payload.status === false) {
            throw new Error(
                payload.msg ??
                payload.message ??
                "Unable to verify payment status"
            );
        }

        const data = payload.data;

        if (!data) {
            throw new Error(
                "Gateway returned an empty payment status response"
            );
        }

        if (
            data.order_id &&
            data.order_id !== gatewayOrderId
        ) {
            throw new Error(
                "Gateway order ID does not match"
            );
        }

        if (
            data.client_txn_id &&
            data.client_txn_id !== clientTxnId
        ) {
            throw new Error(
                "Gateway transaction ID does not match"
            );
        }

        const rawStatus =
            data.payment_status ??
            data.order_status ??
            data.status;

        const normalizedStatus = this.normalizeStatus(rawStatus);

        return {
            success: normalizedStatus === "SUCCESS",

            gatewayOrderId:
                data.order_id ?? gatewayOrderId,

            clientTxnId:
                data.client_txn_id ?? clientTxnId,

            status: normalizedStatus,

            amount: data.amount !== undefined
                ? Number(data.amount)
                : undefined,

            currency: data.currency,

            paidAt: data.paid_at
                ? new Date(data.paid_at)
                : undefined,

            rawResponse: payload
        };
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

        // Business Logic: Get User BharatPe Pay Order
    async getUserBharatPeOrder(orderId: string) {
        this.logger.methodEntry('getUserBharatPeOrder', { orderId });
        const timer = this.logger.startTimer('Get User Bharat Pay Orders');

        this.logger.debug('Fetching bharat pay order for orderId', { orderId });
        const orders = await this.bharatPeOrderRepository.findByPeOrdersId(orderId);
        let firstOrder = null;
        if(orders !==undefined && orders !== null && orders.length >0){
                firstOrder = orders[0];
        }
        let orJS = JSON.stringify(firstOrder);
        this.logger.info('User  BharatPeOrder Pay  orders retrieved', { orderId, orJS });
        timer();
        this.logger.methodExit('getUserBharatPeOrder', { orderId, orJS });

        return firstOrder;
    }
        // Business Logic: Get User BharatPe Pay QR Pay Status 
    async getUserBharatPeQRPayStatus(orderId: string, clientTxnId: string,userId:string) {
        this.logger.methodEntry('getUserBharatPeQRPayStatus', { orderId });
        const timer = this.logger.startTimer('Poll User Bharat Pay QR Order Payment status ');

        this.logger.debug('Polling bharat pay  QR Order Payment for client txn id , userId ', { orderId ,  userId});
         let baseUrl = process.env.VYAPARGATEWAY_BASE_URL;
         // 2. Define the headers inside a config object
        const config = {
            headers: {
          //  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
            'Content-Type': 'application/json', // Optional: Axios sets this by default for objects
           // 'X-Custom-Header': 'CustomValue'
            }
        };
         // 1. Define the request body (Axios serializes JS objects to JSON automatically)
            const body = {
                 key : process.env.VYAPAR_PROD_KEY,
                order_id:clientTxnId ,
                client_txn_id: orderId
            };
        let responseData = null;
         let pollJSON = JSON.stringify({ status :'Pending'});
        // for response dummy get the order details from above getUseBharatPeOrder function 
        // 
        try { 
        let dbOrderForAmt = await this.getUserBharatPeOrder(orderId); 
        let orderDetails :any = {};
             let jsOrder:any = undefined; 
         if(dbOrderForAmt !==undefined && dbOrderForAmt !== null){
              orderDetails =dbOrderForAmt ; 
             jsOrder = JSON.stringify(dbOrderForAmt);
         }
          this.logger.info(' QR PAYMENT  bharat pe getUserBharatPeOrder fetched', {   BHARATPEQR: jsOrder });
         let orderAmt = dbOrderForAmt?.payment.amount;   
                    const userRepository = new UserRepository();
            const buyer = await userRepository.findById(userId);
           try { 

             if (buyer!== undefined && buyer !==null) //throw new Error("User not found");
                  { 
                  /* * Generate HTML. */
                    const htmlContent =    generateOrderEmailHtml(orderDetails);
                    /*
                    * Debug the actual object being used.
                    */
                    console.log(
                        "ORDER DETAILS:",
                        JSON.stringify(
                            orderDetails,
                            null,
                            2
                        )
                    );

                    console.log(
                        "ORDER ID:",
                        orderDetails.id
                    );

                    console.log(
                        "PAYMENT AMOUNT:",
                        orderDetails.payment?.amount
                    );

                    console.log(
                        "PRODUCTS:",
                        orderDetails.products
                    );

                    orderDetails.products.forEach(
                        (product: OrderProduct) => {

                            console.log(
                                "      PRODUCT:",
                                product.name
                            );

                            console.log(
                                "      PHOTO PATH:",
                                product.photoPath
                            );
                        }
                    );

                    console.log(
                        "GENERATED HTML:",
                        htmlContent
                    );

                    try { 
                                console.log("Sending Polling request to "+ `${baseUrl}/api/v1/check_order_status`);
                                console.log("  Polling request    body "+ JSON.stringify(body));
                                console.log("   Polling request config  "+ JSON.stringify(config));

                                const response =  await axios.post(
                                        `${baseUrl}/api/v1/check_order_status`,  body, config);
                                /*const response =    await Promise.resolve({
                                                    "status": true,
                                                    "msg": "Order found",
                                                    "data": {
                                                        "order_id": clientTxnId,
                                                        "payment_url": "https://vyapargateway.com/gateway/pay/5fe8a3c47b1c4d6f9e0d8a2b1c3d4e5f",
                                                        "client_txn_id":orderId,
                                                        "amount": orderAmt,
                                                        "currency": "INR",
                                                        "status": "success",
                                                        "expires_at": "2024-12-28T10:40:00+00:00",
                                                        "expires_in": "0 seconds",
                                                        "qr_code": "data:image/png;base64,iVBORw0KG...",
                                                        "upi_string": "upi://pay?pa=merchant@upi&pn=Merchant&am=150.50&cu=INR&tr=...",
                                                        "upi_intent": {
                                                        "bhim_link": "upi://pay?...",
                                                        "phonepe_link": "phonepe://pay?...",
                                                        "paytm_link": "paytmmp://pay?...",
                                                        "gpay_link": "tez://upi/pay?..."
                                                        },
                                                        "merchant_upi_id": "paytmqr6jz67n@ptys",
                                                        "merchant_name": "Prime the computer store",
                                                        "created_at_unix": 1735381800
                                                    }
                                                });
                                    */
                                    if(response !==undefined && response !== null && response.data  !==undefined && response.data !== null){
                                            responseData =response.data
                                    }
                                pollJSON = JSON.stringify(responseData);

                                if (responseData !==undefined  && ( responseData?.status === 'success' || responseData?.orderStatus === 'success')) {
                                    console.log('success');
                                    let status  = responseData?.status;
                                    this.logger.info(' BharatPeOrder Pay QR Order Payment status  ', { orderId , clientTxnId , status });
                                    if(this.emService !== null && this.emService !== undefined){
                                         // await this.sendOrderConfirmationEmail(dbOrderForAmt, buyer.email);
                                         await this.sendStrOrderConfirmationEmail(dbOrderForAmt,htmlContent,  buyer.email);

                                    }
                                    else {
                                           this.logger.info(' BharatPeOrder Pay QR Order  Email Service Unavailable  ', { orderId , clientTxnId , status });
                                    }
                                   
                                }
                                else if (responseData?.status === true && (responseData?.data?.status === 'success' || responseData?.orderStatus === 'success')) {
                                        console.log('success');
                                        let status  = responseData?.status;
                                    this.logger.info(' BharatPeOrder Pay QR Order Payment status  ', { orderId , clientTxnId , status });   
                                    if(this.emService !== null && this.emService !== undefined){
                                        // await this.sendOrderConfirmationEmail(dbOrderForAmt, buyer.email);
                                         await this.sendStrOrderConfirmationEmail(dbOrderForAmt,htmlContent , buyer.email);

                                    }
                                    else {
                                           this.logger.info(' BharatPeOrder Pay QR Order  Email Service Unavailable  ', { orderId , clientTxnId , status });
                                    }
                                // start email notification process
                                    
                                //   window.location.href = `/vyaparbharatpesuccess?order_id=${orderId}&clientTxnId=${clientTxnId}`;
                                } 
                            }catch(verr:any){

                                console.log(" Error received from "+baseUrl+"  "+ JSON.stringify(verr));
                            }
                }
                else {
                      console.log(" BharatPeORder  getUserBharatPeQRPayStatus  User not found "+baseUrl+"  " );
                }                 
                    }catch(useerr:any){

                    console.log(" Error fetching User Details  from DB  "+ JSON.stringify(useerr));

                    
                    }
               
        
            }catch(berr:any){

                    console.log(" Error fetching BHARAT PE ORDER  from DB  "+ JSON.stringify(berr));
                }
        
       
      
        this.logger.info(' BharatPeOrder Pay QR Order Payment status  ', { orderId , clientTxnId , pollJSON });
        timer();
        this.logger.methodExit('getUserBharatPeQRPayStatus ', { orderId, clientTxnId ,  pollJSON });

        return responseData;
    }
        // Business Logic: Get User BharatPe Orders
    async getUserBharatPeOrders(userId: string) {
        this.logger.methodEntry('getUserBharatPeOrders', { userId });
        const timer = this.logger.startTimer('Get User Bharat Pay Orders');

        this.logger.debug('Fetching Bharat pay orders for user', { userId });
        const orders = await this.bharatPeOrderRepository.findByUser(userId);

        this.logger.info('User  Bharat Pay  orders retrieved', { userId, orderCount: orders.length });
        timer();
        this.logger.methodExit('getUserBharatPeOrders', { userId, count: orders.length });

        return orders;
    }
  
    async sendOrderConfirmationEmail(order: any, userEmail?: string): Promise<void> {
        const recipientEmail = userEmail || order?.email;
        if (!recipientEmail) return;

        try {
            const total = order?.amount || 
                (order.products || []).reduce((acc: any, p: any) => acc + (Number(p.price) || 0) * (p.quantity || 1), 0);

            const orderDetails = {
                orderId: order.id,
                total: total.toFixed(2),
                products: (order.products || []).map((product: any) => ({
                    name: product.name || "Product Item",
                    quantity: product.quantity || 1,
                    price: (Number(product.price) || 0).toFixed(2),
                })),
            };
                
// 
           // await this.emService.sendOrderConfirmation(recipientEmail, orderDetails);
         //   await this.emService.sendBharatPeOrderConfirmation(recipientEmail, orderDetails);
            await this.emService.sendBharatPeOrderConfirmationHTTP(recipientEmail, orderDetails);
        } catch (error) {
           this. logger.error("Error sending order confirmation email", error as Error, { orderId: order.id });
        }
    }
    async sendStrOrderConfirmationEmail(strorder: any,strHtmlContent:any, userEmail?: string): Promise<void> {
       // let order  = JSON.parse(strorder);
        const recipientEmail = userEmail;// || order?.email;
        if (!recipientEmail) return;
        let orderDetails = strorder;
        try {
           /* const total = order?.amount || 
                (order.products || []).reduce((acc: any, p: any) => acc + (Number(p.price) || 0) * (p.quantity || 1), 0);

            const orderDetails = {
                orderId: order.id,
                total: total.toFixed(2),
                products: (order.products || []).map((product: any) => ({
                    name: product.name || "Product Item",
                    quantity: product.quantity || 1,
                    price: (Number(product.price) || 0).toFixed(2),
                })),
            };
                */
// 
           // await this.emService.sendOrderConfirmation(recipientEmail, orderDetails);
         //   await this.emService.sendBharatPeOrderConfirmation(recipientEmail, orderDetails);
            await this.emService.sendStrBharatPeOrderConfirmationHTTP(recipientEmail, orderDetails,strHtmlContent);
        } catch (error) {
           this. logger.error("Error sending order confirmation email", error as Error, { order : strorder });
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
