import { PointsRecordModel, RecordType, CreatePointsRecordDTO } from '../models/benefits.model';
import { UserModel } from '../models/user.model';

// 积分配置
export const POINTS_CONFIG = {
  // 积分抵扣比例：100积分 = 1元
  POINTS_TO_YUAN_RATIO: 100,
  // 订单最大积分抵扣比例：50%
  MAX_ORDER_DISCOUNT_RATIO: 0.5,
  // 购物积分比例：1元 = 1积分
  PURCHASE_POINTS_RATIO: 1,
  // 评价积分
  REVIEW_POINTS: 10,
  // 分享积分
  SHARE_POINTS: 5,
  // 邀请积分
  INVITE_POINTS: 100,
};

// 积分抵扣信息
export interface PointsDiscountInfo {
  availablePoints: number;    // 用户可用积分
  maxUsablePoints: number;    // 本单最多可用积分
  maxDiscount: number;        // 最多可抵扣金额（元）
}

// 添加积分DTO
export interface AddPointsDTO {
  type: RecordType;
  points: number;
  description: string;
  relatedId?: string;
}

// 扣减积分DTO
export interface DeductPointsDTO {
  type: RecordType;
  points: number;
  description: string;
  relatedId?: string;
}

export class PointsService {
  /**
   * 获取用户积分
   */
  static async getUserPoints(userId: string): Promise<number> {
    const user = await UserModel.findById(userId);
    return user?.points || 0;
  }

  /**
   * 添加积分
   */
  static async addPoints(userId: string, data: AddPointsDTO): Promise<{ record: any; newBalance: number }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentPoints = user.points;
    const newBalance = currentPoints + data.points;

    // 创建积分记录
    const record = await PointsRecordModel.create(
      {
        userId,
        type: data.type,
        points: data.points,
        description: data.description,
        relatedId: data.relatedId,
      },
      currentPoints
    );

    // 更新用户积分
    await UserModel.updatePoints(userId, data.points);

    return { record, newBalance };
  }

  /**
   * 扣减积分
   */
  static async deductPoints(userId: string, data: DeductPointsDTO): Promise<{ record: any; newBalance: number }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.points < data.points) {
      throw new Error('Insufficient points');
    }

    const currentPoints = user.points;
    const newBalance = currentPoints - data.points;

    // 创建积分记录（负数）
    const record = await PointsRecordModel.create(
      {
        userId,
        type: data.type,
        points: -data.points,
        description: data.description,
        relatedId: data.relatedId,
      },
      currentPoints
    );

    // 更新用户积分
    await UserModel.updatePoints(userId, -data.points);

    return { record, newBalance };
  }

  /**
   * 计算订单可用积分抵扣
   */
  static async calculateOrderPointsDiscount(
    userId: string,
    orderAmount: number
  ): Promise<PointsDiscountInfo> {
    const availablePoints = await this.getUserPoints(userId);
    
    // 计算最大可抵扣金额（订单金额的50%）
    const maxDiscountAmount = orderAmount * POINTS_CONFIG.MAX_ORDER_DISCOUNT_RATIO;
    
    // 计算最大可用积分（按抵扣金额换算）
    const maxPointsByAmount = Math.floor(maxDiscountAmount * POINTS_CONFIG.POINTS_TO_YUAN_RATIO);
    
    // 实际可用积分取较小值
    const maxUsablePoints = Math.min(availablePoints, maxPointsByAmount);
    
    // 计算实际可抵扣金额
    const maxDiscount = maxUsablePoints / POINTS_CONFIG.POINTS_TO_YUAN_RATIO;

    return {
      availablePoints,
      maxUsablePoints,
      maxDiscount,
    };
  }

  /**
   * 使用积分抵扣订单
   */
  static async usePointsForOrder(
    userId: string,
    points: number,
    orderId: string
  ): Promise<{ record: any; discountAmount: number }> {
    if (points <= 0) {
      throw new Error('Invalid points amount');
    }

    const result = await this.deductPoints(userId, {
      type: RecordType.ORDER_USE,
      points,
      description: `订单使用积分抵扣`,
      relatedId: orderId,
    });

    const discountAmount = points / POINTS_CONFIG.POINTS_TO_YUAN_RATIO;

    return {
      record: result.record,
      discountAmount,
    };
  }

  /**
   * 退款返还积分
   */
  static async refundPoints(
    userId: string,
    points: number,
    orderId: string
  ): Promise<{ record: any; newBalance: number }> {
    if (points <= 0) {
      return { record: null, newBalance: await this.getUserPoints(userId) };
    }

    return this.addPoints(userId, {
      type: RecordType.REFUND,
      points,
      description: `订单退款返还积分`,
      relatedId: orderId,
    });
  }

  /**
   * 购物获得积分
   */
  static async awardPurchasePoints(
    userId: string,
    orderAmount: number,
    orderId: string
  ): Promise<{ record: any; points: number }> {
    // 1元 = 1积分，向下取整
    const points = Math.floor(orderAmount * POINTS_CONFIG.PURCHASE_POINTS_RATIO);
    
    if (points <= 0) {
      return { record: null, points: 0 };
    }

    const result = await this.addPoints(userId, {
      type: RecordType.PURCHASE,
      points,
      description: `购物获得积分`,
      relatedId: orderId,
    });

    return { record: result.record, points };
  }

  /**
   * 评价获得积分
   */
  static async awardReviewPoints(
    userId: string,
    reviewId: string
  ): Promise<{ record: any; points: number }> {
    const points = POINTS_CONFIG.REVIEW_POINTS;

    const result = await this.addPoints(userId, {
      type: RecordType.REVIEW,
      points,
      description: `评价商品获得积分`,
      relatedId: reviewId,
    });

    return { record: result.record, points };
  }

  /**
   * 分享获得积分
   */
  static async awardSharePoints(
    userId: string,
    productId: string
  ): Promise<{ record: any; points: number }> {
    const points = POINTS_CONFIG.SHARE_POINTS;

    const result = await this.addPoints(userId, {
      type: RecordType.SHARE,
      points,
      description: `分享商品获得积分`,
      relatedId: productId,
    });

    return { record: result.record, points };
  }

  /**
   * 邀请好友获得积分
   */
  static async awardInvitePoints(
    userId: string,
    invitedUserId: string
  ): Promise<{ record: any; points: number }> {
    const points = POINTS_CONFIG.INVITE_POINTS;

    const result = await this.addPoints(userId, {
      type: RecordType.INVITE,
      points,
      description: `邀请好友注册获得积分`,
      relatedId: invitedUserId,
    });

    return { record: result.record, points };
  }
}
