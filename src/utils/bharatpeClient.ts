// src/utils/bharatpeClient.ts
import axios from 'axios';

export class BharatPeClient {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.VYAPAR_PROD_KEY || '';
        this.apiSecret = process.env.VYAPAR_WEBHOOK_SECRET || '';
        this.baseUrl = process.env.VYAPARGATEWAY_BASE_URL || 'https://vyapargateway.com' ;//'https://api.bharatpe.com/v1';
    }
    // client_txn_id  ( neonpostgresorderid )
    async createOrder(payload: { 
         key: string;
         p_info:string;
         customer_name:string;
         customer_mobile:string;
         customer_email:string;
         callback_url:string;
         redirect_url:string;
        amount: number;    /*currency: string; receipt: string; notes?: any,*/
         client_txn_id: string; }) {
        const response = await axios.post(`${this.baseUrl}/api/v1/create_order`, payload, {  // merchant/orders
            headers: {
                'X-API-Key': this.apiKey,
                'x-api-secret': this.apiSecret,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
}