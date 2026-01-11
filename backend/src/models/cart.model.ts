import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// CartItem interface
export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  skuId: string | null;
  quantity: number;
  selected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// CartItem with product details for display
export interface CartItemWithProduct extends CartItem {
  productName: string;
  productImage: string;
  price: number;
  stock: number;
  specValues: Record<string, string> | null;
  productStatus: string;
}

// Cart row from database
interface CartItemRow extends RowDataPacket {
  id: string;
  user_id: string;
  product_id: string;
  sku_id: string | null;
  quantity: number;
  selected: number;
  created_at: Date;
  updated_at: Date;
}

// Cart row with product details
interface CartItemWithProductRow extends CartItemRow {
  product_name: string;
  product_image: string;
  price: string;
  stock: number;
  spec_values: string | null;
  product_status: string;
}

// DTO for adding item to cart
export interface AddToCartDTO {
  productId: string;
  skuId?: string;
  quantity: number;
}

// DTO for updating cart item
export interface UpdateCartItemDTO {
  quantity?: number;
  selected?: boolean;
}


// Parse JSON safely
const parseJSON = <T>(value: string | null, defaultValue: T): T => {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
};

// Map database row to CartItem object
const mapRowToCartItem = (row: CartItemRow): CartItem => ({
  id: row.id,
  userId: row.user_id,
  productId: row.product_id,
  skuId: row.sku_id,
  quantity: row.quantity,
  selected: row.selected === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to CartItemWithProduct object
const mapRowToCartItemWithProduct = (row: CartItemWithProductRow): CartItemWithProduct => ({
  id: row.id,
  userId: row.user_id,
  productId: row.product_id,
  skuId: row.sku_id,
  quantity: row.quantity,
  selected: row.selected === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  productName: row.product_name,
  productImage: row.product_image,
  price: parseFloat(row.price),
  stock: row.stock,
  specValues: parseJSON<Record<string, string> | null>(row.spec_values, null),
  productStatus: row.product_status,
});

export class CartModel {
  // Find cart item by ID
  static async findById(id: string): Promise<CartItem | null> {
    const rows = await query<CartItemRow[]>('SELECT * FROM cart_items WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToCartItem(rows[0]) : null;
  }

  // Find cart item by user, product, and SKU
  static async findByUserProductSku(
    userId: string,
    productId: string,
    skuId: string | null
  ): Promise<CartItem | null> {
    const sql = skuId
      ? 'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND sku_id = ?'
      : 'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND sku_id IS NULL';
    const params = skuId ? [userId, productId, skuId] : [userId, productId];
    const rows = await query<CartItemRow[]>(sql, params);
    return rows.length > 0 ? mapRowToCartItem(rows[0]) : null;
  }

  // Get all cart items for a user with product details
  static async findByUserId(userId: string): Promise<CartItemWithProduct[]> {
    const sql = `
      SELECT 
        ci.id, ci.user_id, ci.product_id, ci.sku_id, ci.quantity, ci.selected,
        ci.created_at, ci.updated_at,
        p.name as product_name, p.main_image as product_image, p.status as product_status,
        COALESCE(ps.price, p.price) as price,
        COALESCE(ps.stock, p.stock) as stock,
        ps.spec_values
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_skus ps ON ci.sku_id = ps.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `;
    const rows = await query<CartItemWithProductRow[]>(sql, [userId]);
    return rows.map(mapRowToCartItemWithProduct);
  }


  // Get cart item count for a user
  static async getCount(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ?',
      [userId]
    );
    return rows[0]?.total || 0;
  }

  // Get selected cart items count
  static async getSelectedCount(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ? AND selected = TRUE',
      [userId]
    );
    return rows[0]?.total || 0;
  }

  // Add item to cart
  static async create(userId: string, data: AddToCartDTO): Promise<CartItem> {
    const id = uuidv4();
    await execute(
      `INSERT INTO cart_items (id, user_id, product_id, sku_id, quantity, selected)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [id, userId, data.productId, data.skuId || null, data.quantity]
    );
    const cartItem = await this.findById(id);
    if (!cartItem) {
      throw new Error('Failed to create cart item');
    }
    return cartItem;
  }

  // Update cart item quantity
  static async updateQuantity(id: string, quantity: number): Promise<CartItem | null> {
    await execute('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, id]);
    return this.findById(id);
  }

  // Update cart item selection
  static async updateSelected(id: string, selected: boolean): Promise<CartItem | null> {
    await execute('UPDATE cart_items SET selected = ? WHERE id = ?', [selected, id]);
    return this.findById(id);
  }

  // Update cart item
  static async update(id: string, data: UpdateCartItemDTO): Promise<CartItem | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(data.quantity);
    }
    if (data.selected !== undefined) {
      updates.push('selected = ?');
      values.push(data.selected);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await execute(`UPDATE cart_items SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Delete cart item
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM cart_items WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Clear all cart items for a user
  static async clearByUserId(userId: string): Promise<boolean> {
    const result = await execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    return result.affectedRows > 0;
  }

  // Delete selected cart items for a user
  static async deleteSelectedByUserId(userId: string): Promise<boolean> {
    const result = await execute(
      'DELETE FROM cart_items WHERE user_id = ? AND selected = TRUE',
      [userId]
    );
    return result.affectedRows > 0;
  }

  // Select/deselect all cart items for a user
  static async selectAll(userId: string, selected: boolean): Promise<boolean> {
    const result = await execute(
      'UPDATE cart_items SET selected = ? WHERE user_id = ?',
      [selected, userId]
    );
    return result.affectedRows > 0;
  }

  // Increment quantity of existing cart item
  static async incrementQuantity(id: string, quantity: number): Promise<CartItem | null> {
    await execute('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, id]);
    return this.findById(id);
  }
}
