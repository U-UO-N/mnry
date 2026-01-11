import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Coupon type enum
export enum CouponType {
  FIXED = 'fixed', // 满减
  PERCENT = 'percent', // 折扣
}

// Coupon status enum
export enum CouponStatus {
  AVAILABLE = 'available',
  USED = 'used',
  EXPIRED = 'expired',
}

// Record type enum for points and balance
export enum RecordType {
  // Points record types
  CHECK_IN = 'check_in',
  PURCHASE = 'purchase',
  EXCHANGE = 'exchange',
  REFUND = 'refund',
  ADMIN_ADJUST = 'admin_adjust',
  REVIEW = 'review',        // 评价获得积分
  SHARE = 'share',          // 分享获得积分
  INVITE = 'invite',        // 邀请好友获得积分
  ORDER_USE = 'order_use',  // 订单使用积分抵扣
  MILESTONE = 'milestone',  // 里程碑奖励
  // Balance record types
  RECHARGE = 'recharge',
  PAYMENT = 'payment',
  WITHDRAW = 'withdraw',
  COMMISSION = 'commission',
}

// Coupon interface
export interface Coupon {
  id: string;
  name: string;
  type: CouponType;
  value: number;
  minAmount: number;
  totalCount: number;
  usedCount: number;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User coupon interface
export interface UserCoupon {
  id: string;
  userId: string;
  couponId: string;
  status: CouponStatus;
  usedAt: Date | null;
  orderId: string | null;
  createdAt: Date;
  // Joined coupon info
  coupon?: Coupon;
}

// Points record interface
export interface PointsRecord {
  id: string;
  userId: string;
  type: RecordType;
  points: number;
  balance: number;
  description: string;
  relatedId: string | null;
  createdAt: Date;
}

// Balance record interface
export interface BalanceRecord {
  id: string;
  userId: string;
  type: RecordType;
  amount: number;
  balance: number;
  description: string;
  relatedId: string | null;
  createdAt: Date;
}

// Database row types
interface CouponRow extends RowDataPacket {
  id: string;
  name: string;
  type: CouponType;
  value: string;
  min_amount: string;
  total_count: number;
  used_count: number;
  start_time: Date;
  end_time: Date;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

interface UserCouponRow extends RowDataPacket {
  id: string;
  user_id: string;
  coupon_id: string;
  status: CouponStatus;
  used_at: Date | null;
  order_id: string | null;
  created_at: Date;
  // Joined coupon fields
  coupon_name?: string;
  coupon_type?: CouponType;
  coupon_value?: string;
  coupon_min_amount?: string;
  coupon_start_time?: Date;
  coupon_end_time?: Date;
}

interface PointsRecordRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: RecordType;
  points: number;
  balance: number;
  description: string;
  related_id: string | null;
  created_at: Date;
}

interface BalanceRecordRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: RecordType;
  amount: string;
  balance: string;
  description: string;
  related_id: string | null;
  created_at: Date;
}

// DTOs
export interface CreateCouponDTO {
  name: string;
  type: CouponType;
  value: number;
  minAmount: number;
  totalCount: number;
  startTime: Date;
  endTime: Date;
}

export interface CreateUserCouponDTO {
  userId: string;
  couponId: string;
}

export interface CreatePointsRecordDTO {
  userId: string;
  type: RecordType;
  points: number;
  description: string;
  relatedId?: string;
}

export interface CreateBalanceRecordDTO {
  userId: string;
  type: RecordType;
  amount: number;
  description: string;
  relatedId?: string;
}

// Query parameters
export interface UserCouponQuery {
  userId: string;
  status?: CouponStatus;
  page?: number;
  pageSize?: number;
}

export interface RecordQuery {
  userId: string;
  type?: RecordType;
  page?: number;
  pageSize?: number;
}

