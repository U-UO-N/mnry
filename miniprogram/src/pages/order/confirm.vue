<template>
  <view class="order-confirm">
    <!-- 收货地址 -->
    <view class="address-section card" @click="selectAddress">
      <view v-if="address" class="address-info">
        <view class="address-header">
          <text class="name">{{ address.name }}</text>
          <text class="phone">{{ address.phone }}</text>
        </view>
        <text class="address-detail">{{ address.province }}{{ address.city }}{{ address.district }}{{ address.detail }}</text>
      </view>
      <view v-else class="no-address">
        <text>请选择收货地址</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <!-- 商品列表 -->
    <view class="goods-section card">
      <view v-for="item in orderItems" :key="item.id" class="goods-item">
        <image class="goods-image" :src="getImageUrl(item.productImage)" mode="aspectFill" />
        <view class="goods-info">
          <text class="goods-name">{{ item.productName }}</text>
          <text class="goods-spec">{{ item.specValues?.join(' / ') }}</text>
          <view class="goods-bottom">
            <text class="goods-price">¥{{ formatPrice(item.price) }}</text>
            <text class="goods-quantity">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠信息 -->
    <view class="discount-section card">
      <view class="discount-item" @click="selectCoupon">
        <text class="label">优惠券</text>
        <view class="value">
          <text v-if="selectedCoupon">-¥{{ formatPrice(selectedCoupon.value) }}</text>
          <text v-else class="placeholder">{{ availableCoupons.length }}张可用</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="discount-item">
        <text class="label">积分抵扣</text>
        <view class="value">
          <text v-if="!usePoints && userStore.userInfo?.points" class="points-hint">
            {{ userStore.userInfo.points }}积分可用
          </text>
          <switch :checked="usePoints" @change="togglePoints" :disabled="!userStore.userInfo?.points" />
          <text v-if="usePoints" class="discount-amount">-¥{{ formatPrice(pointsDiscount) }}</text>
        </view>
      </view>
      <view class="discount-item">
        <text class="label">余额抵扣</text>
        <view class="value">
          <switch :checked="useBalance" @change="toggleBalance" />
          <text v-if="useBalance">-¥{{ formatPrice(balanceDiscount) }}</text>
        </view>
      </view>
    </view>

    <!-- 备注 -->
    <view class="remark-section card">
      <text class="label">订单备注</text>
      <input class="remark-input" v-model="remark" placeholder="选填，请输入备注信息" />
    </view>

    <!-- 底部结算 -->
    <view class="submit-bar safe-bottom">
      <view class="price-info">
        <text>合计：</text>
        <text class="total-price">¥{{ formatPrice(payAmount) }}</text>
      </view>
      <view class="submit-btn" @click="submitOrder">提交订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { createOrder } from '@/api/order'
import { getCoupons } from '@/api/user'
import { getDefaultAddress } from '@/api/address'
import { getProductDetail } from '@/api/product'
import { addToCart } from '@/api/cart'
import { formatPrice, navigateTo, showToast, getImageUrl } from '@/utils'

interface Address {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
}

const cartStore = useCartStore()
const userStore = useUserStore()

const address = ref<Address | null>(null)
const orderItems = ref<any[]>([])
const availableCoupons = ref<any[]>([])
const selectedCoupon = ref<any>(null)
const usePoints = ref(false)
const useBalance = ref(false)
const remark = ref('')
const isDirect = ref(false)

