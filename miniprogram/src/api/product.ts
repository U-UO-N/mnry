import { get } from '@/utils/request'

export interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  mainImage: string
  images: string[]
  categoryId: string
  stock: number
  sales: number
  status: string
}

export interface ProductDetail extends Product {
  description: string
  detailImages: string[]
  specs: { name: string; values: string[] }[]
  skus: {
    id: string
    specValues: string[]
    price: number
    stock: number
  }[]
}

export interface Category {
  id: string
  name: string
  icon?: string
  parentId?: string
  sort: number
  children?: Category[]
}

// 获取分类列表
export function getCategories() {
  return get<Category[]>('/categories')
}

// 获取子分类
export function getSubCategories(parentId: string) {
  return get<Category[]>(`/categories/${parentId}/children`)
}

// 获取完整分类树（包含所有层级）
export function getCategoryTree() {
  return get<Category[]>('/categories/tree')
}

// 获取商品列表
export function getProducts(params: {
  categoryId?: string
  page?: number
  pageSize?: number
  sort?: string
}) {
  return get<{ items: Product[]; list: Product[]; total: number }>('/products', params)
    .then(res => ({
      items: res.items || res.list || [],
      list: res.items || res.list || [],
      total: res.total || 0
    }))
}

// 获取商品详情
export function getProductDetail(productId: string) {
  return get<ProductDetail>(`/products/${productId}`)
}

// 搜索商品
export function searchProducts(keyword: string, page = 1, pageSize = 20) {
  return get<{ items: Product[]; list: Product[]; total: number }>('/products/search', { keyword, page, pageSize })
    .then(res => ({
      list: res.items || res.list || [],
      total: res.total || 0
    }))
}
