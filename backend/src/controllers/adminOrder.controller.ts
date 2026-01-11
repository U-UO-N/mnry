import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { RefundService } from '../services/payment.service';
import { NotFoundError, ValidationError } from '../middlewares/errorHandler';
import { BusinessErrorCode, PaginatedResult } from '../types';
import { OrderStatus, Order, OrderModel, OrderQuery } from '../models/order.model';
import { UserModel } from '../models/user.model';

// Query parameters for admin order list
export interface AdminOrderQuery {
  status?: OrderStatus;
  orderNo?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Extended order type with user name
interface OrderWithUser extends Order {
  userName?: string;
}

// Admin Order Service for admin-specific operations
export class AdminOrderService {
  // Get orders with admin filters (no user restriction)
  static async getOrders(queryParams: AdminOrderQuery): Promise<PaginatedResult<OrderWithUser>> {
    const { status, orderNo, userId, page = 1, pageSize = 20 } = queryParams;

    // Build query for OrderModel
    const query: OrderQuery = {
      status,
      orderNo,
      userId,
      page,
      pageSize,
    };

    const result = await OrderModel.findMany(query);

    // Fetch items and user name for each order
    const ordersWithItems = await Promise.all(
      result.items.map(async (order) => {
        const items = await OrderModel.getOrderItems(order.id);
        const user = await UserModel.findById(order.userId);
        return {
          ...order,
          items,
          userName: user?.nickname || user?.phone || '未知用户',
        };
      })
    );

    return {
      items: ordersWithItems,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }
}

export class AdminOrderController {
  // GET /api/admin/orders - Get order list with filters
  static async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        status,
        orderNo,
        userId,
        startDate,
        endDate,
        page = '1',
        pageSize = '20',
      } = req.query;

      // Validate status if provided
      if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
        throw new ValidationError('Invalid order status');
      }

      const result = await AdminOrderService.getOrders({
        status: status as OrderStatus | undefined,
        orderNo: orderNo as string | undefined,
        userId: userId as string | undefined,
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


  // GET /api/admin/orders/:id - Get order detail
  static async getOrderDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const order = await OrderService.getOrderDetail(id);

      if (!order) {
        throw new NotFoundError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/orders/:id/ship - Ship order
  static async shipOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { company, trackingNo } = req.body;

      // Validate required fields
      if (!company || typeof company !== 'string' || company.trim() === '') {
        throw new ValidationError('Logistics company is required');
      }
      if (!trackingNo || typeof trackingNo !== 'string' || trackingNo.trim() === '') {
        throw new ValidationError('Tracking number is required');
      }

      const order = await OrderService.shipOrder(id, {
        orderId: id,
        company: company.trim(),
        trackingNo: trackingNo.trim(),
      });

      res.json({
        success: true,
        data: order,
        message: 'Order shipped successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/orders/:id/refund - Process refund
  static async processRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { approved, reason } = req.body;

      // Validate approved field
      if (typeof approved !== 'boolean') {
        throw new ValidationError('Approved field must be a boolean');
      }

      // Get refund by order ID
      const refunds = await RefundService.getRefundsByOrderId(id);
      const pendingRefund = refunds.find(
        r => r.status === 'pending' || r.status === 'processing'
      );

      if (!pendingRefund) {
        throw new NotFoundError('No pending refund found for this order', BusinessErrorCode.ORDER_NOT_FOUND);
      }

      const refund = await RefundService.processRefund(pendingRefund.id, approved);

      res.json({
        success: true,
        data: refund,
        message: approved ? 'Refund approved successfully' : 'Refund rejected',
      });
    } catch (error) {
      next(error);
    }
  }
}
