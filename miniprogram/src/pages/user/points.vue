<template>
  <view class="points-page">
    <view class="points-card">
      <text class="label">我的积分</text>
      <text class="amount">{{ points }}</text>
      <view class="points-actions">
        <view class="action-btn" @click="goToCheckIn">签到领积分</view>
        <view class="action-btn" @click="goToExchange">积分兑换</view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view 
        v-for="tab in filterTabs" 
        :key="tab.value"
        :class="['tab-item', { active: currentFilter === tab.value }]"
        @click="changeFilter(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view class="record-list">
      <view v-for="record in records" :key="record.id" class="record-item">
        <view class="record-info">
          <text class="record-title">{{ record.description }}</text>
          <text class="record-time">{{ formatDate(record.createdAt) }}</text>
          <text class="record-type">{{ getTypeLabel(record.type) }}</text>
        </view>
        <text :class="['record-amount', record.points > 0 ? 'income' : 'expense']">
          {{ record.points > 0 ? '+' : '' }}{{ record.points }}
        </text>
      </view>
      
      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMore">
        {{ loading ? '加载中...' : '加载更多' }}
      </view>
      
      <view v-if="records.length === 0 && !loading" class="empty">暂无记录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPoints, getPointsRecords } from '@/api/user'
import { formatDate, navigateTo } from '@/utils'

const points = ref(0)
const records = ref<any[]>([])
const currentFilter = ref('all')
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loading = ref(false)

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '获取', value: 'income' },
  { label: '消费', value: 'expense' }
]

// 积分类型标签映射
const typeLabels: Record<string, string> = {
  check_in: '签到',
  purchase: '购物',
  review: '评价',
  share: '分享',
  invite: '邀请',
  exchange: '兑换',
  order_use: '订单抵扣',
  refund: '退款返还',
  admin_adjust: '系统调整',
  milestone: '里程碑奖励'
}

function getTypeLabel(type: string): string {
  return typeLabels[type] || type
}

onMounted(async () => {
  await loadPoints()
  await loadRecords()
})

async function loadPoints() {
  try {
    const data = await getPoints()
    points.value = data.points
  } catch (error) {
    console.error('加载积分信息失败', error)
  }
}

async function loadRecords(reset = true) {
  if (loading.value) return
  
  loading.value = true
  try {
    if (reset) {
      page.value = 1
      records.value = []
    }
    
    const recordsData = await getPointsRecords(page.value, pageSize)
    let list = recordsData.list || []
    
    // 根据筛选条件过滤
    if (currentFilter.value === 'income') {
      list = list.filter((r: any) => r.points > 0)
    } else if (currentFilter.value === 'expense') {
      list = list.filter((r: any) => r.points < 0)
    }
    
    if (reset) {
      records.value = list
    } else {
      records.value = [...records.value, ...list]
    }
    
    hasMore.value = list.length >= pageSize
  } catch (error) {
    console.error('加载积分记录失败', error)
  } finally {
    loading.value = false
  }
}

function changeFilter(filter: string) {
  currentFilter.value = filter
  loadRecords(true)
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  loadRecords(false)
}

function goToCheckIn() {
  navigateTo('/pages/user/checkin')
}

function goToExchange() {
  navigateTo('/pages/user/exchange')
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.points-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.points-card {
  @include flex(column, center, center);
  background: linear-gradient(135deg, $warning-color, #ffc107);
  padding: $spacing-lg;
  color: #fff;
  
  .label {
    font-size: $font-sm;
    opacity: 0.9;
    margin-bottom: $spacing-sm;
  }
  
  .amount {
    font-size: 64rpx;
    font-weight: bold;
    margin-bottom: $spacing-md;
  }
  
  .points-actions {
    @include flex(row, center, center);
    gap: $spacing-base;
    
    .action-btn {
      padding: $spacing-xs $spacing-base;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: $radius-round;
      font-size: $font-sm;
    }
  }
}

.filter-tabs {
  @include flex(row, flex-start, center);
  background-color: $bg-white;
  padding: $spacing-sm $spacing-base;
  
  .tab-item {
    padding: $spacing-xs $spacing-base;
    margin-right: $spacing-sm;
    font-size: $font-base;
    color: $text-secondary;
    border-radius: $radius-round;
    
    &.active {
      background-color: rgba($primary-color, 0.1);
      color: $primary-color;
    }
  }
}

.record-list {
  background-color: $bg-white;
  margin-top: 2rpx;
  
  .record-item {
    @include flex-between;
    padding: $spacing-base;
    @include border-1px($border-color, bottom);
    
    .record-info {
      flex: 1;
      
      .record-title {
        font-size: $font-base;
        display: block;
        margin-bottom: $spacing-xs;
      }
      
      .record-time {
        font-size: $font-sm;
        color: $text-placeholder;
        margin-right: $spacing-sm;
      }
      
      .record-type {
        font-size: $font-xs;
        color: $text-placeholder;
        background-color: $bg-gray;
        padding: 2rpx 8rpx;
        border-radius: $radius-sm;
      }
    }
    
    .record-amount {
      font-size: $font-md;
      font-weight: bold;
      
      &.income {
        color: $success-color;
      }
      
      &.expense {
        color: $text-primary;
      }
    }
  }
  
  .load-more {
    @include flex-center;
    padding: $spacing-base;
    color: $text-placeholder;
    font-size: $font-sm;
  }
  
  .empty {
    @include flex-center;
    padding: $spacing-lg;
    color: $text-placeholder;
  }
}
</style>
