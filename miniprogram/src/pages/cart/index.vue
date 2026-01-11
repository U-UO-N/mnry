<template>
  <view class="cart-page">
    <!-- 购物车列表 -->
    <view v-if="cartStore.items.length > 0" class="cart-list">
      <view v-for="item in cartStore.items" :key="item.id" class="cart-item">
        <!-- 选择框 -->
        <view 
          :class="['checkbox', { checked: item.selected }]"
          @click="cartStore.toggleSelect(item.id)"
        >
          <text v-if="item.selected">✓</text>
        </view>
        
        <!-- 商品图片 -->
        <image 
          class="item-image" 
          :src="getImageUrl(item.productImage)" 
          mode="aspectFill"
          @click="goToProduct(item.productId)"
        />
        
        <!-- 商品信息 -->
        <view class="item-info">
          <text class="item-name" @click="goToProduct(item.productId)">{{ item.productName }}</text>
          <text class="item-spec">{{ formatSpecValues(item.specValues) }}</text>
          <view class="item-bottom">
            <text class="item-price">¥{{ formatPrice(item.price) }}</text>
            <view class="quantity-control">
              <view class="qty-btn" @click="decreaseQuantity(item)">-</view>
              <text class="qty-value">{{ item.quantity }}</text>
              <view class="qty-btn" @click="increaseQuantity(item)">+</view>
            </view>
          </view>
        </view>
        
        <!-- 删除按钮 -->
        <view class="delete-btn" @click="removeItem(item.id)">删除</view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车是空的</text>
      <view class="empty-btn" @click="goShopping">去逛逛</view>
    </view>

    <!-- 底部结算栏 -->
    <view v-if="cartStore.items.length > 0" class="cart-footer safe-bottom">
      <view class="select-all" @click="cartStore.toggleSelectAll">
        <view :class="['checkbox', { checked: cartStore.isAllSelected }]">
          <text v-if="cartStore.isAllSelected">✓</text>
        </view>
        <text>全选</text>
      </view>
      <view class="total-info">
        <text>合计：</text>
        <text class="total-price">¥{{ formatPrice(cartStore.totalPrice) }}</text>
      </view>
      <view 
        :class="['checkout-btn', { disabled: cartStore.selectedCount === 0 }]"
        @click="checkout"
      >
        结算({{ cartStore.selectedCount }})
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/stores/cart'
import { getCart, updateCartItem, removeCartItem } from '@/api/cart'
import { formatPrice, navigateTo, switchTab, showConfirm, showToast, getImageUrl } from '@/utils'

const cartStore = useCartStore()

onShow(async () => {
  await loadCart()
})

// 格式化规格值（后端返回对象，需要转换为字符串）
function formatSpecValues(specValues: Record<string, string> | string[] | null): string {
  if (!specValues) return ''
  // 如果是数组，直接 join
  if (Array.isArray(specValues)) {
    return specValues.join(' / ')
  }
  // 如果是对象，提取值
  if (typeof specValues === 'object') {
    return Object.values(specValues).join(' / ')
  }
  return ''
}

async function loadCart() {
  try {
    const result = await getCart()
    // 后端返回的是 { items: [...], totalQuantity, ... } 对象
    const items = result.items || result
    cartStore.setItems(items)
  } catch (error) {
    console.error('加载购物车失败', error)
  }
}

async function increaseQuantity(item: any) {
  if (item.quantity >= item.stock) {
    showToast('库存不足')
    return
  }
  
  const newQuantity = item.quantity + 1
  try {
    await updateCartItem(item.id, newQuantity)
    cartStore.updateQuantity(item.id, newQuantity)
  } catch (error) {
    console.error('更新数量失败', error)
  }
}

async function decreaseQuantity(item: any) {
  if (item.quantity <= 1) {
    const confirmed = await showConfirm('确定要删除该商品吗？')
    if (confirmed) {
      await removeItem(item.id)
    }
    return
  }
  
  const newQuantity = item.quantity - 1
  try {
    await updateCartItem(item.id, newQuantity)
    cartStore.updateQuantity(item.id, newQuantity)
  } catch (error) {
    console.error('更新数量失败', error)
  }
}

