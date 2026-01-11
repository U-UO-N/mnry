<template>
  <div class="page-container">
    <div class="page-card">
      <div class="table-toolbar">
        <div class="search-form">
          <el-input v-model="query.keyword" placeholder="商品名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
          <el-select v-model="query.categoryId" placeholder="选择分类" clearable style="width: 150px">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
          <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="在售" value="on_sale" />
            <el-option label="下架" value="off_sale" />
            <el-option label="草稿" value="draft" />
          </el-select>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </div>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>新增商品
        </el-button>
      </div>
      
      <el-table :data="products" v-loading="loading" style="width: 100%">
        <el-table-column prop="mainImage" label="图片" width="80">
          <template #default="{ row }">
            <el-image :src="getImageUrl(row.mainImage)" style="width: 50px; height: 50px" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="200" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" />
        <el-table-column prop="sales" label="销量" width="80" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link :type="row.status === 'on_sale' ? 'warning' : 'success'" @click="handleToggleStatus(row)">
              {{ row.status === 'on_sale' ? '下架' : '上架' }}
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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
          @size-change="fetchProducts"
          @current-change="fetchProducts"
        />
      </div>
    </div>

    <!-- 新增/编辑商品对话框 -->
    <el-dialog v-model="dialogVisible" :title="editingProduct ? '编辑商品' : '新增商品'" width="700px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="cat in allCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="价格" prop="price">
              <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原价">
              <el-input-number v-model="form.originalPrice" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :min="0" style="width: 200px" />
        </el-form-item>
        <el-form-item label="主图" prop="mainImage">
          <el-upload
            class="avatar-uploader"
            :action="uploadUrl"
            :show-file-list="false"
            :on-success="handleMainImageSuccess"
            :before-upload="beforeUpload"
            name="file"
          >
            <img v-if="form.mainImage" :src="getImageUrl(form.mainImage)" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">支持 JPG、PNG、GIF、WEBP 格式，大小不超过 5MB</div>
        </el-form-item>
        <el-form-item label="详情图片">
          <el-upload
            :action="uploadUrl"
            list-type="picture-card"
            :file-list="detailImageList"
            :on-success="handleDetailImageSuccess"
            :on-remove="handleDetailImageRemove"
            :before-upload="beforeUpload"
            name="file"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">可上传多张详情图片（可选）</div>
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入商品描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadProps, type UploadFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { productApi } from '@/api/product'
import { categoryApi } from '@/api/category'
import type { Product, Category, ProductStatus } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const allCategories = ref<Category[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const editingProduct = ref<Product | null>(null)
const formRef = ref<FormInstance>()

const uploadUrl = '/api/upload'

const query = reactive({
  keyword: '',
  categoryId: '',
  status: '' as ProductStatus | '',
  page: 1,
  pageSize: 10
})

const form = reactive({
  name: '',
  categoryId: '',
  price: 0,
  originalPrice: undefined as number | undefined,
  stock: 0,
  mainImage: '',
  images: [] as string[],
  detailImages: [] as string[],
  description: ''
})

// 详情图片列表（用于 el-upload 显示）
const detailImageList = computed(() => {
  return form.detailImages.map((url, index) => ({
    name: `image-${index}`,
    url: getImageUrl(url)
  }))
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }],
  mainImage: [{ required: true, message: '请上传主图', trigger: 'change' }]
}

// 获取完整图片URL
function getImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `http://localhost:3001${url}`
}

const fetchProducts = async () => {
  loading.value = true
  try {
    const params: any = {
      page: query.page,
      pageSize: query.pageSize
    }
    if (query.keyword) params.keyword = query.keyword
    if (query.categoryId) params.categoryId = query.categoryId
    if (query.status) params.status = query.status
    
    const res = await productApi.getList(params)
    console.log('=== 商品列表响应 ===')
    console.log('完整响应:', res)
    console.log('第一个商品:', res.items?.[0] || res.list?.[0])
    
    // 后端返回 items，兼容 list
    products.value = res.items || res.list || []
    total.value = res.total || 0
  } catch (error) {
    console.error('获取商品列表失败', error)
    ElMessage.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const res = await categoryApi.getTree()
    categories.value = res || []
    const flatten = (cats: Category[], result: Category[] = []): Category[] => {
      for (const cat of cats) {
        result.push(cat)
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, result)
        }
      }
      return result
    }
    allCategories.value = flatten(res || [])
  } catch (error) {
    console.error('获取分类失败', error)
  }
}

const handleSearch = () => {
  query.page = 1
  fetchProducts()
}

