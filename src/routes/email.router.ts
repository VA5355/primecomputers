import { Router } from "express";
import {
    checkoutOrderConfirmation,
  
} from "../controllers/email.controller.js";
import { requireSignin, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.post("/email/send-email", checkoutOrderConfirmation);
//router.get("/newsletter/unsubscribe/:token", unsubscribeNewsletter);

// Admin routes
//router.get("/newsletter/subscribers", requireSignin, isAdmin, getNewsletterSubscribers);

export default router;