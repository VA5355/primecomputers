// src/entities/Product.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    ManyToMany,
    OneToMany,
    JoinColumn,
    Index
} from "typeorm";
import { IProduct } from "../types/index.js";
import { Category } from "./category.entity.js";
import { Order } from "./order.entity.js";
import { ProductItem } from "./productitem.entity.js";
import { ProductBarcode } from "./productbarcode.entity.js";

@Entity("products")
@Index(["name"]) // For search performance
@Index(["slug"], { unique: true })
@Index(["categoryId"]) // For filtering by category
export class Product implements IProduct {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 160 })
    name: string;

    @Column({ type: "varchar", length: 255, unique: true })
    slug: string;

    @Column({ type: "text" })
    description: string;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    price: number;

    @Column({ type: "int", default: 0 })
    quantity: number;

    @Column({ type: "int", default: 0 })
    sold: number;

    // --- Base64 / Binary Image Storage ---
    // Storing Base64 payload directly in PostgreSQL standard `text` column
    @Column({ type: "text", nullable: true })
    photoData?: string;


    // Industry Standard: File storage instead of BLOB
    @Column({ type: "varchar", nullable: true })
    photoPath?: string;

    @Column({ type: "varchar", nullable: true })
    photoContentType?: string;

    @Column({ type: "boolean", default: false })
    shipping: boolean;

    // Industry Standard: Proper foreign key relationships
    @ManyToOne(() => Category, (category: Category) => category.products, {
        eager: true, // Always load category with product
        onDelete: "CASCADE" // Delete products when category is deleted
    })
    @JoinColumn({ name: "category_id" })
    category: Category;

    @Column({ name: "category_id", type: "uuid" })
    categoryId: string;

    @ManyToMany(() => Order, (order: Order) => order.products)
    orders?: Order[];

    // --- NEW RELATIONS FOR INVENTORY TRACKING ---

    // 1-to-Many: Multiple Product Barcodes (UPC/SKU) per Product
    @OneToMany(() => ProductBarcode, (barcode) => barcode.product, { cascade: true })
    barcodes: ProductBarcode[];

    // 1-to-Many: Serialized Physical Items (Each SN = 1 stock quantity)
    @OneToMany(() => ProductItem, (item) => item.product, { cascade: true })
    items: ProductItem[];

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

}
