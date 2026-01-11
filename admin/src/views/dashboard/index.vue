<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">今日订单</div>
          <div class="stat-value">{{ stats.todayOrders }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">今日销售额</div>
          <div class="stat-value">¥{{ (stats.todaySales || 0).toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">商品总数</div>
          <div class="stat-value">{{ stats.totalProducts }}</div>
          <div class="stat-footer">在售 {{ stats.onSaleProducts }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">用户总数</div>
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-footer">今日新增 +{{ stats.newUsers }}</div>
        </div>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <div class="page-card">
          <h3>最近订单</h3>
          <el-table :data="recentOrders" v-loading="loading" style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" width="180" />
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="amount" label="金额">
              <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="下单时间" width="180" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="page-card">
          <h3>待处理事项</h3>
          <div class="todo-list">
            <div class="todo-item">
              <span class="label">待发货订单</span>
              <el-badge :value="pendingTasks.pendingShipment" class="badge" />
            </div>
            <div class="todo-item">
              <span class="label">售后申请</span>
              <el-badge :value="pendingTasks.refunding" class="badge" />
            </div>
            <div class="todo-item">
              <span class="label">提现申请</span>
              <el-badge :value="pendingTasks.pendingWithdrawals" class="badge" />
            </div>
            <div class="todo-item">
              <span class="label">合作方申请</span>
              <el-badge :value="pendingTasks.pendingMerchants" class="badge" />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { DashboardStats, PendingTasks, RecentOrder } from '@/api/dashboard'

const loading = ref(false)

const stats = ref<DashboardStats>({
  todayOrders: 0,
  todaySales: 0,
  totalProducts: 0,
  onSaleProducts: 0,
  totalUsers: 0,
  newUsers: 0
})

const pendingTasks = ref<PendingTasks>({
  pendingShipment: 0,
  refunding: 0,
  pendingWithdrawals: 0,
  pendingMerchants: 0
})

const recentOrders = ref<RecentOrder[]>([])

const fetchStats = async () => {
  try {
    const data = await dashboardApi.getStats()
    stats.value = data
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const fetchPendingTasks = async () => {
  try {
    const data = await dashboardApi.getPendingTasks()
    pendingTasks.value = data
  } catch (error) {
    console.error('获取待处理事项失败', error)
  }
}

const fetchRecentOrders = async () => {
  loading.value = true
  try {
    const data = await dashboardApi.getRecentOrders(10)
    recentOrders.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取最近订单失败', error)
  } finally {
    loading.value = false
  }
}

const getStatusType = (status: string) => {
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

const getStatusText = (status: string) => {
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
  fetchStats()
  fetchPendingTasks()
  fetchRecentOrders()
})
</script>

<style lang="scss" scoped>
.dashboard {
  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #303133;
  }
}

.todo-list {
  .todo-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .label {
      color: #606266;
    }
  }
}
</style>
