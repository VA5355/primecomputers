// src/database/data-source.ts
import "reflect-metadata";
import { Collection, DataSource } from "typeorm";
import dotenv from "dotenv";
import { Logger } from "../utils/logger.js";
//import { Order } from "@getbrevo/brevo";
import { Event } from "../entities/event.entity.js"; // <--- Import your Event Entity
import {  Order } from "../entities/order.entity.js";
import { Product } from "../entities/product.entity.js";
import { User } from "../entities/user.entity.js";
import { Category } from "../entities/category.entity.js";
import { Newsletter } from "../entities/newsletter.entity.js";
import { ProductView } from "../entities/product-view.entity.js";
import { RazorOrder } from "../entities/razororder.entity.js";
import { UserPreference } from "../entities/user-preference.entity.js";
import { Wishlist } from "../entities/wishlist.entity.js";

dotenv.config();

const logger = new Logger('DataSource');

// Industry standard: Environment validation
const requiredEnvVars = [
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
];

requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        logger.error(`Missing required environment variable: ${envVar}`, new Error('Environment variable missing'));
        throw new Error(`Missing required environment variable: ${envVar}`)
    }
})

logger.info('Initializing PostgreSQL data source', {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    environment: process.env.NODE_ENV
});

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT || 5432),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,

    // SSL configuration for cloud providers (Neon, Supabase, etc.)
    // Neon requires SSL - always enable for cloud connections
    ssl: process.env.POSTGRES_SSL === 'true' || process.env.POSTGRES_HOST?.includes('neon.tech') ? {
        rejectUnauthorized: false
    } : false,

    // Industry Standards:
    synchronize: process.env.NODE_ENV === "development", // Never use in production
    logging: process.env.NODE_ENV === "development",

    // Entity and Migration paths
   // entities: ["dist/entities/**/*.js"], // Compiled JS for production
       // ✅ Explicit array of imported entity classes (Works seamlessly in dev & prod)
    entities: [User, Order, Product, Category, Collection, Newsletter, ProductView, RazorOrder, UserPreference, Wishlist],

    
    migrations: ["dist/migrations/**/*.js"],
    subscribers: ["dist/subscribers/**/*.js"],

    // Development paths (when using ts-node)
    ...(process.env.NODE_ENV === "development" && {
     //   entities: ["src/entities/**/*.ts"],
      entities: [User, Order, Product, Category, Collection, Newsletter, ProductView, RazorOrder, UserPreference, Wishlist],
        migrations: ["src/migrations/**/*.ts"],
        subscribers: ["src/subscribers/**/*.ts"],
    }),

    // Connection pool settings (Industry standard for scalability)
    extra: {
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
    }
});
