import { Router } from "express";
 import { Pool } from 'pg';
import { create } from 'xmlbuilder2';
import dotenv from "dotenv";
const BASE_URL = process.env.SITE_URL || 'https://primecomputernetwork.com';

// PostgreSQL Pool Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});


const router = Router();

// feeds  routes
router.get("/feeds/products.xml", async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    // Query joining PRODUCTS and CATEGORIES tables
    const query = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.quantity,
        p.shipping,
        p."photoPath",
        c.name AS category_name
      FROM public.products p
      INNER JOIN public.categories c ON p.category_id = c.id
      WHERE p.quantity > 0
      ORDER BY p."updatedAt" DESC;
    `;

    const { rows } = await client.query(query);

    // Initialize XML Feed document structure
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('rss', { 
        version: '2.0', 
        'xmlns:g': 'http://base.google.com/ns/1.0' 
      })
      .ele('channel')
        .ele('title').txt('Prime Computer & Networking Product Feed').up()
        .ele('link').txt(BASE_URL).up()
        .ele('description').txt('Live merchant inventory and pricing feed').up();

    // Map each database row into an XML item
    rows.forEach(product => {
      const productUrl = `${BASE_URL}/product/${product.slug}`;
      const imageUrl = product.photoPath 
        ? (product.photoPath.startsWith('http') ? product.photoPath : `${BASE_URL}${product.photoPath}`)
        : `${BASE_URL}/images/placeholder.jpg`;

      root.ele('item')
        .ele('g:id').txt(product.id).up()
        .ele('g:mpn').txt(product.id).up() // Maps DB UUID as product MPN/SKU
        .ele('title').txt(product.name).up()
        .ele('description').txt(product.description || product.name).up()
        .ele('link').txt(productUrl).up()
        .ele('g:image_link').txt(imageUrl).up()
        .ele('g:price').txt(`${Number(product.price).toFixed(2)} INR`).up()
        .ele('g:availability').txt(product.quantity > 0 ? 'in stock' : 'out of stock').up()
        .ele('g:quantity').txt(product.quantity.toString()).up()
        .ele('g:condition').txt('new').up()
        .ele('g:product_type').txt(product.category_name).up()
        .ele('g:shipping_label').txt(product.shipping ? 'Free Shipping' : 'Standard Shipping').up()
      .up();
    });

    const xmlString = root.end({ prettyPrint: true });

    // Set XML response header
    res.header('Content-Type', 'application/xml');
    res.send(xmlString);

  } catch (error) {
    console.error('Error generating product feed:', error);
    res.status(500).json({ error: 'Failed to generate product feed.' });
  } finally {
    if (client) client.release();
  }
});
//router.post("/login", login);

export default router;
