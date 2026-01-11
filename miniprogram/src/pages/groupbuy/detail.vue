<template>
  <view class="groupbuy-detail">
    <!-- 商品图片 -->
    <swiper class="product-swiper" :indicator-dots="true" :circular="true">
      <swiper-item v-for="(image, index) in productImages" :key="index">
        <image class="product-image" :src="getImageUrl(image)" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <!-- 拼团信息 -->
    <view class="groupbuy-info card">
      <view class="price-row">
        <view class="group-price">
          <text class="label">拼团价</text>
          <text class="price">¥{{ formatPrice(activity?.groupPrice) }}</text>
        </view>
        <view class="original-price">
          <text class="label">单独购买</text>
          <text class="price">¥{{ formatPrice(activity?.originalPrice) }}</text>
        </view>
      </view>
      <view class="group-rule">
        <text>{{ activity?.requiredCount }}人成团，{{ activity?.timeLimit }}小时内有效</text>
      </view>
    </view>

    <!-- 商品信息 -->
    <view class="product-info card">
      <text class="product-name">{{ activity?.productName }}</text>
      <text class="product-desc">{{ activity?.productDescription }}</text>
    </view>

    <!-- 进行中的拼团 -->
    <view v-if="activeGroups.length > 0" class="active-groups card">
      <view class="section-title">正在拼团</view>
      <view v-for="group in activeGroups" :key="group.id" class="group-item">
        <view class="group-info">
          <image class="initiator-avatar" :src="group.participants?.[0]?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
          <text class="initiator-name">{{ group.participants?.[0]?.nickname || '用户' }}的团</text>
          <text class="group-count">还差{{ (activity?.requiredCount || 0) - group.currentCount }}人</text>
        </view>
        <view class="join-btn" @click="joinGroup(group.id)">去参团</view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="action-bar safe-bottom">
      <button class="action-btn share" open-type="share">
        <text class="btn-icon">📤</text>
        <text>分享</text>
      </button>
      <view class="action-btn buy-alone" @click="buyAlone">¥{{ formatPrice(activity?.originalPrice) }} 单独购买</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { getGroupBuyDetail, initiateGroupBuy, joinGroupBuy, getAvailableGroups } from '@/api/groupbuy'
import { createOrder } from '@/api/order'
import type { GroupBuyActivity, GroupBuyGroup } from '@/api/groupbuy'
import { formatPrice, navigateTo, showToast, getImageUrl } from '@/utils'

const activity = ref<GroupBuyActivity | null>(null)
const activeGroups = ref<GroupBuyGroup[]>([])
const activityId = ref('')

// 商品图片列表
const productImages = computed(() => {
  if (activity.value?.productImage) {
    return [activity.value.productImage]
  }
  return []
})

onLoad(async (options) => {
  activityId.value = options?.id || ''
  if (activityId.value) {
    await loadActivity(activityId.value)
    await loadAvailableGroups(activityId.value)
  }
})

// 配置分享
onShareAppMessage(() => {
  return {
    title: `${activity.value?.productName} - 拼团价¥${formatPrice(activity.value?.groupPrice)}`,
    path: `/pages/groupbuy/detail?id=${activityId.value}`,
    imageUrl: activity.value?.productImage ? getImageUrl(activity.value.productImage) : ''
  }
})

async function loadActivity(id: string) {
  try {
    const data = await getGroupBuyDetail(id)
    activity.value = data
  } catch (error) {
    console.error('加载拼团活动失败', error)
    showToast('加载失败', 'error')
  }
}

async function loadAvailableGroups(id: string) {
  try {
    const groups = await getAvailableGroups(id)
    activeGroups.value = groups || []
  } catch (error) {
    console.error('加载拼团列表失败', error)
  }
}

async function initiateGroup() {
  if (!activity.value) return
  
  try {
    uni.showLoading({ title: '发起中...' })
    const result = await initiateGroupBuy(activity.value.id)
    uni.hideLoading()
    showToast('拼团发起成功', 'success')
    // 跳转到我的拼团列表
    navigateTo('/pages/groupbuy/list')
  } catch (error: any) {
    uni.hideLoading()
    console.error('发起拼团失败', error)
    showToast(error.message || '发起失败', 'error')
  }
}

async function joinGroup(groupId: string) {
  try {
    uni.showLoading({ title: '参团中...' })
    const result = await joinGroupBuy(groupId)
    uni.hideLoading()
    
    // 检查拼团是否成功（满足人数）
    const isGroupSuccess = result.status === 'success' || 
      (result.currentCount >= (activity.value?.requiredCount || 2))
    
    if (isGroupSuccess) {
      // 拼团成功，弹出支付确认
      uni.showModal({
        title: '🎉 拼团成功',
        content: `恭喜！拼团已成功，可以用拼团价 ¥${formatPrice(activity.value?.groupPrice)} 购买`,
        confirmText: '立即购买',
        cancelText: '稍后购买',
        success: async (res) => {
          if (res.confirm) {
            await createGroupBuyOrder(groupId)
          } else {
            navigateTo('/pages/groupbuy/list')
          }
        }
      })
    } else {
      // 拼团进行中，提示等待
      uni.showModal({
        title: '参团成功',
        content: `已加入拼团，还差${(activity.value?.requiredCount || 2) - result.currentCount}人成团。成团后可用拼团价购买。`,
        confirmText: '邀请好友',
        cancelText: '我知道了',
        success: (res) => {
          if (res.confirm) {
            // 触发分享
          }
          navigateTo('/pages/groupbuy/list')
        }
      })
    }
    
    // 刷新页面显示最新状态
    await loadAvailableGroups(activityId.value)
  } catch (error: any) {
    uni.hideLoading()
    console.error('参团失败', error)
    showToast(error.message || '参团失败', 'error')
  }
}

