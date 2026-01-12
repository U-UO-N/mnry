<template>
  <div class="page-container">
    <div class="page-card">
      <div class="table-toolbar">
        <div class="search-form">
          <el-select v-model="query.status" placeholder="活动状态" clearable style="width: 120px">
            <el-option label="未开始" value="not_started" />
            <el-option label="进行中" value="active" />
            <el-option label="已结束" value="ended" />
          </el-select>
          <el-button type="primary" @click="fetchActivities">搜索</el-button>
        </div>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>创建拼团活动
        </el-button>
      </div>
      
      <el-table :data="activities" v-loading="loading">
        <el-table-column label="商品" width="300">
          <template #default="{ row }">
            <div class="product-info">
              <el-image :src="getImageUrl(row.productImage)" style="width: 60px; height: 60px" fit="cover" />
              <span class="name">{{ row.productName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="groupPrice" label="拼团价" width="100">
          <template #default="{ row }">¥{{ Number(row.groupPrice).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="originalPrice" label="原价" width="100">
          <template #default="{ row }">¥{{ Number(row.originalPrice).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="requiredCount" label="成团人数" width="100" />
        <el-table-column prop="timeLimit" label="时限(小时)" width="100" />
        <el-table-column label="活动时间" width="200">
          <template #default="{ row }">
            <div>{{ row.startTime }}</div>
            <div>至 {{ row.endTime }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="row.status === 'not_started'" link type="success" @click="handleStart(row)">开始</el-button>
            <el-button v-if="row.status === 'active'" link type="warning" @click="handleEnd(row)">结束</el-button>
            <el-button link type="primary" @click="handleStats(row)">数据</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
        />
      </div>
    </div>
    
    <!-- Stats Dialog -->
    <el-dialog v-model="statsDialogVisible" title="拼团数据统计" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="总拼团数">{{ stats.totalGroups }}</el-descriptions-item>
        <el-descriptions-item label="成功拼团">{{ stats.successGroups }}</el-descriptions-item>
        <el-descriptions-item label="失败拼团">{{ stats.failedGroups }}</el-descriptions-item>
        <el-descriptions-item label="参与人数">{{ stats.totalParticipants }}</el-descriptions-item>
        <el-descriptions-item label="成团率">{{ (stats.successGroups / (stats.totalGroups || 1) * 100).toFixed(1) }}%</el-descriptions-item>
        <el-descriptions-item label="销售额">¥{{ stats.totalSales.toLocaleString() }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { groupBuyApi } from '@/api/groupBuy'
import type { GroupBuyActivity, GroupBuyStats, ActivityStatus } from '@/types'

const router = useRouter()

const loading = ref(false)
const activities = ref<GroupBuyActivity[]>([])
const total = ref(0)
const query = reactive({ status: '' as ActivityStatus | '', page: 1, pageSize: 10 })

const statsDialogVisible = ref(false)
const stats = ref<GroupBuyStats>({
  totalGroups: 0,
  successGroups: 0,
  failedGroups: 0,
  totalParticipants: 0,
  totalSales: 0
})

const fetchActivities = async () => {
  loading.value = true
  try {
    const params: any = {
      page: query.page,
      pageSize: query.pageSize
    }
    if (query.status) params.status = query.status
    
    const res = await groupBuyApi.getList(params)
    // 兼容 items 和 list 字段
    activities.value = (res as any).items || (res as any).list || []
    total.value = res.total || 0
  } catch (error) {
    console.error('获取拼团活动列表失败', error)
    ElMessage.error('获取拼团活动列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  router.push('/marketing/group-buy/edit')
}

const handleEdit = (row: GroupBuyActivity) => {
  router.push(`/marketing/group-buy/edit/${row.id}`)
}

const handleStart = async (row: GroupBuyActivity) => {
  try {
    await groupBuyApi.start(row.id)
    ElMessage.success('活动已开始')
    fetchActivities()
  } catch (error) {
    console.error('开始活动失败', error)
    ElMessage.error('开始活动失败')
  }
}

const handleEnd = async (row: GroupBuyActivity) => {
  try {
    await groupBuyApi.end(row.id)
    ElMessage.success('活动已结束')
    fetchActivities()
  } catch (error) {
    console.error('结束活动失败', error)
    ElMessage.error('结束活动失败')
  }
}

const handleStats = async (row: GroupBuyActivity) => {
  try {
    const res = await groupBuyApi.getStats(row.id)
    stats.value = {
      totalGroups: res.totalGroups || 0,
      successGroups: res.successGroups || 0,
      failedGroups: res.failedGroups || 0,
      totalParticipants: res.totalParticipants || 0,
      totalSales: res.totalSales || 0
    }
    statsDialogVisible.value = true
  } catch (error) {
    console.error('获取统计数据失败', error)
    ElMessage.error('获取统计数据失败')
  }
}

// 获取图片完整URL
const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  // 使用相对路径，通过 Vite 代理访问后端
  if (url.startsWith('/uploads')) return url
  return `/uploads/${url}`
}

const getStatusType = (status: ActivityStatus) => {
  const map: Record<string, string> = { not_started: 'info', active: 'success', ended: 'warning' }
  return map[status] || 'info'
}

const getStatusText = (status: ActivityStatus) => {
  const map: Record<string, string> = { not_started: '未开始', active: '进行中', ended: '已结束' }
  return map[status] || status
}

onMounted(() => {
  fetchActivities()
})
</script>

<style lang="scss" scoped>
.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .name {
    font-size: 14px;
    color: #303133;
  }
}
</style>
