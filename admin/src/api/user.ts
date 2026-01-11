import { request } from '@/utils/request'
import type { User, PaginatedResult, PaginationParams, MerchantApplication, ApplicationStatus } from '@/types'

export interface UserQuery extends PaginationParams {
  keyword?: string
  memberLevel?: string
}

export interface AdjustPointsDTO {
  points: number
  reason: string
}

export interface AdjustBalanceDTO {
  amount: number
  reason: string
}

export interface AdjustMemberLevelDTO {
  memberLevel: string
  reason: string
}

export interface ReviewDTO {
  approved: boolean
  reason?: string
}

export const userApi = {
  getList(params: UserQuery) {
    return request.get<PaginatedResult<User>>('/admin/users', { params })
  },
  
  getDetail(id: string) {
    return request.get<User>(`/admin/users/${id}`)
  },
  
  adjustPoints(id: string, data: AdjustPointsDTO) {
    return request.put(`/admin/users/${id}/points`, data)
  },
  
  adjustBalance(id: string, data: AdjustBalanceDTO) {
    return request.put(`/admin/users/${id}/balance`, data)
  },
  
  adjustMemberLevel(id: string, data: AdjustMemberLevelDTO) {
    return request.put(`/admin/users/${id}/member-level`, data)
  },
  
  getMerchantApplications(params: PaginationParams & { status?: ApplicationStatus }) {
    return request.get<PaginatedResult<MerchantApplication>>('/admin/merchant/applications', { params })
  },
  
  reviewApplication(id: string, data: ReviewDTO) {
    return request.post(`/admin/merchant/applications/${id}/review`, data)
  }
}
