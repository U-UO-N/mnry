import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Link type enum for banners
export enum LinkType {
  PRODUCT = 'product',
  CATEGORY = 'category',
  URL = 'url',
  NONE = 'none',
}

// Banner interface
export interface Banner {
  id: string;
  image: string;
  linkType: LinkType;
  linkValue: string | null;
  sort: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Banner row from database
interface BannerRow extends RowDataPacket {
  id: string;
  image: string;
  link_type: LinkType;
  link_value: string | null;
  sort: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating/updating banner
export interface BannerDTO {
  image: string;
  linkType: LinkType;
  linkValue?: string;
  sort?: number;
  isActive?: boolean;
}

// Map database row to Banner object
const mapRowToBanner = (row: BannerRow): Banner => ({
  id: row.id,
  image: row.image,
  linkType: row.link_type,
  linkValue: row.link_value,
  sort: row.sort,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class BannerModel {
  // Find banner by ID
  static async findById(id: string): Promise<Banner | null> {
    const rows = await query<BannerRow[]>('SELECT * FROM banners WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToBanner(rows[0]) : null;
  }


  // Get all active banners (for frontend)
  static async findActive(): Promise<Banner[]> {
    const rows = await query<BannerRow[]>(
      'SELECT * FROM banners WHERE is_active = TRUE ORDER BY sort ASC, created_at DESC'
    );
    return rows.map(mapRowToBanner);
  }

  // Get all banners (for admin)
  static async findAll(): Promise<Banner[]> {
    const rows = await query<BannerRow[]>(
      'SELECT * FROM banners ORDER BY sort ASC, created_at DESC'
    );
    return rows.map(mapRowToBanner);
  }

  // Create new banner
  static async create(data: BannerDTO): Promise<Banner> {
    const id = uuidv4();
    await execute(
      `INSERT INTO banners (id, image, link_type, link_value, sort, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.image,
        data.linkType,
        data.linkValue || null,
        data.sort || 0,
        data.isActive !== false,
      ]
    );
    const banner = await this.findById(id);
    if (!banner) {
      throw new Error('Failed to create banner');
    }
    return banner;
  }

  // Update banner
  static async update(id: string, data: Partial<BannerDTO>): Promise<Banner | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.image !== undefined) {
      updates.push('image = ?');
      values.push(data.image);
    }
    if (data.linkType !== undefined) {
      updates.push('link_type = ?');
      values.push(data.linkType);
    }
    if (data.linkValue !== undefined) {
      updates.push('link_value = ?');
      values.push(data.linkValue);
    }
    if (data.sort !== undefined) {
      updates.push('sort = ?');
      values.push(data.sort);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await execute(`UPDATE banners SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Delete banner
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM banners WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Clear all banners
  static async clear(): Promise<void> {
    await execute('DELETE FROM banners');
  }

  // Replace all banners (batch update)
  static async replaceAll(banners: BannerDTO[]): Promise<Banner[]> {
    await this.clear();
    const results: Banner[] = [];
    for (let i = 0; i < banners.length; i++) {
      const banner = await this.create({ ...banners[i], sort: i });
      results.push(banner);
    }
    return results;
  }
}


// Hot Product interface (join table between home config and products)
export interface HomeHotProduct {
  id: string;
  productId: string;
  sort: number;
  createdAt: Date;
}

// Hot Product row from database
interface HomeHotProductRow extends RowDataPacket {
  id: string;
  product_id: string;
  sort: number;
  created_at: Date;
}

// Map database row to HomeHotProduct object
const mapRowToHomeHotProduct = (row: HomeHotProductRow): HomeHotProduct => ({
  id: row.id,
  productId: row.product_id,
  sort: row.sort,
  createdAt: row.created_at,
});

export class HomeHotProductModel {
  // Find by ID
  static async findById(id: string): Promise<HomeHotProduct | null> {
    const rows = await query<HomeHotProductRow[]>(
      'SELECT * FROM home_hot_products WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapRowToHomeHotProduct(rows[0]) : null;
  }

  // Get all hot product IDs (ordered)
  static async findAll(): Promise<HomeHotProduct[]> {
    const rows = await query<HomeHotProductRow[]>(
      'SELECT * FROM home_hot_products ORDER BY sort ASC, created_at ASC'
    );
    return rows.map(mapRowToHomeHotProduct);
  }

  // Get hot product IDs
  static async getProductIds(): Promise<string[]> {
    const hotProducts = await this.findAll();
    return hotProducts.map(hp => hp.productId);
  }

  // Add product to hot products
  static async add(productId: string, sort?: number): Promise<HomeHotProduct> {
    const id = uuidv4();
    const sortValue = sort ?? (await this.getMaxSort()) + 1;
    await execute(
      'INSERT INTO home_hot_products (id, product_id, sort) VALUES (?, ?, ?)',
      [id, productId, sortValue]
    );
    const hotProduct = await this.findById(id);
    if (!hotProduct) {
      throw new Error('Failed to add hot product');
    }
    return hotProduct;
  }

  // Remove product from hot products
  static async remove(productId: string): Promise<boolean> {
    const result = await execute(
      'DELETE FROM home_hot_products WHERE product_id = ?',
      [productId]
    );
    return result.affectedRows > 0;
  }

  // Clear all hot products
  static async clear(): Promise<void> {
    await execute('DELETE FROM home_hot_products');
  }

  // Update sort order
  static async updateSort(id: string, sort: number): Promise<HomeHotProduct | null> {
    await execute('UPDATE home_hot_products SET sort = ? WHERE id = ?', [sort, id]);
    return this.findById(id);
  }

  // Get max sort value
  private static async getMaxSort(): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT MAX(sort) as max_sort FROM home_hot_products'
    );
    return rows[0].max_sort || 0;
  }

  // Replace all hot products (batch update)
  static async replaceAll(productIds: string[]): Promise<void> {
    await this.clear();
    for (let i = 0; i < productIds.length; i++) {
      await this.add(productIds[i], i);
    }
  }
}


// Category Shortcut interface
export interface CategoryShortcut {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}

// Category Shortcut row from database
interface CategoryShortcutRow extends RowDataPacket {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  sort: number;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating/updating category shortcut
export interface CategoryShortcutDTO {
  categoryId: string;
  name: string;
  icon: string;
  sort?: number;
}

// Map database row to CategoryShortcut object
const mapRowToCategoryShortcut = (row: CategoryShortcutRow): CategoryShortcut => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  icon: row.icon,
  sort: row.sort,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class CategoryShortcutModel {
  // Find by ID
  static async findById(id: string): Promise<CategoryShortcut | null> {
    const rows = await query<CategoryShortcutRow[]>(
      'SELECT * FROM category_shortcuts WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapRowToCategoryShortcut(rows[0]) : null;
  }

  // Get all category shortcuts (ordered)
  static async findAll(): Promise<CategoryShortcut[]> {
    const rows = await query<CategoryShortcutRow[]>(
      'SELECT * FROM category_shortcuts ORDER BY sort ASC, created_at ASC'
    );
    return rows.map(mapRowToCategoryShortcut);
  }

  // Create new category shortcut
  static async create(data: CategoryShortcutDTO): Promise<CategoryShortcut> {
    const id = uuidv4();
    const sortValue = data.sort ?? (await this.getMaxSort()) + 1;
    await execute(
      `INSERT INTO category_shortcuts (id, category_id, name, icon, sort)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.categoryId, data.name, data.icon, sortValue]
    );
    const shortcut = await this.findById(id);
    if (!shortcut) {
      throw new Error('Failed to create category shortcut');
    }
    return shortcut;
  }

  // Update category shortcut
  static async update(id: string, data: Partial<CategoryShortcutDTO>): Promise<CategoryShortcut | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(data.categoryId);
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon);
    }
    if (data.sort !== undefined) {
      updates.push('sort = ?');
      values.push(data.sort);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await execute(`UPDATE category_shortcuts SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Delete category shortcut
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM category_shortcuts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Clear all shortcuts
  static async clear(): Promise<void> {
    await execute('DELETE FROM category_shortcuts');
  }

  // Get max sort value
  private static async getMaxSort(): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT MAX(sort) as max_sort FROM category_shortcuts'
    );
    return rows[0].max_sort || 0;
  }

  // Replace all shortcuts (batch update)
  static async replaceAll(shortcuts: CategoryShortcutDTO[]): Promise<CategoryShortcut[]> {
    await this.clear();
    const results: CategoryShortcut[] = [];
    for (let i = 0; i < shortcuts.length; i++) {
      const shortcut = await this.create({ ...shortcuts[i], sort: i });
      results.push(shortcut);
    }
    return results;
  }
}
