import { Request, Response, NextFunction } from 'express';
import { AdminFinanceService } from '../services/adminFinance.service';
import { NotFoundError, ValidationError } from '../middlewares/errorHandler';
import { TransactionType } from '../models/finance.model';
import { WithdrawalStatus, CommissionStatus } from '../models/distribution.model';

export class AdminFinanceController {
  // GET /api/admin/finance/overview - Get fund overview
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await AdminFinanceService.getFundOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/finance/transactions - Get transaction list
  static async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        type,
        startDate,
        endDate,
        page = '1',
        pageSize = '20',
      } = req.query;

      // Validate type if provided
      if (type && !Object.values(TransactionType).includes(type as TransactionType)) {
        throw new ValidationError('Invalid transaction type');
      }

      const result = await AdminFinanceService.getTransactions({
        type: type as TransactionType | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/finance/withdrawals - Get withdrawal list
  static async getWithdrawals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        status,
        page = '1',
        pageSize = '20',
      } = req.query;

      // Validate status if provided
      if (status && !Object.values(WithdrawalStatus).includes(status as WithdrawalStatus)) {
        throw new ValidationError('Invalid withdrawal status');
      }

      const result = await AdminFinanceService.getWithdrawals({
        status: status as WithdrawalStatus | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/finance/withdrawals/:id/process - Process withdrawal
  static async processWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { approved, rejectReason } = req.body;

      // Validate approved field
      if (typeof approved !== 'boolean') {
        throw new ValidationError('Approved field must be a boolean');
      }

      // Validate rejectReason if not approved
      if (!approved && (!rejectReason || typeof rejectReason !== 'string')) {
        throw new ValidationError('Reject reason is required when rejecting withdrawal');
      }

      const withdrawal = await AdminFinanceService.processWithdrawal(
        id,
        approved,
        rejectReason
      );

      res.json({
        success: true,
        data: withdrawal,
        message: approved ? 'Withdrawal approved successfully' : 'Withdrawal rejected',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Withdrawal not found') {
          return next(new NotFoundError('Withdrawal not found'));
        }
        if (error.message === 'Withdrawal is not in pending status') {
          return next(new ValidationError('Withdrawal is not in pending status'));
        }
      }
      next(error);
    }
  }

  // GET /api/admin/finance/commissions - Get commission list
  static async getCommissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        status,
        page = '1',
        pageSize = '20',
      } = req.query;

      // Validate status if provided
      if (status && !Object.values(CommissionStatus).includes(status as CommissionStatus)) {
        throw new ValidationError('Invalid commission status');
      }

      const result = await AdminFinanceService.getCommissions({
        status: status as CommissionStatus | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
