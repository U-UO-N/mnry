# Design Document

## Overview

本设计文档描述签到系统和积分制度的技术实现方案。系统基于现有的后端架构（Express + TypeScript + MySQL）和小程序前端（uni-app + Vue3），扩展签到和积分功能。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    小程序前端 (uni-app)                       │
├─────────────────────────────────────────────────────────────┤
│  签到页面  │  积分页面  │  积分商城  │  个人中心             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 API (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  CheckInController  │  PointsController  │  ExchangeController│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  CheckInService  │  PointsService  │  ExchangeService        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (MySQL)                        │
├─────────────────────────────────────────────────────────────┤
│  check_ins  │  points_records  │  exchange_items/orders      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 签到服务 (CheckInService)

```typescript
interface CheckInService {
  // 获取签到状态
  getCheckInStatus(userId: string): Promise<CheckInStatus>
  
  // 执行签到
  checkIn(userId: string): Promise<CheckInResult>
  
  // 获取签到日历
  getCheckInCalendar(userId: string, year: number, month: number): Promise<CheckIn[]>
  
  // 计算连续签到天数
  calculateConsecutiveDays(userId: string): Promise<number>
}

interface CheckInStatus {
  hasCheckedInToday: boolean
  consecutiveDays: number
  lastCheckInDate: string | null
  todayPoints: number
  nextMilestone: MilestoneInfo | null
}

interface CheckInResult {
  success: boolean
  checkIn?: CheckIn
  pointsEarned: number
  bonusPoints: number  // 里程碑奖励
  consecutiveDays: number
  message: string
}

interface MilestoneInfo {
  days: number
  bonusPoints: number
  daysRemaining: number
}
```

### 2. 积分服务 (PointsService)

```typescript
interface PointsService {
  // 获取用户积分
  getUserPoints(userId: string): Promise<number>
  
  // 添加积分
  addPoints(userId: string, data: AddPointsDTO): Promise<PointsRecord>
  
  // 扣减积分
  deductPoints(userId: string, data: DeductPointsDTO): Promise<PointsRecord>
  
  // 获取积分记录
  getPointsRecords(userId: string, query: RecordQuery): Promise<PaginatedResult<PointsRecord>>
  
  // 计算订单可用积分
  calculateOrderPointsDiscount(userId: string, orderAmount: number): Promise<PointsDiscountInfo>
}

interface AddPointsDTO {
  type: PointsType
  points: number
  description: string
  relatedId?: string
}

interface DeductPointsDTO {
  type: PointsType
  points: number
  description: string
  relatedId?: string
}

interface PointsDiscountInfo {
  availablePoints: number
  maxUsablePoints: number  // 最多可用积分
  maxDiscount: number      // 最多可抵扣金额
}

enum PointsType {
  CHECK_IN = 'check_in',
  PURCHASE = 'purchase',
  REVIEW = 'review',
  SHARE = 'share',
  INVITE = 'invite',
  EXCHANGE = 'exchange',
  ORDER_USE = 'order_use',
  REFUND = 'refund',
  ADMIN_ADJUST = 'admin_adjust'
}
```

### 3. 兑换服务 (ExchangeService)

```typescript
interface ExchangeService {
  // 获取兑换商品列表
  getExchangeItems(query: ExchangeItemQuery): Promise<PaginatedResult<ExchangeItem>>
  
  // 兑换商品
  exchangeItem(userId: string, itemId: string): Promise<ExchangeOrder>
  
  // 获取用户兑换记录
  getUserExchangeOrders(userId: string, query: PaginationQuery): Promise<PaginatedResult<ExchangeOrder>>
}

interface ExchangeItem {
  id: string
  name: string
  image: string
  pointsCost: number
  stock: number
  type: 'product' | 'coupon'
  relatedId?: string
  description?: string
  isActive: boolean
}
```

## Data Models

### 积分类型扩展

```sql
-- 更新 points_records 表的 type 枚举
ALTER TABLE points_records 
MODIFY COLUMN type ENUM(
  'check_in',    -- 签到
  'purchase',    -- 购物
  'review',      -- 评价
  'share',       -- 分享
  'invite',      -- 邀请
  'exchange',    -- 兑换
  'order_use',   -- 订单使用
  'refund',      -- 退款返还
  'admin_adjust' -- 管理员调整
) NOT NULL;
```

### 签到里程碑配置

```typescript
const MILESTONES = [
  { days: 7, bonusPoints: 50 },
  { days: 14, bonusPoints: 100 },
  { days: 30, bonusPoints: 200 }
]

// 积分计算公式
function calculateCheckInPoints(consecutiveDays: number): number {
  const basePoints = 10
  const bonusPerDay = 2
  const maxPoints = 30
  return Math.min(basePoints + (consecutiveDays - 1) * bonusPerDay, maxPoints)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 签到幂等性
*For any* user and any given day, performing check-in multiple times SHALL have the same effect as checking in once - the user receives points only on the first check-in.
**Validates: Requirements 1.2**

### Property 2: 连续签到积分计算正确性
*For any* consecutive day count N (1 ≤ N), the points earned SHALL equal min(10 + (N-1) * 2, 30).
**Validates: Requirements 2.1**

### Property 3: 连续签到中断重置
*For any* user with consecutive days > 0, if they miss a day (no check-in record for yesterday), their consecutive days SHALL reset to 0 or 1 on next check-in.
**Validates: Requirements 2.3**

### Property 4: 积分交易记录完整性
*For any* points transaction (add or deduct), a corresponding points_record SHALL be created with correct type, amount, balance, and description.
**Validates: Requirements 3.5, 4.5**

### Property 5: 积分余额一致性
*For any* user, their current points balance SHALL equal the sum of all their points_records amounts.
**Validates: Requirements 3.5**

### Property 6: 积分使用限制
*For any* order, the maximum points usable SHALL not exceed 50% of the order amount (in points equivalent).
**Validates: Requirements 4.4**

### Property 7: 积分退款返还
*For any* order that uses points and is later refunded, the used points SHALL be returned to the user's balance.
**Validates: Requirements 4.3**

### Property 8: 兑换积分扣减正确性
*For any* successful exchange, the user's points SHALL be deducted by exactly the item's pointsCost.
**Validates: Requirements 5.2**

### Property 9: 库存不足阻止兑换
*For any* exchange item with stock = 0, exchange attempts SHALL fail with appropriate error.
**Validates: Requirements 5.4**

### Property 10: 积分不足阻止操作
*For any* user with points < required amount, points usage or exchange SHALL be rejected.
**Validates: Requirements 4.2, 5.3**

## Error Handling

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| ALREADY_CHECKED_IN | 今日已签到 | 400 |
| INSUFFICIENT_POINTS | 积分不足 | 400 |
| ITEM_OUT_OF_STOCK | 兑换商品已售罄 | 400 |
| ITEM_NOT_FOUND | 兑换商品不存在 | 404 |
| POINTS_LIMIT_EXCEEDED | 超出积分使用限制 | 400 |

## Testing Strategy

### Unit Tests
- 积分计算函数测试
- 连续天数计算测试
- 里程碑判断测试

### Property-Based Tests
使用 fast-check 库进行属性测试：
- 签到幂等性测试
- 积分计算公式测试
- 积分余额一致性测试
- 兑换扣减正确性测试

### Integration Tests
- 签到流程端到端测试
- 积分使用下单流程测试
- 兑换流程测试

