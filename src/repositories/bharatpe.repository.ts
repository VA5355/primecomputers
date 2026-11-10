// src/repositories/BharatPeRepository.ts
import { FindOptionsWhere , In} from "typeorm";
import { BaseRepository } from "./base.repository.js";
import { BharatPeOrder } from "../entities/bharatpeorder.entity.js";
import { ICategory } from "../types/index.js";
import { Product } from "../entities/product.entity";
import { IOrder, OrderStatus } from "../types/index.js";
import { UUID } from "node:crypto";
import { PaymentStatus } from "../types/payment-status.enum.js";

//import { Category } from "../entities/category.entity.js";

export class BharatPeRepository extends BaseRepository<BharatPeOrder> {
    constructor() {
        super(BharatPeOrder);
    }

    // BharatPeOrder-specific queries
    async findByName(name: string): Promise<BharatPeOrder | null> {
        return this.findOne({ name } as FindOptionsWhere<BharatPeOrder>);
    }

    async findBySlug(slug: string): Promise<BharatPeOrder | null> {
        return this.findOne({ slug } as FindOptionsWhere<BharatPeOrder>);
    }
/*
    // Industry Standard: Include product count
    async findAllWithProductCount(): Promise<(BharatPeOrder & { productCount: number })[]> {
        const categories = await this.repository
            .createQueryBuilder("category")
            .leftJoin("category.products", "product")
            .addSelect("COUNT(product.id) as productCount")
            .groupBy("category.id")
            .getRawAndEntities();

        return categories.entities.map((category, index) => {
            (category as any).productCount = parseInt(categories.raw[index].productCount) || 0;
            return category as BharatPeOrder & { productCount: number };
        });
    }

    // Create category with auto-generated slug
    async createCategory(categoryData: Omit<ICategory, 'id'>): Promise<BharatPeOrder> {
        const category = this.repository.create(categoryData);
        return this.save(category);
    }

    // Check if name or slug exists
    async nameExists(name: string): Promise<boolean> {
        const count = await this.repository.count({
            where: { name } as FindOptionsWhere<BharatPeOrder>
        });
        return count > 0;
    }

    async slugExists(slug: string): Promise<boolean> {
        const count = await this.repository.count({
            where: { slug } as FindOptionsWhere<BharatPeOrder>
        });
        return count > 0;
    }
   */
      // BharatPeOrder-specific queries matching your Mongoose patterns
      async findByUser(userId: string): Promise<BharatPeOrder[]> {
          return this.find({
              where: { buyerId: userId } as FindOptionsWhere<BharatPeOrder>,
              relations: ["products", "buyer"],
              order: { createdAt: "DESC" }
          });
      }
  
      async findByStatus(status: OrderStatus): Promise<BharatPeOrder[]> {
          return this.find({
              where: { status } as FindOptionsWhere<BharatPeOrder>,
              relations: ["products", "buyer"],
              order: { createdAt: "DESC" }
          });
      }
       // Product-specific queries matching your Mongoose patterns
    async findByPeOrdersId(orderId:string): Promise<BharatPeOrder []> {
           const peOrder = await this.repository.manager
              .getRepository(BharatPeOrder)
              .findBy({ id: orderId });
           if(peOrder !== undefined && peOrder !== null){
             console.log(' found bharat pe orders'+JSON.stringify(peOrder));
           } 
           else {
                console.log('  bharat pe order '+orderId +' NOT FOUND ' );
           }    

        let id = orderId;
       return peOrder; /*this.find({  where: { id } ,
              
              order: { createdAt: "DESC" }
          });*/
       /* this.findOne({  where: { id } ,
              
              order: { createdAt: "DESC" }
          });*/

        // return this.repository.findOne({
          //  where: { id :orderId }    });
    }
    async findBySupabaseOrderId(
        supabaseOrderId: string
    ): Promise<BharatPeOrder | null> {
        return this.repository.findOne({
            where: { supabaseOrderId },
            relations: ["buyer", "products"]
        });
    }
    async saveClientTxnId(
    order: BharatPeOrder,
    clientTxnId: string
    ): Promise<BharatPeOrder> {
        order.clientTxnId = clientTxnId;
        return this.repository.save(order);
    }
    async saveGatewayPayment(
        order: BharatPeOrder,
        payment: {
            clientTxnId: string;
            gatewayOrderId: string;
            paymentUrl?: string;
            qrCode?: string;
            upiString?: string;
            expiresAt?: Date;
            rawResponse?: unknown;
        }
    ): Promise<BharatPeOrder> {

        order.clientTxnId = payment.clientTxnId;
        order.gatewayOrderId = payment.gatewayOrderId;
        order.paymentUrl = payment.paymentUrl;
        order.qrCode = payment.qrCode;
        order.upiString = payment.upiString;
        order.paymentExpiresAt = payment.expiresAt;

        order.paymentStatus = PaymentStatus.PENDING;

        order.gatewayResponse = payment.rawResponse;

        return this.repository.save(order);
    }
      // Create order with products (many-to-many)
      async createOrder(
          orderData: Omit<IOrder, 'id' | 'products' | 'createdAt' | 'updatedAt'>,
          productIds: string[]
      ): Promise<BharatPeOrder> {
          // Get products by IDs
          const products = await this.repository.manager
              .getRepository(Product)
              .findBy({ id: In(productIds) });
  
          // Create order with products
          const order = this.repository.create({
              ...orderData,
              products
          });
  
          return this.save(order);
      }
  
      async updateStatus(id: string, status: OrderStatus): Promise<BharatPeOrder | null> {
          return this.update(id, { status } as Partial<BharatPeOrder>);
      }
  
      // Recent orders for admin dashboard
      async findRecentOrders(limit: number = 10): Promise<BharatPeOrder[]> {
          return this.repository
              .createQueryBuilder("order")
              .leftJoinAndSelect("order.products", "products")
              .leftJoinAndSelect("order.buyer", "buyer")
              .orderBy("order.createdAt", "DESC")
              .limit(limit)
              .getMany();
      }
  
      // Always include products and buyer (matches Mongoose populate)
      async findAllWithRelations(): Promise<BharatPeOrder[]> {
          return this.find({
              relations: ["products", "buyer"],
              order: { createdAt: "DESC" }
          });
      }
  
      async findByIdWithRelations(id: string): Promise<BharatPeOrder | null> {
          return this.repository.findOne({
              where: { id },
              relations: ["products", "products.category", "buyer"]
          });
      }
  
      // Analytics for admin
      async getTotalSales(): Promise<number> {
          const result = await this.repository
              .createQueryBuilder("order")
              .leftJoin("order.products", "product")
              .select("SUM(product.price)", "total")
              .where("order.status != :status", { status: OrderStatus.CANCELLED })
              .getRawOne();
  
          return parseFloat(result.total) || 0;
      }
  
      async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<BharatPeOrder[]> {
          return this.repository
              .createQueryBuilder("order")
              .leftJoinAndSelect("order.products", "products")
              .leftJoinAndSelect("order.buyer", "buyer")
              .where("order.createdAt >= :startDate", { startDate })
              .andWhere("order.createdAt <= :endDate", { endDate })
              .orderBy("order.createdAt", "DESC")
              .getMany();
      }
  
      // Update payment info
      async updatePayment(id: string, paymentData: any): Promise<BharatPeOrder | null> {
          return this.update(id, { payment: paymentData } as Partial<BharatPeOrder>);
      }
  
      // Get user's order count
      async getUserOrderCount(userId: string): Promise<number> {
          return this.repository.count({
              where: { buyerId: userId } as FindOptionsWhere<BharatPeOrder>
          });
      }
}
