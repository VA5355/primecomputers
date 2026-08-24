// src/routes/bharatpe.routes.ts
import { Router } from "express";
//import { create, update, remove, list, read, productsBybharatpe } from "../controllers/bharatpe.controller.js";
import { create  , getOrders, getOrder } from "../controllers/bharatpe.controller.js";
import { requireSignin, isAuth, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// bharatpeOrder CRUD
router.post("/bharatpeorder/create", requireSignin, create); // isAdmin isAuth ,
//router.put("/bharatpeorder/:bharatpeOrderId", requireSignin, isAdmin, update);
//router.delete("/bharatpeorder/:bharatpeOrderId", requireSignin, isAdmin, remove);
// Order routes
router.get("/bharatpeorder/status/:orderId", requireSignin, isAuth, getOrder);
// Public category routes
//router.get("/categories", list);
//router.get("/category/:slug", read);
//router.get("/products-by-bharatpe/:slug", productsBybharatpe);

export default router;
