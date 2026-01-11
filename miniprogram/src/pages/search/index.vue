<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-header">
      <view class="search-input-wrap">
        <input 
          class="search-input"
          v-model="keyword"
          placeholder="搜索商品"
          confirm-type="search"
          @confirm="doSearch"
          focus
        />
        <text v-if="keyword" class="clear-btn" @click="clearKeyword">×</text>
      </view>
      <text class="cancel-btn" @click="goBack">取消</text>
    </view>

    <!-- 搜索结果 -->
    <scroll-view 
      v-if="hasSearched" 
      class="search-result" 
      scroll-y 
      @scrolltolower="loadMore"
    >
      <view v-if="products.length > 0" class="product-list">
        <view 
          v-for="product in products" 
          :key="product.id" 
          class="product-item"
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
      
      <view v-else class="empty">
        <text class="empty-text">未找到相关商品</text>
      </view>
      
      <view v-if="loading" class="load-more">加载中...</view>
      <view v-else-if="!hasMore && products.length > 0" class="load-more">没有更多了</view>
    </scroll-view>

    <!-- 搜索历史 -->
    <view v-else class="search-history">
      <view v-if="history.length > 0" class="history-header">
        <text class="history-title">搜索历史</text>
        <text class="clear-history" @click="clearHistory">清空</text>
      </view>
      <view class="history-tags">
        <text 
          v-for="(item, index) in history" 
          :key="index" 
          class="history-tag"
          @click="searchByHistory(item)"
        >
          {{ item }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchProducts } from '@/api/product'
import type { Product } from '@/api/product'
import { formatPrice, navigateTo, navigateBack, getImageUrl } from '@/utils'

const keyword = ref('')
const products = ref<Product[]>([])
const hasSearched = ref(false)
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const history = ref<string[]>([])

const HISTORY_KEY = 'search_history'

onMounted(() => {
  loadHistory()
})

function loadHistory() {
  const saved = uni.getStorageSync(HISTORY_KEY)
  if (saved) {
    history.value = JSON.parse(saved)
  }
}

function saveHistory(kw: string) {
  const list = history.value.filter(item => item !== kw)
  list.unshift(kw)
  if (list.length > 10) list.pop()
  history.value = list
  uni.setStorageSync(HISTORY_KEY, JSON.stringify(list))
}

function clearHistory() {
  history.value = []
  uni.removeStorageSync(HISTORY_KEY)
}

async function doSearch() {
  if (!keyword.value.trim()) return
  
  saveHistory(keyword.value.trim())
  hasSearched.value = true
  page.value = 1
  hasMore.value = true
  products.value = []
  
  await loadProducts()
}

async function loadProducts() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const { list, total } = await searchProducts(keyword.value, page.value)
    
    if (page.value === 1) {
      products.value = list
    } else {
      products.value.push(...list)
    }
    
    hasMore.value = products.value.length < total
    page.value++
  } catch (error) {
    console.error('搜索失败', error)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  loadProducts()
}

function searchByHistory(kw: string) {
  keyword.value = kw
  doSearch()
}

function clearKeyword() {
  keyword.value = ''
  hasSearched.value = false
  products.value = []
}

function goToProduct(productId: string) {
  navigateTo(`/pages/product/detail?id=${productId}`)
}

function goBack() {
  navigateBack()
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.search-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.search-header {
  @include flex(row, flex-start, center);
  padding: $spacing-base;
  background-color: $bg-white;
  
  .search-input-wrap {
    flex: 1;
    @include flex(row, flex-start, center);
    height: 72rpx;
    background-color: $bg-gray;
    border-radius: $radius-round;
    padding: 0 $spacing-base;
    position: relative;
    
    .search-input {
      flex: 1;
      height: 100%;
      font-size: $font-base;
    }
    
    .clear-btn {
      font-size: $font-lg;
      color: $text-placeholder;
      padding: 0 $spacing-sm;
    }
  }
  
  .cancel-btn {
    margin-left: $spacing-base;
    font-size: $font-base;
    color: $text-secondary;
  }
}

.search-result {
  height: calc(100vh - 120rpx);
}

.product-list {
  padding: $spacing-base;
  
  .product-item {
    @include flex;
    background-color: $bg-white;
    border-radius: $radius-md;
    padding: $spacing-base;
    margin-bottom: $spacing-base;
    
    .product-image {
      width: 200rpx;
      height: 200rpx;
      border-radius: $radius-sm;
      margin-right: $spacing-base;
    }
    
    .product-info {
      flex: 1;
      @include flex(column, space-between);
      
      .product-name {
        @include ellipsis(2);
        font-size: $font-base;
        color: $text-primary;
        line-height: 1.4;
      }
      
      .product-bottom {
        @include flex-between;
        
        .product-price {
          color: $primary-color;
          font-size: $font-md;
          font-weight: bold;
        }
        
        .product-sales {
          font-size: $font-sm;
          color: $text-placeholder;
        }
      }
    }
  }
}

.search-history {
  padding: $spacing-base;
  
  .history-header {
    @include flex-between;
    margin-bottom: $spacing-base;
    
    .history-title {
      font-size: $font-base;
      color: $text-primary;
      font-weight: bold;
    }
    
    .clear-history {
      font-size: $font-sm;
      color: $text-placeholder;
    }
  }
  
  .history-tags {
    @include flex(row, flex-start, center);
    flex-wrap: wrap;
    
    .history-tag {
      padding: $spacing-sm $spacing-base;
      background-color: $bg-white;
      border-radius: $radius-round;
      font-size: $font-sm;
      color: $text-secondary;
      margin-right: $spacing-sm;
      margin-bottom: $spacing-sm;
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
