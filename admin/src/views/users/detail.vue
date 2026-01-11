<template>
  <div class="page-container">
    <div class="page-card">
      <el-descriptions title="用户信息" :column="3" border>
        <el-descriptions-item label="用户ID">{{ user.id }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ user.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ user.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="会员等级">
          <el-tag :type="getLevelType(user.memberLevel)">{{ getLevelText(user.memberLevel) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="余额">¥{{ user.balance.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="积分">{{ user.points }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ user.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </div>
    
    <el-tabs v-model="activeTab">
      <el-tab-pane label="订单记录" name="orders">
        <div class="page-card">
          <el-table :data="orders">
            <el-table-column prop="orderNo" label="订单号" width="180" />
            <el-table-column prop="payAmount" label="金额">
              <template #default="{ row }">¥{{ row.payAmount.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">{{ getOrderStatusText(row.status) }}</template>
            </el-table-column>
            <el-table-column prop="createdAt" label="下单时间" width="170" />
          </el-table>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="积分记录" name="points">
        <div class="page-card">
          <el-table :data="pointsRecords">
            <el-table-column prop="amount" label="变动">
              <template #default="{ row }">
                <span :class="row.amount > 0 ? 'income' : 'expense'">
                  {{ row.amount > 0 ? '+' : '' }}{{ row.amount }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
            <el-table-column prop="createdAt" label="时间" width="170" />
          </el-table>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="余额记录" name="balance">
        <div class="page-card">
          <el-table :data="balanceRecords">
            <el-table-column prop="amount" label="变动">
              <template #default="{ row }">
                <span :class="row.amount > 0 ? 'income' : 'expense'">
                  {{ row.amount > 0 ? '+' : '' }}¥{{ row.amount.toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
            <el-table-column prop="createdAt" label="时间" width="170" />
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <div class="page-card" style="text-align: center">
      <el-button @click="router.back()">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { User, MemberLevel } from '@/types'

const route = useRoute()
const router = useRouter()

const activeTab = ref('orders')

const user = ref<User>({
  id: '',
  nickname: '',
  memberLevel: 'normal',
  balance: 0,
  points: 0,
  createdAt: ''
})

const orders = ref<any[]>([])
const pointsRecords = ref<any[]>([])
const balanceRecords = ref<any[]>([])

const getLevelType = (level: MemberLevel) => {
  const map: Record<string, string> = { normal: 'info', vip: 'warning', svip: 'danger' }
  return map[level] || 'info'
}

const getLevelText = (level: MemberLevel) => {
  const map: Record<string, string> = { normal: '普通', vip: 'VIP', svip: 'SVIP' }
  return map[level] || level
}

const getOrderStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending_payment: '待支付',
    pending_shipment: '待发货',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消'
  }
  return map[status] || status
}

onMounted(() => {
  // Mock data
  user.value = {
    id: route.params.id as string,
    nickname: '张三',
    phone: '13800138000',
    memberLevel: 'vip',
    balance: 500,
    points: 1200,
    createdAt: '2024-01-01 10:00:00'
  }
  
  orders.value = [
    { orderNo: 'ORD001', payAmount: 299, status: 'completed', createdAt: '2024-01-15 10:00:00' },
    { orderNo: 'ORD002', payAmount: 158.5, status: 'shipped', createdAt: '2024-01-10 15:00:00' }
  ]
  
  pointsRecords.value = [
    { amount: 100, reason: '签到奖励', createdAt: '2024-01-15 08:00:00' },
    { amount: -500, reason: '积分兑换', createdAt: '2024-01-14 16:00:00' },
    { amount: 30, reason: '订单奖励', createdAt: '2024-01-10 15:30:00' }
  ]
  
  balanceRecords.value = [
    { amount: 100, reason: '充值', createdAt: '2024-01-12 10:00:00' },
    { amount: -50, reason: '订单抵扣', createdAt: '2024-01-10 15:00:00' }
  ]
})
</script>

<style lang="scss" scoped>
.income { color: #67c23a; }
.expense { color: #f56c6c; }
</style>
