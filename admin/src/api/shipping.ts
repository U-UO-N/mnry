import request from '@/utils/request'

// 获取所有省份及其配送状态
export function getProvinces() {
  return request.get('/admin/shipping/provinces')
}

// 批量更新省份配送状态
export function updateProvinces(provinces: { name: string; isEnabled: boolean }[]) {
  return request.put('/admin/shipping/provinces', { provinces })
}

// 获取所有省份列表
export function getAllProvinces() {
  return request.get('/admin/shipping/all-provinces')
}

// 获取运费模板列表
export function getTemplates() {
  return request.get('/admin/shipping/templates')
}

// 获取运费模板详情
export function getTemplate(id: string) {
  return request.get(`/admin/shipping/templates/${id}`)
}

// 创建运费模板
export function createTemplate(data: any) {
  return request.post('/admin/shipping/templates', data)
}

// 更新运费模板
export function updateTemplate(id: string, data: any) {
  return request.put(`/admin/shipping/templates/${id}`, data)
}

// 删除运费模板
export function deleteShippingTemplate(id: string) {
  return request.delete(`/admin/shipping/templates/${id}`)
}

// 获取配送区域
export function getDeliveryAreas() {
  return request.get('/admin/shipping/delivery-areas')
}

// 创建/更新配送区域
export function upsertDeliveryArea(data: any) {
  return request.post('/admin/shipping/delivery-areas', data)
}
