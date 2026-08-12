import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Product } from "./product.entity.js";

@Entity("product_barcodes")
export class ProductBarcode {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Index({ unique: true })
    @Column({ type: "varchar", length: 100 })
    barcode: string; // Product Master Barcode (e.g. UPC/EAN)

    @ManyToOne(() => Product, (product:any) => product.barcodes, { onDelete: "CASCADE" })
    @JoinColumn({ name: "product_id" })
    product: Product;

    @Column({ name: "product_id", type: "uuid" })
    productId: string;
}