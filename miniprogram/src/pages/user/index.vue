<template>
  <view class="user-page">
    <!-- 未登录状态 -->
    <view v-if="!userStore.isLoggedIn" class="login-card">
      <view class="login-content">
        <view class="login-avatar-placeholder">👤</view>
        <text class="login-tip">登录后享受更多服务</text>
        <view class="login-btn" @click="handleLogin">
          立即登录
        </view>
      </view>
    </view>

    <!-- 已登录状态 - 用户信息卡片 -->
    <view v-else class="user-card">
      <view class="user-info" @click="goToSettings">
        <view v-if="!userInfo?.avatar" class="avatar-placeholder">👤</view>
        <image v-else class="avatar" :src="userInfo.avatar" mode="aspectFill" />
        <view class="info">
          <text class="nickname">{{ userInfo?.nickname || '用户' }}</text>
          <text class="user-id">ID: {{ userInfo?.id?.slice(0, 8) || '--' }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      
      <!-- 资产信息 -->
      <view class="assets">
        <view class="asset-item" @click="goToBalance">
          <text class="asset-value">{{ formatPrice(userInfo?.balance || 0) }}</text>
          <text class="asset-label">余额</text>
        </view>
        <view class="asset-item" @click="goToPoints">
          <text class="asset-value">{{ userInfo?.points || 0 }}</text>
          <text class="asset-label">积分</text>
        </view>
        <view class="asset-item" @click="goToCoupons">
          <text class="asset-value">{{ couponCount }}</text>
          <text class="asset-label">优惠券</text>
        </view>
      </view>
    </view>

    <!-- 订单入口 -->
    <view class="order-section card">
      <view class="section-header" @click="goToOrders()">
        <text class="section-title">我的订单</text>
        <text class="view-all">查看全部 ›</text>
      </view>
      <view class="order-tabs">
        <view class="tab-item" @click="goToOrders('pending_payment')">
          <text class="tab-icon">💳</text>
          <text class="tab-text">待支付</text>
        </view>
        <view class="tab-item" @click="goToOrders('pending_shipment')">
          <text class="tab-icon">📦</text>
          <text class="tab-text">待发货</text>
        </view>
        <view class="tab-item" @click="goToOrders('shipped')">
          <text class="tab-icon">🚚</text>
          <text class="tab-text">待收货</text>
        </view>
        <view class="tab-item" @click="goToOrders('refunding')">
          <text class="tab-icon">🔄</text>
          <text class="tab-text">售后</text>
        </view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="menu-section card">
      <view class="menu-item" @click="goToAddresses">
        <text class="menu-icon">📍</text>
        <text class="menu-text">收货地址</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToFavorites">
        <text class="menu-icon">❤️</text>
        <text class="menu-text">我的收藏</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToHistory">
        <text class="menu-icon">👁️</text>
        <text class="menu-text">浏览记录</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToReviews">
        <text class="menu-icon">💬</text>
        <text class="menu-text">我的评论</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToCheckIn">
        <text class="menu-icon">📅</text>
        <text class="menu-text">签到</text>
        <view v-if="!hasCheckedIn" class="red-dot"></view>
        <text class="menu-extra" v-if="continuousDays > 0">连续{{ continuousDays }}天</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToExchange">
        <text class="menu-icon">🎁</text>
        <text class="menu-text">兑换中心</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToGroupBuy">
        <text class="menu-icon">👥</text>
        <text class="menu-text">我的拼团</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- B端入口 -->
    <view class="menu-section card">
      <view class="menu-item" @click="goToStoreApply">
        <text class="menu-icon">🏪</text>
        <text class="menu-text">门店申请</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToSupplierApply">
        <text class="menu-icon">🏭</text>
        <text class="menu-text">供应商申请</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 - 只在已登录时显示 -->
    <view v-if="userStore.isLoggedIn" class="logout-section">
      <view class="logout-btn" @click="handleLogout">
        退出登录
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { getUserInfo, getCoupons, devLogin, getCheckInStatus } from '@/api/user'
import { formatPrice, navigateTo, showToast } from '@/utils'

const userStore = useUserStore()
const couponCount = ref(0)
const hasCheckedIn = ref(true)
const continuousDays = ref(0)

const userInfo = computed(() => userStore.userInfo)

onShow(async () => {
  if (userStore.isLoggedIn) {
    await loadUserData()
  }
})

async function handleLogin() {
  console.log('handleLogin 被调用')
  try {
    // 开发模式：直接使用devLogin
    console.log('正在调用 devLogin API...')
    const result = await devLogin()
    console.log('devLogin 返回结果:', result)
    userStore.setToken(result.token)
    userStore.setUserInfo(result.user)
    showToast('登录成功', 'success')
    await loadUserData()
  } catch (error) {
    console.error('登录失败', error)
    showToast('登录失败')
  }
}

async function loadUserData() {
  try {
    const [user, coupons, checkInStatus] = await Promise.all([
      getUserInfo(),
      getCoupons('available'),
      getCheckInStatus().catch(() => ({ checkedIn: true, continuousDays: 0 }))
    ])
    userStore.setUserInfo(user)
    couponCount.value = coupons.length
    hasCheckedIn.value = checkInStatus.checkedIn || checkInStatus.hasCheckedInToday || false
    continuousDays.value = checkInStatus.continuousDays || 0
  } catch (error) {
    console.error('加载用户数据失败', error)
  }
}

function goToSettings() {
  // navigateTo('/pages/user/settings')
}

function goToAddresses() {
  navigateTo('/pages/user/address/list')
}

function goToBalance() {
  navigateTo('/pages/user/balance')
}

function goToPoints() {
  navigateTo('/pages/user/points')
}

function goToCoupons() {
  navigateTo('/pages/user/coupons')
}

function goToOrders(status?: string) {
  const url = status ? `/pages/order/list?status=${status}` : '/pages/order/list'
  navigateTo(url)
}

function goToFavorites() {
  navigateTo('/pages/user/favorites')
}

function goToHistory() {
  navigateTo('/pages/user/history')
}

function goToReviews() {
  navigateTo('/pages/user/reviews')
}

function goToCheckIn() {
  navigateTo('/pages/user/checkin')
}

function goToExchange() {
  navigateTo('/pages/user/exchange')
}

function goToGroupBuy() {
  navigateTo('/pages/groupbuy/list')
}

function goToStoreApply() {
  navigateTo('/pages/merchant/store-apply')
}

function goToSupplierApply() {
  navigateTo('/pages/merchant/supplier-apply')
}

function handleLogout() {
  console.log('handleLogout 被调用')
  userStore.logout()
  showToast('已退出登录')
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.user-page {
  min-height: 100vh;
  background-color: $bg-page;
  padding: $spacing-base;
  padding-bottom: 200rpx;
}

.login-card {
  background: linear-gradient(135deg, $primary-color, $primary-light);
  border-radius: $radius-lg;
  padding: $spacing-xl;
  
  .login-content {
    @include flex(column, center, center);
    
    .login-avatar-placeholder {
      width: 160rpx;
      height: 160rpx;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.3);
      border: 4rpx solid rgba(255, 255, 255, 0.3);
      margin-bottom: $spacing-base;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80rpx;
    }
    
    .login-tip {
      color: rgba(255, 255, 255, 0.9);
      font-size: $font-base;
      margin-bottom: $spacing-lg;
    }
    
    .login-btn {
      background-color: #fff;
      color: $primary-color;
      padding: $spacing-sm $spacing-xl;
      border-radius: $radius-round;
      font-size: $font-base;
      font-weight: bold;
    }
  }
}

.user-card {
  background: linear-gradient(135deg, $primary-color, $primary-light);
  border-radius: $radius-lg;
  padding: $spacing-lg;
  color: #fff;
  
  .user-info {
    @include flex(row, flex-start, center);
    margin-bottom: $spacing-lg;
    
    .avatar {
      width: 120rpx;
      height: 120rpx;
      border-radius: 50%;
      border: 4rpx solid rgba(255, 255, 255, 0.3);
      margin-right: $spacing-base;
    }
    
    .avatar-placeholder {
      width: 120rpx;
      height: 120rpx;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.3);
      border: 4rpx solid rgba(255, 255, 255, 0.3);
      margin-right: $spacing-base;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60rpx;
    }
    
    .info {
      flex: 1;
      
      .nickname {
        font-size: $font-lg;
        font-weight: bold;
        display: block;
        margin-bottom: $spacing-xs;
      }
      
      .user-id {
        font-size: $font-sm;
        opacity: 0.8;
      }
    }
    
    .arrow {
      font-size: $font-xl;
      opacity: 0.8;
    }
  }
  
  .assets {
    @include flex(row, space-around, center);
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: $radius-md;
    padding: $spacing-base 0;
    
    .asset-item {
      @include flex(column, center, center);
      
      .asset-value {
        font-size: $font-lg;
        font-weight: bold;
        margin-bottom: $spacing-xs;
      }
      
      .asset-label {
        font-size: $font-sm;
        opacity: 0.8;
      }
    }
  }
}

