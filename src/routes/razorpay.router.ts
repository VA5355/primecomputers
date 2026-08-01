// src/routes/razorpay.routes.ts
import { Router } from "express";
//import { create, update, remove, list, read, productsByRazorPay } from "../controllers/razorpay.controller.js";
import { create  , getOrders } from "../controllers/razorpay.controller.js";
import { requireSignin, isAuth, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// RazorPayOrder CRUD
router.post("/razorpayorder/create", requireSignin, create); // isAdmin isAuth ,
//router.put("/razorpayorder/:razorPayOrderId", requireSignin, isAdmin, update);
//router.delete("/razorpayorder/:razorPayOrderId", requireSignin, isAdmin, remove);
// Order routes
router.get("/razorpayorder/:userId", requireSignin, isAuth, getOrders);
// Public category routes
//router.get("/categories", list);
//router.get("/category/:slug", read);
//router.get("/products-by-razorpay/:slug", productsByRazorPay);

export default router;