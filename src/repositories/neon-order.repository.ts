import { In } from "typeorm";
import { randomUUID } from "node:crypto";
import { AppDataSource } from "../database/data-source.js";

import { BharatPeOrder } from "../entities/bharatpeorder.entity.js";
import { Product } from "../entities/product.entity.js";
import { User } from "../entities/user.entity.js";

import { OrderStatus } from "../types/index.js";
import { PaymentStatus } from "../types/payment-status.enum.js";

export interface FlutterOrderItem {
    productId: string;
    productName: string;
    productImage?: string | null;
    price: number;
    quantity: number;
    selectedAttributes?: Record<string, unknown> | null;
}

export interface FlutterOrderData {
    supabaseOrderId: string;
    supabaseUserId: string;

    total: number;
    subtotal: number;
    shippingCost: number;
    discount: number;

    paymentMethod: string;

    customer: {
        name: string;
        email: string;
        mobile: string;
        address: string;
    };

    items: FlutterOrderItem[];
}

export class NeonOrderRepository {

    private repository =
        AppDataSource.getRepository(BharatPeOrder);

    async findBySupabaseOrderId(
        supabaseOrderId: string
    ): Promise<BharatPeOrder | null> {

        return this.repository.findOne({
            where: { supabaseOrderId },
            relations: ["buyer", "products"]
        });
    }

    async createFlutterOrder(
        data: FlutterOrderData
    ): Promise<{
        order: BharatPeOrder;
        created: boolean;
    }> {

        // Idempotency: do not create a second Neon order.
        const existing = await this.findBySupabaseOrderId(
            data.supabaseOrderId
        );

        if (existing) {
            return {
                order: existing,
                created: false
            };
        }

        const buyerId = process.env.FLUTTER_STORE_USER_ID;

        if (!buyerId) {
            throw new Error(
                "FLUTTER_STORE_USER_ID is not configured"
            );
        }

        if (
            !Number.isFinite(data.total) ||
            data.total <= 0
        ) {
            throw new Error("Invalid order total");
        }

        const amountPaise = Math.round(data.total * 100);

        if (!Number.isSafeInteger(amountPaise)) {
            throw new Error("Invalid order amount");
        }

        const uniqueProductIds = [
            ...new Set(
                data.items
                    .map(item => item.productId)
                    .filter(id =>
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
                    )
            )
        ];

        try {
                const clientTxnId = `PCN_${randomUUID()
                            .replace(/-/g, "")
                            .toUpperCase()}`;
            return await AppDataSource.transaction(
                async manager => {

                    // Recheck inside the transaction.
                    const existingOrder = await manager.findOne(
                        BharatPeOrder,
                        {
                            where: {
                                supabaseOrderId: data.supabaseOrderId
                            },
                            relations: ["buyer", "products"]
                        }
                    );

                    if (existingOrder) {

                           if (!existingOrder.clientTxnId) {

                                existingOrder.clientTxnId = `PCN_${randomUUID()
                                    .replace(/-/g, "")
                                    .toUpperCase()}`;

                                const repairedOrder = await manager.save(
                                    existingOrder
                                );

                                console.log("[NEON ORDER] Existing order repaired:", {
                                    neonOrderId: repairedOrder?.id,
                                    clientTxnId: repairedOrder.clientTxnId
                                });
                                      
                                return {
                                    order: repairedOrder,
                                    created: false
                                };
                            }
 
                        return {
                            order: existingOrder,
                            created: false
                        };
                    }

                    const buyer = await manager.findOne(User, {
                        where: { id: buyerId }
                    });

                    if (!buyer) {
                        throw new Error(
                            "Configured Flutter Neon buyer was not found"
                        );
                    }

                    // Find matching existing Neon products.
                    const products = uniqueProductIds.length
                        ? await manager.find(Product, {
                            where: {
                                id: In(uniqueProductIds)
                            }
                        })
                        : [];

                    // Preserve every Flutter line item, even when a
                    // product UUID cannot be matched in Neon.
                    const itemsSnapshot = data.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        productImage: item.productImage ?? null,
                        price: item.price,
                        quantity: item.quantity,
                        selectedAttributes:
                            item.selectedAttributes ?? null,
                        totalPrice: item.price * item.quantity
                    }));

                    const fullPaymentSnapshot = {
                        amount: data.total.toFixed(2),
                        method: data.paymentMethod,
                        status: "PENDING",
                        itemsSnapshot
                    };

                    const order = manager.create(
                        BharatPeOrder,
                        {
                            buyer,
                            buyerId: buyer.id,

                            products,

                            supabaseOrderId: data.supabaseOrderId,
                            supabaseUserId: data.supabaseUserId,
                             // Generate and persist the payment transaction reference.
                             clientTxnId,

                            amountPaise: String(amountPaise),
                            currency: "INR",

                            paymentStatus: PaymentStatus.PENDING,

                            payment: fullPaymentSnapshot,

                            customerSnapshot: {
                                name: data.customer.name,
                                email: data.customer.email,
                                mobile: data.customer.mobile,
                                address: data.customer.address
                            },

                            source: "FLUTTER",

                            status: OrderStatus.NOT_PROCESSED
                        }
                    );

                    const savedOrder = await manager.save(
                        BharatPeOrder,
                        order
                    );

                    return {
                        order: savedOrder,
                        created: true
                    };
                }
            );

        } catch (error: any) {

            // If two requests arrive simultaneously, the unique
            // Supabase order index prevents duplicate Neon orders.
            if (error?.code === "23505") {

                const existing = await this.findBySupabaseOrderId(
                    data.supabaseOrderId
                );

                if (existing) {
                    return {
                        order: existing,
                        created: false
                    };
                }
            }

            throw error;
        }
    }
}