const handleAdd = () => {
  editingProduct.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = async (row: Product) => {
  // 重置表单
  resetForm()
  
  // 先用列表数据填充基本信息
  editingProduct.value = row
  form.name = row.name
  form.categoryId = row.categoryId || ''
  form.price = row.price
  form.originalPrice = row.originalPrice
  form.stock = row.stock
  form.mainImage = row.mainImage
  form.images = row.images || []
  form.description = row.description || ''
  
  // 尝试获取完整详情（包含 detailImages）
  try {
    const detail = await productApi.getDetail(row.id)
    if (detail && detail.detailImages) {
      form.detailImages = detail.detailImages
    }
  } catch (e) {
    // 如果获取详情失败，使用列表数据
    form.detailImages = row.detailImages || []
  }
  
  dialogVisible.value = true
}

const resetForm = () => {
  form.name = ''
  form.categoryId = ''
  form.price = 0
  form.originalPrice = undefined
  form.stock = 0
  form.mainImage = ''
  form.images = []
  form.detailImages = []
  form.description = ''
}

// 上传前校验
const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(rawFile.type)) {
    ElMessage.error('只支持 JPG、PNG、GIF、WEBP 格式的图片')
    return false
  }
  if (rawFile.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

// 主图上传成功
const handleMainImageSuccess: UploadProps['onSuccess'] = (response) => {
  if (response.success) {
    form.mainImage = response.data.url
  } else {
    ElMessage.error('上传失败')
  }
}

// 详情图上传成功
const handleDetailImageSuccess: UploadProps['onSuccess'] = (response) => {
  if (response.success) {
    form.detailImages.push(response.data.url)
  } else {
    ElMessage.error('上传失败')
  }
}

// 详情图删除
const handleDetailImageRemove = (file: UploadFile) => {
  const url = file.url || ''
  // 从 URL 中提取路径，兼容多种格式
  let path = url
  if (url.startsWith('http://localhost:3001')) {
    path = url.replace('http://localhost:3001', '')
  }
  
  // 尝试直接匹配
  let index = form.detailImages.indexOf(path)
  
  // 如果没找到，尝试匹配不带前缀的路径
  if (index === -1) {
    index = form.detailImages.findIndex(img => url.includes(img) || img.includes(path))
  }
  
  if (index > -1) {
    form.detailImages.splice(index, 1)
  }
  
  console.log('删除详情图:', { url, path, index, remaining: form.detailImages })
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate()
  
  submitting.value = true
  try {
    const data = {
      name: form.name,
      categoryId: form.categoryId,
      price: form.price,
      originalPrice: form.originalPrice,
      stock: form.stock,
      mainImage: form.mainImage,
      images: form.images.length > 0 ? form.images : [form.mainImage],
      detailImages: form.detailImages,
      description: form.description
    }
    
    console.log('=== 提交商品数据 ===')
    console.log('detailImages:', form.detailImages)
    console.log('完整数据:', data)
    
    if (editingProduct.value) {
      const result = await productApi.update(editingProduct.value.id, data)
      console.log('更新结果:', result)
      ElMessage.success('更新成功')
    } else {
      const result = await productApi.create(data)
      console.log('创建结果:', result)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchProducts()
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

const handleToggleStatus = async (row: Product) => {
  const newStatus = row.status === 'on_sale' ? 'off_sale' : 'on_sale'
  const action = newStatus === 'on_sale' ? '上架' : '下架'
  
  await ElMessageBox.confirm(`确定要${action}该商品吗？`, '提示', { type: 'warning' })
  
  try {
    await productApi.updateStatus(row.id, newStatus as ProductStatus)
    ElMessage.success(`${action}成功`)
    fetchProducts()
  } catch (error) {
    console.error('操作失败', error)
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (row: Product) => {
  await ElMessageBox.confirm('确定要删除该商品吗？', '提示', { type: 'warning' })
  
  try {
    await productApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchProducts()
  } catch (error) {
    console.error('删除失败', error)
    ElMessage.error('删除失败')
  }
}

const getStatusType = (status: ProductStatus) => {
  const map: Record<string, string> = { on_sale: 'success', off_sale: 'info', draft: 'warning' }
  return map[status] || 'info'
}

const getStatusText = (status: ProductStatus) => {
  const map: Record<string, string> = { on_sale: '在售', off_sale: '下架', draft: '草稿' }
  return map[status] || status
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<style scoped>
.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.avatar {
  width: 120px;
  height: 120px;
  object-fit: cover;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}
</style>