// Map functions
const mapRowToCoupon = (row: CouponRow): Coupon => ({
  id: row.id,
  name: row.name,
  type: row.type,
  value: parseFloat(row.value),
  minAmount: parseFloat(row.min_amount),
  totalCount: row.total_count,
  usedCount: row.used_count,
  startTime: row.start_time,
  endTime: row.end_time,
  isActive: row.is_active === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRowToUserCoupon = (row: UserCouponRow): UserCoupon => {
  const userCoupon: UserCoupon = {
    id: row.id,
    userId: row.user_id,
    couponId: row.coupon_id,
    status: row.status,
    usedAt: row.used_at,
    orderId: row.order_id,
    createdAt: row.created_at,
  };

  // Add joined coupon info if available
  if (row.coupon_name) {
    userCoupon.coupon = {
      id: row.coupon_id,
      name: row.coupon_name,
      type: row.coupon_type!,
      value: parseFloat(row.coupon_value!),
      minAmount: parseFloat(row.coupon_min_amount!),
      totalCount: 0,
      usedCount: 0,
      startTime: row.coupon_start_time!,
      endTime: row.coupon_end_time!,
      isActive: true,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    };
  }

  return userCoupon;
};

const mapRowToPointsRecord = (row: PointsRecordRow): PointsRecord => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  points: row.points,
  balance: row.balance,
  description: row.description,
  relatedId: row.related_id,
  createdAt: row.created_at,
});

const mapRowToBalanceRecord = (row: BalanceRecordRow): BalanceRecord => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  amount: parseFloat(row.amount),
  balance: parseFloat(row.balance),
  description: row.description,
  relatedId: row.related_id,
  createdAt: row.created_at,
});

// Coupon Model
export class CouponModel {
  static async findById(id: string): Promise<Coupon | null> {
    const rows = await query<CouponRow[]>('SELECT * FROM coupons WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToCoupon(rows[0]) : null;
  }

  static async findActive(): Promise<Coupon[]> {
    const rows = await query<CouponRow[]>(
      'SELECT * FROM coupons WHERE is_active = 1 AND end_time > NOW() ORDER BY created_at DESC'
    );
    return rows.map(mapRowToCoupon);
  }

  static async create(data: CreateCouponDTO): Promise<Coupon> {
    const id = uuidv4();
    await execute(
      `INSERT INTO coupons (id, name, type, value, min_amount, total_count, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.type, data.value, data.minAmount, data.totalCount, data.startTime, data.endTime]
    );
    const coupon = await this.findById(id);
    if (!coupon) throw new Error('Failed to create coupon');
    return coupon;
  }

  static async incrementUsedCount(id: string): Promise<void> {
    await execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [id]);
  }
}

// User Coupon Model
export class UserCouponModel {
  static async findById(id: string): Promise<UserCoupon | null> {
    const rows = await query<UserCouponRow[]>(
      `SELECT uc.*, c.name as coupon_name, c.type as coupon_type, c.value as coupon_value,
              c.min_amount as coupon_min_amount, c.start_time as coupon_start_time, c.end_time as coupon_end_time
       FROM user_coupons uc
       LEFT JOIN coupons c ON uc.coupon_id = c.id
       WHERE uc.id = ?`,
      [id]
    );
    return rows.length > 0 ? mapRowToUserCoupon(rows[0]) : null;
  }

  static async findByUserAndCoupon(userId: string, couponId: string): Promise<UserCoupon | null> {
    const rows = await query<UserCouponRow[]>(
      'SELECT * FROM user_coupons WHERE user_id = ? AND coupon_id = ?',
      [userId, couponId]
    );
    return rows.length > 0 ? mapRowToUserCoupon(rows[0]) : null;
  }

  static async findByUser(queryParams: UserCouponQuery): Promise<{ items: UserCoupon[]; total: number }> {
    const { userId, status, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = ['uc.user_id = ?'];
    const values: unknown[] = [userId];

    if (status) {
      conditions.push('uc.status = ?');
      values.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM user_coupons uc WHERE ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results with coupon info
    const offset = (page - 1) * pageSize;
    const rows = await query<UserCouponRow[]>(
      `SELECT uc.*, c.name as coupon_name, c.type as coupon_type, c.value as coupon_value,
              c.min_amount as coupon_min_amount, c.start_time as coupon_start_time, c.end_time as coupon_end_time
       FROM user_coupons uc
       LEFT JOIN coupons c ON uc.coupon_id = c.id
       WHERE ${whereClause}
       ORDER BY uc.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToUserCoupon),
      total,
    };
  }

