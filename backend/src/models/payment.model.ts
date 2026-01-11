import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CLOSED = 'closed',
}

// Payment method enum
export enum PaymentMethod {
  WECHAT = 'wechat',
  BALANCE = 'balance',
}

// Refund status enum
export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

// Payment interface
export interface Payment {
  id: string;
  paymentNo: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Refund interface
export interface Refund {
  id: string;
  refundNo: string;
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  transactionId: string | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Payment row from database
interface PaymentRow extends RowDataPacket {
  id: string;
  payment_no: string;
  order_id: string;
  user_id: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}


// Refund row from database
interface RefundRow extends RowDataPacket {
  id: string;
  refund_no: string;
  payment_id: string;
  order_id: string;
  user_id: string;
  amount: string;
  reason: string | null;
  status: RefundStatus;
  transaction_id: string | null;
  refunded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating payment
export interface CreatePaymentDTO {
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
}

// DTO for creating refund
export interface CreateRefundDTO {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  reason?: string;
}

// WeChat pay params for frontend
export interface WxPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

// Payment info response
export interface PaymentInfo {
  orderId: string;
  paymentNo: string;
  amount: number;
  wxPayParams?: WxPayParams;
}

// Generate payment number
const generatePaymentNo = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PAY${year}${month}${day}${hours}${minutes}${seconds}${random}`;
};

// Generate refund number
const generateRefundNo = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REF${year}${month}${day}${hours}${minutes}${seconds}${random}`;
};


// Map database row to Payment object
const mapRowToPayment = (row: PaymentRow): Payment => ({
  id: row.id,
  paymentNo: row.payment_no,
  orderId: row.order_id,
  userId: row.user_id,
  amount: parseFloat(row.amount),
  method: row.method,
  status: row.status,
  transactionId: row.transaction_id,
  paidAt: row.paid_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to Refund object
const mapRowToRefund = (row: RefundRow): Refund => ({
  id: row.id,
  refundNo: row.refund_no,
  paymentId: row.payment_id,
  orderId: row.order_id,
  userId: row.user_id,
  amount: parseFloat(row.amount),
  reason: row.reason,
  status: row.status,
  transactionId: row.transaction_id,
  refundedAt: row.refunded_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class PaymentModel {
  // Find payment by ID
  static async findById(id: string): Promise<Payment | null> {
    const rows = await query<PaymentRow[]>('SELECT * FROM payments WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToPayment(rows[0]) : null;
  }

  // Find payment by payment number
  static async findByPaymentNo(paymentNo: string): Promise<Payment | null> {
    const rows = await query<PaymentRow[]>('SELECT * FROM payments WHERE payment_no = ?', [paymentNo]);
    return rows.length > 0 ? mapRowToPayment(rows[0]) : null;
  }

  // Find payment by order ID
  static async findByOrderId(orderId: string): Promise<Payment | null> {
    const rows = await query<PaymentRow[]>(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    return rows.length > 0 ? mapRowToPayment(rows[0]) : null;
  }

  // Find payments by user ID
  static async findByUserId(userId: string, page = 1, pageSize = 20): Promise<{ items: Payment[]; total: number }> {
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM payments WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total as number;

    const offset = (page - 1) * pageSize;
    const rows = await query<PaymentRow[]>(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToPayment),
      total,
    };
  }


  // Create new payment
  static async create(data: CreatePaymentDTO): Promise<Payment> {
    const id = uuidv4();
    const paymentNo = generatePaymentNo();

    await execute(
      `INSERT INTO payments (id, payment_no, order_id, user_id, amount, method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, paymentNo, data.orderId, data.userId, data.amount, data.method, PaymentStatus.PENDING]
    );

    const payment = await this.findById(id);
    if (!payment) {
      throw new Error('Failed to create payment');
    }
    return payment;
  }

  // Update payment status
  static async updateStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string
  ): Promise<Payment | null> {
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (transactionId) {
      updates.push('transaction_id = ?');
      values.push(transactionId);
    }

    if (status === PaymentStatus.SUCCESS) {
      updates.push('paid_at = NOW()');
    }

    values.push(id);
    await execute(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Mark payment as success
  static async markSuccess(id: string, transactionId: string): Promise<Payment | null> {
    return this.updateStatus(id, PaymentStatus.SUCCESS, transactionId);
  }

  // Mark payment as failed
  static async markFailed(id: string): Promise<Payment | null> {
    return this.updateStatus(id, PaymentStatus.FAILED);
  }

  // Close payment
  static async close(id: string): Promise<Payment | null> {
    return this.updateStatus(id, PaymentStatus.CLOSED);
  }
}


export class RefundModel {
  // Find refund by ID
  static async findById(id: string): Promise<Refund | null> {
    const rows = await query<RefundRow[]>('SELECT * FROM refunds WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToRefund(rows[0]) : null;
  }

  // Find refund by refund number
  static async findByRefundNo(refundNo: string): Promise<Refund | null> {
    const rows = await query<RefundRow[]>('SELECT * FROM refunds WHERE refund_no = ?', [refundNo]);
    return rows.length > 0 ? mapRowToRefund(rows[0]) : null;
  }

  // Find refunds by order ID
  static async findByOrderId(orderId: string): Promise<Refund[]> {
    const rows = await query<RefundRow[]>(
      'SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC',
      [orderId]
    );
    return rows.map(mapRowToRefund);
  }

  // Find refunds by payment ID
  static async findByPaymentId(paymentId: string): Promise<Refund[]> {
    const rows = await query<RefundRow[]>(
      'SELECT * FROM refunds WHERE payment_id = ? ORDER BY created_at DESC',
      [paymentId]
    );
    return rows.map(mapRowToRefund);
  }

  // Find refunds by user ID
  static async findByUserId(userId: string, page = 1, pageSize = 20): Promise<{ items: Refund[]; total: number }> {
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM refunds WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total as number;

    const offset = (page - 1) * pageSize;
    const rows = await query<RefundRow[]>(
      'SELECT * FROM refunds WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToRefund),
      total,
    };
  }

  // Create new refund
  static async create(data: CreateRefundDTO): Promise<Refund> {
    const id = uuidv4();
    const refundNo = generateRefundNo();

    await execute(
      `INSERT INTO refunds (id, refund_no, payment_id, order_id, user_id, amount, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, refundNo, data.paymentId, data.orderId, data.userId, data.amount, data.reason || null, RefundStatus.PENDING]
    );

    const refund = await this.findById(id);
    if (!refund) {
      throw new Error('Failed to create refund');
    }
    return refund;
  }

  // Update refund status
  static async updateStatus(
    id: string,
    status: RefundStatus,
    transactionId?: string
  ): Promise<Refund | null> {
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (transactionId) {
      updates.push('transaction_id = ?');
      values.push(transactionId);
    }

    if (status === RefundStatus.SUCCESS) {
      updates.push('refunded_at = NOW()');
    }

    values.push(id);
    await execute(`UPDATE refunds SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Mark refund as processing
  static async markProcessing(id: string): Promise<Refund | null> {
    return this.updateStatus(id, RefundStatus.PROCESSING);
  }

  // Mark refund as success
  static async markSuccess(id: string, transactionId: string): Promise<Refund | null> {
    return this.updateStatus(id, RefundStatus.SUCCESS, transactionId);
  }

  // Mark refund as failed
  static async markFailed(id: string): Promise<Refund | null> {
    return this.updateStatus(id, RefundStatus.FAILED);
  }
}
