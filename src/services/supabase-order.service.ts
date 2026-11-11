import { createClient } from "@supabase/supabase-js";

import {
    NeonOrderRepository,
    FlutterOrderData
} from "../repositories/neon-order.repository.js";

export class SupabaseOrderService {

    private supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );

    private neonOrderRepository = new NeonOrderRepository();

    async syncOrderToNeon(
        supabaseOrderId: string,
        accessToken: string
    ) {

        if (!supabaseOrderId || !accessToken) {
            throw new Error(
                "Order ID and access token are required"
            );
        }

        // 1. Authenticate the actual Flutter customer.
        const {
            data: { user },
            error: authError
        } = await this.supabase.auth.getUser(accessToken);

        if (authError || !user) {
            throw new Error("INVALID_SUPABASE_TOKEN");
        }

        // 2. Fetch only an order belonging to this customer.
        const {
            data: order,
            error: orderError
        } = await this.supabase
            .from("orders")
            .select("*")
            .eq("id", supabaseOrderId)
            .eq("user_id", user.id)
            .single();

        if (orderError || !order) {
            throw new Error("ORDER_NOT_FOUND_OR_NOT_OWNED");
        }

        // 3. Fetch its order items.
        const {
            data: items,
            error: itemsError
        } = await this.supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

        if (itemsError) {
            console.error("[ORDER ITEMS] Supabase query failed:", {
                code: itemsError.code,
                message: itemsError.message,
                details: itemsError.details,
            });

            throw itemsError;
        }
        console.log("[ORDER ITEMS] Retrieved:", items?.length ?? 0);
        if (!items || items.length === 0) {
            console.log("[ORDER ITEMS]  ORDER_ITEMS_NOT_FOUND " );
            throw new Error("ORDER_ITEMS_NOT_FOUND");
        }

        // 4. Convert Supabase shipping address to a snapshot.
        const address = order.shipping_address ?? {};

        const customerName =
            address.full_name ?? user.user_metadata?.full_name ?? "Flutter Customer";

        const customerMobile =
            address.phone ?? "";

        const fullAddress = [
            address.address,
            address.city,
            address.state,
            address.postal_code,
            address.country
        ]
            .filter(Boolean)
            .join(", ");

        // 5. Map order_items.
        const mappedItems = items.map(item => {

            const price = Number(item.price);
            const quantity = Number(item.quantity);

            if (
                !Number.isFinite(price) ||
                price <= 0 ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                throw new Error(
                    `Invalid order item: ${item.id}`
                );
            }

            return {
                productId: item.product_id,
                productName: item.product_name,
                productImage: item.product_image,
                price,
                quantity,
                selectedAttributes: item.selected_attributes
            };
        });

        const total = Number(order.total);
        const subtotal = Number(order.subtotal);
        const shippingCost = Number(order.shipping_cost);
        const discount = Number(order.discount);

        if (
            !Number.isFinite(total) ||
            !Number.isFinite(subtotal) ||
            !Number.isFinite(shippingCost) ||
            !Number.isFinite(discount)
        ) {
            throw new Error("Invalid Supabase order totals");
        }

        // 6. Build the trusted server-side DTO.
        const orderData: FlutterOrderData = {

            supabaseOrderId: order.id,
            supabaseUserId: user.id,

            total,
            subtotal,
            shippingCost,
            discount,

            paymentMethod: order.payment_method ?? "UPI",

            customer: {
                name: customerName,
                email: user.email ?? "",
                mobile: customerMobile,
                address: fullAddress
            },

            items: mappedItems
        };

        // 7. Copy the order into Neon.
        return await this.neonOrderRepository.createFlutterOrder(
            orderData
        );
    }
}
