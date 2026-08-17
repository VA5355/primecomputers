import { DataSource, Repository, EntityManager } from "typeorm";
import { ProductItem, ItemStatus } from "../entities/productitem.entity";
import { Product } from "../entities/product.entity";

export interface CreateProductWithSerialsDTO {
  name: string;
   slug: string;
  description: string;
  price: number;   
    quantity:  number; // typeof quantity === 'string' ? parseInt(quantity) : quantity,
  categoryId: string;
    photoPath: string;
     category: any,
            photoContentType: string;
        
  shipping: boolean;
  photoUrl?: string;
  serials: string[] | string; // Handle both arrays and comma-separated strings
}
/* reference
     name: name.trim(),
            slug,
            description: description.trim(),
            price: typeof price === 'string' ? parseFloat(price) : price,
            quantity: typeof quantity === 'string' ? parseInt(quantity) : quantity,
            shipping: typeof shipping === 'string' ? shipping === "true" : Boolean(shipping),
            categoryId: categoryId,
            category: categoryEntity,
            sold: 0, // Default value
            photoPath,
            photoContentType,


*/
export class ProductItemRepository {
  private itemRepo: Repository<ProductItem>;
  private productRepo: Repository<Product>;

  constructor(private dataSource: DataSource) {
    this.itemRepo = this.dataSource.getRepository(ProductItem);
    this.productRepo = this.dataSource.getRepository(Product);
  }

  /**
   * Helper to ensure serials is always a clean array of non-empty strings
   */
  private normalizeSerials(serials: string[] | string): string[] {
    if (!serials) return [];
    
    // If sent as a comma-separated string from form-data/multiform
    if (typeof serials === "string") {
      return serials
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    
    // If already an array
    return serials.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Creates a Product and bulk-inserts all scanned ProductItems in a single database transaction.
   */
  async createProductWithItems(dto: CreateProductWithSerialsDTO): Promise<{ product: Product; itemCount: number }> {
    const cleanSerials = this.normalizeSerials(dto.serials);

    return await this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
      // 1. Verify that none of the scanned serials already exist in DB
      if (cleanSerials.length > 0) {
        const existingItems = await transactionalEntityManager
          .createQueryBuilder(ProductItem, "item")
          .where("item.snBarcode IN (:...serials)", { serials: cleanSerials })
          .getMany();

        if (existingItems.length > 0) {
          const duplicateSerials = existingItems.map((item) => item.snBarcode).join(", ");
          throw new Error(`Duplicate serial numbers found in database: ${duplicateSerials}`);
        }
      }

      console.log(`ProductItemRepository :: Scanned serials count: ${cleanSerials.length}`);

      // 2. Instantiate and save the main Product record
      const newProduct = transactionalEntityManager.create(Product, {
        name: dto.name,
         slug: dto.slug,
        description: dto.description,
        price: dto.price,
        quantity : dto.quantity,
        categoryId: dto.categoryId,
           photoPath: dto.photoPath,
         category: dto.category,
            photoContentType: dto.photoContentType,
        shipping: dto.shipping,
     //   quantity: dto.serials.length, // Sync total quantity with length of serials
        photoUrl: dto.photoUrl,
      });

      const savedProduct = await transactionalEntityManager.save(Product, newProduct);

      // 3. Bulk insert items using performant INSERT statement
      if (cleanSerials.length > 0) {
        const itemRecords = cleanSerials.map((serial) => ({
          snBarcode: serial,
          status: ItemStatus.AVAILABLE,
          productId: savedProduct.id,
        }));

        // Using direct query builder insert avoids cascade & listener overhead
        await transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into(ProductItem)
          .values(itemRecords)
          .execute();
      }

      return {
        product: savedProduct,
        itemCount: cleanSerials.length,
      };
    });
  }

  /**
   * Find available serial numbers for a given product ID
   */
  async findAvailableItemsByProductId(productId: string): Promise<ProductItem[]> {
    return await this.itemRepo.find({
      where: {
        productId,
        status: ItemStatus.AVAILABLE,
      },
      order: {
        createdAt: "ASC",
      },
    });
  }

  /**
   * Fetch item details by its unique scanned serial barcode
   */
  async findByBarcode(snBarcode: string): Promise<ProductItem | null> {
    return await this.itemRepo.findOne({
      where: { snBarcode },
      relations: ["product"],
    });
  }
}
