<template>
  <div class="page-container">
    <div class="page-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <div class="form-section">
          <div class="section-title">基本信息</div>
          <el-form-item label="商品名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入商品名称" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="商品分类" prop="categoryId">
            <el-cascader v-model="form.categoryId" :options="categoryOptions" :props="{ value: 'id', label: 'name', checkStrictly: true }" placeholder="请选择分类" />
          </el-form-item>
        </div>
        
        <div class="form-section">
          <div class="section-title">商品图片</div>
          <el-form-item label="主图" prop="mainImage">
            <el-upload 
              class="image-uploader" 
              :show-file-list="false" 
              action="#" 
              :auto-upload="false" 
              :on-change="handleMainImageChange"
            >
              <img v-if="form.mainImage" :src="form.mainImage" class="uploaded-image" />
              <el-icon v-else class="upload-icon"><Plus /></el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item label="商品图片">
            <el-upload 
              v-model:file-list="imageList" 
              list-type="picture-card" 
              action="#" 
              :auto-upload="false" 
              :limit="9"
              :on-change="handleImageListChange"
              :on-remove="handleImageRemove"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>
        </div>
        
        <div class="form-section">
          <div class="section-title">价格库存</div>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="销售价格" prop="price">
                <el-input-number v-model="form.price" :min="0" :precision="2" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="原价">
                <el-input-number v-model="form.originalPrice" :min="0" :precision="2" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="库存" prop="stock">
                <el-input-number v-model="form.stock" :min="0" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        
        <div class="form-section">
          <div class="section-title">商品规格</div>
          <div v-for="(spec, index) in form.specs" :key="index" class="spec-item">
            <el-row :gutter="12" align="middle">
              <el-col :span="6">
                <el-input v-model="spec.name" placeholder="规格名称（如：颜色）" />
              </el-col>
              <el-col :span="16">
                <el-select v-model="spec.values" multiple filterable allow-create default-first-option placeholder="输入规格值后回车" style="width: 100%">
                  <el-option v-for="v in spec.values" :key="v" :label="v" :value="v" />
                </el-select>
              </el-col>
              <el-col :span="2">
                <el-button type="danger" link @click="removeSpec(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-col>
            </el-row>
          </div>
          <el-button type="primary" link @click="addSpec">
            <el-icon><Plus /></el-icon>添加规格
          </el-button>
        </div>
        
        <div class="form-section">
          <div class="section-title">商品描述</div>
          <el-form-item label="商品描述">
            <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入商品描述" />
          </el-form-item>
          <el-form-item label="详情图片">
            <el-upload 
              v-model:file-list="detailImageList" 
              list-type="picture-card" 
              action="#" 
              :auto-upload="false"
              :on-change="handleDetailImageListChange"
              :on-remove="handleDetailImageRemove"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>
        </div>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">保存</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { productApi } from '@/api/product'
import { categoryApi } from '@/api/category'
import { request } from '@/utils/request'

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const loading = ref(false)
const imageList = ref<UploadFile[]>([])
const detailImageList = ref<UploadFile[]>([])
const categoryOptions = ref<any[]>([])

// Track pending file uploads
const pendingMainImage = ref<File | null>(null)
const pendingImages = ref<File[]>([])
const pendingDetailImages = ref<File[]>([])

const isEditing = computed(() => !!route.params.id)

