<template>
  <view class="order-list-page">
    <!-- 订单状态Tab -->
    <view class="order-tabs">
      <view 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="['tab-item', { active: currentTab === tab.value }]"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view class="order-scroll" scroll-y @scrolltolower="loadMore">
      <view v-if="orders.length > 0" class="order-list">
        <view v-for="order in orders" :key="order.id" class="order-card" @click="goToDetail(order.id)">
          <view class="order-header">
            <text class="order-no">订单号：{{ order.orderNo }}</text>
            <text :class="['order-status', order.status]">{{ getStatusText(order.status) }}</text>
          </view>
          
          <view class="order-goods">
            <view v-for="item in order.items" :key="item.productId" class="goods-item">
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
          
          <view class="order-footer">
            <text class="order-total">
              共{{ getTotalQuantity(order) }}件商品 实付：
              <text class="pay-amount">¥{{ formatPrice(order.payAmount) }}</text>
            </text>
            <view class="order-actions">
              <view 
                v-if="order.status === 'pending_payment'" 
                class="action-btn primary"
                @click.stop="payOrder(order)"
              >
                去支付
              </view>
              <view 
                v-if="order.status === 'pending_payment'" 
                class="action-btn"
                @click.stop="cancelOrder(order)"
              >
                取消
              </view>
              <view 
                v-if="order.status === 'shipped'" 
                class="action-btn primary"
                @click.stop="confirmReceive(order)"
              >
                确认收货
              </view>
              <view 
                v-if="order.status === 'completed'" 
                class="action-btn"
                @click.stop="applyRefund(order)"
              >
                申请售后
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <view v-else-if="!loading" class="empty">
        <text class="empty-text">暂无订单</text>
      </view>
      
      <view v-if="loading" class="load-more">加载中...</view>
      <view v-else-if="!hasMore && orders.length > 0" class="load-more">没有更多了</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrders, cancelOrder as cancelOrderApi, confirmReceive as confirmReceiveApi } from '@/api/order'
import type { Order, OrderStatus } from '@/api/order'
import { ORDER_STATUS_MAP } from '@/types'
import { formatPrice, navigateTo, showConfirm, showToast, getImageUrl } from '@/utils'

const tabs = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending_payment' },
  { label: '待发货', value: 'pending_shipment' },
  { label: '待收货', value: 'shipped' },
  { label: '售后', value: 'refunding' }
]

const currentTab = ref('')
const orders = ref<Order[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

onLoad((options) => {
  if (options?.status) {
    currentTab.value = options.status
  }
  loadOrders()
})

async function loadOrders() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const status = currentTab.value as OrderStatus | undefined
    const { list, total } = await getOrders(status || undefined, page.value)
    
    if (page.value === 1) {
      orders.value = list
    } else {
      orders.value.push(...list)
    }
    
    hasMore.value = orders.value.length < total
    page.value++
  } catch (error) {
    console.error('加载订单失败', error)
  } finally {
    loading.value = false
  }
}

function switchTab(value: string) {
  currentTab.value = value
  page.value = 1
  hasMore.value = true
  orders.value = []
  loadOrders()
}

function loadMore() {
  loadOrders()
}

function getStatusText(status: string) {
  return ORDER_STATUS_MAP[status] || status
}

function getTotalQuantity(order: Order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function goToDetail(orderId: string) {
  navigateTo(`/pages/order/detail?id=${orderId}`)
}

function payOrder(order: Order) {
  navigateTo(`/pages/order/detail?id=${order.id}&pay=1`)
}

async function cancelOrder(order: Order) {
  const confirmed = await showConfirm('确定要取消该订单吗？')
  if (!confirmed) return
  
  try {
    await cancelOrderApi(order.id)
    showToast('订单已取消')
    // 刷新列表
    page.value = 1
    hasMore.value = true
    orders.value = []
    loadOrders()
  } catch (error) {
    console.error('取消订单失败', error)
  }
}

async function confirmReceive(order: Order) {
  const confirmed = await showConfirm('确认已收到商品？')
  if (!confirmed) return
  
  try {
    await confirmReceiveApi(order.id)
    showToast('已确认收货', 'success')
    // 刷新列表
    page.value = 1
    hasMore.value = true
    orders.value = []
    loadOrders()
  } catch (error) {
    console.error('确认收货失败', error)
  }
}

function applyRefund(order: Order) {
  navigateTo(`/pages/order/refund?id=${order.id}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.order-list-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.order-tabs {
  @include flex(row, space-around, center);
  height: 88rpx;
  background-color: $bg-white;
  
  .tab-item {
    font-size: $font-base;
    color: $text-secondary;
    position: relative;
    
    &.active {
      color: $primary-color;
      font-weight: bold;
      
      &::after {
        content: '';
        position: absolute;
        bottom: -10rpx;
        left: 50%;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background-color: $primary-color;
        border-radius: 2rpx;
      }
    }
  }
}

.order-scroll {
  height: calc(100vh - 88rpx);
}

.order-list {
  padding: $spacing-base;
}

.order-card {
  background-color: $bg-white;
  border-radius: $radius-md;
  margin-bottom: $spacing-base;
  overflow: hidden;
  
  .order-header {
    @include flex-between;
    padding: $spacing-base;
    @include border-1px($border-color, bottom);
    
    .order-no {
      font-size: $font-sm;
      color: $text-secondary;
    }
    
    .order-status {
      font-size: $font-sm;
      
      &.pending_payment {
        color: $primary-color;
      }
      &.pending_shipment,
      &.shipped {
        color: $info-color;
      }
      &.completed {
        color: $success-color;
      }
      &.cancelled,
      &.refunded {
        color: $text-placeholder;
      }
      &.refunding {
        color: $warning-color;
      }
    }
  }
  
  .order-goods {
    padding: $spacing-base;
    
    .goods-item {
      @include flex;
      margin-bottom: $spacing-sm;
      
      &:last-child {
        margin-bottom: 0;
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
          @include ellipsis;
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
  
  .order-footer {
    @include flex-between;
    padding: $spacing-base;
    @include border-1px($border-color, top);
    
    .order-total {
      font-size: $font-sm;
      color: $text-secondary;
      
      .pay-amount {
        color: $primary-color;
        font-weight: bold;
        font-size: $font-md;
      }
    }
    
    .order-actions {
      @include flex(row, flex-end, center);
      
      .action-btn {
        padding: $spacing-sm $spacing-base;
        border: 2rpx solid $border-color;
        border-radius: $radius-round;
        font-size: $font-sm;
        color: $text-secondary;
        margin-left: $spacing-sm;
        
        &.primary {
          background-color: $primary-color;
          border-color: $primary-color;
          color: #fff;
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
