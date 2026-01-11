import { get, post } from '@/utils/request'

export interface MerchantApplication {
  id: string
  type: 'store' | 'supplier'
  status: 'pending' | 'approved' | 'rejected'
  data: Record<string, any>
  createdAt: string
  reviewedAt?: string
  rejectReason?: string
}

// 门店申请
export function applyStore(data: {
  storeName: string
  contactName: string
  contactPhone: string
  address: string
  businessLicense?: string
}) {
  return post('/merchant/apply/store', data)
}

// 供应商申请
export function applySupplier(data: {
  companyName: string
  contactName: string
  contactPhone: string
  businessLicense: string
  productCategories: string[]
}) {
  return post('/merchant/apply/supplier', data)
}

// 获取申请状态
export function getApplicationStatus() {
  return get<MerchantApplication | null>('/merchant/application/status')
}
