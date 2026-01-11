import { UserModel } from '../models/user.model';
import {
  CouponModel,
  UserCouponModel,
  PointsRecordModel,
  BalanceRecordModel,
  CouponStatus,
  RecordType,
  UserCoupon,
  PointsRecord,
  BalanceRecord,
  Coupon,
} from '../models/benefits.model';

// Balance info response
export interface BalanceInfo {
  balance: number;
  availableBalance: number;
}

// Points info response
export interface PointsInfo {
  points: number;
  availablePoints: number;
}

// Coupon with computed status
export interface UserCouponWithStatus extends UserCoupon {
  computedStatus: CouponStatus;
}

// Paginated result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class BenefitsService {
  // Get user balance info
  static async getBalanceInfo(userId: string): Promise<BalanceInfo | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    return {
      balance: user.balance,
      availableBalance: user.balance, // For now, all balance is available
    };
  }

  // Get user balance records
  static async getBalanceRecords(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<BalanceRecord>> {
    const result = await BalanceRecordModel.findByUser({
      userId,
      page,
      pageSize,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  // Get user points info
  static async getPointsInfo(userId: string): Promise<PointsInfo | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    return {
      points: user.points,
      availablePoints: user.points, // For now, all points are available
    };
  }

  // Get user points records
  static async getPointsRecords(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<PointsRecord>> {
    const result = await PointsRecordModel.findByUser({
      userId,
      page,
      pageSize,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  // Get user coupons with status filter
  static async getUserCoupons(
    userId: string,
    status?: CouponStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<UserCouponWithStatus>> {
    // If filtering by status, we need to handle expired coupons specially
    const result = await UserCouponModel.findByUser({
      userId,
      status: status === CouponStatus.EXPIRED ? undefined : status,
      page,
      pageSize,
    });

    const now = new Date();
    const itemsWithStatus = result.items.map(item => {
      let computedStatus = item.status;
      
      // Check if coupon is expired (based on coupon end time)
      if (item.status === CouponStatus.AVAILABLE && item.coupon) {
        if (new Date(item.coupon.endTime) < now) {
          computedStatus = CouponStatus.EXPIRED;
        }
      }

      return {
        ...item,
        computedStatus,
      };
    });

    // Filter by computed status if needed
    let filteredItems = itemsWithStatus;
    if (status) {
      filteredItems = itemsWithStatus.filter(item => item.computedStatus === status);
    }

    return {
      items: filteredItems,
      total: status ? filteredItems.length : result.total,
      page,
      pageSize,
      totalPages: Math.ceil((status ? filteredItems.length : result.total) / pageSize),
    };
  }

  // Get coupon counts by status
  static async getCouponCounts(userId: string): Promise<{ available: number; used: number; expired: number }> {
    const available = await UserCouponModel.countByUserAndStatus(userId, CouponStatus.AVAILABLE);
    const used = await UserCouponModel.countByUserAndStatus(userId, CouponStatus.USED);
    const expired = await UserCouponModel.countByUserAndStatus(userId, CouponStatus.EXPIRED);

    return { available, used, expired };
  }

  // Add points to user (with record)
  static async addPoints(
    userId: string,
    points: number,
    type: RecordType,
    description: string,
    relatedId?: string
  ): Promise<PointsRecord | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    // Create points record
    const record = await PointsRecordModel.create(
      {
        userId,
        type,
        points,
        description,
        relatedId,
      },
      user.points
    );

    // Update user points
    await UserModel.updatePoints(userId, points);

    return record;
  }

  // Deduct points from user (with record)
  static async deductPoints(
    userId: string,
    points: number,
    type: RecordType,
    description: string,
    relatedId?: string
  ): Promise<PointsRecord | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    if (user.points < points) {
      throw new Error('Insufficient points');
    }

    // Create points record (negative points)
    const record = await PointsRecordModel.create(
      {
        userId,
        type,
        points: -points,
        description,
        relatedId,
      },
      user.points
    );

    // Update user points
    await UserModel.updatePoints(userId, -points);

    return record;
  }

  // Add balance to user (with record)
  static async addBalance(
    userId: string,
    amount: number,
    type: RecordType,
    description: string,
    relatedId?: string
  ): Promise<BalanceRecord | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    // Create balance record
    const record = await BalanceRecordModel.create(
      {
        userId,
        type,
        amount,
        description,
        relatedId,
      },
      user.balance
    );

    // Update user balance
    await UserModel.updateBalance(userId, amount);

    return record;
  }

  // Deduct balance from user (with record)
  static async deductBalance(
    userId: string,
    amount: number,
    type: RecordType,
    description: string,
    relatedId?: string
  ): Promise<BalanceRecord | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Create balance record (negative amount)
    const record = await BalanceRecordModel.create(
      {
        userId,
        type,
        amount: -amount,
        description,
        relatedId,
      },
      user.balance
    );

    // Update user balance
    await UserModel.updateBalance(userId, -amount);

    return record;
  }

  // Issue coupon to user
  static async issueCoupon(userId: string, couponId: string): Promise<UserCoupon | null> {
    const coupon = await CouponModel.findById(couponId);
    if (!coupon) return null;

    // Check if coupon is still available
    if (!coupon.isActive || new Date(coupon.endTime) < new Date()) {
      throw new Error('Coupon is not available');
    }

    // Check if user already has this coupon
    const existing = await UserCouponModel.findByUserAndCoupon(userId, couponId);
    if (existing) {
      throw new Error('User already has this coupon');
    }

    // Create user coupon
    const userCoupon = await UserCouponModel.create({
      userId,
      couponId,
    });

    return userCoupon;
  }

  // Use coupon
  static async useCoupon(userCouponId: string, orderId: string): Promise<UserCoupon | null> {
    const userCoupon = await UserCouponModel.findById(userCouponId);
    if (!userCoupon) return null;

    if (userCoupon.status !== CouponStatus.AVAILABLE) {
      throw new Error('Coupon is not available');
    }

    // Check if coupon is expired
    if (userCoupon.coupon && new Date(userCoupon.coupon.endTime) < new Date()) {
      throw new Error('Coupon has expired');
    }

    // Mark coupon as used
    const updatedCoupon = await UserCouponModel.use(userCouponId, orderId);

    // Increment coupon used count
    await CouponModel.incrementUsedCount(userCoupon.couponId);

    return updatedCoupon;
  }

  // Get available coupons for an order amount
  static async getAvailableCouponsForOrder(
    userId: string,
    orderAmount: number
  ): Promise<UserCouponWithStatus[]> {
    const result = await this.getUserCoupons(userId, CouponStatus.AVAILABLE, 1, 100);
    
    // Filter coupons that meet the minimum amount requirement
    return result.items.filter(item => {
      if (!item.coupon) return false;
      return item.coupon.minAmount <= orderAmount;
    });
  }
}
