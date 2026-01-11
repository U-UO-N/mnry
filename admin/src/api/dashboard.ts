import { request } from '@/utils/request'

export interface DashboardStats {
  todayOrders: number
  todaySales: number
  totalProducts: number
  onSaleProducts: number
  totalUsers: number
  newUsers: number
}

export interface PendingTasks {
  pendingShipment: number
  refunding: number
  pendingWithdrawals: number
  pendingMerchants: number
}

export interface RecentOrder {
  id: string
  orderNo: string
  userName: string
  amount: number
  status: string
  createdAt: string
}

export const dashboardApi = {
  getStats() {
    return request.get<DashboardStats>('/admin/dashboard/stats')
  },
  
  getPendingTasks() {
    return request.get<PendingTasks>('/admin/dashboard/pending')
  },
  
  getRecentOrders(limit = 10) {
    return request.get<RecentOrder[]>('/admin/dashboard/recent-orders', { params: { limit } })
  }
}
