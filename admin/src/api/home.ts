import { request } from '@/utils/request'
import type { Banner, CategoryShortcut, Product } from '@/types'

export interface HomeConfig {
  banners: Banner[]
  hotProductIds: string[]
  categoryShortcuts: CategoryShortcut[]
}

export interface BannerDTO {
  image: string
  linkType: string
  linkValue: string
  sort: number
}

export interface CategoryShortcutDTO {
  categoryId: string
  name: string
  icon: string
  sort: number
}

export const homeApi = {
  getConfig() {
    return request.get<HomeConfig>('/admin/home/config')
  },
  
  updateBanners(banners: BannerDTO[]) {
    return request.put('/admin/home/banners', { banners })
  },
  
  updateHotProducts(productIds: string[]) {
    return request.put('/admin/home/hot-products', { productIds })
  },
  
  updateCategoryShortcuts(shortcuts: CategoryShortcutDTO[]) {
    return request.put('/admin/home/category-shortcuts', { shortcuts })
  }
}
