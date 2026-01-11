import { UserModel, User, MemberLevel } from '../models/user.model';
import { 
  MerchantApplicationModel, 
  MerchantApplication, 
  ApplicationStatus,
  ApplicationQuery,
} from '../models/merchant.model';
import { 
  PointsRecordModel, 
  BalanceRecordModel, 
  RecordType,
  PointsRecord,
  BalanceRecord,
} from '../models/benefits.model';
import { query } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';
import { PaginatedResult } from '../types';

// User with additional info for admin view
export interface UserWithDetails extends User {
  orderCount?: number;
  totalSpent?: number;
}

// User query parameters
export interface UserQuery {
  keyword?: string;
  memberLevel?: MemberLevel;
  page?: number;
  pageSize?: number;
}

// Points adjustment DTO
export interface AdjustPointsDTO {
  points: number;
  reason: string;
  adminId: string;
}

// Balance adjustment DTO
export interface AdjustBalanceDTO {
  amount: number;
  reason: string;
  adminId: string;
}

// User row with order stats
interface UserWithStatsRow extends RowDataPacket {
  id: string;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  member_level: MemberLevel;
  balance: string;
  points: number;
  created_at: Date;
  updated_at: Date;
  order_count: number;
  total_spent: string;
}

export class AdminUserService {
  // Get user list with pagination and filters
  static async getUsers(queryParams: UserQuery): Promise<PaginatedResult<UserWithDetails>> {
    const { keyword, memberLevel, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (keyword) {
      conditions.push('(u.nickname LIKE ? OR u.phone LIKE ? OR u.id LIKE ?)');
      const searchPattern = `%${keyword}%`;
      values.push(searchPattern, searchPattern, searchPattern);
    }

    if (memberLevel) {
      conditions.push('u.member_level = ?');
      values.push(memberLevel);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results with order stats
    const offset = (page - 1) * pageSize;
    const rows = await query<UserWithStatsRow[]>(
      `SELECT u.*, 
              COALESCE(o.order_count, 0) as order_count,
              COALESCE(o.total_spent, 0) as total_spent
       FROM users u
       LEFT JOIN (
         SELECT user_id, 
                COUNT(*) as order_count, 
                SUM(pay_amount) as total_spent
         FROM orders 
         WHERE status NOT IN ('cancelled', 'refunded')
         GROUP BY user_id
       ) o ON u.id = o.user_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    const items: UserWithDetails[] = rows.map(row => ({
      id: row.id,
      openid: row.openid,
      nickname: row.nickname,
      avatar: row.avatar,
      phone: row.phone,
      memberLevel: row.member_level,
      balance: parseFloat(row.balance),
      points: row.points,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      orderCount: row.order_count,
      totalSpent: parseFloat(row.total_spent || '0'),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get user detail by ID
  static async getUserDetail(userId: string): Promise<UserWithDetails | null> {
    const user = await UserModel.findById(userId);
    if (!user) {
      return null;
    }

    // Get order stats
    const statsRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(pay_amount), 0) as total_spent
       FROM orders 
       WHERE user_id = ? AND status NOT IN ('cancelled', 'refunded')`,
      [userId]
    );

    return {
      ...user,
      orderCount: statsRows[0].order_count as number,
      totalSpent: parseFloat(statsRows[0].total_spent as string || '0'),
    };
  }

  // Adjust user points
  static async adjustPoints(
    userId: string,
    data: AdjustPointsDTO
  ): Promise<{ user: User; record: PointsRecord }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create points record
    const description = `管理员调整: ${data.reason}`;
    const record = await PointsRecordModel.create(
      {
        userId,
        type: RecordType.ADMIN_ADJUST,
        points: data.points,
        description,
        relatedId: data.adminId,
      },
      user.points
    );

    // Update user points
    const updatedUser = await UserModel.updatePoints(userId, data.points);
    if (!updatedUser) {
      throw new Error('Failed to update user points');
    }

    return { user: updatedUser, record };
  }

  // Adjust user balance
  static async adjustBalance(
    userId: string,
    data: AdjustBalanceDTO
  ): Promise<{ user: User; record: BalanceRecord }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create balance record
    const description = `管理员调整: ${data.reason}`;
    const record = await BalanceRecordModel.create(
      {
        userId,
        type: RecordType.ADMIN_ADJUST,
        amount: data.amount,
        description,
        relatedId: data.adminId,
      },
      user.balance
    );

    // Update user balance
    const updatedUser = await UserModel.updateBalance(userId, data.amount);
    if (!updatedUser) {
      throw new Error('Failed to update user balance');
    }

    return { user: updatedUser, record };
  }

  // Adjust user member level
  static async adjustMemberLevel(
    userId: string,
    memberLevel: MemberLevel
  ): Promise<User> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update user member level
    const updatedUser = await UserModel.updateMemberLevel(userId, memberLevel);
    if (!updatedUser) {
      throw new Error('Failed to update user member level');
    }

    return updatedUser;
  }

  // Get merchant applications list
  static async getMerchantApplications(
    queryParams: ApplicationQuery
  ): Promise<PaginatedResult<MerchantApplication>> {
    const { page = 1, pageSize = 20 } = queryParams;
    const result = await MerchantApplicationModel.findAll(queryParams);

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  // Review merchant application
  static async reviewApplication(
    applicationId: string,
    approved: boolean,
    reviewedBy: string,
    rejectReason?: string
  ): Promise<MerchantApplication> {
    const application = await MerchantApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error('Application is not in pending status');
    }

    const newStatus = approved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    const result = await MerchantApplicationModel.updateStatus(
      applicationId,
      newStatus,
      reviewedBy,
      rejectReason
    );

    if (!result) {
      throw new Error('Failed to update application status');
    }

    // TODO: If approved, grant merchant permissions to user
    // This would involve updating user roles or creating merchant records

    return result;
  }
}
