<template>
  <view class="groupbuy-list">
    <!-- 状态Tab -->
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

    <!-- 拼团列表 -->
    <scroll-view class="list-scroll" scroll-y>
      <view v-if="groups.length > 0" class="group-list">
        <view v-for="item in groups" :key="item.id" class="group-card" @click="goToDetail(item)">
          <!-- 商品信息 -->
          <view class="product-row">
            <image class="product-image" :src="getImageUrl(item.productImage)" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ item.productName }}</text>
              <view class="price-row">
                <text class="group-price">拼团价 ¥{{ formatPrice(item.activity?.groupPrice) }}</text>
              </view>
            </view>
          </view>
          
          <!-- 拼团状态 -->
          <view class="group-status-row">
            <view class="status-left">
              <text :class="['status-tag', item.group?.status]">{{ getStatusText(item.group?.status) }}</text>
              <text class="count-text">{{ item.group?.currentCount || 0 }}/{{ item.activity?.requiredCount || 0 }}人</text>
            </view>
            <text class="expire-time">{{ formatExpireTime(item.group?.expireTime) }}</text>
          </view>
          
          <!-- 参与者头像 -->
          <view class="participants-row">
            <view class="participants">
              <view 
                v-for="i in (item.activity?.requiredCount || 2)" 
                :key="i"
                :class="['participant-slot', { filled: i <= (item.group?.currentCount || 0) }]"
              >
                <text v-if="i > (item.group?.currentCount || 0)">?</text>
              </view>
            </view>
            <text v-if="item.group?.status === 'in_progress'" class="need-text">
              还差{{ (item.activity?.requiredCount || 0) - (item.group?.currentCount || 0) }}人成团
            </text>
          </view>
          
          <!-- 操作按钮 -->
          <view v-if="item.group?.status === 'in_progress'" class="group-actions">
            <button class="share-btn" open-type="share" @click.stop="setShareData(item)">邀请好友参团</button>
          </view>
          <view v-else-if="item.group?.status === 'success'" class="group-actions">
            <view class="success-tip">🎉 拼团成功！可用拼团价购买</view>
            <view class="pay-btn" @click.stop="goToPay(item)">¥{{ formatPrice(item.activity?.groupPrice) }} 立即购买</view>
          </view>
        </view>
      </view>
      
      <view v-else class="empty">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无拼团记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onShareAppMessage } from '@dcloudio/uni-app'
import { getMyGroupBuys } from '@/api/groupbuy'
import { formatPrice, navigateTo, getImageUrl } from '@/utils'

interface MyGroupBuyItem {
  id: string
  groupId: string
  userId: string
  activityId: string
  orderId: string | null
  status: string
  productName: string
  productImage: string
  activity?: {
    id: string
    groupPrice: number
    originalPrice: number
    requiredCount: number
    timeLimit: number
  }
  group?: {
    id: string
    status: string
    currentCount: number
    expireTime: string
  }
}

const tabs = [
  { label: '全部', value: '' },
  { label: '进行中', value: 'in_progress' },
  { label: '已成功', value: 'success' },
  { label: '已失败', value: 'failed' }
]

const currentTab = ref('')
const groups = ref<MyGroupBuyItem[]>([])
const currentShareItem = ref<MyGroupBuyItem | null>(null)

onShow(async () => {
  await loadGroups()
})

// 配置分享
onShareAppMessage(() => {
  if (currentShareItem.value) {
    return {
      title: `${currentShareItem.value.productName} - 拼团价¥${formatPrice(currentShareItem.value.activity?.groupPrice)}，快来一起拼！`,
      path: `/pages/groupbuy/detail?id=${currentShareItem.value.activityId}`,
      imageUrl: currentShareItem.value.productImage ? getImageUrl(currentShareItem.value.productImage) : ''
    }
  }
  return {
    title: '超值拼团，快来参与！',
    path: '/pages/groupbuy/index'
  }
})

async function loadGroups() {
  try {
    const status = currentTab.value || undefined
    const data = await getMyGroupBuys(status as any)
    groups.value = data as any || []
  } catch (error) {
    console.error('加载拼团列表失败', error)
    groups.value = []
  }
}

function switchTab(value: string) {
  currentTab.value = value
  loadGroups()
}

function getStatusText(status?: string) {
  const map: Record<string, string> = {
    'in_progress': '拼团中',
    'success': '拼团成功',
    'failed': '拼团失败'
  }
  return map[status || ''] || status || ''
}

function formatExpireTime(time?: string) {
  if (!time) return ''
  const expire = new Date(time)
  const now = new Date()
  const diff = expire.getTime() - now.getTime()
  
  if (diff <= 0) return '已过期'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `剩余${days}天`
  }
  
  return `剩余${hours}小时${minutes}分`
}

function setShareData(item: MyGroupBuyItem) {
  currentShareItem.value = item
}

