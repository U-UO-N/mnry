import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  nickname: string
  avatar: string
  phone?: string
  memberLevel: 'normal' | 'vip' | 'svip'
  balance: number
  points: number
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string>(uni.getStorageSync('token') || '')
  const userInfo = ref<User | null>(null)
  
  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  
  // 设置token
  function setToken(newToken: string) {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }
  
  // 设置用户信息
  function setUserInfo(info: User) {
    userInfo.value = info
  }
  
  // 登出
  function logout() {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
  }
  
  // 更新余额
  function updateBalance(amount: number) {
    if (userInfo.value) {
      userInfo.value.balance = amount
    }
  }
  
  // 更新积分
  function updatePoints(points: number) {
    if (userInfo.value) {
      userInfo.value.points = points
    }
  }
  
  return {
    token,
    userInfo,
    isLoggedIn,
    setToken,
    setUserInfo,
    logout,
    updateBalance,
    updatePoints
  }
})
