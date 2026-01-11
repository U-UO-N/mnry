<template>
  <div class="page-container">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="轮播图配置" name="banners">
        <div class="page-card">
          <div class="table-toolbar">
            <span></span>
            <el-button type="primary" @click="handleAddBanner">
              <el-icon><Plus /></el-icon>添加轮播图
            </el-button>
          </div>
          <el-table :data="banners" style="width: 100%" v-loading="loading">
            <el-table-column prop="image" label="图片" width="150">
              <template #default="{ row }">
                <el-image :src="row.image" style="width: 120px; height: 60px" fit="cover" />
              </template>
            </el-table-column>
            <el-table-column prop="linkType" label="跳转类型" width="120">
              <template #default="{ row }">{{ getLinkTypeText(row.linkType) }}</template>
            </el-table-column>
            <el-table-column prop="linkValue" label="跳转目标" />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="操作" width="150">
              <template #default="{ row, $index }">
                <el-button link type="primary" @click="handleEditBanner(row, $index)">编辑</el-button>
                <el-button link type="danger" @click="handleDeleteBanner($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 16px; text-align: right">
            <el-button type="primary" @click="saveBanners" :loading="saving">保存配置</el-button>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="热门商品" name="hotProducts">
        <div class="page-card">
          <div class="table-toolbar">
            <span></span>
            <el-button type="primary" @click="showProductSelector = true">
              <el-icon><Plus /></el-icon>添加商品
            </el-button>
          </div>
          <el-table :data="hotProducts" style="width: 100%" v-loading="loading">
            <el-table-column prop="mainImage" label="图片" width="80">
              <template #default="{ row }">
                <el-image :src="row.mainImage" style="width: 50px; height: 50px" fit="cover" />
              </template>
            </el-table-column>
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="price" label="价格" width="100">
              <template #default="{ row }">¥{{ row.price?.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeHotProduct($index)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 16px; text-align: right">
            <el-button type="primary" @click="saveHotProducts" :loading="saving">保存配置</el-button>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="分类入口" name="shortcuts">
        <div class="page-card">
          <div class="table-toolbar">
            <span></span>
            <el-button type="primary" @click="handleAddShortcut">
              <el-icon><Plus /></el-icon>添加入口
            </el-button>
          </div>
          <el-table :data="shortcuts" style="width: 100%" v-loading="loading">
            <el-table-column prop="icon" label="图标" width="80">
              <template #default="{ row }">
                <el-image :src="row.icon" style="width: 40px; height: 40px" fit="cover" />
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="操作" width="150">
              <template #default="{ row, $index }">
                <el-button link type="primary" @click="handleEditShortcut(row, $index)">编辑</el-button>
                <el-button link type="danger" @click="handleDeleteShortcut($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 16px; text-align: right">
            <el-button type="primary" @click="saveShortcuts" :loading="saving">保存配置</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- Banner Dialog -->
    <el-dialog v-model="bannerDialogVisible" :title="editingBannerIndex >= 0 ? '编辑轮播图' : '添加轮播图'" width="500px">
      <el-form :model="bannerForm" label-width="80px">
        <el-form-item label="图片" required>
          <el-upload
            class="image-uploader"
            :show-file-list="false"
            action="#"
            :auto-upload="false"
            :on-change="handleBannerImageChange"
            accept="image/*"
          >
            <img v-if="bannerForm.image" :src="bannerForm.image" style="width: 300px; height: 150px; object-fit: cover" />
            <div v-else class="upload-placeholder" style="width: 300px; height: 150px">
              <el-icon><Plus /></el-icon>
              <span>点击上传图片</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="跳转类型">
          <el-select v-model="bannerForm.linkType" style="width: 100%">
            <el-option label="无跳转" value="none" />
            <el-option label="商品" value="product" />
            <el-option label="分类" value="category" />
            <el-option label="链接" value="url" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="bannerForm.linkType !== 'none'" label="跳转目标">
          <el-input v-model="bannerForm.linkValue" placeholder="请输入跳转目标ID或链接" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="bannerForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bannerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBanner" :loading="uploading">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- Shortcut Dialog -->
    <el-dialog v-model="shortcutDialogVisible" :title="editingShortcutIndex >= 0 ? '编辑入口' : '添加入口'" width="500px">
      <el-form :model="shortcutForm" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="shortcutForm.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="shortcutForm.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="cat in allCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="图标" required>
          <el-upload
            class="image-uploader"
            :show-file-list="false"
            action="#"
            :auto-upload="false"
            :on-change="handleShortcutIconChange"
            accept="image/*"
          >
            <img v-if="shortcutForm.icon" :src="shortcutForm.icon" style="width: 60px; height: 60px; object-fit: cover" />
            <div v-else class="upload-placeholder" style="width: 60px; height: 60px">
              <el-icon><Plus /></el-icon>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="shortcutForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shortcutDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitShortcut" :loading="uploading">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- Product Selector Dialog -->
    <el-dialog v-model="showProductSelector" title="选择商品" width="800px">
      <div class="product-selector">
        <div class="search-bar">
          <el-input v-model="productSearch" placeholder="搜索商品名称" clearable @keyup.enter="searchProducts">
            <template #append>
              <el-button @click="searchProducts">搜索</el-button>
            </template>
          </el-input>
        </div>
        <el-table :data="productList" style="width: 100%" v-loading="productLoading" @selection-change="handleProductSelect">
          <el-table-column type="selection" width="55" :selectable="isProductSelectable" />
          <el-table-column prop="mainImage" label="图片" width="80">
            <template #default="{ row }">
              <el-image :src="row.mainImage" style="width: 50px; height: 50px" fit="cover" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="商品名称" />
          <el-table-column prop="price" label="价格" width="100">
            <template #default="{ row }">¥{{ row.price?.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="stock" label="库存" width="80" />
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="productPage"
            :page-size="10"
            :total="productTotal"
            layout="prev, pager, next"
            @current-change="loadProducts"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="showProductSelector = false">取消</el-button>
        <el-button type="primary" @click="confirmProductSelect">确定添加 ({{ selectedProducts.length }})</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { Banner, CategoryShortcut, Product } from '@/types'
