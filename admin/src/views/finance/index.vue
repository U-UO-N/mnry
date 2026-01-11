<template>
  <div class="page-container">
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">总收入</div>
          <div class="stat-value">¥{{ (overview.totalIncome || 0).toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">待结算</div>
          <div class="stat-value">¥{{ (overview.pendingSettlement || 0).toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">已提现</div>
          <div class="stat-value">¥{{ (overview.withdrawn || 0).toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">可用余额</div>
          <div class="stat-value">¥{{ (overview.availableBalance || 0).toFixed(2) }}</div>
        </div>
      </el-col>
    </el-row>
    
    <el-tabs v-model="activeTab">
      <el-tab-pane label="交易流水" name="transactions">
        <div class="page-card">
          <div class="table-toolbar">
            <div class="search-form">
              <el-select v-model="transQuery.type" placeholder="交易类型" clearable style="width: 120px">
                <el-option label="支付" value="payment" />
                <el-option label="退款" value="refund" />
                <el-option label="提现" value="withdraw" />
                <el-option label="佣金" value="commission" />
              </el-select>
              <el-date-picker v-model="transDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
              <el-button type="primary" @click="fetchTransactions">搜索</el-button>
            </div>
          </div>
          
          <el-table :data="transactions" v-loading="loading">
            <el-table-column prop="id" label="流水号" width="180" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getTransTypeTag(row.type)">{{ getTransTypeText(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">
                <span :class="row.amount > 0 ? 'income' : 'expense'">
                  {{ row.amount > 0 ? '+' : '' }}¥{{ (row.amount || 0).toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="relatedOrderId" label="关联订单" width="180" />
            <el-table-column prop="createdAt" label="时间" width="170" />
          </el-table>
          
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="transQuery.page"
              v-model:page-size="transQuery.pageSize"
              :total="transTotal"
              layout="total, prev, pager, next"
              @current-change="fetchTransactions"
            />
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="提现申请" name="withdrawals">
        <div class="page-card">
          <div class="table-toolbar">
            <div class="search-form">
              <el-select v-model="withdrawQuery.status" placeholder="状态" clearable style="width: 120px">
                <el-option label="待处理" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
                <el-option label="已完成" value="completed" />
              </el-select>
              <el-button type="primary" @click="fetchWithdrawals">搜索</el-button>
            </div>
          </div>
          
          <el-table :data="withdrawals" v-loading="loading">
            <el-table-column prop="id" label="申请ID" width="180" />
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getWithdrawStatusTag(row.status)">{{ getWithdrawStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="申请时间" width="170" />
            <el-table-column prop="processedAt" label="处理时间" width="170" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button link type="success" @click="handleProcess(row, true)">通过</el-button>
                  <el-button link type="danger" @click="handleProcess(row, false)">拒绝</el-button>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="withdrawQuery.page"
              v-model:page-size="withdrawQuery.pageSize"
              :total="withdrawTotal"
              layout="total, prev, pager, next"
              @current-change="fetchWithdrawals"
            />
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="佣金明细" name="commissions">
        <div class="page-card">
          <el-table :data="commissions" v-loading="loading">
            <el-table-column prop="id" label="记录ID" width="180" />
            <el-table-column prop="relatedOrderId" label="关联订单" width="180" />
            <el-table-column prop="amount" label="佣金金额" width="120">
              <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="createdAt" label="时间" width="170" />
          </el-table>
          
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="commissionQuery.page"
              v-model:page-size="commissionQuery.pageSize"
              :total="commissionTotal"
              layout="total, prev, pager, next"
              @current-change="fetchCommissions"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { financeApi } from '@/api/finance'
import type { FundOverview, Transaction, Withdrawal, TransactionType, WithdrawalStatus } from '@/types'

const loading = ref(false)
const activeTab = ref('transactions')

const overview = ref<FundOverview>({
  totalIncome: 0,
  pendingSettlement: 0,
  withdrawn: 0,
  availableBalance: 0
})

const transactions = ref<Transaction[]>([])
const transTotal = ref(0)
const transDateRange = ref<[Date, Date] | null>(null)
const transQuery = reactive({ type: '', page: 1, pageSize: 10 })

const withdrawals = ref<Withdrawal[]>([])
const withdrawTotal = ref(0)
const withdrawQuery = reactive({ status: '', page: 1, pageSize: 10 })

const commissions = ref<Transaction[]>([])
const commissionTotal = ref(0)
const commissionQuery = reactive({ page: 1, pageSize: 10 })

const fetchOverview = async () => {
  try {
    const data = await financeApi.getOverview()
    overview.value = data
  } catch (error) {
    console.error('获取资金概览失败', error)
  }
}

const fetchTransactions = async () => {
  loading.value = true
  try {
    const params: any = {
      page: transQuery.page,
      pageSize: transQuery.pageSize
    }
    if (transQuery.type) params.type = transQuery.type
    if (transDateRange.value && transDateRange.value[0]) {
      params.startDate = transDateRange.value[0].toISOString().split('T')[0]
      params.endDate = transDateRange.value[1].toISOString().split('T')[0]
    }
    
    const res = await financeApi.getTransactions(params)
    transactions.value = (res as any).list || (res as any).items || []
    transTotal.value = res.total || 0
  } catch (error) {
    console.error('获取交易流水失败', error)
    ElMessage.error('获取交易流水失败')
  } finally {
    loading.value = false
  }
}

const fetchWithdrawals = async () => {
  loading.value = true
  try {
    const params: any = {
      page: withdrawQuery.page,
      pageSize: withdrawQuery.pageSize
    }
    if (withdrawQuery.status) params.status = withdrawQuery.status
    
    const res = await financeApi.getWithdrawals(params)
    withdrawals.value = (res as any).list || (res as any).items || []
    withdrawTotal.value = res.total || 0
  } catch (error) {
    console.error('获取提现申请失败', error)
    ElMessage.error('获取提现申请失败')
  } finally {
    loading.value = false
  }
}

const fetchCommissions = async () => {
  loading.value = true
  try {
    const params: any = {
      page: commissionQuery.page,
      pageSize: commissionQuery.pageSize
    }
    
    const res = await financeApi.getCommissions(params)
    commissions.value = (res as any).list || (res as any).items || []
    commissionTotal.value = res.total || 0
  } catch (error) {
    console.error('获取佣金明细失败', error)
    ElMessage.error('获取佣金明细失败')
  } finally {
    loading.value = false
  }
}

const handleProcess = async (row: Withdrawal, approved: boolean) => {
  const action = approved ? '通过' : '拒绝'
  
  try {
    if (!approved) {
      // 拒绝时需要输入原因
      const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝提现', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '请输入拒绝原因'
      })
      await financeApi.processWithdrawal(row.id, false)
    } else {
      await ElMessageBox.confirm(`确定要${action}该提现申请吗？`, '提示', { type: 'warning' })
      await financeApi.processWithdrawal(row.id, true)
    }
    
    ElMessage.success(`${action}成功`)
    fetchWithdrawals()
    fetchOverview()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('处理提现失败', error)
      ElMessage.error('处理失败')
    }
  }
}

const getTransTypeTag = (type: TransactionType) => {
  const map: Record<string, string> = { payment: 'success', refund: 'danger', withdraw: 'warning', commission: 'primary' }
  return map[type] || 'info'
}

const getTransTypeText = (type: TransactionType) => {
  const map: Record<string, string> = { payment: '支付', refund: '退款', withdraw: '提现', commission: '佣金' }
  return map[type] || type
}

const getWithdrawStatusTag = (status: WithdrawalStatus) => {
  const map: Record<string, string> = { pending: 'warning', approved: 'primary', rejected: 'danger', completed: 'success' }
  return map[status] || 'info'
}

const getWithdrawStatusText = (status: WithdrawalStatus) => {
  const map: Record<string, string> = { pending: '待处理', approved: '已通过', rejected: '已拒绝', completed: '已完成' }
  return map[status] || status
}

// 监听 tab 切换，加载对应数据
watch(activeTab, (newTab) => {
  if (newTab === 'transactions') {
    fetchTransactions()
  } else if (newTab === 'withdrawals') {
    fetchWithdrawals()
  } else if (newTab === 'commissions') {
    fetchCommissions()
  }
})

onMounted(() => {
  fetchOverview()
  fetchTransactions()
})
</script>

<style lang="scss" scoped>
.income { color: #67c23a; }
.expense { color: #f56c6c; }
</style>
