<template>
  <div class="shipping-page">
    <el-tabs v-model="activeTab">
      <!-- 配送区域 -->
      <el-tab-pane label="配送区域" name="areas">
        <div class="section-header">
          <h3>配送区域设置</h3>
          <p class="tip">勾选的省份可以在小程序中选择作为收货地址</p>
        </div>
        
        <div class="province-grid">
          <div 
            v-for="province in provinces" 
            :key="province.name"
            class="province-item"
          >
            <el-checkbox 
              v-model="province.isEnabled"
              @change="updateProvince(province)"
            >
              {{ province.name }}
            </el-checkbox>
          </div>
        </div>
        
        <div class="action-bar">
          <el-button type="primary" @click="selectAllProvinces">全选</el-button>
          <el-button @click="deselectAllProvinces">取消全选</el-button>
          <el-button type="success" @click="saveProvinces">保存配送区域</el-button>
        </div>
      </el-tab-pane>

      <!-- 运费模板 -->
      <el-tab-pane label="运费模板" name="templates">
        <div class="section-header">
          <h3>运费模板管理</h3>
          <el-button type="primary" @click="showTemplateDialog()">新增模板</el-button>
        </div>
        
        <el-table :data="templates" border>
          <el-table-column prop="name" label="模板名称" />
          <el-table-column prop="isFree" label="是否包邮" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isFree ? 'success' : 'info'">
                {{ row.isFree ? '包邮' : '不包邮' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="freeAmount" label="满额包邮" width="120">
            <template #default="{ row }">
              {{ row.freeAmount > 0 ? `满${row.freeAmount}元` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="isDefault" label="默认模板" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.isDefault" type="warning">默认</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="showTemplateDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteTemplate(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 运费模板编辑弹窗 -->
    <el-dialog 
      v-model="templateDialogVisible" 
      :title="editingTemplate ? '编辑运费模板' : '新增运费模板'"
      width="600px"
    >
      <el-form :model="templateForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        
        <el-form-item label="是否包邮">
          <el-switch v-model="templateForm.isFree" />
        </el-form-item>
        
        <el-form-item v-if="!templateForm.isFree" label="满额包邮">
          <el-input-number 
            v-model="templateForm.freeAmount" 
            :min="0" 
            :precision="2"
            placeholder="0表示不设置"
          />
          <span class="unit">元</span>
        </el-form-item>
        
        <el-form-item label="设为默认">
          <el-switch v-model="templateForm.isDefault" />
        </el-form-item>
        
        <el-form-item v-if="!templateForm.isFree" label="运费规则">
          <div class="regions-editor">
            <div v-for="(region, index) in templateForm.regions" :key="index" class="region-item">
              <div class="region-provinces">
                <el-select 
                  v-model="region.provinces" 
                  multiple 
                  placeholder="选择配送省份"
                  style="width: 100%"
                >
                  <el-option 
                    v-for="p in allProvinces" 
                    :key="p" 
                    :label="p" 
                    :value="p" 
                  />
                </el-select>
              </div>
              <div class="region-prices">
                <span>首重</span>
                <el-input-number v-model="region.firstWeight" :min="0.1" :precision="1" size="small" />
                <span>kg</span>
                <el-input-number v-model="region.firstPrice" :min="0" :precision="2" size="small" />
                <span>元，续重</span>
                <el-input-number v-model="region.additionalWeight" :min="0.1" :precision="1" size="small" />
                <span>kg</span>
                <el-input-number v-model="region.additionalPrice" :min="0" :precision="2" size="small" />
                <span>元</span>
                <el-button type="danger" size="small" @click="removeRegion(index)">删除</el-button>
              </div>
            </div>
            <el-button type="primary" size="small" @click="addRegion">添加运费规则</el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getProvinces,
  updateProvinces,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteShippingTemplate,
  getAllProvinces
} from '@/api/shipping'

const activeTab = ref('areas')

// 省份数据
const provinces = ref<{ name: string; isEnabled: boolean }[]>([])
const allProvinces = ref<string[]>([])

// 运费模板数据
const templates = ref<any[]>([])
const templateDialogVisible = ref(false)
const editingTemplate = ref<any>(null)

const templateForm = reactive({
  name: '',
  isFree: false,
  freeAmount: 0,
  isDefault: false,
  regions: [] as any[]
})

onMounted(async () => {
  await loadProvinces()
  await loadTemplates()
  await loadAllProvinces()
})

async function loadProvinces() {
  try {
    const data = await getProvinces()
    provinces.value = data || []
  } catch (error) {
    console.error('加载省份失败', error)
    provinces.value = []
  }
}

async function loadAllProvinces() {
  try {
    const data = await getAllProvinces()
    allProvinces.value = data || []
  } catch (error) {
    console.error('加载省份列表失败', error)
    allProvinces.value = []
  }
}

async function loadTemplates() {
  try {
    const data = await getTemplates()
    templates.value = data || []
  } catch (error) {
    console.error('加载运费模板失败', error)
    templates.value = []
  }
}

function updateProvince(province: { name: string; isEnabled: boolean }) {
  // 单个省份更新会在保存时一起提交
}

function selectAllProvinces() {
  if (provinces.value && provinces.value.length > 0) {
    provinces.value.forEach(p => p.isEnabled = true)
  }
}

function deselectAllProvinces() {
  if (provinces.value && provinces.value.length > 0) {
    provinces.value.forEach(p => p.isEnabled = false)
  }
}

async function saveProvinces() {
  try {
    await updateProvinces(provinces.value)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  }
}

function showTemplateDialog(template?: any) {
  editingTemplate.value = template || null
  
  if (template) {
    templateForm.name = template.name
    templateForm.isFree = template.isFree
    templateForm.freeAmount = template.freeAmount
    templateForm.isDefault = template.isDefault
    templateForm.regions = template.regions?.map((r: any) => ({ ...r })) || []
  } else {
    templateForm.name = ''
    templateForm.isFree = false
    templateForm.freeAmount = 0
    templateForm.isDefault = false
    templateForm.regions = []
  }
  
  templateDialogVisible.value = true
}

function addRegion() {
  templateForm.regions.push({
    provinces: [],
    firstWeight: 1,
    firstPrice: 10,
    additionalWeight: 1,
    additionalPrice: 5
  })
}

function removeRegion(index: number) {
  templateForm.regions.splice(index, 1)
}

async function saveTemplate() {
  if (!templateForm.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  
  try {
    const data = {
      name: templateForm.name,
      isFree: templateForm.isFree,
      freeAmount: templateForm.freeAmount,
      isDefault: templateForm.isDefault,
      regions: templateForm.regions
    }
    
    if (editingTemplate.value) {
      await updateTemplate(editingTemplate.value.id, data)
      ElMessage.success('修改成功')
    } else {
      await createTemplate(data)
      ElMessage.success('创建成功')
    }
    
    templateDialogVisible.value = false
    await loadTemplates()
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  }
}

async function deleteTemplate(template: any) {
  try {
    await ElMessageBox.confirm('确定要删除该运费模板吗？', '提示', {
      type: 'warning'
    })
    
    await deleteShippingTemplate(template.id)
    ElMessage.success('删除成功')
    await loadTemplates()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败', error)
      ElMessage.error('删除失败')
    }
  }
}
</script>

<style scoped lang="scss">
.shipping-page {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h3 {
    margin: 0;
  }
  
  .tip {
    color: #999;
    font-size: 14px;
    margin: 5px 0 0;
  }
}

.province-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  
  .province-item {
    padding: 10px;
    background: #f5f7fa;
    border-radius: 4px;
  }
}

.action-bar {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.regions-editor {
  .region-item {
    margin-bottom: 15px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
    
    .region-provinces {
      margin-bottom: 10px;
    }
    
    .region-prices {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      
      span {
        color: #666;
        font-size: 14px;
      }
      
      .el-input-number {
        width: 100px;
      }
    }
  }
}

.unit {
  margin-left: 8px;
  color: #666;
}
</style>
