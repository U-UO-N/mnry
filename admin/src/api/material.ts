import { request } from '@/utils/request'
import type { Material, PaginatedResult, PaginationParams, MaterialType } from '@/types'

export interface MaterialQuery extends PaginationParams {
  type?: MaterialType
  category?: string
}

export const materialApi = {
  getList(params: MaterialQuery) {
    return request.get<PaginatedResult<Material>>('/admin/materials', { params })
  },
  
  // 上传文件到服务器
  upload(file: File, _category?: string, _tags?: string[]) {
    const formData = new FormData()
    formData.append('file', file)
    
    return request.post<{ url: string; filename: string; originalname: string; size: number }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  delete(id: string) {
    return request.delete(`/admin/materials/${id}`)
  }
}
