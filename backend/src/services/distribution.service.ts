import { UserModel } from '../models/user.model';
import {
  CommissionModel,
  WithdrawalModel,
  Commission,
  Withdrawal,
  CommissionStatus,
  WithdrawalStatus,
  CreateCommissionDTO,
} from '../models/distribution.model';

// Income overview response
export interface IncomeOverview {
  totalEarnings: number;      // Total confirmed + settled earnings
  pendingEarnings: number;    // Pending earnings (order not completed)
  withdrawableAmount: number; // Amount available for withdrawal
  withdrawnAmount: number;    // Total withdrawn amount
}

// Paginated result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Share link response
export interface ShareLink {
  productId: string;
  shareUrl: string;
  promoterId: string;
}

// Default commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.10;

export class DistributionService {
  // Get user income overview
  static async getIncomeOverview(userId: string): Promise<IncomeOverview | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    const [totalEarnings, pendingEarnings, withdrawableAmount, withdrawnAmount, pendingWithdrawal] = 
      await Promise.all([
        CommissionModel.getTotalEarnings(userId),
        CommissionModel.getPendingEarnings(userId),
        CommissionModel.getWithdrawableEarnings(userId),
        WithdrawalModel.getTotalWithdrawn(userId),
        WithdrawalModel.getPendingWithdrawal(userId),
      ]);

    return {
      totalEarnings,
      pendingEarnings,
      withdrawableAmount: withdrawableAmount - pendingWithdrawal, // Subtract pending withdrawals
      withdrawnAmount,
    };
  }

  // Get user income records (commissions)
  static async getIncomeRecords(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<Commission>> {
    const result = await CommissionModel.findByUser({
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


  // Request withdrawal
  static async requestWithdraw(userId: string, amount: number): Promise<Withdrawal> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get withdrawable amount
    const withdrawableAmount = await CommissionModel.getWithdrawableEarnings(userId);
    const pendingWithdrawal = await WithdrawalModel.getPendingWithdrawal(userId);
    const availableAmount = withdrawableAmount - pendingWithdrawal;

    // Validate withdrawal amount
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    if (amount > availableAmount) {
      throw new Error('Withdrawal amount exceeds available balance');
    }

    // Create withdrawal request
    const withdrawal = await WithdrawalModel.create({
      userId,
      amount,
    });

    return withdrawal;
  }

  // Generate share link for a product
  static generateShareLink(userId: string, productId: string): ShareLink {
    // Generate a share URL with promoter ID
    // In production, this would be a proper URL with tracking parameters
    const baseUrl = process.env.SHARE_BASE_URL || 'https://miniprogram.example.com';
    const shareUrl = `${baseUrl}/product/${productId}?promoter=${userId}`;

    return {
      productId,
      shareUrl,
      promoterId: userId,
    };
  }

  // Create commission for a referred order
  static async createCommission(data: CreateCommissionDTO): Promise<Commission> {
    // Check if commission already exists for this order
    const existing = await CommissionModel.findByOrderId(data.orderId);
    if (existing) {
      throw new Error('Commission already exists for this order');
    }

    // Create commission with default rate if not specified
    const commissionData = {
      ...data,
      commissionRate: data.commissionRate || DEFAULT_COMMISSION_RATE,
    };

    return CommissionModel.create(commissionData);
  }

  // Confirm commission when order is completed
  static async confirmCommission(orderId: string): Promise<Commission | null> {
    const commission = await CommissionModel.findByOrderId(orderId);
    if (!commission) return null;

    if (commission.status !== CommissionStatus.PENDING) {
      throw new Error('Commission is not in pending status');
    }

    return CommissionModel.updateStatus(commission.id, CommissionStatus.CONFIRMED);
  }

  // Cancel commission when order is cancelled/refunded
  static async cancelCommission(orderId: string): Promise<Commission | null> {
    const commission = await CommissionModel.findByOrderId(orderId);
    if (!commission) return null;

    if (commission.status === CommissionStatus.SETTLED) {
      throw new Error('Cannot cancel settled commission');
    }

    return CommissionModel.updateStatus(commission.id, CommissionStatus.CANCELLED);
  }

  // Process withdrawal (admin function)
  static async processWithdrawal(
    withdrawalId: string,
    approved: boolean,
    rejectReason?: string
  ): Promise<Withdrawal | null> {
    const withdrawal = await WithdrawalModel.findById(withdrawalId);
    if (!withdrawal) return null;

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error('Withdrawal is not in pending status');
    }

    if (approved) {
      // Mark as approved first
      await WithdrawalModel.updateStatus(withdrawalId, WithdrawalStatus.APPROVED);
      
      // In production, this would trigger actual payment processing
      // For now, we'll mark it as completed directly
      return WithdrawalModel.updateStatus(withdrawalId, WithdrawalStatus.COMPLETED);
    } else {
      return WithdrawalModel.updateStatus(
        withdrawalId,
        WithdrawalStatus.REJECTED,
        rejectReason
      );
    }
  }

  // Get withdrawal history
  static async getWithdrawalHistory(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<Withdrawal>> {
    const result = await WithdrawalModel.findByUser({
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

  // Calculate commission amount
  static calculateCommission(orderAmount: number, rate: number = DEFAULT_COMMISSION_RATE): number {
    return Math.round(orderAmount * rate * 100) / 100; // Round to 2 decimal places
  }
}
