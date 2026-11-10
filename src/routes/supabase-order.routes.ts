import { Router } from "express";

import { SupabaseOrderController } from "../controllers/supabase-order.controller.js";

const router = Router();

const controller = new SupabaseOrderController();

router.post(
    "/:supabaseOrderId/sync",
    controller.syncFlutterOrder.bind(controller)
);

export default router;