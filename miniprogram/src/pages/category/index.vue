<template>
  <view class="category-page">
    <!-- 左侧分类导航（支持多级） -->
    <scroll-view class="category-nav" scroll-y>
      <view v-for="item in flatCategories" :key="item.id">
        <view 
          :class="getItemClass(item)"
          :style="{ paddingLeft: (16 + item.level * 24) + 'rpx' }"
          @click="handleCategoryClick(item)"
        >
          <text class="nav-name">{{ item.name }}</text>
          <text v-if="item.hasChildren" class="nav-arrow">
            {{ isExpanded(item.id) ? '▾' : '▸' }}
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 右侧商品列表 -->
    <scroll-view 
      class="category-content" 
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 当前分类名称 -->
      <view class="current-category">
        <text>{{ currentCategoryName }}</text>
      </view>
      
      <!-- 商品列表 -->
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
            <text class="product-price">¥{{ formatPrice(product.price) }}</text>
          </view>
        </view>
      </view>
      
      <!-- 暂无商品 -->
      <view v-else class="empty-products">
        <text>暂无商品</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="load-more">加载中...</view>
      <view v-else-if="!hasMore && products.length > 0" class="load-more">没有更多了</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getCategoryTree, getProducts } from '@/api/product'
import type { Category, Product } from '@/api/product'
import { formatPrice, navigateTo, getImageUrl } from '@/utils'

interface FlatCategory {
  id: string
  name: string
  level: number
  hasChildren: boolean
  parentId?: string
}

const categoryTree = ref<Category[]>([])
const products = ref<Product[]>([])
const currentCategoryId = ref('')
const currentCategoryName = ref('')
const expandedIds = ref<string[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const refreshing = ref(false)

// 将树形结构扁平化，只显示展开的分类
const flatCategories = computed(() => {
  const result: FlatCategory[] = []
  
  function flatten(categories: Category[], level: number, parentExpanded: boolean) {
    for (const cat of categories) {
      // 只有父级展开时才显示子级，或者是顶级分类
      if (level === 0 || parentExpanded) {
        const hasChildren = !!(cat.children && cat.children.length > 0)
        result.push({
          id: cat.id,
          name: cat.name,
          level: level,
          hasChildren: hasChildren,
          parentId: cat.parentId
        })
        
        // 如果有子分类且当前分类已展开，递归处理
        if (hasChildren && expandedIds.value.indexOf(cat.id) > -1) {
          flatten(cat.children!, level + 1, true)
        }
      }
    }
  }
  
  flatten(categoryTree.value, 0, true)
  return result
})

function isExpanded(categoryId: string): boolean {
  return expandedIds.value.indexOf(categoryId) > -1
}

function getItemClass(item: FlatCategory): string {
  let cls = 'nav-item'
  if (item.level === 0) {
    cls += ' level-0'
  } else if (item.level === 1) {
    cls += ' level-1'
  } else {
    cls += ' level-2'
  }
  if (currentCategoryId.value === item.id) {
    cls += ' active'
  }
  if (isExpanded(item.id)) {
    cls += ' expanded'
  }
  return cls
}

function handleCategoryClick(item: FlatCategory) {
  // 如果有子分类，切换展开状态
  if (item.hasChildren) {
    const idx = expandedIds.value.indexOf(item.id)
    if (idx > -1) {
      // 收起时，同时收起所有子分类
      expandedIds.value.splice(idx, 1)
      collapseChildren(item.id)
    } else {
      expandedIds.value.push(item.id)
    }
  }
  
  // 选中该分类
  currentCategoryId.value = item.id
  currentCategoryName.value = item.name
  page.value = 1
  hasMore.value = true
  loadProducts(true)
}

// 递归收起所有子分类
function collapseChildren(parentId: string) {
  function findAndCollapse(categories: Category[]) {
    for (const cat of categories) {
      if (cat.parentId === parentId) {
        const idx = expandedIds.value.indexOf(cat.id)
        if (idx > -1) {
          expandedIds.value.splice(idx, 1)
        }
        if (cat.children && cat.children.length > 0) {
          collapseChildren(cat.id)
        }
      }
      if (cat.children && cat.children.length > 0) {
        findAndCollapse(cat.children)
      }
    }
  }
  findAndCollapse(categoryTree.value)
}

onMounted(() => {
  loadCategoryTree()
})

async function onRefresh() {
  refreshing.value = true
  await loadProducts(true)
  refreshing.value = false
}

async function loadCategoryTree() {
  try {
    const data = await getCategoryTree()
    categoryTree.value = data || []
    
    // 默认选中第一个分类
    if (categoryTree.value.length > 0) {
      currentCategoryId.value = categoryTree.value[0].id
      currentCategoryName.value = categoryTree.value[0].name
      await loadProducts(true)
    }
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

async function loadProducts(reset = false) {
  if (loading.value || (!reset && !hasMore.value)) return
  
  if (reset) {
    page.value = 1
    products.value = []
    hasMore.value = true
  }
  
  loading.value = true
  try {
    const result = await getProducts({
      categoryId: currentCategoryId.value,
      page: page.value,
      pageSize: 20
    }) as any
    
    // 兼容 items 和 list
    const list = result?.items || result?.list || []
    const total = result?.total || 0
    
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

function goToProduct(productId: string) {
  navigateTo(`/pages/product/detail?id=${productId}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.category-page {
  display: flex;
  flex-direction: row;
  height: 100vh;
  background-color: $bg-page;
}

.category-nav {
  width: 220rpx;
  height: 100%;
  background-color: $bg-gray;
  flex-shrink: 0;
  
  .nav-item {
    padding: 24rpx 16rpx;
    font-size: $font-base;
    color: $text-secondary;
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    
    .nav-arrow {
      font-size: 24rpx;
      color: $text-placeholder;
      margin-right: 8rpx;
    }
  }
  
  .level-0 {
    font-weight: 500;
    background-color: $bg-gray;
  }
  
  .level-1 {
    background-color: #f2f2f2;
    font-size: $font-sm;
  }
  
  .level-2 {
    background-color: #ebebeb;
    font-size: $font-sm;
  }
  
  .active {
    background-color: $bg-white;
    color: $primary-color;
    font-weight: bold;
  }
  
  .active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 40rpx;
    background-color: $primary-color;
    border-radius: 0 $radius-sm $radius-sm 0;
  }
  
  .expanded {
    color: $primary-color;
  }
}

.category-content {
  flex: 1;
  height: 100%;
  background-color: $bg-white;
  padding: $spacing-base;
}

.current-category {
  font-size: $font-md;
  font-weight: bold;
  color: $text-primary;
  padding-bottom: $spacing-base;
  margin-bottom: $spacing-base;
  border-bottom: 1px solid $border-color;
}

.empty-products {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-lg;
  color: $text-placeholder;
  font-size: $font-sm;
}

.product-list {
  .product-item {
    display: flex;
    flex-direction: row;
    padding: $spacing-base 0;
    border-bottom: 1px solid $border-color;
    
    .product-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: $radius-sm;
      margin-right: $spacing-base;
      background-color: $bg-gray;
    }
    
    .product-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      
      .product-name {
        font-size: $font-base;
        color: $text-primary;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      
      .product-price {
        color: $primary-color;
        font-size: $font-md;
        font-weight: bold;
      }
    }
  }
}

.load-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-base;
  color: $text-placeholder;
  font-size: $font-sm;
}
</style>
