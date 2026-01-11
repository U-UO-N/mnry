<template>
  <div class="page-container">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="用户列表" name="users">
        <div class="page-card">
          <div class="table-toolbar">
            <div class="search-form">
              <el-input v-model="userQuery.keyword" placeholder="用户ID/昵称/手机号" clearable style="width: 200px" @keyup.enter="fetchUsers" />
              <el-select v-model="userQuery.memberLevel" placeholder="会员等级" clearable style="width: 120px">
                <el-option label="普通会员" value="normal" />
                <el-option label="VIP" value="vip" />
                <el-option label="SVIP" value="svip" />
              </el-select>
              <el-button type="primary" @click="fetchUsers">搜索</el-button>
            </div>
          </div>
          
          <el-table :data="users" v-loading="loading">
            <el-table-column prop="id" label="用户ID" width="180" />
            <el-table-column prop="avatar" label="头像" width="80">
              <template #default="{ row }">
                <el-avatar :src="row.avatar" :size="40" />
              </template>
            </el-table-column>
            <el-table-column prop="nickname" label="昵称" width="120" />
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column prop="memberLevel" label="会员等级" width="100">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.memberLevel)">{{ getLevelText(row.memberLevel) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="balance" label="余额" width="100">
              <template #default="{ row }">¥{{ (row.balance || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="points" label="积分" width="80" />
            <el-table-column prop="createdAt" label="注册时间" width="170" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleView(row)">查看</el-button>
                <el-button link type="primary" @click="handleAdjust(row)">调整</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="userQuery.page"
              v-model:page-size="userQuery.pageSize"
              :total="userTotal"
              layout="total, sizes, prev, pager, next"
            />
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="合作方申请" name="applications">
        <div class="page-card">
          <div class="table-toolbar">
            <div class="search-form">
              <el-select v-model="appQuery.status" placeholder="状态" clearable style="width: 120px">
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
              <el-button type="primary" @click="fetchApplications">搜索</el-button>
            </div>
          </div>
          
          <el-table :data="applications" v-loading="loading">
            <el-table-column prop="id" label="申请ID" width="180" />
            <el-table-column prop="userName" label="申请人" width="100" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">{{ row.type === 'store' ? '门店' : '供应商' }}</template>
            </el-table-column>
            <el-table-column prop="companyName" label="公司名称" />
            <el-table-column prop="contactName" label="联系人" width="100" />
            <el-table-column prop="contactPhone" label="联系电话" width="130" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getAppStatusType(row.status)">{{ getAppStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="申请时间" width="170" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button link type="success" @click="handleReview(row, true)">通过</el-button>
                  <el-button link type="danger" @click="handleReview(row, false)">拒绝</el-button>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- Adjust Dialog -->
    <el-dialog v-model="adjustDialogVisible" title="调整用户信息" width="500px">
      <el-form :model="adjustForm" label-width="100px">
        <el-form-item label="调整类型">
          <el-radio-group v-model="adjustForm.type">
            <el-radio label="points">积分</el-radio>
            <el-radio label="balance">余额</el-radio>
            <el-radio label="memberLevel">会员等级</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="adjustForm.type === 'memberLevel'" label="会员等级">
          <el-select v-model="adjustForm.memberLevel" placeholder="请选择会员等级" style="width: 100%">
            <el-option label="普通会员" value="normal" />
            <el-option label="VIP会员" value="vip" />
            <el-option label="SVIP会员" value="svip" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="调整数值">
          <el-input-number v-model="adjustForm.amount" :precision="adjustForm.type === 'balance' ? 2 : 0" />
          <span style="margin-left: 8px; color: #909399">正数增加，负数减少</span>
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="adjustForm.reason" type="textarea" :rows="3" placeholder="请输入调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/api/user'
import type { User, MerchantApplication, MemberLevel, ApplicationStatus } from '@/types'

const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('users')

const users = ref<User[]>([])
const userTotal = ref(0)
const userQuery = reactive({ keyword: '', memberLevel: '', page: 1, pageSize: 10 })

const applications = ref<MerchantApplication[]>([])
const appTotal = ref(0)
const appQuery = reactive({ status: '', page: 1, pageSize: 10 })

