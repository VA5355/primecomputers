import { Router } from "express";

import { PhonePeController } from "../controllers/phonepe.controller.js";
import {
    createFlutterPayment
} from "../controllers/phonepe.controller.js";
import {
    requireSupabaseSignin
} from "../middlewares/require-supabase-signin.middleware.js";
const router = Router();

const controller = new PhonePeController();

// Add your Supabase authentication middleware here.
/*router.post(
    "/:neonOrderId/payment",
    controller.createFlutterPayment.bind(controller)
);*/

router.post(
    "/:neonOrderId/payment", (req, res, next) => {
        console.log("[NEON ORDER PAYMENT ROUTE MATCHED]", {
            neonOrderId: req.params.neonOrderId,
            body: req.body,
        });

        next();
    },
    requireSupabaseSignin,
    createFlutterPayment
);

export default router;
