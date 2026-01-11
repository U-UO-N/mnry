<template>
  <div class="page-container">
    <div class="page-card">
      <el-descriptions title="订单信息" :column="3" border>
        <el-descriptions-item label="订单号">{{ order.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="getStatusType(order.status)">{{ getStatusText(order.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ order.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ order.paidAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货时间">{{ order.shippedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ order.completedAt || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>
    
    <div class="page-card">
      <h3>商品信息</h3>
      <el-table :data="order.items" style="width: 100%">
        <el-table-column prop="productImage" label="商品" width="300">
          <template #default="{ row }">
            <div class="product-info">
              <el-image :src="getImageUrl(row.productImage)" style="width: 60px; height: 60px" fit="cover" />
              <div class="product-detail">
                <div class="name">{{ row.productName }}</div>
                <div v-if="row.specValues" class="spec">{{ row.specValues.join(' / ') }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="单价">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" />
        <el-table-column label="小计">
          <template #default="{ row }">¥{{ (row.price * row.quantity).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
      
      <div class="order-summary">
        <div class="summary-item">
          <span>商品总额：</span>
          <span>¥{{ order.totalAmount.toFixed(2) }}</span>
        </div>
        <div class="summary-item">
          <span>优惠金额：</span>
          <span class="discount">-¥{{ order.discountAmount.toFixed(2) }}</span>
        </div>
        <div class="summary-item total">
          <span>实付金额：</span>
          <span class="amount">¥{{ order.payAmount.toFixed(2) }}</span>
        </div>
      </div>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <div class="page-card">
          <h3>收货信息</h3>
          <el-descriptions :column="1">
            <el-descriptions-item label="收货人">{{ order.addressSnapshot?.name }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ order.addressSnapshot?.phone }}</el-descriptions-item>
            <el-descriptions-item label="收货地址">
              {{ order.addressSnapshot?.province }}{{ order.addressSnapshot?.city }}{{ order.addressSnapshot?.district }}{{ order.addressSnapshot?.detail }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <h3>物流信息</h3>
          <el-descriptions v-if="order.logistics" :column="1">
            <el-descriptions-item label="物流公司">{{ order.logistics.company }}</el-descriptions-item>
            <el-descriptions-item label="物流单号">{{ order.logistics.trackingNo }}</el-descriptions-item>
            <el-descriptions-item label="发货时间">{{ order.logistics.shippedAt }}</el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="暂无物流信息" :image-size="60" />
        </div>
      </el-col>
    </el-row>
    
    <div class="page-card" style="text-align: center">
      <el-button @click="router.back()">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api/order'
import type { Order, OrderStatus } from '@/types'

const route = useRoute()
const router = useRouter()

// 获取图片完整URL
const getImageUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return path // 已配置代理，直接返回相对路径
}

const order = ref<Order>({
  id: '',
  orderNo: '',
  userId: '',
  status: 'pending_payment',
  totalAmount: 0,
  payAmount: 0,
  discountAmount: 0,
  items: [],
  addressSnapshot: { name: '', phone: '', province: '', city: '', district: '', detail: '' },
  createdAt: ''
})

const getStatusType = (status: OrderStatus) => {
  const map: Record<string, string> = {
    pending_payment: 'warning',
    pending_shipment: 'primary',
    shipped: 'info',
    completed: 'success',
    cancelled: 'info',
    refunding: 'danger',
    refunded: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status: OrderStatus) => {
  const map: Record<string, string> = {
    pending_payment: '待支付',
    pending_shipment: '待发货',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
    refunding: '售后中',
    refunded: '已退款'
  }
  return map[status] || status
}

onMounted(async () => {
  const orderId = route.params.id as string
  if (orderId) {
    try {
      const data = await orderApi.getDetail(orderId)
      order.value = data
    } catch (error) {
      console.error('获取订单详情失败', error)
      ElMessage.error('获取订单详情失败')
    }
  }
})
</script>

<style lang="scss" scoped>
h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.product-info {
  display: flex;
  gap: 12px;
  
  .product-detail {
    .name {
      font-size: 14px;
      color: #303133;
    }
    .spec {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.order-summary {
  margin-top: 20px;
  text-align: right;
  
  .summary-item {
    margin-bottom: 8px;
    
    .discount {
      color: #67c23a;
    }
    
    &.total {
      font-size: 16px;
      font-weight: 500;
      
      .amount {
        color: #f56c6c;
        font-size: 20px;
      }
    }
  }
}
</style>
