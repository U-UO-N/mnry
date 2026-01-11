<template>
  <view class="groupbuy-index">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="title">拼团活动</text>
      <text class="subtitle">超值拼团，人多更优惠</text>
    </view>

    <!-- 活动列表 -->
    <scroll-view class="activity-list" scroll-y @scrolltolower="loadMore">
      <view v-if="activities.length > 0">
        <view 
          v-for="activity in activities" 
          :key="activity.id" 
          class="activity-card"
          @click="goToDetail(activity.id)"
        >
          <!-- 商品图片 -->
          <image class="product-image" :src="getImageUrl(activity.productImage)" mode="aspectFill" />
          
          <!-- 活动信息 -->
          <view class="activity-info">
            <text class="product-name">{{ activity.productName }}</text>
            
            <view class="price-row">
              <view class="group-price">
                <text class="label">拼团价</text>
                <text class="price">¥{{ formatPrice(activity.groupPrice) }}</text>
              </view>
              <view class="original-price">
                <text class="label">原价</text>
                <text class="price">¥{{ formatPrice(activity.originalPrice) }}</text>
              </view>
            </view>
            
            <view class="activity-meta">
              <text class="rule">{{ activity.requiredCount }}人成团</text>
              <text class="time-limit">{{ activity.timeLimit }}小时有效</text>
            </view>
            
            <!-- 参与按钮 -->
            <view class="join-btn">参与拼团</view>
          </view>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>
      
      <!-- 空状态 -->
      <view v-else-if="activities.length === 0" class="empty">
        <text class="empty-icon">🛒</text>
        <text class="empty-text">暂无拼团活动</text>
      </view>
      
      <!-- 没有更多 -->
      <view v-else-if="!hasMore" class="no-more">
        <text>— 没有更多了 —</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getGroupBuyActivities } from '@/api/groupbuy'
import type { GroupBuyActivity } from '@/api/groupbuy'
import { formatPrice, navigateTo, getImageUrl } from '@/utils'

const activities = ref<GroupBuyActivity[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10

onShow(() => {
  // 每次显示页面时刷新数据
  page.value = 1
  hasMore.value = true
  loadActivities(true)
})

async function loadActivities(refresh = false) {
  if (loading.value) return
  if (!refresh && !hasMore.value) return
  
  loading.value = true
  try {
    const result = await getGroupBuyActivities(page.value, pageSize)
    const list = result.list || result.items || []
    
    if (refresh) {
      activities.value = list
    } else {
      activities.value = [...activities.value, ...list]
    }
    
    hasMore.value = list.length >= pageSize
  } catch (error) {
    console.error('加载拼团活动失败', error)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (hasMore.value && !loading.value) {
    page.value++
    loadActivities()
  }
}

function goToDetail(activityId: string) {
  navigateTo(`/pages/groupbuy/detail?id=${activityId}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.groupbuy-index {
  min-height: 100vh;
  background-color: $bg-page;
}

.page-header {
  background: linear-gradient(135deg, $primary-color, $primary-light);
  padding: 40rpx $spacing-base;
  color: #fff;
  
  .title {
    font-size: 40rpx;
    font-weight: bold;
    display: block;
    margin-bottom: 8rpx;
  }
  
  .subtitle {
    font-size: $font-sm;
    opacity: 0.9;
  }
}

.activity-list {
  height: calc(100vh - 140rpx);
  padding: $spacing-base;
}

.activity-card {
  @include flex(row, flex-start, stretch);
  background-color: $bg-white;
  border-radius: $radius-md;
  overflow: hidden;
  margin-bottom: $spacing-base;
  
  .product-image {
    width: 240rpx;
    height: 240rpx;
    flex-shrink: 0;
  }
  
  .activity-info {
    flex: 1;
    padding: $spacing-base;
    @include flex(column, space-between, flex-start);
    
    .product-name {
      font-size: $font-md;
      font-weight: bold;
      color: $text-primary;
      @include ellipsis(2);
      line-height: 1.4;
    }
    
    .price-row {
      @include flex(row, flex-start, center);
      gap: $spacing-base;
      margin: $spacing-sm 0;
      
      .group-price,
      .original-price {
        .label {
          font-size: $font-xs;
          color: $text-secondary;
          margin-right: 4rpx;
        }
        
        .price {
          font-size: $font-md;
          font-weight: bold;
        }
      }
      
      .group-price .price {
        color: $primary-color;
      }
      
      .original-price .price {
        color: $text-placeholder;
        text-decoration: line-through;
        font-size: $font-sm;
        font-weight: normal;
      }
    }
    
    .activity-meta {
      @include flex(row, flex-start, center);
      gap: $spacing-sm;
      
      .rule,
      .time-limit {
        font-size: $font-xs;
        color: $text-secondary;
        background-color: $bg-gray;
        padding: 4rpx 12rpx;
        border-radius: $radius-sm;
      }
    }
    
    .join-btn {
      align-self: flex-end;
      padding: $spacing-xs $spacing-base;
      background: linear-gradient(135deg, $primary-color, $primary-light);
      color: #fff;
      border-radius: $radius-round;
      font-size: $font-sm;
      margin-top: $spacing-sm;
    }
  }
}

.loading,
.empty,
.no-more {
  @include flex-center;
  padding: 60rpx 0;
  color: $text-placeholder;
  font-size: $font-sm;
}

.empty {
  flex-direction: column;
  
  .empty-icon {
    font-size: 80rpx;
    margin-bottom: $spacing-base;
  }
  
  .empty-text {
    font-size: $font-base;
  }
}
</style>
