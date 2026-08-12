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
  serials: string[]; // Incoming array of scanned serial barcodes
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
   * Creates a Product and bulk-inserts all scanned ProductItems in a single database transaction.
   */
  async createProductWithItems(dto: CreateProductWithSerialsDTO): Promise<{ product: Product; itemCount: number }> {
    return await this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
      // 1. Verify that none of the scanned serials already exist in DB
      if (dto.serials.length > 0) {
        const existingItems = await transactionalEntityManager
          .createQueryBuilder(ProductItem, "item")
          .where("item.snBarcode IN (:...serials)", { serials: dto.serials })
          .getMany();

        if (existingItems.length > 0) {
          const duplicateSerials = existingItems.map((item) => item.snBarcode).join(", ");
          throw new Error(`Duplicate serial numbers found in database: ${duplicateSerials}`);
        }
      }
      console.log("ProductItemRepository createProductWithItems :: scanned serials  "+dto.serials.length);

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

      // 3. Map serials array to ProductItem entities and bulk insert
      if (dto.serials.length > 0) {
        const productItems = dto.serials.map((serial) => {
          return transactionalEntityManager.create(ProductItem, {
            snBarcode: serial.trim(),
            status: ItemStatus.AVAILABLE,
            productId: savedProduct.id,
          });
        });

        await transactionalEntityManager.save(ProductItem, productItems);
      }

      return {
        product: savedProduct,
        itemCount: dto.serials.length,
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