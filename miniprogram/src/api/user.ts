import { get, post, put, del } from '@/utils/request'
import type { User } from '@/stores/user'

// 微信登录
export function wxLogin(code: string) {
  return post<{ token: string; user: User }>('/user/login', { code })
}

// 开发模式登录（不需要微信）
export function devLogin(phone?: string) {
  return post<{ token: string; user: User; isNew: boolean }>('/user/dev-login', { phone })
}

// 获取用户信息
export function getUserInfo() {
  return get<User>('/user/info')
}

// 更新用户信息
export function updateUserInfo(data: Partial<User>) {
  return put<User>('/user/info', data)
}

// 获取余额信息
export function getBalance() {
  return get<{ balance: number; records: any[] }>('/user/balance')
}

// 获取余额明细
export function getBalanceRecords(page = 1, pageSize = 20) {
  return get<{ list: any[]; total: number }>('/user/balance/records', { page, pageSize })
}

// 充值余额
export function rechargeBalance(amount: number) {
  return post<{ record: any; balance: number }>('/user/balance/recharge', { amount })
}

// 获取积分信息
export function getPoints() {
  return get<{ points: number; records: any[] }>('/user/points')
}

// 获取积分明细
export function getPointsRecords(page = 1, pageSize = 20) {
  return get<{ list: any[]; total: number }>('/user/points/records', { page, pageSize })
}

// 获取优惠券列表
export function getCoupons(status?: 'available' | 'used' | 'expired') {
  return get<any[]>('/user/coupons', { status })
}

// 签到状态
export function getCheckInStatus() {
  return get<{
    hasCheckedInToday: boolean
    consecutiveDays: number
    lastCheckInDate: string | null
    todayPoints: number
    nextMilestone: { days: number; bonusPoints: number; daysRemaining: number } | null
    calendar: any[]
  }>('/check-in/status')
}

// 执行签到
export function checkIn() {
  return post<{
    checkIn: any
    pointsEarned: number
    bonusPoints: number
    totalPoints: number
    consecutiveDays: number
    milestone: { days: number; bonusPoints: number; daysRemaining: number } | null
  }>('/check-in')
}

// 获取收藏列表
export async function getFavorites(page = 1, pageSize = 20) {
  const result = await get<{ items: any[]; total: number }>('/user/favorites', { page, pageSize })
  // 后端返回 items，前端期望 list，做兼容处理
  return {
    list: (result as any).list || result.items || [],
    total: result.total || 0
  }
}

// 添加收藏
export function addFavorite(productId: string) {
  return post('/user/favorites', { productId })
}

// 取消收藏
export function removeFavorite(productId: string) {
  return del(`/user/favorites/${productId}`)
}

// 获取浏览记录
export async function getBrowseHistory(page = 1, pageSize = 20) {
  const result = await get<{ items: any[]; total: number }>('/user/browse-history', { page, pageSize })
  // 后端返回 items，前端期望 list，做兼容处理
  return {
    list: (result as any).list || result.items || [],
    total: result.total || 0
  }
}

// 记录浏览历史
export function recordBrowseHistory(productId: string) {
  return post('/user/browse-history', { productId })
}

// 获取我的评论
export function getMyReviews(page = 1, pageSize = 20) {
  return get<{ list: any[]; total: number }>('/user/reviews', { page, pageSize })
}

// 生成分享链接
export function generateShareLink(productId: string) {
  return get<{ shareUrl: string }>(`/share/${productId}`)
}
