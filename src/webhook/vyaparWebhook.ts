import { Request, Response } from 'express';
import crypto from 'crypto';

export interface StaticQRPayload {
  event: string;
  customer_reference: string;
  customer_mobile: string;
  customer_name: string;
  amount: number;
  currency: string;
  upi_txn_id: string;
  payer_vpa: string;
  payer_name: string;
  status: string;
  timestamp: number;
  idempotency_key: string;
}

export interface DynamicQRPayload {
  order_id: string;
  client_txn_id: string;
  amount: number;
  currency: string;
  status: string;
  upi_txn_id: string;
  customer_name: string;
  customer_mobile: string;
  timestamp: string;
}

export type VyaparWebhookPayload = StaticQRPayload | DynamicQRPayload;

// Interface extending Express Request to hold rawBody
export interface RawBodyRequest extends Request {
  rawBody?: string;
}

const WEBHOOK_SECRET = process.env.VYAPAR_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET_HERE';

export const handleVyaparWebhook = async (req: RawBodyRequest, res: Response): Promise<Response> => {
  try {
    const signatureHeader = req.headers['x-vyapargateway-signature'];
    const timestampHeader = req.headers['x-vyapargateway-timestamp'];

    if (!signatureHeader || !timestampHeader) {
      return res.status(400).json({ error: 'Missing signature or timestamp headers' });
    }

    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const timestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;
    const payload: VyaparWebhookPayload = req.body;

    // Use rawBody string if available, otherwise fall back to canonical stringification
    const bodyString = req.rawBody 
      ? req.rawBody 
      : JSON.stringify(payload, Object.keys(payload || {}).sort());

    const stringToSign = `${timestamp}.${bodyString}`;

    // Step 2: Compute HMAC-SHA256
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(stringToSign)
      .digest('hex');

    // Step 3: Constant-time comparison
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      console.warn('⚠️ Invalid Vyapar Gateway webhook signature detected');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle Payment Success
    if ('order_id' in payload) {
      console.log('✅ Dynamic QR Payment Confirmed:', payload.order_id, 'Amount:', payload.amount);
      // TODO: Update Order status to 'PAID' in database for order_id
    } else {
      console.log('✅ Static QR Payment Confirmed:', payload.customer_reference, 'Amount:', payload.amount);
      // TODO: Log incoming merchant payment in database
    }

    // Webhook provider expects a 200 OK fast response
    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('❌ Webhook Processing Exception:', error);
    return res.status(500).json({ error: 'Internal server error while processing webhook' });
  }
};
