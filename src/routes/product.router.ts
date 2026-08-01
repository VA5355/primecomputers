// src/routes/product.routes.ts
import { Router } from "express";
import {
    create,createFromJson , list, read, photo, remove,removeFromJson,  update, updateFromJson,
    filteredProducts, productsCount, listProducts,
    productSearch, relatedProducts, getToken, processPayment, orderStatus
} from "../controllers/product.controller.js";
import { requireSignin, isAuth, isAdmin } from "../middlewares/auth.middleware.js";
import formidable from "express-formidable";
import path from "path";
import fs from "fs";

const router = Router();


// 1. Define target directory in the public folder
const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

// 2. Ensure directory exists dynamically at server startup
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 3. Formidable Configuration Options
const formidableOptions = {
    uploadDir: uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
};




// Product CRUD
router.post("/product/create", requireSignin, isAdmin, formidable(formidableOptions), create);
router.put("/product/:productId", requireSignin, isAdmin, formidable(formidableOptions), update);
router.delete("/product/:productId", requireSignin, isAdmin, remove);

// Product AS JSON CRUD
router.post("/product-as-json/create", requireSignin, isAdmin,  createFromJson);
router.put("/product-as-json/:productId", requireSignin, isAdmin,   updateFromJson);
router.delete("/product-as-json/:productId", requireSignin, isAdmin, removeFromJson);

// Public product routes
router.get("/products", list);
router.get("/product/:slug", read);
router.get("/product/photo/:productId", photo);

// Search and filtering
router.post("/products/search", filteredProducts);
router.get("/products/count", productsCount);
router.get("/products/:page", listProducts);
router.get("/products/search/:keyword", productSearch);
router.get("/products/related/:productId/:categoryId", relatedProducts);

// Payment routes
router.get("/braintree/getToken", requireSignin, getToken);
router.post("/braintree/payment", requireSignin, processPayment);
router.put("/order/status/:orderId", requireSignin, isAdmin, orderStatus);

export default router;
