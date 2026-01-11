import { Response, NextFunction } from 'express';
import { DistributionService } from '../services/distribution.service';
import { AuthenticatedRequest, BusinessErrorCode } from '../types';
import { BadRequestError, NotFoundError } from '../middlewares/errorHandler';

export class DistributionController {
  // GET /api/user/income - Get user income overview
  static async getIncome(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const incomeOverview = await DistributionService.getIncomeOverview(userId);
      if (!incomeOverview) {
        throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: incomeOverview,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/income/records - Get user income records
  static async getIncomeRecords(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await DistributionService.getIncomeRecords(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/user/withdraw - Request withdrawal
  static async requestWithdraw(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { amount } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new BadRequestError('Invalid withdrawal amount');
      }

      const withdrawal = await DistributionService.requestWithdraw(userId, amount);

      res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal request submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/withdrawals - Get withdrawal history
  static async getWithdrawals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await DistributionService.getWithdrawalHistory(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/share/:productId - Generate share link
  static async generateShareLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { productId } = req.params;
      if (!productId) {
        throw new BadRequestError('Product ID is required');
      }

      const shareLink = DistributionService.generateShareLink(userId, productId);

      res.json({
        success: true,
        data: shareLink,
      });
    } catch (error) {
      next(error);
    }
  }
}
