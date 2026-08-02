// src/workers/cloudinaryWorker.ts
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { EventRepository } from "../repositories/event.repository.js";
import { EventType } from "../entities/event.entity.js";

export interface CloudinaryJobData {
  productId: string;
  localRelativePath: string;
  slug: string;
}

export class CloudinaryWorkerService {
  private productRepository = new ProductRepository();
  private eventRepository = new EventRepository();

  /**
   * Dispatches the upload task to run asynchronously in background.
   */
  public enqueueUpload(data: CloudinaryJobData): void {
    setImmediate(() => {
      this.processUpload(data).catch((err) => {
        console.error(`[Cloudinary Worker Error] Product ID: ${data.productId}`, err);
      });
    });
  }

  private async processUpload({ productId, localRelativePath, slug }: CloudinaryJobData): Promise<void> {
    const absolutePath = path.join(process.cwd(), "public", localRelativePath);

    try {
      // 1. Verify file exists on local disk
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at path: ${absolutePath}`);
      }

      // 2. Upload file to Cloudinary in products folder
      const uploadResponse = await cloudinary.uploader.upload(absolutePath, {
        folder: "products",
        public_id: `${slug}-${productId}`,
        overwrite: true,
        resource_type: "image",
      });

      const secureUrl = uploadResponse.secure_url;

      // 3. Update photoPath in PostgreSQL DB using TypeORM ProductRepository
      await this.productRepository.update(productId, { photoPath: secureUrl });
    // 2. Safe Event Logging (Prevents worker crash if DB logging fails)
    try {

      // 4. Log Success Event in Events Table
      await this.eventRepository.logEvent(
        "PRODUCT_IMAGE_CLOUDINARY_SYNC",
        `Image for product '${slug}' successfully synced to Cloudinary.`,
        EventType.SUCCESS,
        { productId, secureUrl, publicId: uploadResponse.public_id }
      );
    } catch (logError :any) {
      console.warn(`[CloudinaryWorker] Failed to log event for Product ${productId}:`, logError.message);
    }


      // 5. Clean up local temporary file safely
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error: any) {
      // Log Failure Event in Events Table
      await this.eventRepository.logEvent(
        "PRODUCT_IMAGE_CLOUDINARY_FAILED",
        `Failed to upload image for product '${slug}': ${error.message}`,
        EventType.ERROR,
        { productId, localRelativePath, error: error.message }
      );
    }
  }
}