  static async create(data: CreateUserCouponDTO): Promise<UserCoupon> {
    const id = uuidv4();
    await execute(
      'INSERT INTO user_coupons (id, user_id, coupon_id, status) VALUES (?, ?, ?, ?)',
      [id, data.userId, data.couponId, CouponStatus.AVAILABLE]
    );
    const userCoupon = await this.findById(id);
    if (!userCoupon) throw new Error('Failed to create user coupon');
    return userCoupon;
  }

  static async use(id: string, orderId: string): Promise<UserCoupon | null> {
    await execute(
      'UPDATE user_coupons SET status = ?, used_at = NOW(), order_id = ? WHERE id = ?',
      [CouponStatus.USED, orderId, id]
    );
    return this.findById(id);
  }

  static async markExpired(id: string): Promise<UserCoupon | null> {
    await execute('UPDATE user_coupons SET status = ? WHERE id = ?', [CouponStatus.EXPIRED, id]);
    return this.findById(id);
  }

  static async countByUserAndStatus(userId: string, status?: CouponStatus): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM user_coupons WHERE user_id = ?';
    const values: unknown[] = [userId];

    if (status) {
      sql += ' AND status = ?';
      values.push(status);
    }

    const rows = await query<RowDataPacket[]>(sql, values);
    return rows[0].count as number;
  }
}

// Points Record Model
export class PointsRecordModel {
  static async findById(id: string): Promise<PointsRecord | null> {
    const rows = await query<PointsRecordRow[]>('SELECT * FROM points_records WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToPointsRecord(rows[0]) : null;
  }

  static async findByUser(queryParams: RecordQuery): Promise<{ items: PointsRecord[]; total: number }> {
    const { userId, type, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = ['user_id = ?'];
    const values: unknown[] = [userId];

    if (type) {
      conditions.push('type = ?');
      values.push(type);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM points_records WHERE ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<PointsRecordRow[]>(
      `SELECT * FROM points_records WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToPointsRecord),
      total,
    };
  }

  static async create(data: CreatePointsRecordDTO, currentBalance: number): Promise<PointsRecord> {
    const id = uuidv4();
    const newBalance = currentBalance + data.points;
    await execute(
      `INSERT INTO points_records (id, user_id, type, points, balance, description, related_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.type, data.points, newBalance, data.description, data.relatedId || null]
    );
    const record = await this.findById(id);
    if (!record) throw new Error('Failed to create points record');
    return record;
  }
}

// Balance Record Model
export class BalanceRecordModel {
  static async findById(id: string): Promise<BalanceRecord | null> {
    const rows = await query<BalanceRecordRow[]>('SELECT * FROM balance_records WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToBalanceRecord(rows[0]) : null;
  }

  static async findByUser(queryParams: RecordQuery): Promise<{ items: BalanceRecord[]; total: number }> {
    const { userId, type, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = ['user_id = ?'];
    const values: unknown[] = [userId];

    if (type) {
      conditions.push('type = ?');
      values.push(type);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM balance_records WHERE ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<BalanceRecordRow[]>(
      `SELECT * FROM balance_records WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToBalanceRecord),
      total,
    };
  }

  static async create(data: CreateBalanceRecordDTO, currentBalance: number): Promise<BalanceRecord> {
    const id = uuidv4();
    const newBalance = currentBalance + data.amount;
    await execute(
      `INSERT INTO balance_records (id, user_id, type, amount, balance, description, related_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.type, data.amount, newBalance, data.description, data.relatedId || null]
    );
    const record = await this.findById(id);
    if (!record) throw new Error('Failed to create balance record');
    return record;
  }
}
