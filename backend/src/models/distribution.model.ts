import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Commission status enum
export enum CommissionStatus {
  PENDING = 'pending',      // Waiting for order completion
  CONFIRMED = 'confirmed',  // Order completed, commission confirmed
  SETTLED = 'settled',      // Commission settled to user balance
  CANCELLED = 'cancelled',  // Order cancelled/refunded
}

// Withdrawal status enum
export enum WithdrawalStatus {
  PENDING = 'pending',      // Waiting for review
  APPROVED = 'approved',    // Approved, processing
  COMPLETED = 'completed',  // Withdrawal completed
  REJECTED = 'rejected',    // Rejected
}

// Commission interface
export interface Commission {
  id: string;
  userId: string;
  orderId: string;
  orderNo: string;
  productId: string;
  productName: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Withdrawal interface
export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: WithdrawalStatus;
  rejectReason: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Commission row from database
interface CommissionRow extends RowDataPacket {
  id: string;
  user_id: string;
  order_id: string;
  order_no: string;
  product_id: string;
  product_name: string;
  order_amount: string;
  commission_rate: string;
  commission_amount: string;
  status: CommissionStatus;
  settled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Withdrawal row from database
interface WithdrawalRow extends RowDataPacket {
  id: string;
  user_id: string;
  amount: string;
  status: WithdrawalStatus;
  reject_reason: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}


// DTO for creating commission
export interface CreateCommissionDTO {
  userId: string;
  orderId: string;
  orderNo: string;
  productId: string;
  productName: string;
  orderAmount: number;
  commissionRate: number;
}

// DTO for creating withdrawal
export interface CreateWithdrawalDTO {
  userId: string;
  amount: number;
}

// Query parameters for commission list
export interface CommissionQuery {
  userId?: string;
  status?: CommissionStatus;
  page?: number;
  pageSize?: number;
}

// Query parameters for withdrawal list
export interface WithdrawalQuery {
  userId?: string;
  status?: WithdrawalStatus;
  page?: number;
  pageSize?: number;
}

// Map database row to Commission object
const mapRowToCommission = (row: CommissionRow): Commission => ({
  id: row.id,
  userId: row.user_id,
  orderId: row.order_id,
  orderNo: row.order_no,
  productId: row.product_id,
  productName: row.product_name,
  orderAmount: parseFloat(row.order_amount),
  commissionRate: parseFloat(row.commission_rate),
  commissionAmount: parseFloat(row.commission_amount),
  status: row.status,
  settledAt: row.settled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to Withdrawal object
const mapRowToWithdrawal = (row: WithdrawalRow): Withdrawal => ({
  id: row.id,
  userId: row.user_id,
  amount: parseFloat(row.amount),
  status: row.status,
  rejectReason: row.reject_reason,
  processedAt: row.processed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});


export class CommissionModel {
  // Find commission by ID
  static async findById(id: string): Promise<Commission | null> {
    const rows = await query<CommissionRow[]>('SELECT * FROM commissions WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToCommission(rows[0]) : null;
  }

  // Find commissions by user ID with pagination
  static async findByUser(queryParams: CommissionQuery): Promise<{ items: Commission[]; total: number }> {
    const { userId, status, page = 1, pageSize = 20 } = queryParams;
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM commissions ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<CommissionRow[]>(
      `SELECT * FROM commissions ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToCommission),
      total,
    };
  }

  // Create new commission
  static async create(data: CreateCommissionDTO): Promise<Commission> {
    const id = uuidv4();
    const commissionAmount = data.orderAmount * data.commissionRate;

    await execute(
      `INSERT INTO commissions (id, user_id, order_id, order_no, product_id, product_name, 
       order_amount, commission_rate, commission_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.orderId,
        data.orderNo,
        data.productId,
        data.productName,
        data.orderAmount,
        data.commissionRate,
        commissionAmount,
        CommissionStatus.PENDING,
      ]
    );

    const commission = await this.findById(id);
    if (!commission) {
      throw new Error('Failed to create commission');
    }
    return commission;
  }

  // Update commission status
  static async updateStatus(id: string, status: CommissionStatus): Promise<Commission | null> {
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (status === CommissionStatus.SETTLED) {
      updates.push('settled_at = NOW()');
    }

    values.push(id);
    await execute(`UPDATE commissions SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Get total earnings for a user
  static async getTotalEarnings(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(commission_amount), 0) as total 
       FROM commissions 
       WHERE user_id = ? AND status IN (?, ?)`,
      [userId, CommissionStatus.CONFIRMED, CommissionStatus.SETTLED]
    );
    return parseFloat(rows[0].total as string) || 0;
  }

  // Get pending earnings for a user (not yet confirmed)
  static async getPendingEarnings(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(commission_amount), 0) as total 
       FROM commissions 
       WHERE user_id = ? AND status = ?`,
      [userId, CommissionStatus.PENDING]
    );
    return parseFloat(rows[0].total as string) || 0;
  }

  // Get withdrawable earnings for a user (confirmed but not settled)
  static async getWithdrawableEarnings(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(commission_amount), 0) as total 
       FROM commissions 
       WHERE user_id = ? AND status = ?`,
      [userId, CommissionStatus.CONFIRMED]
    );
    return parseFloat(rows[0].total as string) || 0;
  }

  // Get settled earnings for a user
  static async getSettledEarnings(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(commission_amount), 0) as total 
       FROM commissions 
       WHERE user_id = ? AND status = ?`,
      [userId, CommissionStatus.SETTLED]
    );
    return parseFloat(rows[0].total as string) || 0;
  }

  // Find commission by order ID
  static async findByOrderId(orderId: string): Promise<Commission | null> {
    const rows = await query<CommissionRow[]>(
      'SELECT * FROM commissions WHERE order_id = ?',
      [orderId]
    );
    return rows.length > 0 ? mapRowToCommission(rows[0]) : null;
  }
}


export class WithdrawalModel {
  // Find withdrawal by ID
  static async findById(id: string): Promise<Withdrawal | null> {
    const rows = await query<WithdrawalRow[]>('SELECT * FROM withdrawals WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToWithdrawal(rows[0]) : null;
  }

  // Find withdrawals by user ID with pagination
  static async findByUser(queryParams: WithdrawalQuery): Promise<{ items: Withdrawal[]; total: number }> {
    const { userId, status, page = 1, pageSize = 20 } = queryParams;
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM withdrawals ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<WithdrawalRow[]>(
      `SELECT * FROM withdrawals ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToWithdrawal),
      total,
    };
  }

