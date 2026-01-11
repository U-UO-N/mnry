import { Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { OrderStatus } from '../models/order.model';
import { AuthenticatedRequest } from '../types';
import { BadRequestError, UnauthorizedError } from '../middlewares/errorHandler';

export class OrderController {
  // POST /api/orders - Create order from cart
  static async createOrder(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { cartItemIds, addressSnapshot, items, addressId, couponId, pointsUsed, balanceUsed, remark, groupBuyGroupId, groupBuyPrice } = req.body;

      // Check if this is a direct order (group buy) or cart order
      if (items && addressId) {
        // Direct order (for group buy)
        const order = await OrderService.createOrderDirect(userId, {
          items,
          addressId,
          couponId,
          pointsUsed: pointsUsed ? parseInt(pointsUsed, 10) : undefined,
          balanceUsed: balanceUsed ? parseFloat(balanceUsed) : undefined,
          remark,
          groupBuyGroupId,
          groupBuyPrice: groupBuyPrice ? parseFloat(groupBuyPrice) : undefined,
        });

        res.status(201).json({
          success: true,
          data: order,
        });
        return;
      }

      // Cart order
      if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
        throw new BadRequestError('Cart item IDs are required');
      }

      if (!addressSnapshot || !addressSnapshot.name || !addressSnapshot.phone || !addressSnapshot.address) {
        throw new BadRequestError('Valid address is required');
      }

      const order = await OrderService.createOrder(userId, {
        cartItemIds,
        addressSnapshot,
        couponId,
        pointsUsed: pointsUsed ? parseInt(pointsUsed, 10) : undefined,
        balanceUsed: balanceUsed ? parseFloat(balanceUsed) : undefined,
        remark,
      });

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }


  // GET /api/orders - Get orders list
  static async getOrders(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { status, page, pageSize } = req.query;

      // Validate status if provided
      let orderStatus: OrderStatus | undefined;
      if (status && typeof status === 'string') {
        if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
          throw new BadRequestError('Invalid order status');
        }
        orderStatus = status as OrderStatus;
      }

      const result = await OrderService.getOrders(
        userId,
        orderStatus,
        page ? parseInt(page as string, 10) : 1,
        pageSize ? parseInt(pageSize as string, 10) : 20
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/orders/:id - Get order detail
  static async getOrderDetail(
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

      const order = await OrderService.getOrderDetail(id, userId);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }


  // POST /api/orders/:id/cancel - Cancel order
  static async cancelOrder(
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

      const order = await OrderService.cancelOrder(id, userId);

      res.json({
        success: true,
        data: order,
        message: 'Order cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/orders/:id/confirm - Confirm receipt
  static async confirmReceipt(
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

      const order = await OrderService.confirmReceipt(id, userId);

      res.json({
        success: true,
        data: order,
        message: 'Receipt confirmed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/orders/:id/refund - Apply for refund
  static async applyRefund(
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

      const order = await OrderService.applyRefund(id, userId);

      res.json({
        success: true,
        data: order,
        message: 'Refund application submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
