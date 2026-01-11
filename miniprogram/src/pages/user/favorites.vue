<template>
  <view class="favorites-page">
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
      <view v-if="products.length > 0" class="product-list">
        <view v-for="product in products" :key="product.id" class="product-item">
          <image class="product-image" :src="getImageUrl(product.productImage || product.mainImage)" mode="aspectFill" @click="goToProduct(product.productId || product.id)" />
          <view class="product-info" @click="goToProduct(product.productId || product.id)">
            <text class="product-name">{{ product.productName || product.name }}</text>
            <text class="product-price">¥{{ formatPrice(product.productPrice || product.price) }}</text>
          </view>
          <view class="remove-btn" @click="handleRemoveFavorite(product.productId || product.id)">取消收藏</view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty">暂无收藏</view>
      <view v-if="loading" class="load-more">加载中...</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFavorites, removeFavorite as removeFavoriteApi } from '@/api/user'
import { formatPrice, navigateTo, showToast, getImageUrl } from '@/utils'

const products = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

onMounted(() => {
  loadFavorites()
})

async function loadFavorites() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const { list, total } = await getFavorites(page.value)
    products.value.push(...list)
    hasMore.value = products.value.length < total
    page.value++
  } catch (error) {
    console.error('加载收藏失败', error)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  loadFavorites()
}

function goToProduct(productId: string) {
  navigateTo(`/pages/product/detail?id=${productId}`)
}

async function handleRemoveFavorite(productId: string) {
  try {
    await removeFavoriteApi(productId)
    products.value = products.value.filter(p => (p.productId || p.id) !== productId)
    showToast('已取消收藏')
  } catch (error) {
    console.error('取消收藏失败', error)
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.favorites-page {
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
  
  .remove-btn {
    font-size: $font-sm;
    color: $text-placeholder;
    align-self: flex-end;
  }
}

.empty {
  @include flex-center;
  padding: 100rpx 0;
  color: $text-placeholder;
}
</style>
