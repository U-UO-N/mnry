import { Response, NextFunction } from 'express';
import { BenefitsService } from '../services/benefits.service';
import { PointsService } from '../services/points.service';
import { AuthenticatedRequest, BusinessErrorCode } from '../types';
import { BadRequestError, NotFoundError } from '../middlewares/errorHandler';
import { CouponStatus } from '../models/benefits.model';

export class BenefitsController {
  // GET /api/user/balance - Get user balance info
  static async getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const balanceInfo = await BenefitsService.getBalanceInfo(userId);
      if (!balanceInfo) {
        throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: balanceInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/balance/records - Get user balance records
  static async getBalanceRecords(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await BenefitsService.getBalanceRecords(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/user/balance/recharge - Recharge user balance (for testing)
  static async rechargeBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        throw new BadRequestError('Invalid recharge amount');
      }

      // amount is in yuan
      const amountInYuan = amount;

      // Add balance with record
      const record = await BenefitsService.addBalance(
        userId,
        amountInYuan,
        'recharge' as any,
        `充值 ¥${amountInYuan.toFixed(2)}`
      );

      if (!record) {
        throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
      }

      // Get updated balance
      const balanceInfo = await BenefitsService.getBalanceInfo(userId);

      res.json({
        success: true,
        data: {
          record,
          balance: balanceInfo?.balance || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/points - Get user points info
  static async getPoints(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const pointsInfo = await BenefitsService.getPointsInfo(userId);
      if (!pointsInfo) {
        throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: pointsInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/points/records - Get user points records
  static async getPointsRecords(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await BenefitsService.getPointsRecords(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/coupons - Get user coupons
  static async getCoupons(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const statusParam = req.query.status as string | undefined;

      // Validate status parameter
      let status: CouponStatus | undefined;
      if (statusParam) {
        if (!Object.values(CouponStatus).includes(statusParam as CouponStatus)) {
          throw new BadRequestError('Invalid coupon status');
        }
        status = statusParam as CouponStatus;
      }

      const result = await BenefitsService.getUserCoupons(userId, status, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/coupons/counts - Get coupon counts by status
  static async getCouponCounts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const counts = await BenefitsService.getCouponCounts(userId);

      res.json({
        success: true,
        data: counts,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/points/discount - Calculate points discount for order
  static async getPointsDiscount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const orderAmount = parseFloat(req.query.orderAmount as string);
      if (isNaN(orderAmount) || orderAmount <= 0) {
        throw new BadRequestError('Invalid order amount');
      }

      const discountInfo = await PointsService.calculateOrderPointsDiscount(userId, orderAmount);

      res.json({
        success: true,
        data: discountInfo,
      });
    } catch (error) {
      next(error);
    }
  }
}
