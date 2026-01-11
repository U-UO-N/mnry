import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Order status enum
export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PENDING_SHIPMENT = 'pending_shipment',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDING = 'refunding',
  REFUNDED = 'refunded',
}

// Address snapshot interface
export interface AddressSnapshot {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
}

// Order interface
export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  payAmount: number;
  discountAmount: number;
  pointsUsed: number;
  balanceUsed: number;
  couponId: string | null;
  addressSnapshot: AddressSnapshot;
  remark: string | null;
  createdAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  completedAt: Date | null;
}

// Order item interface
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  skuId: string | null;
  productName: string;
  productImage: string;
  specValues: Record<string, string> | null;
  price: number;
  quantity: number;
  createdAt: Date;
}


// Logistics interface
export interface Logistics {
  id: string;
  orderId: string;
  company: string;
  trackingNo: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Order with items for detail view
export interface OrderDetail extends Order {
  items: OrderItem[];
  logistics: Logistics | null;
}

// Order row from database
interface OrderRow extends RowDataPacket {
  id: string;
  order_no: string;
  user_id: string;
  status: OrderStatus;
  total_amount: string;
  pay_amount: string;
  discount_amount: string;
  points_used: number;
  balance_used: string;
  coupon_id: string | null;
  address_snapshot: string;
  remark: string | null;
  created_at: Date;
  paid_at: Date | null;
  shipped_at: Date | null;
  completed_at: Date | null;
}

// Order item row from database
interface OrderItemRow extends RowDataPacket {
  id: string;
  order_id: string;
  product_id: string;
  sku_id: string | null;
  product_name: string;
  product_image: string;
  spec_values: string | null;
  price: string;
  quantity: number;
  created_at: Date;
}

// Logistics row from database
interface LogisticsRow extends RowDataPacket {
  id: string;
  order_id: string;
  company: string;
  tracking_no: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}


// DTO for creating order
export interface CreateOrderDTO {
  userId: string;
  items: CreateOrderItemDTO[];
  addressSnapshot: AddressSnapshot;
  couponId?: string;
  pointsUsed?: number;
  balanceUsed?: number;
  remark?: string;
}

// DTO for creating order item
export interface CreateOrderItemDTO {
  productId: string;
  skuId?: string;
  productName: string;
  productImage: string;
  specValues?: Record<string, string>;
  price: number;
  quantity: number;
}

// DTO for creating logistics
export interface CreateLogisticsDTO {
  orderId: string;
  company: string;
  trackingNo: string;
}

// Query parameters for order list
export interface OrderQuery {
  userId?: string;
  status?: OrderStatus;
  orderNo?: string;
  page?: number;
  pageSize?: number;
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

// Generate order number
const generateOrderNo = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`;
};


// Map database row to Order object
const mapRowToOrder = (row: OrderRow): Order => ({
  id: row.id,
  orderNo: row.order_no,
  userId: row.user_id,
  status: row.status,
  totalAmount: parseFloat(row.total_amount),
  payAmount: parseFloat(row.pay_amount),
  discountAmount: parseFloat(row.discount_amount),
  pointsUsed: row.points_used,
  balanceUsed: parseFloat(row.balance_used),
  couponId: row.coupon_id,
  addressSnapshot: parseJSON<AddressSnapshot>(row.address_snapshot, {
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    address: '',
  }),
  remark: row.remark,
  createdAt: row.created_at,
  paidAt: row.paid_at,
  shippedAt: row.shipped_at,
  completedAt: row.completed_at,
});

// Map database row to OrderItem object
const mapRowToOrderItem = (row: OrderItemRow): OrderItem => ({
  id: row.id,
  orderId: row.order_id,
  productId: row.product_id,
  skuId: row.sku_id,
  productName: row.product_name,
  productImage: row.product_image,
  specValues: parseJSON<Record<string, string> | null>(row.spec_values, null),
  price: parseFloat(row.price),
  quantity: row.quantity,
  createdAt: row.created_at,
});

// Map database row to Logistics object
const mapRowToLogistics = (row: LogisticsRow): Logistics => ({
  id: row.id,
  orderId: row.order_id,
  company: row.company,
  trackingNo: row.tracking_no,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});


export class OrderModel {
  // Find order by ID
  static async findById(id: string): Promise<Order | null> {
    const rows = await query<OrderRow[]>('SELECT * FROM orders WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToOrder(rows[0]) : null;
  }

  // Find order by order number
  static async findByOrderNo(orderNo: string): Promise<Order | null> {
    const rows = await query<OrderRow[]>('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
    return rows.length > 0 ? mapRowToOrder(rows[0]) : null;
  }

  // Get order detail with items and logistics
  static async getDetail(id: string): Promise<OrderDetail | null> {
    const order = await this.findById(id);
    if (!order) return null;

    const items = await OrderItemModel.findByOrderId(id);
    const logistics = await LogisticsModel.findByOrderId(id);

    return {
      ...order,
      items,
      logistics,
    };
  }

  // Get orders with pagination and filters
  static async findMany(queryParams: OrderQuery): Promise<{ items: Order[]; total: number }> {
    const { userId, status, orderNo, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (userId) {
      conditions.push('user_id = ?');
      values.push(userId);
    }

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    if (orderNo) {
      conditions.push('order_no LIKE ?');
      values.push(`%${orderNo}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM orders ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<OrderRow[]>(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToOrder),
      total,
    };
  }


  // Create new order
  static async create(data: CreateOrderDTO): Promise<Order> {
    const id = uuidv4();
    const orderNo = generateOrderNo();

    // Calculate amounts
    const totalAmount = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const pointsDiscount = (data.pointsUsed || 0) / 100; // 100 points = 1 yuan
    const balanceDiscount = data.balanceUsed || 0;
    const discountAmount = pointsDiscount + balanceDiscount;
    const payAmount = Math.max(0, totalAmount - discountAmount);

    await execute(
      `INSERT INTO orders (id, order_no, user_id, status, total_amount, pay_amount, discount_amount, 
       points_used, balance_used, coupon_id, address_snapshot, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        orderNo,
        data.userId,
        OrderStatus.PENDING_PAYMENT,
        totalAmount,
        payAmount,
        discountAmount,
        data.pointsUsed || 0,
        data.balanceUsed || 0,
        data.couponId || null,
        JSON.stringify(data.addressSnapshot),
        data.remark || null,
      ]
    );

    // Create order items
    for (const item of data.items) {
      await OrderItemModel.create({
        orderId: id,
        ...item,
      });
    }

    const order = await this.findById(id);
    if (!order) {
      throw new Error('Failed to create order');
    }
    return order;
  }

  // Update order status
  static async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    // Set timestamp based on status
    if (status === OrderStatus.PENDING_SHIPMENT) {
      updates.push('paid_at = NOW()');
    } else if (status === OrderStatus.SHIPPED) {
      updates.push('shipped_at = NOW()');
    } else if (status === OrderStatus.COMPLETED) {
      updates.push('completed_at = NOW()');
    }

    values.push(id);
    await execute(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Cancel order
  static async cancel(id: string): Promise<Order | null> {
    return this.updateStatus(id, OrderStatus.CANCELLED);
  }

  // Delete order
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM orders WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Get order items by order ID
  static async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return OrderItemModel.findByOrderId(orderId);
  }
}


export class OrderItemModel {
  // Find order item by ID
  static async findById(id: string): Promise<OrderItem | null> {
    const rows = await query<OrderItemRow[]>('SELECT * FROM order_items WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToOrderItem(rows[0]) : null;
  }

  // Find order items by order ID
  static async findByOrderId(orderId: string): Promise<OrderItem[]> {
    const rows = await query<OrderItemRow[]>(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    return rows.map(mapRowToOrderItem);
  }

  // Create new order item
  static async create(data: CreateOrderItemDTO & { orderId: string }): Promise<OrderItem> {
    const id = uuidv4();
    await execute(
      `INSERT INTO order_items (id, order_id, product_id, sku_id, product_name, product_image, spec_values, price, quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.orderId,
        data.productId,
        data.skuId || null,
        data.productName,
        data.productImage,
        data.specValues ? JSON.stringify(data.specValues) : null,
        data.price,
        data.quantity,
      ]
    );
    const item = await this.findById(id);
    if (!item) {
      throw new Error('Failed to create order item');
    }
    return item;
  }

  // Delete order items by order ID
  static async deleteByOrderId(orderId: string): Promise<boolean> {
    const result = await execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    return result.affectedRows > 0;
  }
}


