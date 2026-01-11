<template>
  <div class="page-container">
    <div class="page-card">
      <div class="table-toolbar">
        <div class="search-form">
          <el-input v-model="query.orderNo" placeholder="订单号" clearable style="width: 180px" />
          <el-select v-model="query.status" placeholder="订单状态" clearable style="width: 140px">
            <el-option label="待支付" value="pending_payment" />
            <el-option label="待发货" value="pending_shipment" />
            <el-option label="已发货" value="shipped" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="售后中" value="refunding" />
          </el-select>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 260px" />
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </div>
      </div>
      
      <el-table :data="orders" v-loading="loading" style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="userName" label="用户" width="100" />
        <el-table-column label="商品" min-width="200">
          <template #default="{ row }">
            <div class="order-items" v-if="row.items && row.items.length > 0">
              <div v-for="item in row.items.slice(0, 2)" :key="item.productId" class="order-item">
                <el-image :src="getImageUrl(item.productImage)" style="width: 40px; height: 40px" fit="cover" />
                <span class="item-name">{{ item.productName }}</span>
              </div>
              <span v-if="row.items.length > 2" class="more">等{{ row.items.length }}件商品</span>
            </div>
            <span v-else class="no-items">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="payAmount" label="实付金额" width="100">
          <template #default="{ row }">¥{{ (row.payAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="170" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.status === 'pending_shipment'" link type="success" @click="handleShip(row)">发货</el-button>
            <el-button v-if="row.status === 'refunding'" link type="warning" @click="handleRefund(row)">处理售后</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchOrders"
          @current-change="fetchOrders"
        />
      </div>
    </div>
    
    <!-- Ship Dialog -->
    <el-dialog v-model="shipDialogVisible" title="订单发货" width="500px">
      <el-form :model="shipForm" label-width="100px">
        <el-form-item label="物流公司">
          <el-select v-model="shipForm.company" placeholder="请选择物流公司" style="width: 100%">
            <el-option label="顺丰速运" value="SF" />
            <el-option label="中通快递" value="ZTO" />
            <el-option label="圆通速递" value="YTO" />
            <el-option label="韵达快递" value="YD" />
            <el-option label="申通快递" value="STO" />
          </el-select>
        </el-form-item>
        <el-form-item label="物流单号">
          <el-input v-model="shipForm.trackingNo" placeholder="请输入物流单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitShip" :loading="submitting">确认发货</el-button>
      </template>
    </el-dialog>
    
    <!-- Refund Dialog -->
    <el-dialog v-model="refundDialogVisible" title="处理售后" width="500px">
      <el-form :model="refundForm" label-width="100px">
        <el-form-item label="处理结果">
          <el-radio-group v-model="refundForm.approved">
            <el-radio :label="true">同意退款</el-radio>
            <el-radio :label="false">拒绝退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!refundForm.approved" label="拒绝原因">
          <el-input v-model="refundForm.reason" type="textarea" :rows="3" placeholder="请输入拒绝原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRefund" :loading="submitting">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api/order'
import type { Order, OrderStatus } from '@/types'

const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const orders = ref<Order[]>([])
const total = ref(0)
const dateRange = ref<[Date, Date] | null>(null)

const query = reactive({
  orderNo: '',
  status: '' as OrderStatus | '',
  page: 1,
  pageSize: 10
})

// 获取图片完整URL
const getImageUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return path // 已配置代理，直接返回相对路径
}

const shipDialogVisible = ref(false)
const shipForm = reactive({ company: '', trackingNo: '' })
const currentOrder = ref<Order | null>(null)

const refundDialogVisible = ref(false)
const refundForm = reactive({ approved: true, reason: '' })

const fetchOrders = async () => {
  loading.value = true
  try {
    const params: any = {
      page: query.page,
      pageSize: query.pageSize
    }
    if (query.orderNo) params.orderNo = query.orderNo
    if (query.status) params.status = query.status
    if (dateRange.value && dateRange.value[0]) {
      params.startDate = dateRange.value[0].toISOString().split('T')[0]
      params.endDate = dateRange.value[1].toISOString().split('T')[0]
    }
    
    const res = await orderApi.getList(params)
    // 兼容 items 和 list 字段
    orders.value = (res as any).list || (res as any).items || []
    total.value = res.total || 0
  } catch (error) {
    console.error('获取订单列表失败', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.page = 1
  fetchOrders()
}

const handleView = (row: Order) => {
  router.push(`/orders/${row.id}`)
}

const handleShip = (row: Order) => {
  currentOrder.value = row
  shipForm.company = ''
  shipForm.trackingNo = ''
  shipDialogVisible.value = true
}

const submitShip = async () => {
  if (!shipForm.company || !shipForm.trackingNo) {
    ElMessage.warning('请填写完整物流信息')
    return
  }
  if (!currentOrder.value) return
  
  submitting.value = true
  try {
    await orderApi.ship(currentOrder.value.id, {
      company: shipForm.company,
      trackingNo: shipForm.trackingNo
    })
    ElMessage.success('发货成功')
    shipDialogVisible.value = false
    fetchOrders()
  } catch (error) {
    console.error('发货失败', error)
    ElMessage.error('发货失败')
  } finally {
    submitting.value = false
  }
}

const handleRefund = (row: Order) => {
  currentOrder.value = row
  refundForm.approved = true
  refundForm.reason = ''
  refundDialogVisible.value = true
}

const submitRefund = async () => {
  if (!currentOrder.value) return
  
  submitting.value = true
  try {
    await orderApi.handleRefund(currentOrder.value.id, {
      approved: refundForm.approved,
      reason: refundForm.reason
    })
    ElMessage.success('处理成功')
    refundDialogVisible.value = false
    fetchOrders()
  } catch (error) {
    console.error('处理退款失败', error)
    ElMessage.error('处理失败')
  } finally {
    submitting.value = false
  }
}

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

onMounted(() => {
  fetchOrders()
})
</script>

<style lang="scss" scoped>
.order-items {
  .order-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    
    .item-name {
      font-size: 12px;
      color: #606266;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 150px;
    }
  }
  
  .more {
    font-size: 12px;
    color: #909399;
  }
}
</style>
