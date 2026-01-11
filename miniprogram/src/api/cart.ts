import { get, post, put, del } from '@/utils/request'
import type { CartItem } from '@/stores/cart'

// 购物车摘要
interface CartSummary {
  items: CartItem[]
  totalQuantity: number
  selectedQuantity: number
  totalPrice: number
  selectedPrice: number
}

// 获取购物车列表
export function getCart() {
  return get<CartSummary>('/cart')
}

// 添加商品到购物车
export function addToCart(data: { productId: string; skuId: string; quantity: number }) {
  return post<CartItem>('/cart', data)
}

// 更新购物车商品数量
export function updateCartItem(itemId: string, quantity: number) {
  return put<CartItem>(`/cart/${itemId}`, { quantity })
}

// 删除购物车商品
export function removeCartItem(itemId: string) {
  return del(`/cart/${itemId}`)
}

// 获取购物车商品数量
export function getCartCount() {
  return get<{ count: number }>('/cart/count')
}
