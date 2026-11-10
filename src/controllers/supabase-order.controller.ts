import { Request, Response } from "express";

import { SupabaseOrderService } from "../services/supabase-order.service.js";

export class SupabaseOrderController {

    private service = new SupabaseOrderService();

    async syncFlutterOrder(
        req: Request,
        res: Response
    ): Promise<void> {

        try {

            const supabaseOrderId = req.params.supabaseOrderId;

            const authorization = req.headers.authorization;

            if (!authorization?.startsWith("Bearer ")) {
                res.status(401).json({
                    success: false,
                    message: "Authentication token is required"
                });
                return;
            }

            const accessToken = authorization.substring(7);

            const result = await this.service.syncOrderToNeon(
                supabaseOrderId,
                accessToken
            );

            res.status(result.created ? 201 : 200).json({

                success: true,

                message: result.created
                    ? "Flutter order registered successfully"
                    : "Flutter order already exists in Neon",

                data: {
                    supabaseOrderId:
                        result.order.supabaseOrderId,

                    neonOrderId:
                        result.order.id,

                    source:
                        result.order.source,

                    paymentStatus:
                        result.order.paymentStatus,

                    orderStatus:
                        result.order.status,

                    amount:
                        result.order.payment?.amount,

                    customer:
                        result.order.customerSnapshot,

                    products:
                        result.order.payment?.itemsSnapshot ?? []
                }
            });

        } catch (error: any) {

            console.error(
                "Flutter order synchronization error:",
                error
            );

            const message = error.message;

            if (message === "INVALID_SUPABASE_TOKEN") {
                res.status(401).json({
                    success: false,
                    message: "Your session has expired. Please sign in again."
                });
                return;
            }

            if (message === "ORDER_NOT_FOUND_OR_NOT_OWNED") {
                res.status(404).json({
                    success: false,
                    message: "Order not found."
                });
                return;
            }

            if (message === "ORDER_ITEMS_NOT_FOUND") {
                res.status(400).json({
                    success: false,
                    message: "Order items were not found."
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: "Unable to synchronize the order with the website."
            });
        }
    }
}