  // Create new withdrawal
  static async create(data: CreateWithdrawalDTO): Promise<Withdrawal> {
    const id = uuidv4();

    await execute(
      `INSERT INTO withdrawals (id, user_id, amount, status)
       VALUES (?, ?, ?, ?)`,
      [id, data.userId, data.amount, WithdrawalStatus.PENDING]
    );

    const withdrawal = await this.findById(id);
    if (!withdrawal) {
      throw new Error('Failed to create withdrawal');
    }
    return withdrawal;
  }

  // Update withdrawal status
  static async updateStatus(
    id: string,
    status: WithdrawalStatus,
    rejectReason?: string
  ): Promise<Withdrawal | null> {
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (status === WithdrawalStatus.COMPLETED || status === WithdrawalStatus.REJECTED) {
      updates.push('processed_at = NOW()');
    }

    if (rejectReason && status === WithdrawalStatus.REJECTED) {
      updates.push('reject_reason = ?');
      values.push(rejectReason);
    }

    values.push(id);
    await execute(`UPDATE withdrawals SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Get total withdrawn amount for a user
  static async getTotalWithdrawn(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM withdrawals 
       WHERE user_id = ? AND status = ?`,
      [userId, WithdrawalStatus.COMPLETED]
    );
    return parseFloat(rows[0].total as string) || 0;
  }

  // Get pending withdrawal amount for a user
  static async getPendingWithdrawal(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM withdrawals 
       WHERE user_id = ? AND status IN (?, ?)`,
      [userId, WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED]
    );
    return parseFloat(rows[0].total as string) || 0;
  }
}
