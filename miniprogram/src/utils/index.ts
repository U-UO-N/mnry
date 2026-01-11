// 格式化价格（数据库存的是元，直接显示）
export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null) return '0.00'
  return Number(price).toFixed(2)
}

// 格式化日期
export function formatDate(date: Date | string | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// 防抖
export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  } as T
}

// 节流
export function throttle<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let lastTime = 0
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  } as T
}

// 深拷贝
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (obj instanceof Object) {
    const copy = {} as T
    Object.keys(obj).forEach(key => {
      (copy as any)[key] = deepClone((obj as any)[key])
    })
    return copy
  }
  return obj
}

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 校验手机号
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

// 静态资源基础URL
const STATIC_BASE_URL = 'http://localhost:3001'

// 获取图片完整URL
export function getImageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${STATIC_BASE_URL}${path}`
}

// 显示提示
export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none'): void {
  uni.showToast({
    title,
    icon,
    duration: 2000
  })
}

// 显示确认框
export function showConfirm(content: string, title = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

// 页面跳转
export function navigateTo(url: string): void {
  uni.navigateTo({ url })
}

export function redirectTo(url: string): void {
  uni.redirectTo({ url })
}

export function switchTab(url: string): void {
  uni.switchTab({ url })
}

export function navigateBack(delta = 1): void {
  uni.navigateBack({ delta })
}
