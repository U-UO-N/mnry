import { request } from '@/utils/request'
import type { GroupBuyActivity, GroupBuyStats, PaginatedResult, PaginationParams, ActivityStatus } from '@/types'

export interface GroupBuyQuery extends PaginationParams {
  status?: ActivityStatus
}

export interface GroupBuyDTO {
  productId: string
  groupPrice: number
  originalPrice: number
  requiredCount: number
  timeLimit: number
  startTime: string
  endTime: string
}

export const groupBuyApi = {
  getList(params: GroupBuyQuery) {
    return request.get<PaginatedResult<GroupBuyActivity>>('/admin/group-buy/activities', { params })
  },
  
  getDetail(id: string) {
    return request.get<GroupBuyActivity>(`/admin/group-buy/activities/${id}`)
  },
  
  create(data: GroupBuyDTO) {
    return request.post<GroupBuyActivity>('/admin/group-buy/activities', data)
  },
  
  update(id: string, data: Partial<GroupBuyDTO>) {
    return request.put<GroupBuyActivity>(`/admin/group-buy/activities/${id}`, data)
  },
  
  getStats(id: string) {
    return request.get<GroupBuyStats>(`/admin/group-buy/activities/${id}/stats`)
  },
  
  // 手动开始活动
  start(id: string) {
    return request.post<GroupBuyActivity>(`/admin/group-buy/activities/${id}/start`)
  },
  
  // 手动结束活动
  end(id: string) {
    return request.post<GroupBuyActivity>(`/admin/group-buy/activities/${id}/end`)
  }
}
