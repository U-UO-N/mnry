import { get, post } from '@/utils/request'
import type { Product } from './product'

export interface GroupBuyActivity {
  id: string
  productId: string
  productName?: string
  productImage?: string
  productDescription?: string
  product?: Product
  groupPrice: number
  originalPrice: number
  requiredCount: number
  timeLimit: number
  startTime: string
  endTime: string
  status: 'not_started' | 'active' | 'ended'
}

export interface GroupBuyGroup {
  id: string
  activityId: string
  initiatorId: string
  status: 'in_progress' | 'success' | 'failed'
  currentCount: number
  expireTime: string
  participants?: { userId: string; nickname?: string; avatar?: string; joinedAt: string }[]
}

export interface GroupBuyOrder {
  id: string
  groupId: string
  userId: string
  activityId: string
  status: 'in_progress' | 'success' | 'failed'
  currentCount: number
  requiredCount: number
  expireTime: string
  participants: { userId: string; nickname: string; avatar: string }[]
}

// 获取拼团活动列表
export function getGroupBuyActivities(page = 1, pageSize = 20) {
  return get<{ items: GroupBuyActivity[]; list?: GroupBuyActivity[]; total: number }>('/group-buy/activities', { page, pageSize })
}

// 获取拼团活动详情
export function getGroupBuyDetail(activityId: string) {
  return get<GroupBuyActivity>(`/group-buy/activities/${activityId}`)
}

// 获取活动可参与的拼团列表
export function getAvailableGroups(activityId: string) {
  return get<GroupBuyGroup[]>(`/group-buy/activities/${activityId}/groups`)
}

// 发起拼团
export function initiateGroupBuy(activityId: string) {
  return post<GroupBuyGroup>('/group-buy/initiate', { activityId })
}

// 参与拼团
export function joinGroupBuy(groupId: string) {
  return post<GroupBuyGroup>(`/group-buy/join/${groupId}`)
}

// 获取我的拼团列表
export function getMyGroupBuys(status?: 'in_progress' | 'success' | 'failed') {
  const params: Record<string, any> = {}
  if (status) {
    params.status = status
  }
  return get<GroupBuyOrder[]>('/group-buy/my', params)
}

// 获取拼团详情
export function getGroupDetail(groupId: string) {
  return get<GroupBuyGroup>(`/group-buy/groups/${groupId}`)
}
