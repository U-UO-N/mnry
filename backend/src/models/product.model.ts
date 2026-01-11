import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Product status enum
export enum ProductStatus {
  DRAFT = 'draft',
  ON_SALE = 'on_sale',
  OFF_SALE = 'off_sale',
}

// Product interface
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  mainImage: string;
  images: string[];
  categoryId: string | null;
  description: string | null;
  detailImages: string[];
  stock: number;
  sales: number;
  status: ProductStatus;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}

// Product with SKUs for detail view
export interface ProductDetail extends Product {
  skus: ProductSKU[];
  specs: ProductSpec[];
}

// Product spec (derived from SKUs)
export interface ProductSpec {
  name: string;
  values: string[];
}

// Product SKU interface
export interface ProductSKU {
  id: string;
  productId: string;
  specValues: Record<string, string>;
  price: number;
  stock: number;
  createdAt: Date;
}

// Product row from database
interface ProductRow extends RowDataPacket {
  id: string;
  name: string;
  price: string;
  original_price: string | null;
  main_image: string;
  images: string | null;
  category_id: string | null;
  description: string | null;
  detail_images: string | null;
  stock: number;
  sales: number;
  status: ProductStatus;
  sort: number;
  created_at: Date;
  updated_at: Date;
}

// SKU row from database
interface SKURow extends RowDataPacket {
  id: string;
  product_id: string;
  spec_values: string;
  price: string;
  stock: number;
  created_at: Date;
}

// DTO for creating product
export interface CreateProductDTO {
  name: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  images?: string[];
  categoryId?: string;
  description?: string;
  detailImages?: string[];
  stock?: number;
  status?: ProductStatus;
  sort?: number;
}


// DTO for updating product
export interface UpdateProductDTO {
  name?: string;
  price?: number;
  originalPrice?: number;
  mainImage?: string;
  images?: string[];
  categoryId?: string;
  description?: string;
  detailImages?: string[];
  stock?: number;
  status?: ProductStatus;
  sort?: number;
}

// DTO for creating SKU
export interface CreateSKUDTO {
  productId: string;
  specValues: Record<string, string>;
  price: number;
  stock?: number;
}

