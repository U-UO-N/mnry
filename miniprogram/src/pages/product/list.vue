<template>
  <view class="product-list-page">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view 
        :class="['filter-item', { active: sortType === 'default' }]"
        @click="setSort('default')"
      >
        综合
      </view>
      <view 
        :class="['filter-item', { active: sortType === 'sales' }]"
        @click="setSort('sales')"
      >
        销量
      </view>
      <view 
        :class="['filter-item', { active: sortType.startsWith('price') }]"
        @click="togglePriceSort"
      >
        价格
        <text v-if="sortType === 'price_asc'">↑</text>
        <text v-else-if="sortType === 'price_desc'">↓</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <scroll-view class="product-scroll" scroll-y @scrolltolower="loadMore">
      <view class="product-grid">
        <view 
          v-for="product in products" 
          :key="product.id" 
          class="product-card"
          @click="goToProduct(product.id)"
        >
          <image class="product-image" :src="getImageUrl(product.mainImage)" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <view class="product-bottom">
              <text class="product-price">¥{{ formatPrice(product.price) }}</text>
              <text class="product-sales">已售{{ product.sales }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="loading" class="load-more">加载中...</view>
      <view v-else-if="!hasMore && products.length > 0" class="load-more">没有更多了</view>
      <view v-else-if="products.length === 0 && !loading" class="empty">
        <text class="empty-text">暂无商品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProducts } from '@/api/product'
import type { Product } from '@/api/product'
import { formatPrice, navigateTo, getImageUrl } from '@/utils'

const products = ref<Product[]>([])
const categoryId = ref('')
const sortType = ref('default')
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

onLoad(async (options) => {
  categoryId.value = options?.categoryId || ''
  await loadProducts()
})

async function loadProducts() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const { list, total } = await getProducts({
      categoryId: categoryId.value,
      page: page.value,
      pageSize: 20,
      sort: sortType.value
    })
    
    if (page.value === 1) {
      products.value = list
    } else {
      products.value.push(...list)
    }
    
    hasMore.value = products.value.length < total
    page.value++
  } catch (error) {
    console.error('加载商品失败', error)
  } finally {
    loading.value = false
  }
}

function setSort(type: string) {
  if (sortType.value === type) return
  sortType.value = type
  resetAndLoad()
}

function togglePriceSort() {
  if (sortType.value === 'price_asc') {
    sortType.value = 'price_desc'
  } else {
    sortType.value = 'price_asc'
  }
  resetAndLoad()
}

function resetAndLoad() {
  page.value = 1
  hasMore.value = true
  products.value = []
  loadProducts()
}

function loadMore() {
  loadProducts()
}

function goToProduct(productId: string) {
  navigateTo(`/pages/product/detail?id=${productId}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.product-list-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.filter-bar {
  @include flex(row, space-around, center);
  height: 88rpx;
  background-color: $bg-white;
  
  .filter-item {
    font-size: $font-base;
    color: $text-secondary;
    
    &.active {
      color: $primary-color;
      font-weight: bold;
    }
  }
}

.product-scroll {
  height: calc(100vh - 88rpx);
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  padding: $spacing-sm;
  
  .product-card {
    width: calc(50% - #{$spacing-sm});
    margin: $spacing-xs;
    background-color: $bg-white;
    border-radius: $radius-md;
    overflow: hidden;
    
    .product-image {
      width: 100%;
      height: 340rpx;
    }
    
    .product-info {
      padding: $spacing-sm;
      
      .product-name {
        @include ellipsis(2);
        font-size: $font-base;
        color: $text-primary;
        line-height: 1.4;
        height: 80rpx;
      }
      
      .product-bottom {
        @include flex-between;
        margin-top: $spacing-xs;
        
        .product-price {
          color: $primary-color;
          font-size: $font-md;
          font-weight: bold;
        }
        
        .product-sales {
          font-size: $font-xs;
          color: $text-placeholder;
        }
      }
    }
  }
}

.empty {
  @include flex-center;
  padding: 100rpx 0;
  
  .empty-text {
    color: $text-placeholder;
    font-size: $font-base;
  }
}
</style>
