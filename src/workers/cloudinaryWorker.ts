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
  picNumber: string;
}
export interface CloudinaryJobDataArray {
 productPhotos :   CloudinaryJobData [];
}
export  interface UploadedPhotoResult {
  productId: string;
  publicId: string;
  secureUrl: string;
}

export class CloudinaryWorkerService {
  private productRepository = new ProductRepository();
  private eventRepository = new EventRepository();

  /**
   * Dispatches the upload task to run asynchronously in background.
   * invoked from product service 
    // Enqueue background upload workers for all saved photo paths
        for (const photoPath of savedPhotoPaths) {
            workerService.enqueueUpload({
                productId: product.id,
                localRelativePath: photoPath,
                slug: product.slug,
            });
        }
   * 
   */
  public enqueueUpload(data: CloudinaryJobData): void {
    setImmediate(() => {
      this.processUpload(data).catch((err) => {
        console.error(`[Cloudinary Worker Error] Product ID: ${data.productId}`, err);
      });
    });
  }

    public enqueueUploadArray(dataArray: CloudinaryJobDataArray): Promise<any>  {
      let productUrls : any = [];
      setImmediate(() => {
      productUrls =     this.processUploadArray(dataArray).catch((err) => {
          console.error(`[Cloudinary Worker Error] : batch enqueueUploadArray error :: `, err);
        });

      });
       console.log(`[CloudinaryWorker]  Uploader enqueueUploadArray  `   );
       console.log(`[CloudinaryWorker]  product urls : ${productUrls}   `   );
      return productUrls;
  }


  private async processUpload({ productId, localRelativePath, slug ,picNumber }: CloudinaryJobData): Promise<void> {
    const absolutePath = path.join(process.cwd(), "public", localRelativePath);

    try {
      // 1. Verify file exists on local disk
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at path: ${absolutePath}`);
      }
       console.log(`[CloudinaryWorker]   Product id : ${productId}:  slug:  ${slug}  picNumber: ${picNumber} `   );
        console.log(`[CloudinaryWorker]  upload absolutePath : ${absolutePath}  `   );
       console.log(`[CloudinaryWorker]  Uploader file: PARAM 1  ${absolutePath}`   );
       console.log(`[CloudinaryWorker]  Uploader : UploadApiOptions PARAM 2 { folder : products , public_id:  ${slug}-${picNumber}-${productId} ,  overwrite: true ,  resource_type:  image  }`   );
    

      // 2. Upload file to Cloudinary in products folder
      const uploadResponse = await cloudinary.uploader.upload(absolutePath, {
        folder: "products",
        public_id: `${slug}-${picNumber}-${productId}`,
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
  private async processUploadArray(
  jobArray: CloudinaryJobDataArray
): Promise<UploadedPhotoResult[]> {
  // Guard clause for empty payloads
  if (!jobArray?.productPhotos?.length) {
    return [];
  }

  const uploadedResults: UploadedPhotoResult[] = [];
  // Group secure URLs by database productId (safe even if batch has multiple products)
  const urlsByProductId = new Map<string, string[]>();

  // 1. Upload all photos to Cloudinary one by one
  for (const cloudinaryJob of jobArray.productPhotos) {
    const { productId, localRelativePath, slug, picNumber } = cloudinaryJob;
    const absolutePath = path.join(process.cwd(), "public", localRelativePath);

    try {
      // Verify file exists on local disk
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at path: ${absolutePath}`);
      }

      const cloudinaryPublicId = `${slug}-${picNumber}-${productId}`;

      console.log(
        `[CloudinaryWorker] Uploading Product ID: ${productId}, slug: ${slug}, picNumber: ${picNumber}`
      );

      // Upload file to Cloudinary in 'products' folder
      const uploadResponse = await cloudinary.uploader.upload(absolutePath, {
        folder: "products",
        public_id: cloudinaryPublicId,
        overwrite: true,
        resource_type: "image",
      });

