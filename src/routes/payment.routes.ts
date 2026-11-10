import { Router } from "express";

import { PhonePeController } from "../controllers/phonepe.controller.js";

const router = Router();

const controller = new PhonePeController();

// Add your Supabase authentication middleware here.
router.post(
    "/:neonOrderId/payment",
    controller.createFlutterPayment.bind(controller)
);

export default router;
