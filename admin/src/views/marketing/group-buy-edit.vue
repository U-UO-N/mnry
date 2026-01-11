<template>
  <div class="page-container">
    <div class="page-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="选择商品" prop="productId">
          <el-select v-model="form.productId" placeholder="请选择商品" filterable style="width: 400px" @change="handleProductChange">
            <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id">
              <div class="product-option">
                <el-image :src="getImageUrl(p.mainImage)" style="width: 40px; height: 40px" fit="cover" />
                <span>{{ p.name }}</span>
                <span class="price">¥{{ Number(p.price).toFixed(2) }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="原价">
              <el-input-number v-model="form.originalPrice" :min="0" :precision="2" :controls="false" disabled style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="拼团价" prop="groupPrice">
              <el-input-number v-model="form.groupPrice" :min="0" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="成团人数" prop="requiredCount">
              <el-input-number v-model="form.requiredCount" :min="2" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="拼团时限" prop="timeLimit">
          <el-input-number v-model="form.timeLimit" :min="1" :max="168" />
          <span style="margin-left: 8px">小时</span>
        </el-form-item>
        
        <el-form-item label="每人限参与" prop="maxPerUser">
          <el-input-number v-model="form.maxPerUser" :min="1" :max="99" />
          <span style="margin-left: 8px">次</span>
        </el-form-item>
        
        <el-form-item label="活动时间" prop="dateRange">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 400px"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">保存</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { productApi } from '@/api/product'
import { groupBuyApi } from '@/api/groupBuy'
import type { Product } from '@/types'

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const loading = ref(false)
const products = ref<Product[]>([])
const dateRange = ref<[Date, Date] | null>(null)
const isEdit = ref(false)

const form = reactive({
  productId: '',
  groupPrice: 0,
  originalPrice: 0,
  requiredCount: 2,
  timeLimit: 24,
  maxPerUser: 1,
  startTime: '',
  endTime: ''
})

const rules: FormRules = {
  productId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  groupPrice: [{ required: true, message: '请输入拼团价', trigger: 'blur' }],
  requiredCount: [{ required: true, message: '请输入成团人数', trigger: 'blur' }],
  timeLimit: [{ required: true, message: '请输入拼团时限', trigger: 'blur' }]
}

// 获取图片完整URL
const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `http://localhost:3001${url}`
}

watch(dateRange, (val) => {
  if (val) {
    form.startTime = val[0].toISOString()
    form.endTime = val[1].toISOString()
  }
})

const handleProductChange = (productId: string) => {
  const product = products.value.find(p => p.id === productId)
  if (product) {
    form.originalPrice = Number(product.price)
    form.groupPrice = Number((product.price * 0.9).toFixed(2)) // Default 10% off
  }
}

const fetchProducts = async () => {
  try {
    const res = await productApi.getList({ page: 1, pageSize: 100, status: 'on_sale' })
    products.value = (res as any).items || (res as any).list || []
  } catch (error) {
    console.error('获取商品列表失败', error)
    ElMessage.error('获取商品列表失败')
  }
}

const fetchActivityDetail = async (id: string) => {
  loading.value = true
  try {
    const activity = await groupBuyApi.getDetail(id)
    form.productId = activity.productId
    form.originalPrice = activity.originalPrice
    form.groupPrice = activity.groupPrice
    form.requiredCount = activity.requiredCount
    form.timeLimit = activity.timeLimit
    form.maxPerUser = activity.maxPerUser || 1
    dateRange.value = [new Date(activity.startTime), new Date(activity.endTime)]
  } catch (error) {
    console.error('获取活动详情失败', error)
    ElMessage.error('获取活动详情失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return
  
  if (!dateRange.value) {
    ElMessage.warning('请选择活动时间')
    return
  }
  
  if (form.groupPrice >= form.originalPrice) {
    ElMessage.warning('拼团价必须低于原价')
    return
  }
  
  submitting.value = true
  try {
    const data = {
      productId: form.productId,
      groupPrice: form.groupPrice,
      originalPrice: form.originalPrice,
      requiredCount: form.requiredCount,
      timeLimit: form.timeLimit,
      maxPerUser: form.maxPerUser,
      startTime: form.startTime,
      endTime: form.endTime
    }
    
    if (isEdit.value) {
      await groupBuyApi.update(route.params.id as string, data)
      ElMessage.success('更新成功')
    } else {
      await groupBuyApi.create(data)
      ElMessage.success('创建成功')
    }
    router.back()
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  // Load products
  await fetchProducts()
  
  // Load activity if editing
  const id = route.params.id as string
  if (id) {
    isEdit.value = true
    await fetchActivityDetail(id)
  }
})
</script>

<style lang="scss" scoped>
.product-option {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .price {
    margin-left: auto;
    color: #f56c6c;
  }
}
</style>