const adjustDialogVisible = ref(false)
const currentUser = ref<User | null>(null)
const adjustForm = reactive({ type: 'points', amount: 0, memberLevel: 'normal', reason: '' })

const fetchUsers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: userQuery.page,
      pageSize: userQuery.pageSize
    }
    if (userQuery.keyword) params.keyword = userQuery.keyword
    if (userQuery.memberLevel) params.memberLevel = userQuery.memberLevel
    
    const res = await userApi.getList(params)
    // 兼容 items 和 list 字段
    users.value = (res as any).list || (res as any).items || []
    userTotal.value = res.total || 0
  } catch (error) {
    console.error('获取用户列表失败', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const fetchApplications = async () => {
  loading.value = true
  try {
    const params: any = {
      page: appQuery.page,
      pageSize: appQuery.pageSize
    }
    if (appQuery.status) params.status = appQuery.status
    
    const res = await userApi.getMerchantApplications(params)
    // 兼容 items 和 list 字段
    applications.value = (res as any).list || (res as any).items || []
    appTotal.value = res.total || 0
  } catch (error) {
    console.error('获取合作方申请失败', error)
    ElMessage.error('获取合作方申请失败')
  } finally {
    loading.value = false
  }
}

const handleView = (row: User) => {
  router.push(`/users/${row.id}`)
}

const handleAdjust = (row: User) => {
  currentUser.value = row
  adjustForm.type = 'points'
  adjustForm.amount = 0
  adjustForm.memberLevel = row.memberLevel || 'normal'
  adjustForm.reason = ''
  adjustDialogVisible.value = true
}

const submitAdjust = async () => {
  if (!adjustForm.reason) {
    ElMessage.warning('请输入调整原因')
    return
  }
  if (!currentUser.value) return
  
  submitting.value = true
  try {
    if (adjustForm.type === 'points') {
      await userApi.adjustPoints(currentUser.value.id, { points: adjustForm.amount, reason: adjustForm.reason })
    } else if (adjustForm.type === 'balance') {
      await userApi.adjustBalance(currentUser.value.id, { amount: adjustForm.amount, reason: adjustForm.reason })
    } else if (adjustForm.type === 'memberLevel') {
      await userApi.adjustMemberLevel(currentUser.value.id, { memberLevel: adjustForm.memberLevel, reason: adjustForm.reason })
    }
    ElMessage.success('调整成功')
    adjustDialogVisible.value = false
    fetchUsers()
  } catch (error) {
    console.error('调整失败', error)
    ElMessage.error('调整失败')
  } finally {
    submitting.value = false
  }
}

const handleReview = async (row: MerchantApplication, approved: boolean) => {
  const action = approved ? '通过' : '拒绝'
  
  try {
    if (!approved) {
      const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝申请', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '请输入拒绝原因'
      })
      await userApi.reviewApplication(row.id, { approved: false, reason })
    } else {
      await ElMessageBox.confirm(`确定要${action}该申请吗？`, '提示', { type: 'warning' })
      await userApi.reviewApplication(row.id, { approved: true })
    }
    ElMessage.success(`${action}成功`)
    fetchApplications()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('处理申请失败', error)
      ElMessage.error('处理失败')
    }
  }
}

// 监听 tab 切换
watch(activeTab, (newTab) => {
  if (newTab === 'users') {
    fetchUsers()
  } else if (newTab === 'applications') {
    fetchApplications()
  }
})

// 监听分页变化
watch(() => userQuery.page, () => fetchUsers())
watch(() => userQuery.pageSize, () => {
  userQuery.page = 1
  fetchUsers()
})

const getLevelType = (level: MemberLevel) => {
  const map: Record<string, string> = { normal: 'info', vip: 'warning', svip: 'danger' }
  return map[level] || 'info'
}

const getLevelText = (level: MemberLevel) => {
  const map: Record<string, string> = { normal: '普通', vip: 'VIP', svip: 'SVIP' }
  return map[level] || level
}

const getAppStatusType = (status: ApplicationStatus) => {
  const map: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const getAppStatusText = (status: ApplicationStatus) => {
  const map: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
  return map[status] || status
}

onMounted(() => {
  fetchUsers()
  fetchApplications()
})
</script>
