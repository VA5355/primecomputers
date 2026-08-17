import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm";
import { Product } from "./product.entity";

export enum ItemStatus {
    AVAILABLE = "AVAILABLE",
    SOLD = "SOLD",
    RESERVED = "RESERVED"
}

@Entity("product_items")
export class ProductItem {
    @PrimaryGeneratedColumn("uuid")
    id: string;

  @Index({ unique: true })
  @Column({ name: "snBarcode", type: "varchar", length: 100 })
  snBarcode: string;

  @Column({
    type: "enum",
    enum: ItemStatus,
    default: ItemStatus.AVAILABLE,
  })
  status: ItemStatus;

  @ManyToOne(() => Product, (product: any) => product.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ name: "product_id", type: "uuid" })
  productId: string;

  @CreateDateColumn({ name: "createdAt", type: "timestamp" })
  createdAt: Date;
}
