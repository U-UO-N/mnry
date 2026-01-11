import { Response, NextFunction } from 'express';
import { RefundService } from '../services/payment.service';
import { AuthenticatedRequest } from '../types';
import { BadRequestError, UnauthorizedError } from '../middlewares/errorHandler';

export class RefundController {
  // POST /api/refunds - Create refund request
  static async createRefund(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { orderId, reason } = req.body;

      if (!orderId) {
        throw new BadRequestError('Order ID is required');
      }

      const refund = await RefundService.createRefund(orderId, userId, reason);

      res.status(201).json({
        success: true,
        data: refund,
        message: 'Refund request submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/refunds/order/:orderId - Get refunds by order ID
  static async getRefundsByOrderId(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { orderId } = req.params;

      const refunds = await RefundService.getRefundsByOrderId(orderId);

      // Filter to only show user's own refunds
      const userRefunds = refunds.filter(r => r.userId === userId);

      res.json({
        success: true,
        data: userRefunds,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/refunds/:id - Get refund by ID
  static async getRefundById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      const refund = await RefundService.getRefundById(id);

      if (!refund || refund.userId !== userId) {
        throw new BadRequestError('Refund not found');
      }

      res.json({
        success: true,
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  }
}
