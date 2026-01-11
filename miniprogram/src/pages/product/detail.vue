<template>
  <view class="product-detail">
    <!-- 商品图片轮播 -->
    <swiper class="product-swiper" :indicator-dots="true" :circular="true">
      <swiper-item v-for="(image, index) in productImages" :key="index">
        <image class="product-image" :src="getImageUrl(image)" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <!-- 商品信息 -->
    <view class="product-info card">
      <view class="price-row">
        <text class="price">{{ formatPrice(currentPrice) }}</text>
        <text v-if="product?.originalPrice" class="original-price">
          ¥{{ formatPrice(product.originalPrice) }}
        </text>
      </view>
      <text class="product-name">{{ product?.name }}</text>
      <view class="product-meta">
        <text>已售 {{ product?.sales || 0 }}</text>
        <text>库存 {{ currentStock }}</text>
      </view>
    </view>

    <!-- 规格选择 -->
    <view v-if="product?.specs?.length" class="spec-section card">
      <view class="section-title">规格选择</view>
      <view v-for="spec in product.specs" :key="spec.name" class="spec-group">
        <text class="spec-name">{{ spec.name }}</text>
        <view class="spec-values">
          <view 
            v-for="value in spec.values" 
            :key="value"
            :class="['spec-value', { active: selectedSpecs[spec.name] === value }]"
            @click="selectSpec(spec.name, value)"
          >
            {{ value }}
          </view>
        </view>
      </view>
    </view>

    <!-- 商品描述 -->
    <view class="description-section card">
      <view class="section-title">商品详情</view>
      <view v-if="product?.description" class="description">{{ product.description }}</view>
      <view v-if="productDetailImages.length > 0" class="detail-images">
        <image 
          v-for="(img, index) in productDetailImages" 
          :key="index"
          class="detail-image"
          :src="getImageUrl(img)"
          mode="widthFix"
        />
      </view>
      <view v-if="!product?.description && productDetailImages.length === 0" class="no-detail">
        <text>暂无详情</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar safe-bottom">
      <view class="action-icons">
        <view class="action-icon" @click="toggleFavorite">
          <text>{{ isFavorite ? '❤️' : '🤍' }}</text>
          <text class="icon-text">收藏</text>
        </view>
        <view class="action-icon" @click="goToCart">
          <text>🛒</text>
          <text class="icon-text">购物车</text>
          <view v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</view>
        </view>
      </view>
      <view class="action-buttons">
        <view 
          :class="['btn-add-cart', { disabled: currentStock <= 0 }]"
          @click="addToCart"
        >
          加入购物车
        </view>
        <view 
          :class="['btn-buy-now', { disabled: currentStock <= 0 }]"
          @click="buyNow"
        >
          立即购买
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProductDetail } from '@/api/product'
import { addToCart as addToCartApi, getCartCount } from '@/api/cart'
import { addFavorite, removeFavorite, recordBrowseHistory } from '@/api/user'
import type { ProductDetail } from '@/api/product'
import { formatPrice, navigateTo, switchTab, showToast, getImageUrl } from '@/utils'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const product = ref<ProductDetail | null>(null)
const selectedSpecs = ref<Record<string, string>>({})
const isFavorite = ref(false)
const cartCount = ref(0)
const quantity = ref(1)

// 商品图片（优先使用images，如果为空则使用mainImage）
const productImages = computed(() => {
  if (!product.value) return []
  if (product.value.images && product.value.images.length > 0) {
    return product.value.images
  }
  return product.value.mainImage ? [product.value.mainImage] : []
})

// 详情图片
const productDetailImages = computed(() => {
  return product.value?.detailImages || []
})

const currentSku = computed(() => {
  if (!product.value?.skus?.length) return null
  const specValues = Object.values(selectedSpecs.value)
  return product.value.skus.find(sku => 
    sku.specValues.every(v => specValues.includes(v))
  )
})

const currentPrice = computed(() => {
  return currentSku.value?.price || product.value?.price || 0
})

const currentStock = computed(() => {
  return currentSku.value?.stock ?? product.value?.stock ?? 0
})

onLoad(async (options) => {
  const productId = options?.id
  if (productId) {
    await loadProduct(productId)
    await loadCartCount()
    // 记录浏览历史（仅登录用户）
    if (userStore.isLoggedIn) {
      recordBrowseHistory(productId).catch(() => {
        // 忽略记录浏览历史失败
      })
    }
  }
})

async function loadProduct(productId: string) {
  try {
    const data = await getProductDetail(productId)
    product.value = data
    
    // 初始化规格选择
    if (data.specs?.length) {
      data.specs.forEach(spec => {
        if (spec.values.length > 0) {
          selectedSpecs.value[spec.name] = spec.values[0]
        }
      })
    }
  } catch (error) {
    console.error('加载商品详情失败', error)
  }
}

async function loadCartCount() {
  try {
    const result = await getCartCount()
    cartCount.value = result?.count || 0
  } catch (error) {
    // 忽略购物车数量获取失败，不影响页面显示
    console.log('获取购物车数量失败', error)
    cartCount.value = 0
  }
}

function selectSpec(specName: string, value: string) {
  selectedSpecs.value[specName] = value
}