async function createGroupBuyOrder(groupId: string) {
  if (!activity.value) return
  
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
    
    // 创建拼团订单（使用拼团价）
    const { createOrder } = await import('@/api/order')
    const order = await createOrder({
      items: [{
        productId: activity.value.productId,
        quantity: 1
      }],
      addressId: address.id,
      remark: '',
      groupBuyGroupId: groupId,
      groupBuyPrice: activity.value.groupPrice
    })
    
    uni.hideLoading()
    
    // 跳转到订单详情页进行支付
    navigateTo(`/pages/order/detail?id=${order.id}`)
  } catch (error: any) {
    uni.hideLoading()
    console.error('创建订单失败', error)
    showToast(error.message || '创建订单失败', 'error')
  }
}

async function startGroupBuy() {
  if (!activity.value) return
  
  try {
    uni.showLoading({ title: '发起拼团中...' })
    const result = await initiateGroupBuy(activity.value.id)
    uni.hideLoading()
    showToast('拼团发起成功', 'success')
    // 刷新可参与的拼团列表
    await loadAvailableGroups(activityId.value)
    // 跳转到我的拼团列表
    navigateTo('/pages/groupbuy/list')
  } catch (error: any) {
    uni.hideLoading()
    console.error('发起拼团失败', error)
    showToast(error.message || '发起失败', 'error')
  }
}

async function buyAlone() {
  if (!activity.value) return
  
  // 检查是否有默认地址
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
    
    // 直接创建订单
    const { createOrder } = await import('@/api/order')
    const order = await createOrder({
      items: [{
        productId: activity.value.productId,
        quantity: 1
      }],
      addressId: address.id,
      remark: ''
    })
    
    uni.hideLoading()
    
    // 跳转到订单详情页进行支付
    navigateTo(`/pages/order/detail?id=${order.id}`)
  } catch (error: any) {
    uni.hideLoading()
    console.error('创建订单失败', error)
    showToast(error.message || '创建订单失败', 'error')
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.groupbuy-detail {
  min-height: 100vh;
  background-color: $bg-page;
  padding-bottom: 140rpx;
}

.product-swiper {
  height: 750rpx;
  
  .product-image {
    width: 100%;
    height: 100%;
  }
}

.card {
  background-color: $bg-white;
  border-radius: $radius-md;
  padding: $spacing-base;
}

.groupbuy-info {
  margin: $spacing-base;
  
  .price-row {
    @include flex(row, space-around, center);
    margin-bottom: $spacing-base;
    
    .group-price,
    .original-price {
      @include flex(column, center, center);
      
      .label {
        font-size: $font-sm;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }
      
      .price {
        font-size: $font-xl;
        font-weight: bold;
      }
    }
    
    .group-price .price {
      color: $primary-color;
    }
    
    .original-price .price {
      color: $text-placeholder;
      text-decoration: line-through;
    }
  }
  
  .group-rule {
    text-align: center;
    font-size: $font-sm;
    color: $text-secondary;
    padding-top: $spacing-base;
    @include border-1px($border-color, top);
  }
}

.product-info {
  margin: 0 $spacing-base $spacing-base;
  
  .product-name {
    font-size: $font-md;
    font-weight: bold;
    display: block;
    margin-bottom: $spacing-sm;
  }
  
  .product-desc {
    font-size: $font-sm;
    color: $text-secondary;
    line-height: 1.5;
  }
}

.active-groups {
  margin: 0 $spacing-base $spacing-base;
  
  .section-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-base;
  }
  
  .group-item {
    @include flex-between;
    padding: $spacing-base 0;
    @include border-1px($border-color, bottom);
    
    &:last-child::after {
      display: none;
    }
    
    .group-info {
      @include flex(row, flex-start, center);
      
      .initiator-avatar {
        width: 64rpx;
        height: 64rpx;
        border-radius: 50%;
        margin-right: $spacing-sm;
        background-color: #f0f0f0;
      }
      
      .initiator-name {
        font-size: $font-base;
        margin-right: $spacing-sm;
      }
      
      .group-count {
        font-size: $font-sm;
        color: $primary-color;
      }
    }
    
    .join-btn {
      padding: $spacing-xs $spacing-base;
      background-color: $primary-color;
      color: #fff;
      border-radius: $radius-round;
      font-size: $font-sm;
    }
  }
}

.action-bar {
  @include flex(row, center, center);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background-color: $bg-white;
  padding: 0 $spacing-base;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  gap: $spacing-sm;
  
  .action-btn {
    @include flex-center;
    height: 80rpx;
    border-radius: $radius-round;
    font-size: $font-sm;
    
    &.share {
      width: 120rpx;
      background-color: #f5f5f5;
      color: $text-primary;
      border: none;
      padding: 0;
      margin: 0;
      line-height: 1;
      
      .btn-icon {
        margin-right: 4rpx;
      }
    }
    
    &.buy-alone {
      flex: 1;
      background: linear-gradient(135deg, $primary-color, $primary-light);
      color: #fff;
    }
  }
}
</style>
