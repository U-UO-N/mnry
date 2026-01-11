import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Category interface
export interface Category {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
  sort: number;
  createdAt: Date;
  children?: Category[];
}

// Category row from database
interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  sort: number;
  created_at: Date;
}

// DTO for creating category
export interface CreateCategoryDTO {
  name: string;
  icon?: string;
  parentId?: string;
  sort?: number;
}

// DTO for updating category
export interface UpdateCategoryDTO {
  name?: string;
  icon?: string;
  sort?: number;
}

// Map database row to Category object
const mapRowToCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  parentId: row.parent_id,
  sort: row.sort,
  createdAt: row.created_at,
});

export class CategoryModel {
  // Find category by ID
  static async findById(id: string): Promise<Category | null> {
    const rows = await query<CategoryRow[]>('SELECT * FROM categories WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToCategory(rows[0]) : null;
  }

  // Get all top-level categories (no parent)
  static async findTopLevel(): Promise<Category[]> {
    const rows = await query<CategoryRow[]>(
      'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort ASC, created_at ASC'
    );
    return rows.map(mapRowToCategory);
  }

  // Get children of a category
  static async findChildren(parentId: string): Promise<Category[]> {
    const rows = await query<CategoryRow[]>(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY sort ASC, created_at ASC',
      [parentId]
    );
    return rows.map(mapRowToCategory);
  }

  // Get all categories
  static async findAll(): Promise<Category[]> {
    const rows = await query<CategoryRow[]>(
      'SELECT * FROM categories ORDER BY sort ASC, created_at ASC'
    );
    return rows.map(mapRowToCategory);
  }

  // Get category tree (top-level with children)
  static async getCategoryTree(): Promise<Category[]> {
    const allCategories = await this.findAll();
    const categoryMap = new Map<string, Category>();
    const topLevel: Category[] = [];

    // First pass: create map of all categories
    for (const category of allCategories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    // Second pass: build tree structure
    for (const category of allCategories) {
      const categoryWithChildren = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(categoryWithChildren);
        }
      } else {
        topLevel.push(categoryWithChildren);
      }
    }

    return topLevel;
  }

  // Create new category
  static async create(data: CreateCategoryDTO): Promise<Category> {
    const id = uuidv4();
    await execute(
      `INSERT INTO categories (id, name, icon, parent_id, sort) VALUES (?, ?, ?, ?, ?)`,
      [id, data.name, data.icon || null, data.parentId || null, data.sort || 0]
    );
    const category = await this.findById(id);
    if (!category) {
      throw new Error('Failed to create category');
    }
    return category;
  }

  // Update category
  static async update(id: string, data: UpdateCategoryDTO): Promise<Category | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

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
    await execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Delete category
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Check if category has products
  static async hasProducts(id: string): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );
    return rows[0].count > 0;
  }

  // Check if category has children
  static async hasChildren(id: string): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [id]
    );
    return rows[0].count > 0;
  }
}