async function removeItem(itemId: string) {
  try {
    await removeCartItem(itemId)
    cartStore.removeItem(itemId)
    showToast('已删除')
  } catch (error) {
    console.error('删除失败', error)
  }
}

function goToProduct(productId: string) {
  navigateTo(`/pages/product/detail?id=${productId}`)
}

function goShopping() {
  switchTab('/pages/home/index')
}

function checkout() {
  if (cartStore.selectedCount === 0) {
    showToast('请选择商品')
    return
  }
  navigateTo('/pages/order/confirm')
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.cart-page {
  min-height: 100vh;
  background-color: $bg-page;
  padding-bottom: 120rpx;
}

.cart-list {
  padding: $spacing-base;
}

.cart-item {
  @include flex(row, flex-start, flex-start);
  background-color: $bg-white;
  border-radius: $radius-md;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
  position: relative;
  
  .checkbox {
    @include flex-center;
    width: 44rpx;
    height: 44rpx;
    border: 2rpx solid $border-color;
    border-radius: 50%;
    margin-right: $spacing-base;
    margin-top: 58rpx;
    
    &.checked {
      background-color: $primary-color;
      border-color: $primary-color;
      color: #fff;
    }
  }
  
  .item-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-sm;
    margin-right: $spacing-base;
  }
  
  .item-info {
    flex: 1;
    
    .item-name {
      @include ellipsis(2);
      font-size: $font-base;
      color: $text-primary;
      line-height: 1.4;
    }
    
    .item-spec {
      font-size: $font-sm;
      color: $text-placeholder;
      margin-top: $spacing-xs;
    }
    
    .item-bottom {
      @include flex-between;
      margin-top: $spacing-sm;
      
      .item-price {
        color: $primary-color;
        font-size: $font-md;
        font-weight: bold;
      }
      
      .quantity-control {
        @include flex(row, center, center);
        
        .qty-btn {
          @include flex-center;
          width: 48rpx;
          height: 48rpx;
          background-color: $bg-gray;
          border-radius: $radius-sm;
          font-size: $font-md;
        }
        
        .qty-value {
          width: 60rpx;
          text-align: center;
          font-size: $font-base;
        }
      }
    }
  }
  
  .delete-btn {
    position: absolute;
    top: $spacing-base;
    right: $spacing-base;
    font-size: $font-sm;
    color: $text-placeholder;
  }
}

.cart-footer {
  @include flex-between;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: $bg-white;
  padding: 0 $spacing-base;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .select-all {
    @include flex(row, flex-start, center);
    
    .checkbox {
      @include flex-center;
      width: 40rpx;
      height: 40rpx;
      border: 2rpx solid $border-color;
      border-radius: 50%;
      margin-right: $spacing-sm;
      font-size: $font-sm;
      
      &.checked {
        background-color: $primary-color;
        border-color: $primary-color;
        color: #fff;
      }
    }
  }
  
  .total-info {
    flex: 1;
    text-align: right;
    padding-right: $spacing-base;
    
    .total-price {
      color: $primary-color;
      font-size: $font-lg;
      font-weight: bold;
    }
  }
  
  .checkout-btn {
    @include flex-center;
    width: 200rpx;
    height: 72rpx;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: #fff;
    border-radius: $radius-round;
    font-size: $font-base;
    
    &.disabled {
      background: $text-disabled;
    }
  }
}

.empty {
  @include flex(column, center, center);
  padding-top: 200rpx;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: $spacing-md;
  }
  
  .empty-text {
    color: $text-placeholder;
    font-size: $font-base;
    margin-bottom: $spacing-lg;
  }
  
  .empty-btn {
    @include btn-primary;
    padding: 0 $spacing-lg;
    height: 72rpx;
  }
}
</style>
