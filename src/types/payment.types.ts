export interface CreateGatewayPaymentRequest {
    clientTxnId: string;

    // Always calculate and store this in paise.
    amountPaise: number;

    description: string;

    customer?: {
        name?: string;
        email?: string;
        mobile?: string;
    };

    redirectUrl: string;
    callbackUrl: string;
}

export interface GatewayPaymentResult {
    success: boolean;

    gatewayOrderId: string;
    clientTxnId: string;

    amount: number;
    currency: "INR";

    paymentUrl?: string;
    qrCode?: string;
    upiString?: string;

    expiresAt?: Date;

    rawResponse?: unknown;
}

export type GatewayPaymentStatus =
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "EXPIRED"
    | "CANCELLED"
    | "UNKNOWN";

export interface GatewayStatusResult {
    success: boolean;

    gatewayOrderId: string;
    clientTxnId: string;

    status: GatewayPaymentStatus;

    amount?: number;
    currency?: string;
    paidAt?: Date;

    rawResponse?: unknown;
}