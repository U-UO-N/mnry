<template>
  <div class="page-container">
    <div class="page-card">
      <div class="table-toolbar">
        <div class="search-form">
          <el-select v-model="query.type" placeholder="素材类型" clearable style="width: 120px">
            <el-option label="图片" value="image" />
            <el-option label="视频" value="video" />
          </el-select>
          <el-input v-model="query.category" placeholder="分类" clearable style="width: 150px" />
          <el-button type="primary" @click="fetchMaterials">搜索</el-button>
        </div>
        <el-upload
          :show-file-list="false"
          action="#"
          :auto-upload="false"
          :on-change="handleUpload"
          multiple
          accept="image/*,video/*"
        >
          <el-button type="primary">
            <el-icon><Upload /></el-icon>上传素材
          </el-button>
        </el-upload>
      </div>
      
      <div class="material-grid">
        <div v-for="item in materials" :key="item.id" class="material-item">
          <div class="preview">
            <el-image v-if="item.type === 'image'" :src="item.url" fit="cover" :preview-src-list="[item.url]" />
            <video v-else :src="item.url" controls />
          </div>
          <div class="info">
            <div class="name" :title="item.name">{{ item.name }}</div>
            <div class="meta">
              <span>{{ formatSize(item.size) }}</span>
              <span>{{ item.createdAt }}</span>
            </div>
          </div>
          <div class="actions">
            <el-button link type="primary" @click="handleCopy(item)">复制链接</el-button>
            <el-button link type="danger" @click="handleDelete(item)">删除</el-button>
          </div>
        </div>
      </div>
      
      <el-empty v-if="!materials.length" description="暂无素材" />
      
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { UploadFile } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import type { Material, MaterialType } from '@/types'

const loading = ref(false)
const materials = ref<Material[]>([])
const total = ref(0)

const query = reactive({
  type: '' as MaterialType | '',
  category: '',
  page: 1,
  pageSize: 20
})

const fetchMaterials = async () => {
  loading.value = true
  try {
    materials.value = [
      { id: '1', name: 'banner1.jpg', url: 'https://via.placeholder.com/400x200', type: 'image', size: 102400, createdAt: '2024-01-15 10:00:00' },
      { id: '2', name: 'product1.jpg', url: 'https://via.placeholder.com/400x400', type: 'image', size: 204800, createdAt: '2024-01-14 15:00:00' },
      { id: '3', name: 'promo.mp4', url: 'https://via.placeholder.com/400x300', type: 'video', size: 5242880, createdAt: '2024-01-13 09:00:00' }
    ]
    total.value = 3
  } finally {
    loading.value = false
  }
}

const handleUpload = async (file: UploadFile) => {
  if (!file.raw) return
  
  // Mock upload
  ElMessage.success(`${file.name} 上传成功`)
  fetchMaterials()
}

const handleCopy = (item: Material) => {
  navigator.clipboard.writeText(item.url)
  ElMessage.success('链接已复制')
}

const handleDelete = async (item: Material) => {
  await ElMessageBox.confirm('确定要删除该素材吗？', '提示', { type: 'warning' })
  ElMessage.success('删除成功')
  fetchMaterials()
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

onMounted(() => {
  fetchMaterials()
})
</script>

<style lang="scss" scoped>
.material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.material-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  
  .preview {
    height: 150px;
    background: #f5f7fa;
    
    .el-image, video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  
  .info {
    padding: 12px;
    
    .name {
      font-size: 14px;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .meta {
      margin-top: 8px;
      font-size: 12px;
      color: #909399;
      display: flex;
      justify-content: space-between;
    }
  }
  
  .actions {
    padding: 8px 12px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: space-between;
  }
}
</style>
