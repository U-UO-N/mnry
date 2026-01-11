// 分页结果
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 通用响应
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 订单状态映射
export const ORDER_STATUS_MAP: Record<string, string> = {
  pending_payment: '待支付',
  pending_shipment: '待发货',
  shipped: '待收货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
}

// 拼团状态映射
export const GROUP_BUY_STATUS_MAP: Record<string, string> = {
  in_progress: '进行中',
  success: '已成功',
  failed: '已失败'
}

// 优惠券状态映射
export const COUPON_STATUS_MAP: Record<string, string> = {
  available: '可用',
  used: '已使用',
  expired: '已过期'
}
