/*
This service is responsible for retrieving and validating orders created by Flutter.
It should NOT create Neon orders or call BharatPe.
Its responsibilities are:
1.	Receive the Supabase order ID.
2.	Validate the Supabase access token.
3.	Verify that the authenticated user owns the requested order.
4.	Retrieve the order from Supabase.
5.	Retrieve the corresponding order_items.
6.	Retrieve customer/address information if it is not already included in the order.
7.	Return a normalized order object to the controller.
The service should use the Supabase server-side client. Do not trust a user_id, price, quantity, address, or product name supplied independently by Flutter.
Suggested implementation:


*/
// src/services/supabase-order.service.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SupabaseOrderItem {
    product_id: string;
    product_name?: string;
    quantity: number;
    price: number;
}

export interface VerifiedSupabaseOrder {
    orderId: string;
    userId: string;
    customerName: string;
    email: string;
    phone: string;
    address: Record<string, unknown>;
    subtotal: number;
    shippingCost: number;
    discount: number;
    totalAmount: number;
    items: SupabaseOrderItem[];
}

export class SupabaseOrderService {

    async getVerifiedOrder(
        orderId: string,
        accessToken: string
    ): Promise<VerifiedSupabaseOrder> {

        // 1. Verify the Supabase JWT.
        const { data: userData, error: authError } =
            await supabase.auth.getUser(accessToken);

        if (authError || !userData.user) {
            throw new Error("INVALID_SUPABASE_SESSION");
        }

        const userId = userData.user.id;

        // 2. Retrieve the order.
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .eq("user_id", userId)
            .single();

        if (orderError || !order) {
            throw new Error("ORDER_NOT_FOUND_OR_UNAUTHORIZED");
        }

        // 3. Retrieve order items.
        const { data: items, error: itemsError } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", orderId);

        if (itemsError || !items?.length) {
            throw new Error("ORDER_ITEMS_NOT_FOUND");
        }

        // 4. Normalize and validate the order.
        const normalizedItems = items.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: Number(item.quantity),
            price: Number(item.price),
        }));

        const calculatedSubtotal = normalizedItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        const shippingCost = Number(order.shipping_cost ?? 0);
        const discount = Number(order.discount ?? 0);
        const totalAmount =
            calculatedSubtotal + shippingCost - discount;

        if (
            normalizedItems.some(
                item =>
                    !Number.isFinite(item.price) ||
                    !Number.isInteger(item.quantity) ||
                    item.quantity <= 0 ||
                    item.price < 0
            ) ||
            totalAmount < 0
        ) {
            throw new Error("INVALID_ORDER_AMOUNT");
        }

        return {
            orderId: order.id,
            userId,
            customerName: order.customer_name ?? "",
            email: userData.user.email ?? "",
            phone: order.phone ?? "",
            address: order.address ?? {},
            subtotal: calculatedSubtotal,
            shippingCost,
            discount,
            totalAmount,
            items: normalizedItems,
        };
    }
}
