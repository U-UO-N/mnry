import { FinanceModel, FundOverview, Transaction, TransactionQuery, TransactionType } from '../models/finance.model';
import { 
  WithdrawalModel, 
  Withdrawal, 
  WithdrawalStatus, 
  WithdrawalQuery,
  CommissionModel,
  Commission,
  CommissionQuery,
  CommissionStatus,
} from '../models/distribution.model';
import { PaginatedResult } from '../types';

// Extended withdrawal with user info
export interface WithdrawalWithUser extends Withdrawal {
  userNickname?: string;
  userPhone?: string;
}

// Extended commission with user info
export interface CommissionWithUser extends Commission {
  userNickname?: string;
}

export class AdminFinanceService {
  // Get fund overview
  static async getFundOverview(): Promise<FundOverview> {
    return FinanceModel.getFundOverview();
  }

  // Get transactions with filters
  static async getTransactions(
    queryParams: TransactionQuery
  ): Promise<PaginatedResult<Transaction>> {
    const { page = 1, pageSize = 20 } = queryParams;
    const result = await FinanceModel.getTransactions(queryParams);

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  // Get all withdrawals (admin view)
  static async getWithdrawals(
    queryParams: WithdrawalQuery
  ): Promise<PaginatedResult<Withdrawal>> {
    const { status, page = 1, pageSize = 20 } = queryParams;
    const result = await WithdrawalModel.findByUser({
      status,
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

  // Process withdrawal (approve or reject)
  static async processWithdrawal(
    withdrawalId: string,
    approved: boolean,
    rejectReason?: string
  ): Promise<Withdrawal> {
    const withdrawal = await WithdrawalModel.findById(withdrawalId);
    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error('Withdrawal is not in pending status');
    }

    if (approved) {
      // Mark as approved first
      await WithdrawalModel.updateStatus(withdrawalId, WithdrawalStatus.APPROVED);
      
      // In production, this would trigger actual payment processing
      // For now, we'll mark it as completed directly
      const result = await WithdrawalModel.updateStatus(withdrawalId, WithdrawalStatus.COMPLETED);
      if (!result) {
        throw new Error('Failed to process withdrawal');
      }
      return result;
    } else {
      const result = await WithdrawalModel.updateStatus(
        withdrawalId,
        WithdrawalStatus.REJECTED,
        rejectReason
      );
      if (!result) {
        throw new Error('Failed to reject withdrawal');
      }
      return result;
    }
  }

  // Get all commissions (admin view)
  static async getCommissions(
    queryParams: CommissionQuery
  ): Promise<PaginatedResult<Commission>> {
    const { status, page = 1, pageSize = 20 } = queryParams;
    const result = await CommissionModel.findByUser({
      status,
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

  // Calculate total income from payments
  static calculateTotalIncome(payments: { amount: number; status: string }[]): number {
    return payments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  // Calculate pending settlement from commissions
  static calculatePendingSettlement(commissions: { commissionAmount: number; status: string }[]): number {
    return commissions
      .filter(c => c.status === CommissionStatus.CONFIRMED)
      .reduce((sum, c) => sum + c.commissionAmount, 0);
  }

  // Calculate withdrawn amount
  static calculateWithdrawn(withdrawals: { amount: number; status: string }[]): number {
    return withdrawals
      .filter(w => w.status === WithdrawalStatus.COMPLETED)
      .reduce((sum, w) => sum + w.amount, 0);
  }
}
