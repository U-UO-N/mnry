import { get, post, put, del } from '@/utils/request'

// 地址接口
export interface Address {
  id: string
  userId: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// 创建/更新地址参数
export interface AddressDTO {
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault?: boolean
}

// 获取地址列表
export function getAddresses() {
  return get<Address[]>('/address')
}

// 获取默认地址
export function getDefaultAddress() {
  return get<Address | null>('/address/default')
}

// 获取地址详情
export function getAddress(id: string) {
  return get<Address>(`/address/${id}`)
}

// 创建地址
export function createAddress(data: AddressDTO) {
  return post<Address>('/address', data)
}

// 更新地址
export function updateAddress(id: string, data: Partial<AddressDTO>) {
  return put<Address>(`/address/${id}`, data)
}

// 设为默认地址
export function setDefaultAddress(id: string) {
  return put(`/address/${id}/default`)
}

// 删除地址
export function deleteAddress(id: string) {
  return del(`/address/${id}`)
}

// 获取可配送区域
export function getDeliveryAreas() {
  return get<{ areas: any[], provinces: string[] }>('/address/delivery-areas')
}
