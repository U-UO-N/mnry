<template>
  <view class="coupons-page">
    <view class="status-tabs">
      <view 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="['tab-item', { active: currentTab === tab.value }]"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <scroll-view class="coupon-scroll" scroll-y>
      <view v-if="coupons.length > 0" class="coupon-list">
        <view v-for="coupon in coupons" :key="coupon.id" :class="['coupon-card', coupon.status]">
          <view class="coupon-left">
            <text class="coupon-value">
              <text v-if="coupon.type === 'fixed'">¥</text>
              {{ coupon.value }}
              <text v-if="coupon.type === 'percent'">%</text>
            </text>
            <text class="coupon-condition">满{{ coupon.minAmount }}可用</text>
          </view>
          <view class="coupon-right">
            <text class="coupon-name">{{ coupon.name }}</text>
            <text class="coupon-time">{{ formatDate(coupon.endTime) }}到期</text>
          </view>
          <view v-if="coupon.status !== 'available'" class="coupon-mask">
            {{ coupon.status === 'used' ? '已使用' : '已过期' }}
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无优惠券</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCoupons } from '@/api/user'
import { formatDate } from '@/utils'

const tabs = [
  { label: '可用', value: 'available' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' }
]

const currentTab = ref('available')
const coupons = ref<any[]>([])

onMounted(() => {
  loadCoupons()
})

async function loadCoupons() {
  try {
    const data = await getCoupons(currentTab.value as any)
    coupons.value = data
  } catch (error) {
    console.error('加载优惠券失败', error)
  }
}

function switchTab(value: string) {
  currentTab.value = value
  loadCoupons()
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.coupons-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.status-tabs {
  @include flex(row, space-around, center);
  height: 88rpx;
  background-color: $bg-white;
  
  .tab-item {
    font-size: $font-base;
    color: $text-secondary;
    
    &.active {
      color: $primary-color;
      font-weight: bold;
    }
  }
}

.coupon-scroll {
  height: calc(100vh - 88rpx);
  padding: $spacing-base;
}

.coupon-card {
  @include flex;
  background-color: $bg-white;
  border-radius: $radius-md;
  margin-bottom: $spacing-base;
  overflow: hidden;
  position: relative;
  
  .coupon-left {
    @include flex(column, center, center);
    width: 200rpx;
    padding: $spacing-base;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: #fff;
    
    .coupon-value {
      font-size: $font-xxl;
      font-weight: bold;
    }
    
    .coupon-condition {
      font-size: $font-xs;
      opacity: 0.9;
    }
  }
  
  .coupon-right {
    flex: 1;
    padding: $spacing-base;
    
    .coupon-name {
      font-size: $font-md;
      font-weight: bold;
      display: block;
      margin-bottom: $spacing-sm;
    }
    
    .coupon-time {
      font-size: $font-sm;
      color: $text-placeholder;
    }
  }
  
  &.used,
  &.expired {
    .coupon-left {
      background: $text-disabled;
    }
  }
  
  .coupon-mask {
    position: absolute;
    top: 20rpx;
    right: -40rpx;
    width: 160rpx;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: $font-xs;
    padding: $spacing-xs 0;
    transform: rotate(45deg);
  }
}

.empty {
  @include flex-center;
  padding: 100rpx 0;
  color: $text-placeholder;
}
</style>
