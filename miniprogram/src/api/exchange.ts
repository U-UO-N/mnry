import { get, post } from '@/utils/request'

export interface ExchangeItem {
  id: string
  name: string
  image: string
  pointsCost: number
  stock: number
  type: 'product' | 'coupon'
}

// 获取可兑换商品列表
export function getExchangeItems() {
  return get<ExchangeItem[]>('/exchange/items')
}

// 执行兑换
export function exchangeItem(itemId: string) {
  return post('/exchange', { itemId })
}