      const secureUrl = uploadResponse.secure_url;

      // Track result using the actual database productId
      uploadedResults.push({
        productId,
        publicId: uploadResponse.public_id,
        secureUrl,
      });

      // Group URL under its respective database productId
      const existingUrls = urlsByProductId.get(productId) ?? [];
      existingUrls.push(secureUrl);
      urlsByProductId.set(productId, existingUrls);

      // Safe Event Logging for individual upload
      try {
        await this.eventRepository.logEvent(
          "PRODUCT_IMAGE_CLOUDINARY_SYNC",
          `Image ${picNumber} for product '${productId}' successfully synced to Cloudinary.`,
          EventType.SUCCESS,
          { productId, path: absolutePath, publicId: uploadResponse.public_id, secureUrl }
        );
      } catch (logError: any) {
        console.warn(
          `[CloudinaryWorker] Failed to log upload event for Product ${productId}:`,
          logError.message
        );
      }

      // Clean up local temporary file safely after successful upload
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (uploadError: any) {
      console.error(
        `[CloudinaryWorker] Upload error for product '${productId}' at '${absolutePath}':`,
        uploadError.message
      );

      try {
        await this.eventRepository.logEvent(
          "PRODUCT_IMAGE_CLOUDINARY_FAILED",
          `Image for product '${productId}' failed syncing to Cloudinary.`,
          EventType.ERROR,
          { productId, path: absolutePath, error: uploadError.message }
        );
      } catch (logError: any) {
        console.warn(`[CloudinaryWorker] Failed to log error event:`, logError.message);
      }
    }
  }

  // 2. Update PostgreSQL database in batch per Product ID
  for (const [productId, urlsOnly] of urlsByProductId.entries()) {
    const urlsJSON = JSON.stringify(urlsOnly);

    try {
      await this.productRepository.updatePhotos(productId, urlsOnly);

      console.log(
        `[CloudinaryWorker] Updated DB for product '${productId}' with photos: ${urlsJSON}`
      );

      await this.eventRepository.logEvent(
        "PRODUCT_DB_PHOTOS_UPDATED",
        `Database photos array updated for product '${productId}'.`,
        EventType.SUCCESS,
        { productId, urlsJSON, count: urlsOnly.length }
      );
    } catch (dbError: any) {
      console.error(
        `[CloudinaryWorker] DB update error for product '${productId}':`,
        dbError.message
      );

      try {
        await this.eventRepository.logEvent(
          "PRODUCT_IMAGE_CLOUDINARY_FAILED",
          `Failed to save photo URLs in DB for product '${productId}': ${dbError.message}`,
          EventType.ERROR,
          { productId, urlsJSON, error: dbError.message }
        );
      } catch (logError: any) {
        console.warn(`[CloudinaryWorker] Failed to log DB error event:`, logError.message);
      }
    }
  }
   return uploadedResults;
 }
  private async processUploadArrayOld(jobArray : CloudinaryJobDataArray): Promise<any> {

    let productPhotoSecureUrls :any = [];

       // const photoPath of
    for (const cloudinaryJob of  jobArray.productPhotos){ 
      const  { productId, localRelativePath, slug ,picNumber }  = cloudinaryJob;
    const absolutePath = path.join(process.cwd(), "public", localRelativePath);
      try {
      // 1. Verify file exists on local disk
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at path: ${absolutePath}`);
      }
       console.log(`[CloudinaryWorker]   Product id : ${productId}:  slug:  ${slug}  picNumber: ${picNumber} `   );
        console.log(`[CloudinaryWorker]  upload absolutePath : ${absolutePath}  `   );
       console.log(`[CloudinaryWorker]  Uploader file: PARAM 1  ${absolutePath}`   );
       console.log(`[CloudinaryWorker]  Uploader : UploadApiOptions PARAM 2 { folder : products , public_id:  ${slug}-${picNumber}-${productId} ,  overwrite: true ,  resource_type:  image  }`   );
    

      // 2. Upload file to Cloudinary in products folder
      const uploadResponse = await cloudinary.uploader.upload(absolutePath, {
        folder: "products",
        public_id: `${slug}-${picNumber}-${productId}`,
        overwrite: true,
        resource_type: "image",
      });

      const secureUrl = uploadResponse.secure_url;

    
      /*
       UploadApiResponse {
        public_id: string;
        version: number;
        signature: string;
        width: number;
        height: number;
        format: string;
        resource_type: "image" | "video" | "raw" | "auto";
        created_at: string;
        tags: Array<string>;
        pages: number;
        bytes: number;
        type: string;
        etag: string;
        placeholder: boolean;
        url: string;
        secure_url: string;
        access_mode: string;
        original_filename: string;
        moderation: Array<string>;
        access_control: Array<string>;
        context: object; //won't change since it's response, we need to discuss documentation team about it before implementing.
        metadata: object; //won't change since it's response, we need to discuss documentation team about it before implementing.
        colors?: [string, number][];

        [futureKey: string]: any;
      }
      */
       productPhotoSecureUrls.push({public_id : uploadResponse.public_id , secure_url : uploadResponse.secure_url });

       
      // 2. Safe Event Logging (Prevents worker crash if DB logging fails)
        try {

           await this.eventRepository.logEvent(
          "PRODUCT_IMAGE_CLOUDINARY_SYNC",
          `Image for product '${productId}' successfully synced to Cloudinary.`,
          EventType.SUCCESS,
          { productId, path: absolutePath, publicId: productId }
         );
            console.log(`[CloudinaryWorker] Uploaded success publicId: ${productId} path: ${absolutePath} `   );
        } catch (logError :any) {
          console.warn(`[CloudinaryWorker] Failed to log event for Product ${productId}:`, logError.message);
        }


      // 5. Clean up local temporary file safely
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (uploadError: any) {
       await this.eventRepository.logEvent(
          "PRODUCT_IMAGE_CLOUDINARY_SYNC",
          `Image for product '${productId}' failed synced to Cloudinary.`,
          EventType.ERROR,
          { productId,  path: absolutePath , error: uploadError.message }
        );
    }
     

    }// Upload all the Photos ONE BY ONE  FOR LOOP 

    if(productPhotoSecureUrls.length > 0){ 

     // Standard renaming (TypeScript infers the string types automatically)
      const { public_id: productId, secure_url: secureUrl } = productPhotoSecureUrls[0];
      const urlsOnly: string[] = productPhotoSecureUrls.map((pr:any) => pr.secure_url);
      ///await productRepository.updatePhotos(productId, urlsOnly);
    
      try {
                // 3. Update photoPath in PostgreSQL DB using TypeORM ProductRepository
        await this.productRepository.updatePhotos(productId, urlsOnly);   ; //.update(productId, { photoPath: secureUrl });
         let urlsJSON = JSON.stringify(urlsOnly);

          console.log(`[CloudinaryWorker] Products  product : ${productId}  photots :  ${urlsJSON}`   );
            // 4. Log Success Event in Events Table
        await this.eventRepository.logEvent(
          "PRODUCT_IMAGE_CLOUDINARY_SYNC",
          `Image for product '${productId}' successfully synced to Cloudinary.`,
          EventType.SUCCESS,
          { productId, urlsJSON, publicId: productId }
        );



      } catch (error: any) {
        let urlsJSON = JSON.stringify(urlsOnly);

          console.log(`[CloudinaryWorker] Products  product : ${productId}  photots  upload error:  ${error.message}`   );
        // Log Failure Event in Events Table
        await this.eventRepository.logEvent(
          "PRODUCT_IMAGE_CLOUDINARY_FAILED",
          `Failed to upload image for product '${productId}': ${error.message}`,
          EventType.ERROR,
          { productId, urlsJSON, error: error.message }
        );
      }

    }



    return productPhotoSecureUrls;
   

    
  }

}
