<template>
  <view class="order-detail">
    <!-- 订单状态 -->
    <view class="status-section">
      <text class="status-text">{{ getStatusText(order?.status) }}</text>
      <text class="status-desc">{{ getStatusDesc(order?.status) }}</text>
    </view>

    <!-- 收货地址 -->
    <view class="address-section card">
      <view class="address-icon">📍</view>
      <view class="address-info">
        <view class="address-header">
          <text class="name">{{ order?.addressSnapshot?.name }}</text>
          <text class="phone">{{ order?.addressSnapshot?.phone }}</text>
        </view>
        <text class="address-detail">{{ order?.addressSnapshot?.fullAddress }}</text>
      </view>
    </view>

    <!-- 物流信息 -->
    <view v-if="order?.logistics" class="logistics-section card">
      <view class="section-title">物流信息</view>
      <view class="logistics-info">
        <text>{{ order.logistics.company }}：{{ order.logistics.trackingNo }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="goods-section card">
      <view v-for="item in order?.items" :key="item.productId" class="goods-item">
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

    <!-- 订单信息 -->
    <view class="info-section card">
      <view class="info-item">
        <text class="label">订单编号</text>
        <text class="value">{{ order?.orderNo }}</text>
      </view>
      <view class="info-item">
        <text class="label">下单时间</text>
        <text class="value">{{ formatDate(order?.createdAt) }}</text>
      </view>
      <view v-if="order?.paidAt" class="info-item">
        <text class="label">支付时间</text>
        <text class="value">{{ formatDate(order.paidAt) }}</text>
      </view>
      <view v-if="order?.shippedAt" class="info-item">
        <text class="label">发货时间</text>
        <text class="value">{{ formatDate(order.shippedAt) }}</text>
      </view>
    </view>

    <!-- 金额信息 -->
    <view class="amount-section card">
      <view class="amount-item">
        <text class="label">商品总额</text>
        <text class="value">¥{{ formatPrice(order?.totalAmount) }}</text>
      </view>
      <view v-if="order?.discountAmount" class="amount-item">
        <text class="label">优惠金额</text>
        <text class="value discount">-¥{{ formatPrice(order.discountAmount) }}</text>
      </view>
      <view class="amount-item total">
        <text class="label">实付金额</text>
        <text class="value">¥{{ formatPrice(order?.payAmount) }}</text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view v-if="showActions" class="action-bar safe-bottom">
      <view 
        v-if="order?.status === 'pending_payment'" 
        class="action-btn"
        @click="cancelOrder"
      >
        取消订单
      </view>
      <view 
        v-if="order?.status === 'pending_payment'" 
        class="action-btn primary"
        @click="showPaymentModal"
      >
        去支付
      </view>
      <view 
        v-if="order?.status === 'shipped'" 
        class="action-btn primary"
        @click="confirmReceive"
      >
        确认收货
      </view>
      <view 
        v-if="order?.status === 'completed'" 
        class="action-btn"
        @click="applyRefund"
      >
        申请售后
      </view>
      <view 
        v-if="order?.status === 'completed'" 
        class="action-btn primary"
        @click="reviewOrder"
      >
        评价
      </view>
    </view>

    <!-- 支付方式弹窗 -->
    <view v-if="showPayModal" class="pay-modal-mask" @click="closePayModal">
      <view class="pay-modal" @click.stop>
        <view class="pay-modal-header">
          <text class="pay-modal-title">选择支付方式</text>
          <text class="pay-modal-close" @click="closePayModal">×</text>
        </view>
        <view class="pay-modal-amount">
          <text class="pay-label">支付金额</text>
          <text class="pay-value">¥{{ formatPrice(order?.payAmount) }}</text>
        </view>
        <view class="pay-methods">
          <view 
            class="pay-method-item" 
            :class="{ active: payMethod === 'balance' }"
            @click="payMethod = 'balance'"
          >
            <view class="pay-method-left">
              <text class="pay-method-icon">💰</text>
              <view class="pay-method-info">
                <text class="pay-method-name">余额支付</text>
                <text class="pay-method-desc">可用余额：¥{{ formatPrice(userBalance) }}</text>
              </view>
            </view>
            <view class="pay-method-check" :class="{ checked: payMethod === 'balance' }"></view>
          </view>
          <view 
            class="pay-method-item" 
            :class="{ active: payMethod === 'wechat' }"
            @click="payMethod = 'wechat'"
          >
            <view class="pay-method-left">
              <text class="pay-method-icon">💳</text>
              <view class="pay-method-info">
                <text class="pay-method-name">微信支付</text>
                <text class="pay-method-desc">推荐使用</text>
              </view>
            </view>
            <view class="pay-method-check" :class="{ checked: payMethod === 'wechat' }"></view>
          </view>
        </view>
        <view class="pay-modal-footer">
          <view 
            class="pay-confirm-btn" 
            :class="{ disabled: payMethod === 'balance' && userBalance < (order?.payAmount || 0) }"
            @click="confirmPay"
          >
            {{ payMethod === 'balance' && userBalance < (order?.payAmount || 0) ? '余额不足' : '确认支付' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderDetail, cancelOrder as cancelOrderApi, confirmReceive as confirmReceiveApi, createPayment } from '@/api/order'
import { getBalance } from '@/api/user'
import type { Order } from '@/api/order'
import { ORDER_STATUS_MAP } from '@/types'
import { formatPrice, formatDate, navigateTo, navigateBack, showConfirm, showToast, getImageUrl } from '@/utils'

const order = ref<Order | null>(null)
const needPay = ref(false)
const userBalance = ref(0)
const showPayModal = ref(false)
const payMethod = ref<'balance' | 'wechat'>('balance')
const paying = ref(false)

const showActions = computed(() => {
  const status = order.value?.status
  return status === 'pending_payment' || status === 'shipped' || status === 'completed'
})

onLoad(async (options) => {
  const orderId = options?.id
  needPay.value = options?.pay === '1'
  
  if (orderId) {
    await loadOrder(orderId)
    await loadBalance()
    
    if (needPay.value && order.value?.status === 'pending_payment') {
      showPaymentModal()
    }
  }
})

async function loadOrder(orderId: string) {
  try {
    const data = await getOrderDetail(orderId)
    order.value = data
  } catch (error) {
    console.error('加载订单详情失败', error)
  }
}

async function loadBalance() {
  try {
    const data = await getBalance()
    userBalance.value = data.balance || 0
  } catch (error) {
    console.error('加载余额失败', error)
  }
}

function getStatusText(status?: string) {
  return status ? ORDER_STATUS_MAP[status] || status : ''
}

function getStatusDesc(status?: string) {
  const descMap: Record<string, string> = {
    pending_payment: '请在30分钟内完成支付',
    pending_shipment: '商家正在准备发货',
    shipped: '商品正在配送中',
    completed: '交易已完成',
    cancelled: '订单已取消',
    refunding: '售后处理中',
    refunded: '退款已完成'
  }
  return status ? descMap[status] || '' : ''
}

async function cancelOrder() {
  const confirmed = await showConfirm('确定要取消该订单吗？')
  if (!confirmed) return
  
  try {
    await cancelOrderApi(order.value!.id)
    showToast('订单已取消')
    navigateBack()
  } catch (error) {
    console.error('取消订单失败', error)
  }
}

function showPaymentModal() {
  showPayModal.value = true
}

function closePayModal() {
  showPayModal.value = false
}

async function confirmPay() {
  if (paying.value) return
  
  const payAmount = order.value?.payAmount || 0
  
  if (payMethod.value === 'balance' && userBalance.value < payAmount) {
    showToast('余额不足，请充值或选择其他支付方式')
    return
  }
  
  paying.value = true
  
  try {
    const result = await createPayment(order.value!.id, payMethod.value)
    
    if (payMethod.value === 'balance') {
      showToast('支付成功', 'success')
      closePayModal()
      await loadOrder(order.value!.id)
      await loadBalance()
    } else {
      // 微信支付
      if (result.wxPayParams) {
        const wxParams = result.wxPayParams
        
        // 调用微信支付
        uni.requestPayment({
          provider: 'wxpay',
          timeStamp: wxParams.timeStamp,
          nonceStr: wxParams.nonceStr,
          package: wxParams.package,
          signType: wxParams.signType as 'MD5' | 'HMAC-SHA256' | 'RSA',
          paySign: wxParams.paySign,
          success: async () => {
            showToast('支付成功', 'success')
            closePayModal()
            await loadOrder(order.value!.id)
          },
          fail: (err: any) => {
            console.error('微信支付失败', err)
            if (err.errMsg?.includes('cancel')) {
              showToast('已取消支付')
            } else {
              showToast('支付失败，请重试')
            }
          }
        })
      } else {
        showToast('获取支付参数失败')
      }
    }
  } catch (error: any) {
    console.error('支付失败', error)
    showToast(error.message || '支付失败，请重试')
  } finally {
    paying.value = false
  }
}

async function confirmReceive() {
  const confirmed = await showConfirm('确认已收到商品？')
  if (!confirmed) return
  
  try {
    await confirmReceiveApi(order.value!.id)
    showToast('已确认收货', 'success')
    await loadOrder(order.value!.id)
  } catch (error) {
    console.error('确认收货失败', error)
  }
}

function applyRefund() {
  navigateTo(`/pages/order/refund?id=${order.value!.id}`)
}

function reviewOrder() {
  navigateTo(`/pages/order/review?id=${order.value!.id}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.order-detail {
  min-height: 100vh;
  background-color: $bg-page;
  padding-bottom: 120rpx;
}

.status-section {
  background: linear-gradient(135deg, $primary-color, $primary-light);
  padding: $spacing-lg $spacing-base;
  color: #fff;
  
  .status-text {
    font-size: $font-xl;
    font-weight: bold;
    display: block;
    margin-bottom: $spacing-xs;
  }
  
  .status-desc {
    font-size: $font-sm;
    opacity: 0.9;
  }
}

.address-section {
  @include flex(row, flex-start, flex-start);
  margin: $spacing-base;
  
  .address-icon {
    font-size: 40rpx;
    margin-right: $spacing-base;
  }
  
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
}

.logistics-section {
  margin: 0 $spacing-base $spacing-base;
  
  .section-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-sm;
  }
  
  .logistics-info {
    font-size: $font-sm;
    color: $text-secondary;
  }
}

.goods-section {
  margin: 0 $spacing-base $spacing-base;
  
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
          color: $text-primary;
        }
        
        .goods-quantity {
          color: $text-secondary;
        }
      }
    }
  }
}

.info-section,
.amount-section {
  margin: 0 $spacing-base $spacing-base;
  
  .info-item,
  .amount-item {
    @include flex-between;
    padding: $spacing-sm 0;
    
    .label {
      font-size: $font-sm;
      color: $text-secondary;
    }
    
    .value {
      font-size: $font-sm;
      color: $text-primary;
      
      &.discount {
        color: $primary-color;
      }
    }
    
    &.total {
      .label,
      .value {
        font-size: $font-md;
        font-weight: bold;
      }
      
      .value {
        color: $primary-color;
      }
    }
  }
}

.action-bar {
  @include flex(row, flex-end, center);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: $bg-white;
  padding: 0 $spacing-base;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .action-btn {
    padding: $spacing-sm $spacing-lg;
    border: 2rpx solid $border-color;
    border-radius: $radius-round;
    font-size: $font-base;
    color: $text-secondary;
    margin-left: $spacing-base;
    
    &.primary {
      background-color: $primary-color;
      border-color: $primary-color;
      color: #fff;
    }
  }
}

// 支付弹窗样式
.pay-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.pay-modal {
  width: 100%;
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  
  .pay-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    border-bottom: 1rpx solid #eee;
    
    .pay-modal-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .pay-modal-close {
      font-size: 48rpx;
      color: #999;
      line-height: 1;
    }
  }
  
  .pay-modal-amount {
    padding: 40rpx 32rpx;
    text-align: center;
    
    .pay-label {
      font-size: 28rpx;
      color: #666;
      display: block;
      margin-bottom: 16rpx;
    }
    
    .pay-value {
      font-size: 56rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .pay-methods {
    padding: 0 32rpx;
    
    .pay-method-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 32rpx 0;
      border-bottom: 1rpx solid #eee;
      
      &:last-child {
        border-bottom: none;
      }
      
      .pay-method-left {
        display: flex;
        align-items: center;
        
        .pay-method-icon {
          font-size: 48rpx;
          margin-right: 24rpx;
        }
        
        .pay-method-info {
          .pay-method-name {
            font-size: 30rpx;
            color: #333;
            display: block;
            margin-bottom: 8rpx;
          }
          
          .pay-method-desc {
            font-size: 24rpx;
            color: #999;
          }
        }
      }
      
      .pay-method-check {
        width: 40rpx;
        height: 40rpx;
        border: 2rpx solid #ddd;
        border-radius: 50%;
        
        &.checked {
          background-color: $primary-color;
          border-color: $primary-color;
          position: relative;
          
          &::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 16rpx;
            height: 16rpx;
            background-color: #fff;
            border-radius: 50%;
          }
        }
      }
    }
  }
  
  .pay-modal-footer {
    padding: 32rpx;
    
    .pay-confirm-btn {
      width: 100%;
      height: 88rpx;
      line-height: 88rpx;
      text-align: center;
      background-color: $primary-color;
      color: #fff;
      font-size: 32rpx;
      border-radius: 44rpx;
      
      &.disabled {
        background-color: #ccc;
      }
    }
  }
}
</style>
