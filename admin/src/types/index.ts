// Product types
export interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  mainImage: string
  images: string[]
  categoryId: string
  description?: string
  detailImages?: string[]
  stock: number
  sales: number
  status: ProductStatus
  specs?: ProductSpec[]
  skus?: ProductSKU[]
  createdAt: string
  updatedAt: string
}

export interface ProductSpec {
  name: string
  values: string[]
}

export interface ProductSKU {
  id: string
  specValues: string[]
  price: number
  stock: number
}

export type ProductStatus = 'draft' | 'on_sale' | 'off_sale'

// Category types
export interface Category {
  id: string
  name: string
  icon?: string
  parentId?: string
  sort: number
  children?: Category[]
}

// Order types
export interface Order {
  id: string
  orderNo: string
  userId: string
  userName?: string
  status: OrderStatus
  totalAmount: number
  payAmount: number
  discountAmount: number
  items: OrderItem[]
  addressSnapshot: Address
  logistics?: Logistics
  remark?: string
  createdAt: string
  paidAt?: string
  shippedAt?: string
  completedAt?: string
}

export interface OrderItem {
  productId: string
  skuId?: string
  productName: string
  productImage: string
  specValues?: string[]
  price: number
  quantity: number
}

export interface Address {
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
}

export interface Logistics {
  company: string
  trackingNo: string
  shippedAt: string
}

export type OrderStatus = 
  | 'pending_payment'
  | 'pending_shipment'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunding'
  | 'refunded'

// User types
export interface User {
  id: string
  openid?: string
  nickname: string
  avatar?: string
  phone?: string
  memberLevel: MemberLevel
  balance: number
  points: number
  createdAt: string
}

export type MemberLevel = 'normal' | 'vip' | 'svip'

// Finance types
export interface FundOverview {
  totalIncome: number
  pendingSettlement: number
  withdrawn: number
  availableBalance: number
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  relatedOrderId?: string
  description: string
  createdAt: string
}

export type TransactionType = 'payment' | 'refund' | 'withdraw' | 'commission'

export interface Withdrawal {
  id: string
  userId: string
  userName?: string
  amount: number
  status: WithdrawalStatus
  createdAt: string
  processedAt?: string
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed'

// Group buy types
export interface GroupBuyActivity {
  id: string
  productId: string
  product?: Product
  groupPrice: number
  originalPrice: number
  requiredCount: number
  timeLimit: number
  startTime: string
  endTime: string
  status: ActivityStatus
  createdAt: string
}

export type ActivityStatus = 'not_started' | 'active' | 'ended'

export interface GroupBuyStats {
  totalGroups: number
  successGroups: number
  failedGroups: number
  totalParticipants: number
  totalSales: number
}

// Material types
export interface Material {
  id: string
  name: string
  url: string
  type: MaterialType
  size: number
  category?: string
  tags?: string[]
  createdAt: string
}

export type MaterialType = 'image' | 'video'

// Home config types
export interface Banner {
  id: string
  image: string
  linkType: LinkType
  linkValue: string
  sort: number
}

export interface CategoryShortcut {
  id: string
  categoryId: string
  name: string
  icon: string
  sort: number
}

export type LinkType = 'product' | 'category' | 'url' | 'none'

// Merchant types
export interface MerchantApplication {
  id: string
  userId: string
  userName?: string
  type: MerchantType
  companyName: string
  contactName: string
  contactPhone: string
  businessLicense?: string
  status: ApplicationStatus
  rejectReason?: string
  createdAt: string
  reviewedAt?: string
}

export type MerchantType = 'store' | 'supplier'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

// Pagination
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface PaginationParams {
  page: number
  pageSize: number
}
