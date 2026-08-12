import { Request, Response } from "express";
import { ProductItemRepository } from "../repositories/productitem.repository.js";
import { AppDataSource } from "../database/data-source.js"; // Your TypeORM DataSource instance
import { CategoryRepository } from "../repositories/category.repository.js";

const productItemRepository = new ProductItemRepository(AppDataSource);
const  categoryRepository = new CategoryRepository();
export const createProductHandler = async (req: Request, res: Response) => {
  try {
    const { name, slug , description, price, quantity , category, shipping, serials } = req.body;

    // Parse the JSON string passed in Form-Data for serials
    let parsedSerials: string[] = [];
    if (typeof serials === "string") {
      parsedSerials = JSON.parse(serials);
    } else if (Array.isArray(serials)) {
      parsedSerials = serials;
    }
     const categoryExists = await  categoryRepository.findById(category);
        if (!categoryExists) {
            throw new Error("Category not found");
        }
    // Handle file upload path if photo was processed (e.g., via Multer) req.files as any;
   // const photoUrl = req.files as any ;// req.file!! ? req.file?.path : undefined;
     const { photo } = req.files as any;
     const photoUrl =  photo.path
    const result = await productItemRepository.createProductWithItems({
      name,
      slug,
      description,
      price: parseFloat(price),
      quantity,
      categoryId: category,
        photoPath:photo.path! || '' ,
             category:categoryExists,
             photoContentType: photo.type! ||'',
      shipping: shipping === "1" || shipping === "true",
      photoUrl,
      serials: parsedSerials,
    });
 
         /**
          name: string;
            slug: string;
            description: string;
            price: number;
            categoryId: string;
                photoPath: string;
                category: categoryEntity,
                        photoContentType: string;
            shipping: boolean;
            photoUrl?: string;
            serials: string[]; // Incoming array of scanned serial barcodes
            }
          */


    return res.status(201).json({
      success: true,
      message: `Product created successfully with ${result.itemCount} items.`,
      product: result.product,
    });
  } catch (error: any) {
    console.error("Error creating product with items:", error);
    return res.status(400).json({
      error: error.message || "Failed to create product.",
    });
  }
};