const form = reactive({
  name: '',
  categoryId: '' as string | string[],
  mainImage: '',
  images: [] as string[],
  price: 0,
  originalPrice: undefined as number | undefined,
  stock: 0,
  specs: [] as { name: string; values: string[] }[],
  description: '',
  detailImages: [] as string[]
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  mainImage: [{ required: true, message: '请上传商品主图', trigger: 'change' }],
  price: [{ required: true, message: '请输入销售价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }]
}

// Upload a single file and return the URL
const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  
  const result = await request.post<{ url: string }>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return result.url
}

// Handle main image change
const handleMainImageChange = (file: UploadFile) => {
  if (file.raw) {
    pendingMainImage.value = file.raw
    form.mainImage = URL.createObjectURL(file.raw)
  }
}

// Handle image list change
const handleImageListChange = (file: UploadFile) => {
  if (file.raw && file.status === 'ready') {
    pendingImages.value.push(file.raw)
  }
}

// Handle image remove
const handleImageRemove = (file: UploadFile) => {
  // Remove from pending if it's a new file
  if (file.raw) {
    const index = pendingImages.value.indexOf(file.raw)
    if (index > -1) {
      pendingImages.value.splice(index, 1)
    }
  }
  // Remove from existing images if it has a URL
  if (file.url && form.images.includes(file.url)) {
    const index = form.images.indexOf(file.url)
    if (index > -1) {
      form.images.splice(index, 1)
    }
  }
}

// Handle detail image list change
const handleDetailImageListChange = (file: UploadFile) => {
  if (file.raw && file.status === 'ready') {
    pendingDetailImages.value.push(file.raw)
  }
}

// Handle detail image remove
const handleDetailImageRemove = (file: UploadFile) => {
  if (file.raw) {
    const index = pendingDetailImages.value.indexOf(file.raw)
    if (index > -1) {
      pendingDetailImages.value.splice(index, 1)
    }
  }
  if (file.url && form.detailImages.includes(file.url)) {
    const index = form.detailImages.indexOf(file.url)
    if (index > -1) {
      form.detailImages.splice(index, 1)
    }
  }
}

const addSpec = () => {
  form.specs.push({ name: '', values: [] })
}

const removeSpec = (index: number) => {
  form.specs.splice(index, 1)
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return
  
  submitting.value = true
  try {
    console.log('=== 开始保存商品 ===')
    console.log('pendingMainImage:', pendingMainImage.value)
    console.log('pendingImages:', pendingImages.value)
    console.log('pendingDetailImages:', pendingDetailImages.value)
    
    // Upload pending main image
    if (pendingMainImage.value) {
      console.log('上传主图...')
      form.mainImage = await uploadFile(pendingMainImage.value)
      console.log('主图上传成功:', form.mainImage)
      pendingMainImage.value = null
    }
    
    // Upload pending images
    if (pendingImages.value.length > 0) {
      console.log('上传商品图片...', pendingImages.value.length, '张')
      const uploadedUrls = await Promise.all(
        pendingImages.value.map(file => uploadFile(file))
      )
      console.log('商品图片上传成功:', uploadedUrls)
      form.images = [...form.images, ...uploadedUrls]
      pendingImages.value = []
    }
    
    // Upload pending detail images
    if (pendingDetailImages.value.length > 0) {
      console.log('上传详情图片...', pendingDetailImages.value.length, '张')
      const uploadedUrls = await Promise.all(
        pendingDetailImages.value.map(file => uploadFile(file))
      )
      console.log('详情图片上传成功:', uploadedUrls)
      form.detailImages = [...form.detailImages, ...uploadedUrls]
      pendingDetailImages.value = []
    }
    
    // Get categoryId as string
    const categoryId = Array.isArray(form.categoryId) 
      ? form.categoryId[form.categoryId.length - 1] 
      : form.categoryId
    
    const productData = {
      name: form.name,
      price: form.price,
      originalPrice: form.originalPrice,
      mainImage: form.mainImage,
      images: form.images,
      categoryId,
      description: form.description,
      detailImages: form.detailImages,
      stock: form.stock,
      specs: form.specs.filter(s => s.name && s.values.length > 0)
    }
    
    console.log('提交的商品数据:', productData)
    
    if (isEditing.value) {
      const result = await productApi.update(route.params.id as string, productData)
      console.log('更新结果:', result)
      ElMessage.success('保存成功')
    } else {
      const result = await productApi.create(productData)
      console.log('创建结果:', result)
      ElMessage.success('创建成功')
    }
    
    router.back()
  } catch (error: any) {
    console.error('保存失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// Load product data for editing
const loadProduct = async (id: string) => {
  loading.value = true
  try {
    const product = await productApi.getDetail(id)
    
    form.name = product.name
    form.price = product.price
    form.originalPrice = product.originalPrice || undefined
    form.mainImage = product.mainImage
    form.images = product.images || []
    form.categoryId = product.categoryId || ''
    form.description = product.description || ''
    form.detailImages = product.detailImages || []
    form.stock = product.stock
    form.specs = product.specs || []
    
    // Initialize image lists for display
    imageList.value = form.images.map((url, index) => ({
      name: `image-${index}`,
      url,
      uid: index
    })) as UploadFile[]
    
    detailImageList.value = form.detailImages.map((url, index) => ({
      name: `detail-${index}`,
      url,
      uid: index + 1000
    })) as UploadFile[]
  } catch (error: any) {
    ElMessage.error('加载商品信息失败')
    router.back()
  } finally {
    loading.value = false
  }
}

// Load categories
const loadCategories = async () => {
  try {
    const result = await categoryApi.getTree()
    categoryOptions.value = result
  } catch {
    // Fallback to mock data
    categoryOptions.value = [
      { id: '1', name: '食品', children: [{ id: '1-1', name: '乳制品' }, { id: '1-2', name: '零食' }] },
      { id: '2', name: '酒水', children: [{ id: '2-1', name: '白酒' }, { id: '2-2', name: '葡萄酒' }] },
      { id: '3', name: '美妆', children: [{ id: '3-1', name: '护肤' }, { id: '3-2', name: '彩妆' }] }
    ]
  }
}

onMounted(async () => {
  await loadCategories()
  
  const id = route.params.id as string
  if (id) {
    await loadProduct(id)
  }
})
</script>

<style lang="scss" scoped>
.spec-item {
  margin-bottom: 12px;
}

.image-uploader {
  :deep(.el-upload) {
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);
    width: 148px;
    height: 148px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      border-color: var(--el-color-primary);
    }
  }
}

.uploaded-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
}
</style>
