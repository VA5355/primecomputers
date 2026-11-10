/*
CREATE TYPE bharatpeorders_payment_status_enum AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
    'UNKNOWN'
);

ALTER TABLE bharatpeorders
ADD COLUMN supabase_order_id UUID,
ADD COLUMN supabase_user_id UUID,
ADD COLUMN amount_paise BIGINT,
ADD COLUMN currency VARCHAR(3) DEFAULT 'INR',
ADD COLUMN client_txn_id VARCHAR(100),
ADD COLUMN gateway_order_id VARCHAR(150),
ADD COLUMN payment_url TEXT,
ADD COLUMN qr_code TEXT,
ADD COLUMN upi_string TEXT,
ADD COLUMN payment_expires_at TIMESTAMP,
ADD COLUMN payment_status bharatpeorders_payment_status_enum
    DEFAULT 'PENDING',
ADD COLUMN paid_at TIMESTAMP,
ADD COLUMN customer_snapshot JSONB,
ADD COLUMN gateway_response JSONB,
ADD COLUMN payment_error TEXT,
ADD COLUMN source VARCHAR(30) DEFAULT 'WEBSITE';

CREATE UNIQUE INDEX "UQ_bharatpe_supabase_order"
ON bharatpeorders(supabase_order_id);

CREATE UNIQUE INDEX "UQ_bharatpe_client_txn"
ON bharatpeorders(client_txn_id);

CREATE UNIQUE INDEX "UQ_bharatpe_gateway_order"
ON bharatpeorders(gateway_order_id);

*/


// src/entities/BharatPeOrder.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    ManyToMany,
    JoinColumn,
    JoinTable,
    Index
} from "typeorm";
import { IOrder, OrderStatus } from "../types/index.js";
import { PaymentStatus } from "../types/payment-status.enum.js";
import { User } from "./user.entity.js";
import { Product } from "./product.entity";

@Entity("bharatpeorders")
@Index(["buyerId"]) // For querying user orders
@Index(["status"]) // For filtering by status
@Index(["createdAt"]) // For date-based queries
/** NEW ENTRIES  */
@Index("UQ_bharatpe_supabase_order", ["supabaseOrderId"], {
    unique: true
})
@Index("UQ_bharatpe_client_txn", ["clientTxnId"], {
    unique: true
})
@Index("UQ_bharatpe_gateway_order", ["gatewayOrderId"], {
    unique: true
})


export class BharatPeOrder implements IOrder {
    @PrimaryGeneratedColumn("uuid")
    id: string;

   /* @ManyToMany(() => Product, (product: Product) => product.orders, {
        eager: true,
        cascade: true
    })
    @JoinTable({
        name: "bharatpeorder_products",
        joinColumn: { name: "order_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "product_id", referencedColumnName: "id" }
    })
    products: Product[];*/

    // for SUPABASE FLUTTER ORDERS eASY MOVE to NEON TECH ORDERS 
    // have deliberately removed cascade: true. We are connecting existing catalogue products to orders,
    //  not creating or updating catalogue products during checkout.
    @ManyToMany(
    () => Product,
    (product: Product) => product.bharatPeOrders,
    {
        eager: true
    }
    )
    @JoinTable({
        name: "bharatpeorder_products",
        joinColumn: {
            name: "order_id",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "product_id",
            referencedColumnName: "id"
        }
    })
    products: Product[];

    @Column({ type: "jsonb", nullable: true })
    payment?: any;

    @ManyToOne(() => User, (user: User) => user.orders, {
        eager: true,
        onDelete: "CASCADE"
    })
    @JoinColumn({ name: "buyer_id" })
    buyer: User;

    @Column({ name: "buyer_id", type: "uuid" })
    buyerId: string;

    // NEW FIELDS -----------------------------------------------------------------------------------------------------------------
      // -------------------------------------------------
    // SUPABASE ORDER MAPPING
    // -------------------------------------------------

    @Column({
        name: "supabase_order_id",
        type: "uuid",
        nullable: true
    })
    supabaseOrderId?: string;

    @Column({
        name: "supabase_user_id",
        type: "uuid",
        nullable: true
    })
    supabaseUserId?: string;

    // -------------------------------------------------
    // PAYMENT AMOUNT
    // -------------------------------------------------

    // Stored in paise.
    // PostgreSQL BIGINT is represented as string by node-postgres.
    @Column({
        name: "amount_paise",
        type: "bigint",
        nullable: true
    })
    amountPaise?: string;

    @Column({
        name: "currency",
        type: "varchar",
        length: 3,
        default: "INR"
    })
    currency: string;

    // -------------------------------------------------
    // GATEWAY TRANSACTION REFERENCES
    // -------------------------------------------------

    @Column({
        name: "client_txn_id",
        type: "varchar",
        length: 100,
        nullable: true
    })
    clientTxnId?: string;

    @Column({
        name: "gateway_order_id",
        type: "varchar",
        length: 150,
        nullable: true
    })
    gatewayOrderId?: string;

    // -------------------------------------------------
    // QR CODE / UPI DETAILS
    // -------------------------------------------------

    @Column({
        name: "payment_url",
        type: "text",
        nullable: true
    })
    paymentUrl?: string;

    @Column({
        name: "qr_code",
        type: "text",
        nullable: true
    })
    qrCode?: string;

    @Column({
        name: "upi_string",
        type: "text",
        nullable: true
    })
    upiString?: string;

    @Column({
        name: "payment_expires_at",
        type: "timestamp",
        nullable: true
    })
    paymentExpiresAt?: Date;

    // -------------------------------------------------
    // PAYMENT STATUS
    // -------------------------------------------------

    @Column({
        name: "payment_status",
        type: "enum",
        enum: PaymentStatus,
        enumName: "bharatpeorders_payment_status_enum",
        default: PaymentStatus.PENDING
    })
    paymentStatus: PaymentStatus;

    @Column({
        name: "paid_at",
        type: "timestamp",
        nullable: true
    })
    paidAt?: Date;

    // -------------------------------------------------
    // CUSTOMER SNAPSHOT
    // -------------------------------------------------

    // Keep the customer's actual checkout details separately
    // from the static Neon buyer account.
    @Column({
        name: "customer_snapshot",
        type: "jsonb",
        nullable: true
    })
    customerSnapshot?: {
        name?: string;
        email?: string;
        mobile?: string;
        address?: string;
    };

    // -------------------------------------------------
    // GATEWAY RESPONSE / ERROR INFORMATION
    // -------------------------------------------------

    @Column({
        name: "gateway_response",
        type: "jsonb",
        nullable: true
    })
    gatewayResponse?: any;

    @Column({
        name: "payment_error",
        type: "text",
        nullable: true
    })
    paymentError?: string;

    // -------------------------------------------------
    // ORDER SOURCE
    // -------------------------------------------------

    @Column({
        name: "source",
        type: "varchar",
        length: 30,
        default: "WEBSITE"
    })
    source: string;
     // NEW FIELDS -----------------------------------------------------------------------------------------------------------------

    @Column({
        type: "enum",
        enum: OrderStatus,
        default: OrderStatus.NOT_PROCESSED
    })
    status: OrderStatus;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

}


