import { get } from '@/utils/request'
import type { Product } from './product'

export interface Banner {
  id: string
  image: string
  linkType: 'product' | 'category' | 'url' | 'none'
  linkValue: string
  sort: number
}

export interface CategoryShortcut {
  id: string
  categoryId: string
  name: string
  icon: string
  sort: number
}

export interface GroupBuyActivity {
  id: string
  productId: string
  productName: string
  productImage: string
  originalPrice: number
  groupPrice: number
  requiredCount: number
  timeLimit: number
  startTime: string
  endTime: string
  status: string
}

// 获取轮播图
export function getBanners() {
  return get<Banner[]>('/home/banners')
}

// 获取热门商品
export function getHotProducts() {
  return get<Product[]>('/home/hot-products')
}

// 获取分类快捷入口
export function getCategoryShortcuts() {
  return get<CategoryShortcut[]>('/home/category-shortcuts')
}

// 获取首页拼团活动
export function getGroupBuyActivities(limit = 4) {
  return get<GroupBuyActivity[]>('/home/group-buy', { limit })
}
