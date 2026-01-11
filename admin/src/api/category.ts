import { request } from '@/utils/request'
import type { Category, PaginatedResult, PaginationParams } from '@/types'

export interface CategoryDTO {
  name: string
  icon?: string
  parentId?: string
  sort?: number
}

export const categoryApi = {
  getTree() {
    return request.get<Category[]>('/admin/categories')
  },
  
  getList(params?: PaginationParams) {
    return request.get<PaginatedResult<Category>>('/admin/categories/list', { params })
  },
  
  create(data: CategoryDTO) {
    return request.post<Category>('/admin/categories', data)
  },
  
  update(id: string, data: Partial<CategoryDTO>) {
    return request.put<Category>(`/admin/categories/${id}`, data)
  },
  
  delete(id: string) {
    return request.delete(`/admin/categories/${id}`)
  }
}