async function toggleFavorite() {
  if (!product.value) return
  
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    showToast('请先登录')
    navigateTo('/pages/user/index')
    return
  }
  
  try {
    if (isFavorite.value) {
      await removeFavorite(product.value.id)
      isFavorite.value = false
      showToast('已取消收藏')
    } else {
      await addFavorite(product.value.id)
      isFavorite.value = true
      showToast('已收藏', 'success')
    }
  } catch (error) {
    console.error('收藏操作失败', error)
  }
}

function goToCart() {
  switchTab('/pages/cart/index')
}

async function addToCart() {
  if (currentStock.value <= 0) {
    showToast('库存不足')
    return
  }
  
  if (!product.value) return
  
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    showToast('请先登录')
    navigateTo('/pages/user/index')
    return
  }
  
  try {
    await addToCartApi({
      productId: product.value.id,
      skuId: currentSku.value?.id || '',
      quantity: quantity.value
    })
    cartCount.value++
    showToast('已加入购物车', 'success')
  } catch (error) {
    console.error('加入购物车失败', error)
  }
}

function buyNow() {
  if (currentStock.value <= 0) {
    showToast('库存不足')
    return
  }
  
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    showToast('请先登录')
    navigateTo('/pages/user/index')
    return
  }
  
  // 跳转到订单确认页，带上商品信息
  const params = {
    productId: product.value?.id,
    skuId: currentSku.value?.id || '',
    quantity: quantity.value
  }
  navigateTo(`/pages/order/confirm?direct=1&data=${encodeURIComponent(JSON.stringify(params))}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.product-detail {
  min-height: 100vh;
  background-color: $bg-page;
  padding-bottom: 120rpx;
}

.product-swiper {
  height: 750rpx;
  
  .product-image {
    width: 100%;
    height: 100%;
  }
}

.product-info {
  .price-row {
    @include flex(row, flex-start, baseline);
    margin-bottom: $spacing-sm;
    
    .price {
      color: $primary-color;
      font-size: $font-xxl;
      font-weight: bold;
      
      &::before {
        content: '¥';
        font-size: $font-md;
      }
    }
    
    .original-price {
      color: $text-placeholder;
      font-size: $font-sm;
      text-decoration: line-through;
      margin-left: $spacing-sm;
    }
  }
  
  .product-name {
    font-size: $font-md;
    color: $text-primary;
    line-height: 1.5;
    margin-bottom: $spacing-sm;
  }
  
  .product-meta {
    @include flex(row, flex-start, center);
    font-size: $font-sm;
    color: $text-placeholder;
    
    text {
      margin-right: $spacing-md;
    }
  }
}

.spec-section {
  .section-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-base;
  }
  
  .spec-group {
    margin-bottom: $spacing-base;
    
    .spec-name {
      font-size: $font-sm;
      color: $text-secondary;
      margin-bottom: $spacing-sm;
      display: block;
    }
    
    .spec-values {
      @include flex(row, flex-start, center);
      flex-wrap: wrap;
      
      .spec-value {
        padding: $spacing-sm $spacing-base;
        background-color: $bg-gray;
        border-radius: $radius-sm;
        font-size: $font-sm;
        color: $text-primary;
        margin-right: $spacing-sm;
        margin-bottom: $spacing-sm;
        border: 2rpx solid transparent;
        
        &.active {
          background-color: rgba($primary-color, 0.1);
          color: $primary-color;
          border-color: $primary-color;
        }
      }
    }
  }
}

.description-section {
  .section-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-base;
  }
  
  .description {
    font-size: $font-base;
    color: $text-secondary;
    line-height: 1.6;
    margin-bottom: $spacing-base;
  }
  
  .detail-images {
    .detail-image {
      width: 100%;
      display: block;
    }
  }
  
  .no-detail {
    text-align: center;
    color: $text-placeholder;
    font-size: $font-sm;
    padding: $spacing-lg 0;
  }
}

.action-bar {
  @include flex(row, space-between, center);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: $bg-white;
  padding: 0 $spacing-base;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .action-icons {
    @include flex(row, flex-start, center);
    
    .action-icon {
      @include flex(column, center, center);
      margin-right: $spacing-lg;
      position: relative;
      
      text {
        font-size: 40rpx;
      }
      
      .icon-text {
        font-size: $font-xs;
        color: $text-secondary;
        margin-top: 4rpx;
      }
      
      .cart-badge {
        position: absolute;
        top: -8rpx;
        right: -8rpx;
        min-width: 32rpx;
        height: 32rpx;
        background-color: $primary-color;
        color: #fff;
        font-size: $font-xs;
        border-radius: 50%;
        @include flex-center;
      }
    }
  }
  
  .action-buttons {
    @include flex(row, flex-end, center);
    
    .btn-add-cart,
    .btn-buy-now {
      @include flex-center;
      height: 72rpx;
      padding: 0 $spacing-lg;
      border-radius: $radius-round;
      font-size: $font-base;
    }
    
    .btn-add-cart {
      background-color: $warning-color;
      color: #fff;
      margin-right: $spacing-sm;
      
      &.disabled {
        background-color: $text-disabled;
      }
    }
    
    .btn-buy-now {
      background: linear-gradient(135deg, $primary-color, $primary-light);
      color: #fff;
      
      &.disabled {
        background: $text-disabled;
      }
    }
  }
}
</style>