const totalAmount = computed(() => {
  return orderItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

const couponDiscount = computed(() => {
  return selectedCoupon.value?.value || 0
})

// 积分抵扣计算：100积分 = 1元，最多抵扣订单50%
const pointsDiscount = computed(() => {
  if (!usePoints.value) return 0
  const userPoints = userStore.userInfo?.points || 0
  const remainingAmount = totalAmount.value - couponDiscount.value
  // 最多抵扣订单金额的50%
  const maxDiscountAmount = remainingAmount * 0.5
  // 用户积分可抵扣金额（100积分=1元）
  const pointsDiscountAmount = userPoints / 100
  return Math.min(pointsDiscountAmount, maxDiscountAmount)
})

// 实际使用的积分数量
const pointsUsed = computed(() => {
  return Math.floor(pointsDiscount.value * 100)
})

const balanceDiscount = computed(() => {
  if (!useBalance.value) return 0
  const balance = userStore.userInfo?.balance || 0
  return Math.min(balance, totalAmount.value - couponDiscount.value - pointsDiscount.value)
})

const payAmount = computed(() => {
  return Math.max(0, totalAmount.value - couponDiscount.value - pointsDiscount.value - balanceDiscount.value)
})

onLoad(async (options) => {
  if (options?.direct === '1' && options?.data) {
    // 直接购买
    isDirect.value = true
    const data = JSON.parse(decodeURIComponent(options.data))
    
    // 获取商品详情
    try {
      const product = await getProductDetail(data.productId)
      // 找到对应的SKU
      const sku = data.skuId ? product.skus?.find(s => s.id === data.skuId) : null
      
      // 先添加到购物车，获取购物车项ID
      const cartItem = await addToCart({
        productId: data.productId,
        skuId: data.skuId || '',
        quantity: data.quantity || 1
      })
      
      orderItems.value = [{
        id: cartItem.id, // 使用购物车项ID
        productId: data.productId,
        productName: product.name,
        productImage: product.mainImage,
        price: sku?.price || product.price,
        quantity: data.quantity || 1,
        specValues: sku?.specValues || [],
        skuId: data.skuId
      }]
    } catch (error) {
      console.error('获取商品详情失败', error)
      showToast('获取商品信息失败')
    }
  } else {
    // 从购物车结算
    orderItems.value = cartStore.selectedItems
  }
  
  await loadCoupons()
  await loadDefaultAddress()
})

// 页面显示时检查是否有选中的地址
onShow(() => {
  const selectedAddress = uni.getStorageSync('selectedAddress')
  if (selectedAddress) {
    address.value = selectedAddress
    uni.removeStorageSync('selectedAddress')
  }
})

async function loadDefaultAddress() {
  try {
    const defaultAddr = await getDefaultAddress()
    if (defaultAddr && !address.value) {
      address.value = defaultAddr
    }
  } catch (error) {
    console.error('加载默认地址失败', error)
  }
}

async function loadCoupons() {
  try {
    const coupons = await getCoupons('available')
    availableCoupons.value = coupons.filter(c => c.minAmount <= totalAmount.value)
  } catch (error) {
    console.error('加载优惠券失败', error)
  }
}

function selectAddress() {
  // 跳转到地址选择页面
  navigateTo('/pages/user/address/list?select=1')
}

function selectCoupon() {
  // 跳转到优惠券选择页面
  // navigateTo('/pages/coupon/select')
}

function togglePoints(e: any) {
  usePoints.value = e.detail.value
}

function toggleBalance(e: any) {
  useBalance.value = e.detail.value
}

async function submitOrder() {
  if (!address.value) {
    showToast('请选择收货地址')
    return
  }
  
  if (orderItems.value.length === 0) {
    showToast('请选择商品')
    return
  }
  
  try {
    const order = await createOrder({
      cartItemIds: orderItems.value.map(item => item.id),
      addressSnapshot: {
        name: address.value.name,
        phone: address.value.phone,
        address: `${address.value.province || ''}${address.value.city || ''}${address.value.district || ''}${address.value.detail || ''}`
      },
      couponId: selectedCoupon.value?.id,
      pointsUsed: usePoints.value ? pointsUsed.value : 0,
      balanceUsed: useBalance.value ? balanceDiscount.value : 0,
      remark: remark.value
    })
    
    // 清空已选购物车商品
    if (!isDirect.value) {
      cartStore.clearSelected()
    }
    
    // 如果支付金额为0，直接完成支付
    if (order.payAmount <= 0) {
      showToast('订单已支付', 'success')
      navigateTo(`/pages/order/detail?id=${order.id}`)
    } else {
      // 跳转到支付页面
      navigateTo(`/pages/order/detail?id=${order.id}&pay=1`)
    }
  } catch (error) {
    console.error('创建订单失败', error)
    showToast('创建订单失败')
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.order-confirm {
  min-height: 100vh;
  background-color: $bg-page;
  padding: $spacing-base;
  padding-bottom: 120rpx;
}

.address-section {
  @include flex(row, flex-start, center);
  
  .address-info {
    flex: 1;
    
    .address-header {
      margin-bottom: $spacing-xs;
      
      .name {
        font-size: $font-md;
        font-weight: bold;
        margin-right: $spacing-base;
      }
      
      .phone {
        font-size: $font-base;
        color: $text-secondary;
      }
    }
    
    .address-detail {
      font-size: $font-sm;
      color: $text-secondary;
      line-height: 1.4;
    }
  }
  
  .no-address {
    flex: 1;
    color: $text-placeholder;
  }
  
  .arrow {
    font-size: $font-xl;
    color: $text-placeholder;
  }
}

.goods-section {
  .goods-item {
    @include flex;
    padding: $spacing-base 0;
    @include border-1px($border-color, bottom);
    
    &:last-child::after {
      display: none;
    }
    
    .goods-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: $radius-sm;
      margin-right: $spacing-base;
    }
    
    .goods-info {
      flex: 1;
      
      .goods-name {
        @include ellipsis(2);
        font-size: $font-base;
        color: $text-primary;
      }
      
      .goods-spec {
        font-size: $font-sm;
        color: $text-placeholder;
        margin-top: $spacing-xs;
      }
      
      .goods-bottom {
        @include flex-between;
        margin-top: $spacing-sm;
        
        .goods-price {
          color: $primary-color;
          font-weight: bold;
        }
        
        .goods-quantity {
          color: $text-secondary;
        }
      }
    }
  }
}

.discount-section {
  .discount-item {
    @include flex-between;
    padding: $spacing-base 0;
    @include border-1px($border-color, bottom);
    
    &:last-child::after {
      display: none;
    }
    
    .label {
      font-size: $font-base;
      color: $text-primary;
    }
    
    .value {
      @include flex(row, flex-end, center);
      color: $primary-color;
      
      .placeholder {
        color: $text-placeholder;
      }
      
      .points-hint {
        font-size: $font-sm;
        color: $text-placeholder;
        margin-right: $spacing-sm;
      }
      
      .discount-amount {
        margin-left: $spacing-sm;
      }
      
      .arrow {
        margin-left: $spacing-xs;
        color: $text-placeholder;
      }
    }
  }
}

.remark-section {
  @include flex(row, flex-start, center);
  
  .label {
    font-size: $font-base;
    color: $text-primary;
    margin-right: $spacing-base;
  }
  
  .remark-input {
    flex: 1;
    font-size: $font-base;
  }
}

.submit-bar {
  @include flex-between;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: $bg-white;
  padding: 0 $spacing-base;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .price-info {
    .total-price {
      color: $primary-color;
      font-size: $font-xl;
      font-weight: bold;
    }
  }
  
  .submit-btn {
    @include flex-center;
    width: 240rpx;
    height: 80rpx;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: #fff;
    border-radius: $radius-round;
    font-size: $font-md;
  }
}
</style>