.order-section {
  margin-top: $spacing-base;
  
  .section-header {
    @include flex-between;
    padding-bottom: $spacing-base;
    @include border-1px($border-color, bottom);
    
    .section-title {
      font-size: $font-md;
      font-weight: bold;
    }
    
    .view-all {
      font-size: $font-sm;
      color: $text-placeholder;
    }
  }
  
  .order-tabs {
    @include flex(row, space-around, center);
    padding-top: $spacing-base;
    
    .tab-item {
      @include flex(column, center, center);
      
      .tab-icon {
        font-size: 48rpx;
        margin-bottom: $spacing-xs;
      }
      
      .tab-text {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }
  }
}

.menu-section {
  margin-top: $spacing-base;
  
  .menu-item {
    @include flex(row, flex-start, center);
    padding: $spacing-base 0;
    @include border-1px($border-color, bottom);
    
    &:last-child::after {
      display: none;
    }
    
    .menu-icon {
      font-size: 40rpx;
      margin-right: $spacing-base;
    }
    
    .menu-text {
      flex: 1;
      font-size: $font-base;
      color: $text-primary;
    }
    
    .menu-extra {
      font-size: $font-sm;
      color: $primary-color;
      margin-right: $spacing-sm;
    }
    
    .red-dot {
      width: 16rpx;
      height: 16rpx;
      background-color: #ff4d4f;
      border-radius: 50%;
      margin-right: $spacing-sm;
    }
    
    .menu-arrow {
      font-size: $font-lg;
      color: $text-placeholder;
    }
  }
}

.logout-section {
  margin-top: $spacing-lg;
  padding: 0 $spacing-base;
  
  .logout-btn {
    @include flex-center;
    height: 88rpx;
    background-color: $bg-white;
    border-radius: $radius-md;
    color: #ff4d4f;
    font-size: $font-base;
  }
}
</style>
