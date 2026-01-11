import { query } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';
import { PaymentStatus } from './payment.model';
import { RefundStatus } from './payment.model';
import { WithdrawalStatus, CommissionStatus } from './distribution.model';

// Transaction type enum
export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  WITHDRAW = 'withdraw',
  COMMISSION = 'commission',
}

// Fund overview interface
export interface FundOverview {
  totalIncome: number;
  pendingSettlement: number;
  withdrawn: number;
  availableBalance: number;
  totalRefunds: number;
  pendingWithdrawals: number;
}

// Transaction interface for unified transaction view
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  relatedOrderId: string | null;
  relatedUserId: string | null;
  description: string;
  status: string;
  createdAt: Date;
}

// Transaction row from database
interface TransactionRow extends RowDataPacket {
  id: string;
  type: TransactionType;
  amount: string;
  related_order_id: string | null;
  related_user_id: string | null;
  description: string;
  status: string;
  created_at: Date;
}

// Query parameters for transactions
export interface TransactionQuery {
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Map row to Transaction
const mapRowToTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  amount: parseFloat(row.amount),
  relatedOrderId: row.related_order_id,
  relatedUserId: row.related_user_id,
  description: row.description,
  status: row.status,
  createdAt: row.created_at,
});

export class FinanceModel {
  // Get fund overview
  static async getFundOverview(): Promise<FundOverview> {
    // Get total income from successful payments
    const incomeRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = ?`,
      [PaymentStatus.SUCCESS]
    );
    const totalIncome = parseFloat(incomeRows[0].total as string) || 0;

    // Get total refunds
    const refundRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM refunds WHERE status = ?`,
      [RefundStatus.SUCCESS]
    );
    const totalRefunds = parseFloat(refundRows[0].total as string) || 0;

    // Get pending settlement (confirmed commissions not yet settled)
    const pendingRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE status = ?`,
      [CommissionStatus.CONFIRMED]
    );
    const pendingSettlement = parseFloat(pendingRows[0].total as string) || 0;

    // Get total withdrawn
    const withdrawnRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = ?`,
      [WithdrawalStatus.COMPLETED]
    );
    const withdrawn = parseFloat(withdrawnRows[0].total as string) || 0;

    // Get pending withdrawals
    const pendingWithdrawRows = await query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status IN (?, ?)`,
      [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED]
    );
    const pendingWithdrawals = parseFloat(pendingWithdrawRows[0].total as string) || 0;

    // Calculate available balance
    const availableBalance = totalIncome - totalRefunds - withdrawn - pendingWithdrawals;

    return {
      totalIncome,
      pendingSettlement,
      withdrawn,
      availableBalance,
      totalRefunds,
      pendingWithdrawals,
    };
  }

  // Get transactions (unified view of payments, refunds, withdrawals)
  static async getTransactions(
    queryParams: TransactionQuery
  ): Promise<{ items: Transaction[]; total: number }> {
    const { type, startDate, endDate, page = 1, pageSize = 20 } = queryParams;
    const offset = (page - 1) * pageSize;

    // Build union query for all transaction types
    let unionParts: string[] = [];
    const values: unknown[] = [];
    const countValues: unknown[] = [];

    // Payment transactions
    if (!type || type === TransactionType.PAYMENT) {
      unionParts.push(`
        SELECT 
          id, 
          'payment' as type, 
          amount, 
          order_id as related_order_id, 
          user_id as related_user_id,
          CONCAT('Payment for order') as description,
          status,
          created_at
        FROM payments
        WHERE 1=1
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
      `);
      if (startDate) {
        values.push(startDate);
        countValues.push(startDate);
      }
      if (endDate) {
        values.push(endDate);
        countValues.push(endDate);
      }
    }

    // Refund transactions
    if (!type || type === TransactionType.REFUND) {
      unionParts.push(`
        SELECT 
          id, 
          'refund' as type, 
          amount, 
          order_id as related_order_id, 
          user_id as related_user_id,
          COALESCE(reason, 'Refund') as description,
          status,
          created_at
        FROM refunds
        WHERE 1=1
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
      `);
      if (startDate) {
        values.push(startDate);
        countValues.push(startDate);
      }
      if (endDate) {
        values.push(endDate);
        countValues.push(endDate);
      }
    }

    // Withdrawal transactions
    if (!type || type === TransactionType.WITHDRAW) {
      unionParts.push(`
        SELECT 
          id, 
          'withdraw' as type, 
          amount, 
          NULL as related_order_id, 
          user_id as related_user_id,
          'Withdrawal request' as description,
          status,
          created_at
        FROM withdrawals
        WHERE 1=1
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
      `);
      if (startDate) {
        values.push(startDate);
        countValues.push(startDate);
      }
      if (endDate) {
        values.push(endDate);
        countValues.push(endDate);
      }
    }

    // Commission transactions
    if (!type || type === TransactionType.COMMISSION) {
      unionParts.push(`
        SELECT 
          id, 
          'commission' as type, 
          amount, 
          order_id as related_order_id, 
          user_id as related_user_id,
          CONCAT('佣金收入') as description,
          status,
          created_at
        FROM commissions
        WHERE 1=1
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
      `);
      if (startDate) {
        values.push(startDate);
        countValues.push(startDate);
      }
      if (endDate) {
        values.push(endDate);
        countValues.push(endDate);
      }
    }

    if (unionParts.length === 0) {
      return { items: [], total: 0 };
    }

    const unionQuery = unionParts.join(' UNION ALL ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${unionQuery}) as combined`;
    const countRows = await query<RowDataPacket[]>(countQuery, countValues);
    const total = countRows[0].total as number;

    // Get paginated results
    const dataQuery = `
      SELECT * FROM (${unionQuery}) as combined 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = await query<TransactionRow[]>(dataQuery, [...values, pageSize, offset]);

    return {
      items: rows.map(mapRowToTransaction),
      total,
    };
  }
}