import { homeApi } from '@/api/home'
import { productApi } from '@/api/product'
import { categoryApi } from '@/api/category'
import { materialApi } from '@/api/material'

const activeTab = ref('banners')
const banners = ref<Banner[]>([])
const hotProducts = ref<Product[]>([])
const hotProductIds = ref<string[]>([])
const shortcuts = ref<CategoryShortcut[]>([])
const allCategories = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)

// Banner form
const bannerDialogVisible = ref(false)
const editingBannerIndex = ref(-1)
const bannerForm = reactive({ image: '', linkType: 'none', linkValue: '', sort: 0 })
const bannerImageFile = ref<File | null>(null)

// Shortcut form
const shortcutDialogVisible = ref(false)
const editingShortcutIndex = ref(-1)
const shortcutForm = reactive({ name: '', categoryId: '', icon: '', sort: 0 })
const shortcutIconFile = ref<File | null>(null)

// Product selector
const showProductSelector = ref(false)
const productSearch = ref('')
const productList = ref<Product[]>([])
const productPage = ref(1)
const productTotal = ref(0)
const productLoading = ref(false)
const selectedProducts = ref<Product[]>([])

const getLinkTypeText = (type: string) => {
  const map: Record<string, string> = { none: '无跳转', product: '商品', category: '分类', url: '链接' }
  return map[type] || type
}

