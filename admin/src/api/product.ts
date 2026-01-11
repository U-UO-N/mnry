import { request } from '@/utils/request'
import type { Product, PaginatedResult, PaginationParams, ProductStatus } from '@/types'

export interface ProductQuery extends PaginationParams {
  keyword?: string
  categoryId?: string
  status?: ProductStatus
}

export interface ProductDTO {
  name: string
  price: number
  originalPrice?: number
  mainImage: string
  images: string[]
  categoryId: string
  description?: string
  detailImages?: string[]
  stock: number
  specs?: { name: string; values: string[] }[]
  skus?: { specValues: string[]; price: number; stock: number }[]
}

export const productApi = {
  getList(params: ProductQuery) {
    return request.get<PaginatedResult<Product>>('/admin/products', { params })
  },
  
  getDetail(id: string) {
    return request.get<Product>(`/admin/products/${id}`)
  },
  
  create(data: ProductDTO) {
    return request.post<Product>('/admin/products', data)
  },
  
  update(id: string, data: Partial<ProductDTO>) {
    return request.put<Product>(`/admin/products/${id}`, data)
  },
  
  updateStatus(id: string, status: ProductStatus) {
    return request.put(`/admin/products/${id}/status`, { status })
  },
  
  delete(id: string) {
    return request.delete(`/admin/products/${id}`)
  }
}
