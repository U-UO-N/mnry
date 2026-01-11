<template>
  <view class="reviews-page">
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
      <view v-if="reviews.length > 0" class="review-list">
        <view v-for="review in reviews" :key="review.id" class="review-item">
          <view class="review-header">
            <image class="product-image" :src="review.productImage" mode="aspectFill" />
            <text class="product-name">{{ review.productName }}</text>
          </view>
          <view class="review-content">
            <view class="rating">
              <text v-for="i in 5" :key="i" :class="['star', { active: i <= review.rating }]">★</text>
            </view>
            <text class="content">{{ review.content }}</text>
            <view v-if="review.images?.length" class="review-images">
              <image v-for="(img, index) in review.images" :key="index" :src="img" mode="aspectFill" />
            </view>
            <text class="review-time">{{ formatDate(review.createdAt) }}</text>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty">暂无评论</view>
      <view v-if="loading" class="load-more">加载中...</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMyReviews } from '@/api/user'
import { formatDate } from '@/utils'

const reviews = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

onMounted(() => {
  loadReviews()
})

async function loadReviews() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const { list, total } = await getMyReviews(page.value)
    reviews.value.push(...list)
    hasMore.value = reviews.value.length < total
    page.value++
  } catch (error) {
    console.error('加载评论失败', error)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  loadReviews()
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.reviews-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.list-scroll {
  height: 100vh;
  padding: $spacing-base;
}

.review-item {
  background-color: $bg-white;
  border-radius: $radius-md;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
  
  .review-header {
    @include flex(row, flex-start, center);
    margin-bottom: $spacing-base;
    
    .product-image {
      width: 80rpx;
      height: 80rpx;
      border-radius: $radius-sm;
      margin-right: $spacing-sm;
    }
    
    .product-name {
      @include ellipsis;
      flex: 1;
      font-size: $font-sm;
      color: $text-secondary;
    }
  }
  
  .review-content {
    .rating {
      margin-bottom: $spacing-sm;
      
      .star {
        color: $text-disabled;
        font-size: $font-md;
        
        &.active {
          color: $warning-color;
        }
      }
    }
    
    .content {
      font-size: $font-base;
      line-height: 1.5;
      margin-bottom: $spacing-sm;
    }
    
    .review-images {
      @include flex(row, flex-start, center);
      flex-wrap: wrap;
      margin-bottom: $spacing-sm;
      
      image {
        width: 160rpx;
        height: 160rpx;
        border-radius: $radius-sm;
        margin-right: $spacing-sm;
        margin-bottom: $spacing-sm;
      }
    }
    
    .review-time {
      font-size: $font-sm;
      color: $text-placeholder;
    }
  }
}

.empty {
  @include flex-center;
  padding: 100rpx 0;
  color: $text-placeholder;
}
</style>