// Query parameters for product list
export interface ProductQuery {
  categoryId?: string;
  status?: ProductStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

// Parse JSON safely - handles both string and already-parsed values
const parseJSON = <T>(value: string | T | null, defaultValue: T): T => {
  if (value === null || value === undefined) return defaultValue;
  // If already parsed (e.g., MySQL JSON type returns parsed value)
  if (typeof value !== 'string') return value as T;
  // If it's a string, try to parse it
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
};

// Map database row to Product object
const mapRowToProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  price: parseFloat(row.price),
  originalPrice: row.original_price ? parseFloat(row.original_price) : null,
  mainImage: row.main_image,
  images: parseJSON<string[]>(row.images, []),
  categoryId: row.category_id,
  description: row.description,
  detailImages: parseJSON<string[]>(row.detail_images, []),
  stock: row.stock,
  sales: row.sales,
  status: row.status,
  sort: row.sort,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to SKU object
const mapRowToSKU = (row: SKURow): ProductSKU => ({
  id: row.id,
  productId: row.product_id,
  specValues: parseJSON<Record<string, string>>(row.spec_values, {}),
  price: parseFloat(row.price),
  stock: row.stock,
  createdAt: row.created_at,
});

export class ProductModel {
  // Find product by ID
  static async findById(id: string): Promise<Product | null> {
    const rows = await query<ProductRow[]>('SELECT * FROM products WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToProduct(rows[0]) : null;
  }

  // Get product detail with SKUs
  static async getDetail(id: string): Promise<ProductDetail | null> {
    const product = await this.findById(id);
    if (!product) return null;

    const skus = await ProductSKUModel.findByProductId(id);
    const specs = this.extractSpecs(skus);

    return {
      ...product,
      skus,
      specs,
    };
  }

  // Extract specs from SKUs
  private static extractSpecs(skus: ProductSKU[]): ProductSpec[] {
    const specMap = new Map<string, Set<string>>();

    for (const sku of skus) {
      for (const [name, value] of Object.entries(sku.specValues)) {
        if (!specMap.has(name)) {
          specMap.set(name, new Set());
        }
        specMap.get(name)!.add(value);
      }
    }

    return Array.from(specMap.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values),
    }));
  }

  // Get products with pagination and filters
  static async findMany(queryParams: ProductQuery): Promise<{ items: Product[]; total: number }> {
    const { categoryId, status, keyword, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (categoryId) {
      conditions.push('category_id = ?');
      values.push(categoryId);
    }

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    if (keyword) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      values.push(`%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM products ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<ProductRow[]>(
      `SELECT * FROM products ${whereClause} ORDER BY sort ASC, created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    console.log('=== findMany raw rows ===');
    if (rows.length > 0) {
      console.log('First row detail_images:', rows[0].detail_images);
    }
    
    const items = rows.map(mapRowToProduct);
    console.log('=== findMany mapped items ===');
    if (items.length > 0) {
      console.log('First item detailImages:', items[0].detailImages);
    }

    return {
      items,
      total,
    };
  }


  // Search products by keyword
  static async search(keyword: string, page = 1, pageSize = 20): Promise<{ items: Product[]; total: number }> {
    return this.findMany({
      keyword,
      status: ProductStatus.ON_SALE,
      page,
      pageSize,
    });
  }

  // Get products by category (only on_sale)
  static async findByCategory(categoryId: string, page = 1, pageSize = 20): Promise<{ items: Product[]; total: number }> {
    return this.findMany({
      categoryId,
      status: ProductStatus.ON_SALE,
      page,
      pageSize,
    });
  }

  // Create new product
  static async create(data: CreateProductDTO): Promise<Product> {
    const id = uuidv4();
    await execute(
      `INSERT INTO products (id, name, price, original_price, main_image, images, category_id, description, detail_images, stock, status, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.price,
        data.originalPrice || null,
        data.mainImage,
        JSON.stringify(data.images || []),
        data.categoryId || null,
        data.description || null,
        JSON.stringify(data.detailImages || []),
        data.stock || 0,
        data.status || ProductStatus.ON_SALE,
        data.sort || 0,
      ]
    );
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Failed to create product');
    }
    return product;
  }

  // Update product
  static async update(id: string, data: UpdateProductDTO): Promise<Product | null> {
    console.log('ProductModel.update called with id:', id);
    console.log('ProductModel.update data:', JSON.stringify(data, null, 2));
    console.log('data.detailImages:', data.detailImages);
    console.log('data.detailImages !== undefined:', data.detailImages !== undefined);
    
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }
    if (data.originalPrice !== undefined) {
      updates.push('original_price = ?');
      values.push(data.originalPrice);
    }
    if (data.mainImage !== undefined) {
      updates.push('main_image = ?');
      values.push(data.mainImage);
    }
    if (data.images !== undefined) {
      updates.push('images = ?');
      values.push(JSON.stringify(data.images));
    }
    if (data.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(data.categoryId);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.detailImages !== undefined) {
      console.log('Adding detailImages to update, value:', JSON.stringify(data.detailImages));
      updates.push('detail_images = ?');
      values.push(JSON.stringify(data.detailImages));
    }
    if (data.stock !== undefined) {
      updates.push('stock = ?');
      values.push(data.stock);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.sort !== undefined) {
      updates.push('sort = ?');
      values.push(data.sort);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    console.log('SQL:', sql);
    console.log('Values:', values);

    values.push(id);
    const result = await execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
    console.log('Update result:', result);
    
    const updatedProduct = await this.findById(id);
    console.log('Updated product from DB:', JSON.stringify(updatedProduct, null, 2));
    
    return updatedProduct;
  }

  // Update product status
  static async updateStatus(id: string, status: ProductStatus): Promise<Product | null> {
    await execute('UPDATE products SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  // Delete product
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Update stock
  static async updateStock(id: string, quantity: number): Promise<Product | null> {
    await execute('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, id]);
    return this.findById(id);
  }

  // Increment sales
  static async incrementSales(id: string, quantity: number): Promise<Product | null> {
    await execute('UPDATE products SET sales = sales + ? WHERE id = ?', [quantity, id]);
    return this.findById(id);
  }
}

export class ProductSKUModel {
  // Find SKU by ID
  static async findById(id: string): Promise<ProductSKU | null> {
    const rows = await query<SKURow[]>('SELECT * FROM product_skus WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToSKU(rows[0]) : null;
  }

  // Find SKUs by product ID
  static async findByProductId(productId: string): Promise<ProductSKU[]> {
    const rows = await query<SKURow[]>(
      'SELECT * FROM product_skus WHERE product_id = ? ORDER BY created_at ASC',
      [productId]
    );
    return rows.map(mapRowToSKU);
  }

  // Create new SKU
  static async create(data: CreateSKUDTO): Promise<ProductSKU> {
    const id = uuidv4();
    await execute(
      `INSERT INTO product_skus (id, product_id, spec_values, price, stock) VALUES (?, ?, ?, ?, ?)`,
      [id, data.productId, JSON.stringify(data.specValues), data.price, data.stock || 0]
    );
    const sku = await this.findById(id);
    if (!sku) {
      throw new Error('Failed to create SKU');
    }
    return sku;
  }

  // Update SKU stock
  static async updateStock(id: string, quantity: number): Promise<ProductSKU | null> {
    await execute('UPDATE product_skus SET stock = stock + ? WHERE id = ?', [quantity, id]);
    return this.findById(id);
  }

  // Delete SKUs by product ID
  static async deleteByProductId(productId: string): Promise<boolean> {
    const result = await execute('DELETE FROM product_skus WHERE product_id = ?', [productId]);
    return result.affectedRows > 0;
  }

  // Delete SKU
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM product_skus WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
