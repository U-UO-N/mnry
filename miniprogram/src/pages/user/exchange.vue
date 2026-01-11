<template>
  <view class="exchange-page">
    <view class="points-header">
      <text class="label">可用积分</text>
      <text class="points">{{ userPoints }}</text>
      <view class="header-actions">
        <view class="action-btn" @click="goToPoints">积分明细</view>
        <view class="action-btn" @click="goToOrders">兑换记录</view>
      </view>
    </view>

    <view class="exchange-list">
      <view v-for="item in items" :key="item.id" class="exchange-item">
        <view class="item-badge" v-if="item.stock <= 0">已兑完</view>
        <view class="item-badge hot" v-else-if="item.stock <= 10">即将售罄</view>
        <image class="item-image" :src="getImageUrl(item.image)" mode="aspectFill" />
        <view class="item-info">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-desc" v-if="item.description">{{ item.description }}</text>
          <view class="item-bottom">
            <view class="item-points-wrap">
              <text class="item-points">{{ item.pointsCost }}</text>
              <text class="item-points-label">积分</text>
            </view>
            <view class="item-stock" v-if="item.stock > 0">库存: {{ item.stock }}</view>
            <view 
              :class="['exchange-btn', { 
                disabled: userPoints < item.pointsCost || item.stock <= 0,
                'out-of-stock': item.stock <= 0
              }]"
              @click="doExchange(item)"
            >
              {{ getButtonText(item) }}
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="items.length === 0 && !loading" class="empty">
        <text class="empty-icon">🎁</text>
        <text class="empty-text">暂无可兑换商品</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { getExchangeItems, exchangeItem } from '@/api/exchange'
import { getUserInfo } from '@/api/user'
import type { ExchangeItem } from '@/api/exchange'
import { showConfirm, showToast, getImageUrl, navigateTo } from '@/utils'

const userStore = useUserStore()
const userPoints = ref(userStore.userInfo?.points || 0)
const items = ref<ExchangeItem[]>([])
const loading = ref(false)

onShow(async () => {
  await loadUserPoints()
  await loadItems()
})

async function loadUserPoints() {
  try {
    const user = await getUserInfo()
    userPoints.value = user.points || 0
    userStore.setUserInfo(user)
  } catch (error) {
    console.error('加载用户积分失败', error)
  }
}

async function loadItems() {
  loading.value = true
  try {
    const data = await getExchangeItems()
    items.value = data
  } catch (error) {
    console.error('加载兑换商品失败', error)
  } finally {
    loading.value = false
  }
}

function getButtonText(item: ExchangeItem): string {
  if (item.stock <= 0) return '已兑完'
  if (userPoints.value < item.pointsCost) return '积分不足'
  return '立即兑换'
}

async function doExchange(item: ExchangeItem) {
  if (userPoints.value < item.pointsCost) {
    showToast('积分不足，快去签到赚积分吧')
    return
  }
  
  if (item.stock <= 0) {
    showToast('该商品已兑完')
    return
  }
  
  const confirmed = await showConfirm(
    `确定使用 ${item.pointsCost} 积分兑换「${item.name}」？\n\n兑换后积分将立即扣除，不可退还。`
  )
  if (!confirmed) return
  
  try {
    await exchangeItem(item.id)
    userPoints.value -= item.pointsCost
    userStore.updatePoints(userPoints.value)
    
    // 更新库存
    const index = items.value.findIndex(i => i.id === item.id)
    if (index !== -1) {
      items.value[index].stock -= 1
    }
    
    showToast('兑换成功', 'success')
  } catch (error: any) {
    console.error('兑换失败', error)
    showToast(error.message || '兑换失败')
  }
}

function goToPoints() {
  navigateTo('/pages/user/points')
}

function goToOrders() {
  // TODO: 兑换记录页面
  showToast('功能开发中')
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.exchange-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.points-header {
  @include flex(column, center, center);
  background: linear-gradient(135deg, $warning-color, #ffc107);
  padding: $spacing-lg;
  color: #fff;
  
  .label {
    font-size: $font-sm;
    opacity: 0.9;
    margin-bottom: $spacing-xs;
  }
  
  .points {
    font-size: 56rpx;
    font-weight: bold;
    margin-bottom: $spacing-md;
  }
  
  .header-actions {
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

.exchange-list {
  padding: $spacing-base;
  
  .exchange-item {
    @include flex;
    background-color: $bg-white;
    border-radius: $radius-md;
    padding: $spacing-base;
    margin-bottom: $spacing-base;
    position: relative;
    overflow: hidden;
    
    .item-badge {
      position: absolute;
      top: 16rpx;
      left: -30rpx;
      background-color: $text-disabled;
      color: #fff;
      font-size: $font-xs;
      padding: 4rpx 40rpx;
      transform: rotate(-45deg);
      
      &.hot {
        background-color: #ff4d4f;
      }
    }
    
    .item-image {
      width: 180rpx;
      height: 180rpx;
      border-radius: $radius-sm;
      margin-right: $spacing-base;
    }
    
    .item-info {
      flex: 1;
      @include flex(column, space-between);
      
      .item-name {
        font-size: $font-md;
        color: $text-primary;
        font-weight: bold;
      }
      
      .item-desc {
        font-size: $font-sm;
        color: $text-secondary;
        margin-top: $spacing-xs;
        @include ellipsis(2);
      }
      
      .item-bottom {
        @include flex(row, flex-start, center);
        flex-wrap: wrap;
        gap: $spacing-sm;
        margin-top: $spacing-sm;
        
        .item-points-wrap {
          @include flex(row, flex-start, baseline);
          
          .item-points {
            color: $warning-color;
            font-size: $font-lg;
            font-weight: bold;
          }
          
          .item-points-label {
            color: $warning-color;
            font-size: $font-sm;
            margin-left: 4rpx;
          }
        }
        
        .item-stock {
          font-size: $font-xs;
          color: $text-placeholder;
        }
        
        .exchange-btn {
          margin-left: auto;
          padding: $spacing-xs $spacing-base;
          background-color: $primary-color;
          color: #fff;
          border-radius: $radius-round;
          font-size: $font-sm;
          
          &.disabled {
            background-color: $text-disabled;
          }
          
          &.out-of-stock {
            background-color: $bg-gray;
            color: $text-placeholder;
          }
        }
      }
    }
  }
  
  .empty {
    @include flex(column, center, center);
    padding: 100rpx 0;
    
    .empty-icon {
      font-size: 80rpx;
      margin-bottom: $spacing-base;
    }
    
    .empty-text {
      color: $text-placeholder;
    }
  }
}
</style>
