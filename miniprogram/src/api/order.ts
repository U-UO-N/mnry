import { get, post } from '@/utils/request'

export interface Order {
  id: string
  orderNo: string
  userId: string
  status: OrderStatus
  totalAmount: number
  payAmount: number
  discountAmount: number
  items: OrderItem[]
  createdAt: string
  paidAt?: string
  shippedAt?: string
  completedAt?: string
}

export interface OrderItem {
  productId: string
  skuId: string
  productName: string
  productImage: string
  specValues: string[]
  price: number
  quantity: number
}

export type OrderStatus = 
  | 'pending_payment'
  | 'pending_shipment'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunding'
  | 'refunded'

export interface CreateOrderDTO {
  cartItemIds?: string[]
  addressSnapshot?: {
    name: string
    phone: string
    address: string
  }
  // For direct order (group buy)
  items?: { productId: string; quantity: number }[]
  addressId?: string
  groupBuyGroupId?: string
  groupBuyPrice?: number
  // Common fields
  couponId?: string
  pointsUsed?: number
  balanceUsed?: number
  remark?: string
}

// 创建订单
export function createOrder(data: CreateOrderDTO) {
  return post<Order>('/orders', data)
}

// 获取订单列表
export function getOrders(status?: OrderStatus, page = 1, pageSize = 20) {
  return get<{ list: Order[]; total: number }>('/orders', { status, page, pageSize })
}

// 获取订单详情
export function getOrderDetail(orderId: string) {
  return get<Order>(`/orders/${orderId}`)
}

// 取消订单
export function cancelOrder(orderId: string) {
  return post(`/orders/${orderId}/cancel`)
}

// 确认收货
export function confirmReceive(orderId: string) {
  return post(`/orders/${orderId}/confirm`)
}

// 申请售后
export function applyRefund(orderId: string, data: { reason: string; images?: string[] }) {
  return post(`/orders/${orderId}/refund`, data)
}

// 提交评价
export function submitReview(orderId: string, data: { rating: number; content: string; images?: string[] }) {
  return post(`/orders/${orderId}/review`, data)
}


// 创建支付（余额支付或微信支付）
export function createPayment(orderId: string, method: 'wechat' | 'balance' = 'wechat') {
  return post<{ orderId: string; paymentNo: string; amount: number; wxPayParams?: any }>('/payments', { orderId, method })
}