function goToDetail(item: MyGroupBuyItem) {
  navigateTo(`/pages/groupbuy/detail?id=${item.activityId}`)
}

async function goToPay(item: MyGroupBuyItem) {
  // 直接创建拼团订单
  try {
    uni.showLoading({ title: '创建订单...' })
    
    // 获取默认地址
    const { getDefaultAddress } = await import('@/api/address')
    let address = null
    try {
      address = await getDefaultAddress()
    } catch (e) {
      // 没有默认地址
    }
    
    if (!address) {
      uni.hideLoading()
      uni.showModal({
        title: '提示',
        content: '请先添加收货地址',
        confirmText: '去添加',
        success: (res) => {
          if (res.confirm) {
            navigateTo('/pages/user/address/edit')
          }
        }
      })
      return
    }
    
    // 获取活动详情以获取商品ID
    const { getGroupBuyDetail } = await import('@/api/groupbuy')
    const activity = await getGroupBuyDetail(item.activityId)
    
    // 创建拼团订单（使用拼团价）
    const { createOrder } = await import('@/api/order')
    const order = await createOrder({
      items: [{
        productId: activity.productId,
        quantity: 1
      }],
      addressId: address.id,
      remark: '',
      groupBuyGroupId: item.groupId,
      groupBuyPrice: item.activity?.groupPrice
    })
    
    uni.hideLoading()
    
    // 跳转到订单详情页进行支付
    navigateTo(`/pages/order/detail?id=${order.id}`)
  } catch (error: any) {
    uni.hideLoading()
    console.error('创建订单失败', error)
    uni.showToast({ title: error.message || '创建订单失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.groupbuy-list {
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
    padding: $spacing-sm $spacing-base;
    
    &.active {
      color: $primary-color;
      font-weight: bold;
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background-color: $primary-color;
        border-radius: 2rpx;
      }
    }
  }
}

.list-scroll {
  height: calc(100vh - 88rpx);
  padding: $spacing-base;
}

.group-card {
  background-color: $bg-white;
  border-radius: $radius-md;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
  
  .product-row {
    @include flex(row, flex-start, center);
    margin-bottom: $spacing-base;
    
    .product-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: $radius-sm;
      margin-right: $spacing-base;
      background-color: #f5f5f5;
    }
    
    .product-info {
      flex: 1;
      
      .product-name {
        font-size: $font-md;
        font-weight: bold;
        color: $text-primary;
        display: block;
        @include ellipsis(2);
        line-height: 1.4;
        margin-bottom: $spacing-sm;
      }
      
      .price-row {
        .group-price {
          font-size: $font-base;
          color: $primary-color;
          font-weight: bold;
        }
      }
    }
  }
  
  .group-status-row {
    @include flex-between;
    margin-bottom: $spacing-sm;
    
    .status-left {
      @include flex(row, flex-start, center);
      gap: $spacing-sm;
      
      .status-tag {
        padding: 4rpx 16rpx;
        border-radius: $radius-sm;
        font-size: $font-xs;
        
        &.in_progress {
          background-color: rgba($primary-color, 0.1);
          color: $primary-color;
        }
        
        &.success {
          background-color: rgba(#52c41a, 0.1);
          color: #52c41a;
        }
        
        &.failed {
          background-color: rgba($text-placeholder, 0.1);
          color: $text-placeholder;
        }
      }
      
      .count-text {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }
    
    .expire-time {
      font-size: $font-sm;
      color: $text-placeholder;
    }
  }
  
  .participants-row {
    @include flex-between;
    padding: $spacing-sm 0;
    
    .participants {
      @include flex(row, flex-start, center);
      
      .participant-slot {
        @include flex-center;
        width: 56rpx;
        height: 56rpx;
        border-radius: 50%;
        background-color: #f0f0f0;
        margin-right: 8rpx;
        font-size: $font-sm;
        color: $text-placeholder;
        
        &.filled {
          background: linear-gradient(135deg, $primary-color, $primary-light);
          color: #fff;
          
          &::before {
            content: '✓';
          }
        }
      }
    }
    
    .need-text {
      font-size: $font-sm;
      color: $primary-color;
    }
  }
  
  .group-actions {
    margin-top: $spacing-base;
    padding-top: $spacing-base;
    @include border-1px($border-color, top);
    
    .share-btn,
    .pay-btn {
      @include flex-center;
      height: 72rpx;
      border-radius: $radius-round;
      font-size: $font-base;
    }
    
    .share-btn {
      background-color: $primary-color;
      color: #fff;
      border: none;
      padding: 0;
      margin: 0;
      line-height: 72rpx;
    }
    
    .success-tip {
      text-align: center;
      font-size: $font-sm;
      color: #52c41a;
      margin-bottom: $spacing-sm;
    }
    
    .pay-btn {
      background: linear-gradient(135deg, #ff9500, #ff6b35);
      color: #fff;
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
    font-size: $font-base;
  }
}
</style>
