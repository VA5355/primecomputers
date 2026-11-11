/*import { Router } from "express";

import { SupabaseOrderController } from "../controllers/supabase-order.controller.js";

const router = Router();

const controller = new SupabaseOrderController();

router.post(
    "/:supabaseOrderId/sync",
    controller.syncFlutterOrder.bind(controller)
);

export default router;*/
import { Router } from "express";

import {
    SupabaseOrderController
} from "../controllers/supabase-order.controller.js";
import {
    syncFlutterOrder
} from "../controllers/supabase-order.controller.js";

import {
    requireSupabaseSignin
} from "../middlewares/require-supabase-signin.middleware.js";

const router = Router();

const controller = new SupabaseOrderController();
/*
router.post(
    "/:supabaseOrderId/sync",
    requireSupabaseSignin,
    controller.syncFlutterOrder.bind(controller)
);*/
router.post(
    "/:supabaseOrderId/sync",
    requireSupabaseSignin,
    syncFlutterOrder
);

export default router;
