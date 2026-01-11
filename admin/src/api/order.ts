import { request } from '@/utils/request'
import type { Order, PaginatedResult, PaginationParams, OrderStatus } from '@/types'

export interface OrderQuery extends PaginationParams {
  orderNo?: string
  userId?: string
  status?: OrderStatus
  startDate?: string
  endDate?: string
}

export interface ShipDTO {
  company: string
  trackingNo: string
}

export interface RefundDTO {
  approved: boolean
  reason?: string
}

export const orderApi = {
  getList(params: OrderQuery) {
    return request.get<PaginatedResult<Order>>('/admin/orders', { params })
  },
  
  getDetail(id: string) {
    return request.get<Order>(`/admin/orders/${id}`)
  },
  
  ship(id: string, data: ShipDTO) {
    return request.post(`/admin/orders/${id}/ship`, data)
  },
  
  handleRefund(id: string, data: RefundDTO) {
    return request.post(`/admin/orders/${id}/refund`, data)
  }
}
