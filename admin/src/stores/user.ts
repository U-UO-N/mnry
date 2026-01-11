import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AdminUser {
  id: string
  username: string
  nickname: string
  avatar?: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<AdminUser | null>(null)
  const token = ref<string>(localStorage.getItem('admin_token') || '')

  const setUser = (userData: AdminUser) => {
    user.value = userData
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('admin_token', newToken)
  }

  const logout = () => {
    user.value = null
    token.value = ''
    localStorage.removeItem('admin_token')
  }

  return {
    user,
    token,
    setUser,
    setToken,
    logout
  }
})
