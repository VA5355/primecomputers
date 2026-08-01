// src/repositories/RazorPayRepository.ts
import { FindOptionsWhere , In} from "typeorm";
import { BaseRepository } from "./base.repository.js";
import { RazorOrder } from "../entities/razororder.entity.js";
import { ICategory } from "../types/index.js";
import { Product } from "../entities/product.entity.js";
import { IOrder, OrderStatus } from "../types/index.js";

//import { Category } from "../entities/category.entity.js";

export class RazorPayRepository extends BaseRepository<RazorOrder> {
    constructor() {
        super(RazorOrder);
    }

    // RazorOrder-specific queries
    async findByName(name: string): Promise<RazorOrder | null> {
        return this.findOne({ name } as FindOptionsWhere<RazorOrder>);
    }

    async findBySlug(slug: string): Promise<RazorOrder | null> {
        return this.findOne({ slug } as FindOptionsWhere<RazorOrder>);
    }
/*
    // Industry Standard: Include product count
    async findAllWithProductCount(): Promise<(RazorOrder & { productCount: number })[]> {
        const categories = await this.repository
            .createQueryBuilder("category")
            .leftJoin("category.products", "product")
            .addSelect("COUNT(product.id) as productCount")
            .groupBy("category.id")
            .getRawAndEntities();

        return categories.entities.map((category, index) => {
            (category as any).productCount = parseInt(categories.raw[index].productCount) || 0;
            return category as RazorOrder & { productCount: number };
        });
    }

    // Create category with auto-generated slug
    async createCategory(categoryData: Omit<ICategory, 'id'>): Promise<RazorOrder> {
        const category = this.repository.create(categoryData);
        return this.save(category);
    }

    // Check if name or slug exists
    async nameExists(name: string): Promise<boolean> {
        const count = await this.repository.count({
            where: { name } as FindOptionsWhere<RazorOrder>
        });
        return count > 0;
    }

    async slugExists(slug: string): Promise<boolean> {
        const count = await this.repository.count({
            where: { slug } as FindOptionsWhere<RazorOrder>
        });
        return count > 0;
    }
   */
      // RazorOrder-specific queries matching your Mongoose patterns
      async findByUser(userId: string): Promise<RazorOrder[]> {
          return this.find({
              where: { buyerId: userId } as FindOptionsWhere<RazorOrder>,
              relations: ["products", "buyer"],
              order: { createdAt: "DESC" }
          });
      }
  
      async findByStatus(status: OrderStatus): Promise<RazorOrder[]> {
          return this.find({
              where: { status } as FindOptionsWhere<RazorOrder>,
              relations: ["products", "buyer"],
              order: { createdAt: "DESC" }
          });
      }
  
      // Create order with products (many-to-many)
      async createOrder(
          orderData: Omit<IOrder, 'id' | 'products' | 'createdAt' | 'updatedAt'>,
          productIds: string[]
      ): Promise<RazorOrder> {
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
  
      async updateStatus(id: string, status: OrderStatus): Promise<RazorOrder | null> {
          return this.update(id, { status } as Partial<RazorOrder>);
      }
  
      // Recent orders for admin dashboard
      async findRecentOrders(limit: number = 10): Promise<RazorOrder[]> {
          return this.repository
              .createQueryBuilder("order")
              .leftJoinAndSelect("order.products", "products")
              .leftJoinAndSelect("order.buyer", "buyer")
              .orderBy("order.createdAt", "DESC")
              .limit(limit)
              .getMany();
      }
  
      // Always include products and buyer (matches Mongoose populate)
      async findAllWithRelations(): Promise<RazorOrder[]> {
          return this.find({
              relations: ["products", "buyer"],
              order: { createdAt: "DESC" }
          });
      }
  
      async findByIdWithRelations(id: string): Promise<RazorOrder | null> {
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
  
      async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<RazorOrder[]> {
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
      async updatePayment(id: string, paymentData: any): Promise<RazorOrder | null> {
          return this.update(id, { payment: paymentData } as Partial<RazorOrder>);
      }
  
      // Get user's order count
      async getUserOrderCount(userId: string): Promise<number> {
          return this.repository.count({
              where: { buyerId: userId } as FindOptionsWhere<RazorOrder>
          });
      }
}