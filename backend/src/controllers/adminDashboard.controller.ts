import { Request, Response, NextFunction } from 'express';
import { query } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';
import { OrderStatus } from '../models/order.model';
import { WithdrawalStatus } from '../models/distribution.model';

// Dashboard statistics interface
export interface DashboardStats {
  todayOrders: number;
  todaySales: number;
  totalProducts: number;
  onSaleProducts: number;
  totalUsers: number;
  newUsers: number;
}

// Pending tasks interface
export interface PendingTasks {
  pendingShipment: number;
  refunding: number;
  pendingWithdrawals: number;
  pendingMerchants: number;
}

// Recent order interface
export interface RecentOrder {
  id: string;
  orderNo: string;
  userName: string;
  amount: number;
  status: string;
  createdAt: string;
}

export class AdminDashboardController {
  // GET /api/admin/dashboard/stats - Get dashboard statistics
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get today's orders count
      const todayOrdersRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?`,
        [todayStr]
      );
      const todayOrders = todayOrdersRows[0].count as number;

      // Get today's sales (only paid orders)
      const todaySalesRows = await query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(pay_amount), 0) as total FROM orders 
         WHERE DATE(created_at) = ? AND status != ?`,
        [todayStr, OrderStatus.PENDING_PAYMENT]
      );
      const todaySales = parseFloat(todaySalesRows[0].total as string) || 0;

      // Get total products
      const totalProductsRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM products`
      );
      const totalProducts = totalProductsRows[0].count as number;

      // Get on-sale products
      const onSaleProductsRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM products WHERE status = 'on_sale'`
      );
      const onSaleProducts = onSaleProductsRows[0].count as number;

      // Get total users
      const totalUsersRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM users`
      );
      const totalUsers = totalUsersRows[0].count as number;

      // Get new users today
      const newUsersRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?`,
        [todayStr]
      );
      const newUsers = newUsersRows[0].count as number;

      const stats: DashboardStats = {
        todayOrders,
        todaySales,
        totalProducts,
        onSaleProducts,
        totalUsers,
        newUsers,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/dashboard/pending - Get pending tasks
  static async getPendingTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get pending shipment orders
      const pendingShipmentRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM orders WHERE status = ?`,
        [OrderStatus.PENDING_SHIPMENT]
      );
      const pendingShipment = pendingShipmentRows[0].count as number;

      // Get refunding orders
      const refundingRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM orders WHERE status = ?`,
        [OrderStatus.REFUNDING]
      );
      const refunding = refundingRows[0].count as number;

      // Get pending withdrawals
      const pendingWithdrawalsRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM withdrawals WHERE status = ?`,
        [WithdrawalStatus.PENDING]
      );
      const pendingWithdrawals = pendingWithdrawalsRows[0].count as number;

      // Get pending merchant applications
      const pendingMerchantsRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM merchant_applications WHERE status = 'pending'`
      );
      const pendingMerchants = pendingMerchantsRows[0].count as number;

      const tasks: PendingTasks = {
        pendingShipment,
        refunding,
        pendingWithdrawals,
        pendingMerchants,
      };

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/dashboard/recent-orders - Get recent orders
  static async getRecentOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const rows = await query<RowDataPacket[]>(
        `SELECT o.id, o.order_no, o.pay_amount, o.status, o.created_at,
                u.nickname, u.phone
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC
         LIMIT ?`,
        [limit]
      );

      const recentOrders: RecentOrder[] = rows.map(row => ({
        id: row.id,
        orderNo: row.order_no,
        userName: row.nickname || row.phone || '未知用户',
        amount: parseFloat(row.pay_amount as string) || 0,
        status: row.status,
        createdAt: row.created_at,
      }));

      res.json({
        success: true,
        data: recentOrders,
      });
    } catch (error) {
      next(error);
    }
  }
}
