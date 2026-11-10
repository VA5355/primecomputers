import { Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { BharatPeService } from "../services/bharatpe.service.js";
import { BharatPeRepository } from "../repositories/bharatpe.repository.js";

export class PhonePeController {

    private bharatPeService = new BharatPeService();
    private orderRepository = new BharatPeRepository();

    async createFlutterPayment(
        req: Request,
        res: Response
    ): Promise<void> {

        try {

            const neonOrderId = req.params.neonOrderId;

            if (!neonOrderId) {
                res.status(400).json({
                    success: false,
                    message: "Neon order ID is required"
                });
                return;
            }

            // Load the already-created Neon order.
            const order = await this.orderRepository
                .findByIdWithRelations(neonOrderId);

            if (!order) {
                res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
                return;
            }

            if (order.source !== "FLUTTER") {
                res.status(400).json({
                    success: false,
                    message: "This endpoint is for Flutter orders"
                });
                return;
            }

            if (order.paymentStatus === "SUCCESS") {
                res.status(409).json({
                    success: false,
                    message: "This order has already been paid"
                });
                return;
            }

            // If a valid payment session already exists,
            // return the same QR rather than creating another one.
            if (
                order.clientTxnId &&
                order.gatewayOrderId &&
                (order.paymentUrl || order.qrCode || order.upiString) &&
                (!order.paymentExpiresAt ||
                    order.paymentExpiresAt > new Date())
            ) {

                res.status(200).json({
                    success: true,
                    message: "Existing payment session returned",
                    data: {
                        supabaseOrderId: order.supabaseOrderId,
                        neonOrderId: order.id,
                        clientTxnId: order.clientTxnId,
                        gatewayOrderId: order.gatewayOrderId,
                        amountPaise: order.amountPaise,
                        paymentStatus: order.paymentStatus,
                        paymentUrl: order.paymentUrl,
                        qrCode: order.qrCode,
                        upiString: order.upiString,
                        expiresAt: order.paymentExpiresAt
                    }
                });

                return;
            }

            // Reuse the transaction ID when retrying an
            // uncertain gateway request.
            const clientTxnId =
                order.clientTxnId ??
                `PCN_${randomUUID()}`;

            if (!order.amountPaise) {
                throw new Error("Order amount is missing");
            }

            const amountPaise = Number(order.amountPaise);

            if (
                !Number.isSafeInteger(amountPaise) ||
                amountPaise <= 0
            ) {
                throw new Error("Invalid order amount");
            }

            // Save the stable reference BEFORE contacting gateway.
            order.clientTxnId = clientTxnId;
          /*  await this.orderRepository.updatePayment(
                order.id,
                {
                    ...order.payment,
                    clientTxnId,
                    status: "PENDING"
                }
            ); */
            await this.orderRepository.saveClientTxnId(
                order,
                clientTxnId
            );

            // The gateway request uses the Neon order's trusted amount.
            const gatewayResult =
                await this.bharatPeService.createPayment({

                    clientTxnId,

                    amountPaise,

                    description: `Prime Computer Network Order ${order.id}`,

                    customer: {
                        name: order.customerSnapshot?.name,
                        email: order.customerSnapshot?.email,
                        mobile: order.customerSnapshot?.mobile
                    },

                    redirectUrl:
                        process.env.VYAPARGATEWAY_REDIRECT_URL!,

                    callbackUrl:
                        process.env.VYAPARGATEWAY_CALLBACK_URL!
                });

            // Persist the actual response.
            const savedOrder =
                await this.orderRepository.saveGatewayPayment(
                    order,
                    gatewayResult
                );

            res.status(201).json({

                success: true,

                message: "Payment session created successfully",

                data: {
                    supabaseOrderId: savedOrder.supabaseOrderId,
                    neonOrderId: savedOrder.id,

                    clientTxnId: gatewayResult.clientTxnId,
                    gatewayOrderId: gatewayResult.gatewayOrderId,

                    amount: gatewayResult.amount,
                    currency: gatewayResult.currency,

                    paymentStatus: savedOrder.paymentStatus,

                    paymentUrl: gatewayResult.paymentUrl,
                    qrCode: gatewayResult.qrCode,
                    upiString: gatewayResult.upiString,
                    upiIntent: gatewayResult.upi_intent,

                    expiresAt: gatewayResult.expiresAt
                }
            });

        } catch (error: any) {

            console.error(
                "Flutter payment creation failed:",
                error
            );

            res.status(502).json({
                success: false,
                message: error.message ??
                    "Unable to create payment session"
            });
        }
    }
}