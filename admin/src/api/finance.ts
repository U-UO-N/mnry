import { request } from '@/utils/request'
import type { FundOverview, Transaction, Withdrawal, PaginatedResult, PaginationParams, WithdrawalStatus } from '@/types'

export interface TransactionQuery extends PaginationParams {
  type?: string
  startDate?: string
  endDate?: string
}

export interface WithdrawalQuery extends PaginationParams {
  status?: WithdrawalStatus
}

export const financeApi = {
  getOverview() {
    return request.get<FundOverview>('/admin/finance/overview')
  },
  
  getTransactions(params: TransactionQuery) {
    return request.get<PaginatedResult<Transaction>>('/admin/finance/transactions', { params })
  },
  
  getWithdrawals(params: WithdrawalQuery) {
    return request.get<PaginatedResult<Withdrawal>>('/admin/finance/withdrawals', { params })
  },
  
  processWithdrawal(id: string, approved: boolean) {
    return request.post(`/admin/finance/withdrawals/${id}/process`, { approved })
  },
  
  getCommissions(params: PaginationParams) {
    return request.get<PaginatedResult<Transaction>>('/admin/finance/commissions', { params })
  }
}