// Load all config data
const loadConfig = async () => {
  loading.value = true
  try {
    const res = await homeApi.getConfig()
    banners.value = res.banners || []
    hotProductIds.value = res.hotProductIds || []
    shortcuts.value = res.categoryShortcuts || []
    
    // Load hot products details
    if (hotProductIds.value.length > 0) {
      await loadHotProductDetails()
    }
  } catch (error) {
    console.error('加载配置失败', error)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

// Load hot product details
const loadHotProductDetails = async () => {
  const products: Product[] = []
  for (const id of hotProductIds.value) {
    try {
      const product = await productApi.getDetail(id)
      products.push(product)
    } catch (e) {
      console.error('加载商品详情失败', id)
    }
  }
  hotProducts.value = products
}

// Load categories
const loadCategories = async () => {
  try {
    const categories = await categoryApi.getTree()
    // Flatten tree to list
    const flattenCategories = (cats: any[], result: any[] = []): any[] => {
      for (const cat of cats) {
        result.push(cat)
        if (cat.children && cat.children.length > 0) {
          flattenCategories(cat.children, result)
        }
      }
      return result
    }
    allCategories.value = flattenCategories(categories)
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

// Banner handlers
const handleAddBanner = () => {
  editingBannerIndex.value = -1
  Object.assign(bannerForm, { image: '', linkType: 'none', linkValue: '', sort: banners.value.length })
  bannerImageFile.value = null
  bannerDialogVisible.value = true
}

const handleEditBanner = (row: Banner, index: number) => {
  editingBannerIndex.value = index
  Object.assign(bannerForm, {
    image: row.image,
    linkType: row.linkType || 'none',
    linkValue: row.linkValue || '',
    sort: row.sort || 0
  })
  bannerImageFile.value = null
  bannerDialogVisible.value = true
}

const handleDeleteBanner = (index: number) => {
  banners.value.splice(index, 1)
}

const handleBannerImageChange = (file: UploadFile) => {
  if (file.raw) {
    bannerImageFile.value = file.raw
    bannerForm.image = URL.createObjectURL(file.raw)
  }
}

const submitBanner = async () => {
  if (!bannerForm.image) {
    ElMessage.warning('请上传图片')
    return
  }
  
  uploading.value = true
  try {
    let imageUrl = bannerForm.image
    
    // Upload image if new file selected
    if (bannerImageFile.value) {
      const res = await materialApi.upload(bannerImageFile.value, 'banner')
      imageUrl = res.url
    }
    
    const bannerData = {
      image: imageUrl,
      linkType: bannerForm.linkType,
      linkValue: bannerForm.linkValue,
      sort: bannerForm.sort
    }
    
    if (editingBannerIndex.value >= 0) {
      banners.value[editingBannerIndex.value] = { 
        ...banners.value[editingBannerIndex.value],
        ...bannerData
      }
    } else {
      banners.value.push({ ...bannerData, id: Date.now().toString() } as Banner)
    }
    bannerDialogVisible.value = false
  } catch (error) {
    console.error('上传图片失败', error)
    ElMessage.error('上传图片失败')
  } finally {
    uploading.value = false
  }
}

const saveBanners = async () => {
  saving.value = true
  try {
    await homeApi.updateBanners(banners.value.map((b, i) => ({
      image: b.image,
      linkType: b.linkType || 'none',
      linkValue: b.linkValue || '',
      sort: i
    })))
    ElMessage.success('轮播图配置保存成功')
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// Hot products handlers
const removeHotProduct = (index: number) => {
  hotProducts.value.splice(index, 1)
  hotProductIds.value.splice(index, 1)
}

const saveHotProducts = async () => {
  saving.value = true
  try {
    const ids = hotProducts.value.map(p => p.id)
    await homeApi.updateHotProducts(ids)
    ElMessage.success('热门商品配置保存成功')
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// Product selector handlers
const loadProducts = async () => {
  productLoading.value = true
  try {
    const res = await productApi.getList({
      page: productPage.value,
      pageSize: 10,
      keyword: productSearch.value || undefined,
      status: 'on_sale'
    })
    // 后端返回 items，兼容 list
    productList.value = res.items || res.list || []
    productTotal.value = res.total || 0
  } catch (error) {
    console.error('加载商品列表失败', error)
  } finally {
    productLoading.value = false
  }
}

const searchProducts = () => {
  productPage.value = 1
  loadProducts()
}

const isProductSelectable = (row: Product) => {
  return !hotProducts.value.some(p => p.id === row.id)
}

const handleProductSelect = (selection: Product[]) => {
  selectedProducts.value = selection
}

const confirmProductSelect = () => {
  for (const product of selectedProducts.value) {
    if (!hotProducts.value.some(p => p.id === product.id)) {
      hotProducts.value.push(product)
      hotProductIds.value.push(product.id)
    }
  }
  selectedProducts.value = []
  showProductSelector.value = false
}

// Shortcut handlers
const handleAddShortcut = () => {
  editingShortcutIndex.value = -1
  Object.assign(shortcutForm, { name: '', categoryId: '', icon: '', sort: shortcuts.value.length })
  shortcutIconFile.value = null
  shortcutDialogVisible.value = true
}

const handleEditShortcut = (row: CategoryShortcut, index: number) => {
  editingShortcutIndex.value = index
  Object.assign(shortcutForm, {
    name: row.name,
    categoryId: row.categoryId,
    icon: row.icon,
    sort: row.sort || 0
  })
  shortcutIconFile.value = null
  shortcutDialogVisible.value = true
}

const handleDeleteShortcut = (index: number) => {
  shortcuts.value.splice(index, 1)
}

const handleShortcutIconChange = (file: UploadFile) => {
  if (file.raw) {
    shortcutIconFile.value = file.raw
    shortcutForm.icon = URL.createObjectURL(file.raw)
  }
}

const submitShortcut = async () => {
  if (!shortcutForm.name || !shortcutForm.categoryId || !shortcutForm.icon) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  uploading.value = true
  try {
    let iconUrl = shortcutForm.icon
    
    // Upload icon if new file selected
    if (shortcutIconFile.value) {
      const res = await materialApi.upload(shortcutIconFile.value, 'icon')
      iconUrl = res.url
    }
    
    const shortcutData = {
      name: shortcutForm.name,
      categoryId: shortcutForm.categoryId,
      icon: iconUrl,
      sort: shortcutForm.sort
    }
    
    if (editingShortcutIndex.value >= 0) {
      shortcuts.value[editingShortcutIndex.value] = {
        ...shortcuts.value[editingShortcutIndex.value],
        ...shortcutData
      }
    } else {
      shortcuts.value.push({ ...shortcutData, id: Date.now().toString() } as CategoryShortcut)
    }
    shortcutDialogVisible.value = false
  } catch (error) {
    console.error('上传图标失败', error)
    ElMessage.error('上传图标失败')
  } finally {
    uploading.value = false
  }
}

const saveShortcuts = async () => {
  saving.value = true
  try {
    await homeApi.updateCategoryShortcuts(shortcuts.value.map((s, i) => ({
      categoryId: s.categoryId,
      name: s.name,
      icon: s.icon,
      sort: i
    })))
    ElMessage.success('分类入口配置保存成功')
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// Watch product selector open
const openProductSelector = () => {
  productPage.value = 1
  productSearch.value = ''
  selectedProducts.value = []
  loadProducts()
}

onMounted(async () => {
  await Promise.all([loadConfig(), loadCategories()])
})

// Watch showProductSelector
import { watch } from 'vue'
watch(showProductSelector, (val) => {
  if (val) openProductSelector()
})
</script>

<style scoped>
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  background-color: #fafafa;
}

.upload-placeholder:hover {
  border-color: #409eff;
}

.upload-placeholder span {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.product-selector .search-bar {
  margin-bottom: 16px;
}

.product-selector .pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