export class LogisticsModel {
  // Find logistics by ID
  static async findById(id: string): Promise<Logistics | null> {
    const rows = await query<LogisticsRow[]>('SELECT * FROM logistics WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToLogistics(rows[0]) : null;
  }

  // Find logistics by order ID
  static async findByOrderId(orderId: string): Promise<Logistics | null> {
    const rows = await query<LogisticsRow[]>(
      'SELECT * FROM logistics WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    return rows.length > 0 ? mapRowToLogistics(rows[0]) : null;
  }

  // Create new logistics record
  static async create(data: CreateLogisticsDTO): Promise<Logistics> {
    const id = uuidv4();
    await execute(
      `INSERT INTO logistics (id, order_id, company, tracking_no, status)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.orderId, data.company, data.trackingNo, 'shipped']
    );
    const logistics = await this.findById(id);
    if (!logistics) {
      throw new Error('Failed to create logistics');
    }
    return logistics;
  }

  // Update logistics status
  static async updateStatus(id: string, status: string): Promise<Logistics | null> {
    await execute('UPDATE logistics SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  // Delete logistics by order ID
  static async deleteByOrderId(orderId: string): Promise<boolean> {
    const result = await execute('DELETE FROM logistics WHERE order_id = ?', [orderId]);
    return result.affectedRows > 0;
  }
}
