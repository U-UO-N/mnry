import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Exchange item type enum
export enum ExchangeItemType {
  PRODUCT = 'product',
  COUPON = 'coupon',
}

// Exchange order status enum
export enum ExchangeOrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Exchange item interface
export interface ExchangeItem {
  id: string;
  name: string;
  image: string;
  pointsCost: number;
  stock: number;
  type: ExchangeItemType;
  relatedId: string | null;
  description: string | null;
  isActive: boolean;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
}

// Exchange order interface
export interface ExchangeOrder {
  id: string;
  orderNo: string;
  userId: string;
  itemId: string;
  itemName: string;
  pointsCost: number;
  status: ExchangeOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Database row types
interface ExchangeItemRow extends RowDataPacket {
  id: string;
  name: string;
  image: string;
  points_cost: number;
  stock: number;
  type: ExchangeItemType;
  related_id: string | null;
  description: string | null;
  is_active: number;
  sort: number;
  created_at: Date;
  updated_at: Date;
}

interface ExchangeOrderRow extends RowDataPacket {
  id: string;
  order_no: string;
  user_id: string;
  item_id: string;
  item_name: string;
  points_cost: number;
  status: ExchangeOrderStatus;
  created_at: Date;
  updated_at: Date;
}

// DTOs
export interface CreateExchangeItemDTO {
  name: string;
  image: string;
  pointsCost: number;
  stock: number;
  type: ExchangeItemType;
  relatedId?: string;
  description?: string;
}

export interface CreateExchangeOrderDTO {
  userId: string;
  itemId: string;
  itemName: string;
  pointsCost: number;
}

// Map functions
const mapRowToExchangeItem = (row: ExchangeItemRow): ExchangeItem => ({
  id: row.id,
  name: row.name,
  image: row.image,
  pointsCost: row.points_cost,
  stock: row.stock,
  type: row.type,
  relatedId: row.related_id,
  description: row.description,
  isActive: row.is_active === 1,
  sort: row.sort,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRowToExchangeOrder = (row: ExchangeOrderRow): ExchangeOrder => ({
  id: row.id,
  orderNo: row.order_no,
  userId: row.user_id,
  itemId: row.item_id,
  itemName: row.item_name,
  pointsCost: row.points_cost,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Generate order number
const generateOrderNo = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EX${timestamp}${random}`;
};

// Exchange Item Model
export class ExchangeItemModel {
  static async findById(id: string): Promise<ExchangeItem | null> {
    const rows = await query<ExchangeItemRow[]>('SELECT * FROM exchange_items WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToExchangeItem(rows[0]) : null;
  }

  static async findActive(): Promise<ExchangeItem[]> {
    const rows = await query<ExchangeItemRow[]>(
      'SELECT * FROM exchange_items WHERE is_active = 1 ORDER BY sort ASC, created_at DESC'
    );
    return rows.map(mapRowToExchangeItem);
  }

  static async findAll(): Promise<ExchangeItem[]> {
    const rows = await query<ExchangeItemRow[]>(
      'SELECT * FROM exchange_items ORDER BY sort ASC, created_at DESC'
    );
    return rows.map(mapRowToExchangeItem);
  }

  static async create(data: CreateExchangeItemDTO): Promise<ExchangeItem> {
    const id = uuidv4();
    await execute(
      `INSERT INTO exchange_items (id, name, image, points_cost, stock, type, related_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.image, data.pointsCost, data.stock, data.type, data.relatedId || null, data.description || null]
    );
    const item = await this.findById(id);
    if (!item) throw new Error('Failed to create exchange item');
    return item;
  }

  static async decrementStock(id: string): Promise<void> {
    await execute('UPDATE exchange_items SET stock = stock - 1 WHERE id = ? AND stock > 0', [id]);
  }

  static async updateStock(id: string, stock: number): Promise<void> {
    await execute('UPDATE exchange_items SET stock = ? WHERE id = ?', [stock, id]);
  }
}

// Exchange Order Model
export class ExchangeOrderModel {
  static async findById(id: string): Promise<ExchangeOrder | null> {
    const rows = await query<ExchangeOrderRow[]>('SELECT * FROM exchange_orders WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToExchangeOrder(rows[0]) : null;
  }

  static async findByOrderNo(orderNo: string): Promise<ExchangeOrder | null> {
    const rows = await query<ExchangeOrderRow[]>('SELECT * FROM exchange_orders WHERE order_no = ?', [orderNo]);
    return rows.length > 0 ? mapRowToExchangeOrder(rows[0]) : null;
  }

  static async findByUser(userId: string, page: number = 1, pageSize: number = 20): Promise<{ items: ExchangeOrder[]; total: number }> {
    // Get total count
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM exchange_orders WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<ExchangeOrderRow[]>(
      'SELECT * FROM exchange_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToExchangeOrder),
      total,
    };
  }

  static async create(data: CreateExchangeOrderDTO): Promise<ExchangeOrder> {
    const id = uuidv4();
    const orderNo = generateOrderNo();
    await execute(
      `INSERT INTO exchange_orders (id, order_no, user_id, item_id, item_name, points_cost, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, orderNo, data.userId, data.itemId, data.itemName, data.pointsCost, ExchangeOrderStatus.COMPLETED]
    );
    const order = await this.findById(id);
    if (!order) throw new Error('Failed to create exchange order');
    return order;
  }

  static async updateStatus(id: string, status: ExchangeOrderStatus): Promise<ExchangeOrder | null> {
    await execute('UPDATE exchange_orders SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }
}
