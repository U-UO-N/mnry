<template>
  <view class="history-page">
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
      <view v-if="products.length > 0" class="product-list">
        <view v-for="product in products" :key="product.id" class="product-item" @click="goToProduct(product.productId || product.id)">
          <image class="product-image" :src="getImageUrl(product.productImage || product.mainImage)" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.productName || product.name }}</text>
            <text class="product-price">¥{{ formatPrice(product.productPrice || product.price) }}</text>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty">暂无浏览记录</view>
      <view v-if="loading" class="load-more">加载中...</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getBrowseHistory } from '@/api/user'
import { formatPrice, navigateTo, getImageUrl } from '@/utils'

const products = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

onMounted(() => {
  loadHistory()
})

async function loadHistory() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const { list, total } = await getBrowseHistory(page.value)
    products.value.push(...list)
    hasMore.value = products.value.length < total
    page.value++
  } catch (error) {
    console.error('加载浏览记录失败', error)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  loadHistory()
}

function goToProduct(productId: string) {
  navigateTo(`/pages/product/detail?id=${productId}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.history-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.list-scroll {
  height: 100vh;
  padding: $spacing-base;
}

.product-item {
  @include flex;
  background-color: $bg-white;
  border-radius: $radius-md;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
  
  .product-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-sm;
    margin-right: $spacing-base;
  }
  
  .product-info {
    flex: 1;
    @include flex(column, space-between);
    
    .product-name {
      @include ellipsis(2);
      font-size: $font-base;
    }
    
    .product-price {
      color: $primary-color;
      font-weight: bold;
    }
  }
}

.empty {
  @include flex-center;
  padding: 100rpx 0;
  color: $text-placeholder;
}
</style>
