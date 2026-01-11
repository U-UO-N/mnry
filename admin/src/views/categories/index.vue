<template>
  <div class="page-container">
    <div class="page-card">
      <div class="table-toolbar">
        <span></span>
        <el-button type="primary" @click="handleAdd()">
          <el-icon><Plus /></el-icon>新增分类
        </el-button>
      </div>
      
      <el-table :data="categories" row-key="id" v-loading="loading" default-expand-all>
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="icon" label="图标" width="100">
          <template #default="{ row }">
            <el-image v-if="row.icon" :src="row.icon" style="width: 40px; height: 40px" fit="cover" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="100" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleAdd(row)">添加子分类</el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <el-dialog v-model="dialogVisible" :title="editingCategory ? '编辑分类' : '新增分类'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="上级分类">
          <el-select v-model="form.parentId" placeholder="无（一级分类）" clearable style="width: 100%">
            <el-option v-for="cat in flatCategories" :key="cat.id" :label="cat.name" :value="cat.id" :disabled="cat.id === editingCategory?.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="图标">
          <el-upload class="image-uploader" :show-file-list="false" action="#" :auto-upload="false" :on-change="handleIconChange">
            <img v-if="form.icon" :src="form.icon" class="uploaded-image" style="width: 80px; height: 80px" />
            <el-icon v-else class="upload-icon" style="width: 80px; height: 80px"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { Category } from '@/types'
import { categoryApi } from '@/api/category'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const categories = ref<Category[]>([])
const editingCategory = ref<Category | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  icon: '',
  parentId: '',
  sort: 0
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

const flatCategories = computed(() => {
  const result: Category[] = []
  const flatten = (list: Category[]) => {
    list.forEach(item => {
      result.push(item)
      if (item.children) flatten(item.children)
    })
  }
  flatten(categories.value)
  return result
})

const fetchCategories = async () => {
  loading.value = true
  try {
    const data = await categoryApi.getTree()
    categories.value = data || []
  } catch (error) {
    console.error('获取分类失败:', error)
    ElMessage.error('获取分类列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = (parent?: Category) => {
  editingCategory.value = null
  form.name = ''
  form.icon = ''
  form.parentId = parent?.id || ''
  form.sort = 0
  dialogVisible.value = true
}

const handleEdit = (row: Category) => {
  editingCategory.value = row
  form.name = row.name
  form.icon = row.icon || ''
  form.parentId = row.parentId || ''
  form.sort = row.sort
  dialogVisible.value = true
}

const handleDelete = async (row: Category) => {
  if (row.children?.length) {
    ElMessage.warning('请先删除子分类')
    return
  }
  await ElMessageBox.confirm('确定要删除该分类吗？', '提示', { type: 'warning' })
  try {
    await categoryApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchCategories()
  } catch (error) {
    console.error('删除分类失败:', error)
    ElMessage.error('删除失败')
  }
}

const handleIconChange = (file: UploadFile) => {
  if (file.raw) {
    form.icon = URL.createObjectURL(file.raw)
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return
  
  submitting.value = true
  try {
    const data = {
      name: form.name,
      icon: form.icon || undefined,
      parentId: form.parentId || undefined,
      sort: form.sort
    }
    
    if (editingCategory.value) {
      await categoryApi.update(editingCategory.value.id, data)
      ElMessage.success('编辑成功')
    } else {
      await categoryApi.create(data)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchCategories()
  } catch (error) {
    console.error('保存分类失败:', error)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
