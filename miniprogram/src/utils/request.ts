import { useUserStore } from '@/stores/user'

// API基础配置
// 开发环境: http://localhost:3001/api
// 生产环境: https://mnry.asia/api
const BASE_URL = 'https://mnry.asia/api'

// 请求配置接口
interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
}

// 响应数据接口
interface ResponseData<T = any> {
  code: number
  message: string
  data: T
}

// 错误码
const ERROR_CODES = {
  SUCCESS: 0,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
}

// 请求拦截器
function requestInterceptor(config: RequestConfig): RequestConfig {
  const userStore = useUserStore()
  const token = userStore.token
  
  // 添加认证头
  if (token) {
    config.header = {
      ...config.header,
      Authorization: `Bearer ${token}`
    }
  }
  
  return config
}

// 响应拦截器
function responseInterceptor<T>(response: UniApp.RequestSuccessCallbackResult): ResponseData<T> {
  const data = response.data as ResponseData<T>
  
  // 处理业务错误 - 支持 code === 0 或 success === true
  const isSuccess = data.code === ERROR_CODES.SUCCESS || (data as any).success === true
  if (!isSuccess) {
    // 未授权，跳转登录
    if (data.code === ERROR_CODES.UNAUTHORIZED) {
      const userStore = useUserStore()
      userStore.logout()
      uni.navigateTo({ url: '/pages/login/index' })
    }
    
    throw new Error(data.message || '请求失败')
  }
  
  return data
}

// 统一请求方法
export function request<T = any>(config: RequestConfig): Promise<T> {
  return new Promise((resolve, reject) => {
    // 显示加载
    if (config.showLoading !== false) {
      uni.showLoading({
        title: config.loadingText || '加载中...',
        mask: true
      })
    }
    
    // 请求拦截
    const finalConfig = requestInterceptor(config)
    
    uni.request({
      url: `${BASE_URL}${finalConfig.url}`,
      method: finalConfig.method || 'GET',
      data: finalConfig.data,
      header: {
        'Content-Type': 'application/json',
        ...finalConfig.header
      },
      success: (res) => {
        try {
          const data = responseInterceptor<T>(res)
          resolve(data.data)
        } catch (error) {
          uni.showToast({
            title: (error as Error).message,
            icon: 'none'
          })
          reject(error)
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
        reject(new Error(err.errMsg))
      },
      complete: () => {
        if (config.showLoading !== false) {
          uni.hideLoading()
        }
      }
    })
  })
}

// GET请求
export function get<T = any>(url: string, data?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'GET', data, ...config })
}

// POST请求
export function post<T = any>(url: string, data?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'POST', data, ...config })
}

// PUT请求
export function put<T = any>(url: string, data?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'PUT', data, ...config })
}

// DELETE请求
export function del<T = any>(url: string, data?: Record<string, any>, config?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'DELETE', data, ...config })
}

export default { request, get, post, put, del }
