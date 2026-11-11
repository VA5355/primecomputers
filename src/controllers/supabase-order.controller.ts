import { Request, Response } from "express";

import { SupabaseOrderService } from "../services/supabase-order.service.js";
import type {
    SupabaseAuthenticatedRequest
} from "../middlewares/require-supabase-signin.middleware.js";
import { supabaseAdmin } from "../config/supabase.js";

// Dependency Injection: Single service instance
const    service = new SupabaseOrderService();
 
//const logger = new Logger('RazorPayController');
//const authService = new AuthService();
 export const syncFlutterOrder =  async (
        req: SupabaseAuthenticatedRequest,
        res: Response
    ): Promise<void>  => {

        try {

            const supabaseOrderId = req.params.supabaseOrderId;
             const authenticatedUser = req.supabaseUser;
                if (!authenticatedUser?.id) {
            res.status(401).json({
                success: false,
                message: "Authentication required."
            });
            return;
        }
            const requestUserId = req.body?.user_id;
              if (!requestUserId) {
                res.status(400).json({
                    success: false,
                    message: "Supabase user_id is required."
                });
            return;
            }
           if (requestUserId !== authenticatedUser.id) {
            res.status(403).json({
                success: false,
                message: "Supplied user_id does not match authenticated user."
            });
            return;
             }

               // Continue with the authoritative Supabase order lookup.
                const { data: supabaseOrder, error } = await supabaseAdmin
                    .from("orders")
                    .select("*")
                    .eq("id", supabaseOrderId)
                    .eq("user_id", authenticatedUser.id)
                    .maybeSingle();

                if (error) {
                    throw error;
                }
                if (!supabaseOrder) {
                    res.status(404).json({
                        success: false,
                        message: "Order not found or does not belong to this customer."
                    });
                    return;
                }

            const authorization = req.headers.authorization;

            if (!authorization?.startsWith("Bearer ")) {
                res.status(401).json({
                    success: false,
                    message: "Authentication token is required"
                });
                return;
            }

            const accessToken = authorization.substring(7);

            const result = await  service.syncOrderToNeon(
                supabaseOrderId,
                accessToken
            );
            if ( result.order.supabaseUserId !== authenticatedUser.id) {
                res.status(403).json({
                    success: false,
                    message: "You are not authorized to synchronize this order."
                });
                return;
            }
            

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
                    clientTxnId:      result.order.clientTxnId,

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

export class SupabaseOrderController {

    private service = new SupabaseOrderService();

    async syncFlutterOrder(
        req: SupabaseAuthenticatedRequest,
        res: Response
    ): Promise<void> {

        try {

            const supabaseOrderId = req.params.supabaseOrderId;
             const authenticatedUser = req.supabaseUser;
                if (!authenticatedUser?.id) {
            res.status(401).json({
                success: false,
                message: "Authentication required."
            });
            return;
        }
            const requestUserId = req.body?.user_id;
              if (!requestUserId) {
                res.status(400).json({
                    success: false,
                    message: "Supabase user_id is required."
                });
            return;
            }
           if (requestUserId !== authenticatedUser.id) {
            res.status(403).json({
                success: false,
                message: "Supplied user_id does not match authenticated user."
            });
            return;
             }

               // Continue with the authoritative Supabase order lookup.
                const { data: supabaseOrder, error } = await supabaseAdmin
                    .from("orders")
                    .select("*")
                    .eq("id", supabaseOrderId)
                    .eq("user_id", authenticatedUser.id)
                    .maybeSingle();

                if (error) {
                    throw error;
                }
                if (!supabaseOrder) {
                    res.status(404).json({
                        success: false,
                        message: "Order not found or does not belong to this customer."
                    });
                    return;
                }

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
            if ( result.order.supabaseUserId !== authenticatedUser.id) {
                res.status(403).json({
                    success: false,
                    message: "You are not authorized to synchronize this order."
                });
                return;
            }
            

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
                    clientTxnId:      result.order.clientTxnId,

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
