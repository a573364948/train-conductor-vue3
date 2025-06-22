<template>
  <div class="standard-item-library">
    <!-- 项点表单 -->
    <el-card class="form-card" shadow="never">
      <template #header>
        <h4>{{ editingItem ? '编辑项点' : '新增项点' }}</h4>
      </template>
      
      <el-form :model="itemForm" :rules="rules" ref="formRef" label-width="140px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项点ID" prop="id">
              <el-input v-model="itemForm.id" disabled placeholder="系统自动生成" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="自定义编号" prop="userCode">
              <el-input v-model="itemForm.userCode" placeholder="例如：FW-001 或 服务-01" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="原始描述" prop="description">
          <el-input
            v-model="itemForm.description"
            type="textarea"
            :rows="2"
            placeholder="例如：服务备品 / 列车整备、环境卫生、备品定位不达标"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="分类" prop="category">
              <el-select v-model="itemForm.category" placeholder="选择分类" style="width: 100%">
                <el-option
                  v-for="cat in categories"
                  :key="cat"
                  :label="cat"
                  :value="cat"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="原始分值" prop="maxScore">
              <el-input-number
                v-model="itemForm.maxScore"
                :min="-100"
                :max="0"
                placeholder="例如：-2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="原始负责部门" prop="responsibleDepartment">
              <el-input v-model="itemForm.responsibleDepartment" placeholder="例如：车队 或 安全科" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 默认负责实体 -->
        <el-form-item label="默认负责实体" required>
          <div class="responsible-entities">
            <div
              v-for="(entity, index) in (itemForm.defaultResponsibleEntities || [])"
              :key="index"
              class="entity-item"
            >
              <el-select v-model="entity.level" placeholder="层级" style="width: 120px">
                <el-option label="科室" value="科室" />
                <el-option label="车队" value="车队" />
              </el-select>
              <el-input
                v-model="entity.department"
                placeholder="具体部门名称"
                style="flex: 1"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeEntity(index)"
                :disabled="(itemForm.defaultResponsibleEntities || []).length === 1"
              />
            </div>
            <el-button type="primary" text @click="addEntity">
              <el-icon><Plus /></el-icon>
              添加负责实体
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="saveItem">{{ editingItem ? '保存修改' : '保存项点' }}</el-button>
          <el-button v-if="editingItem" @click="cancelEdit">取消</el-button>
          <el-button @click="resetForm">清空表单</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作 -->
    <el-card class="batch-card" shadow="never">
      <template #header>
        <h4>批量操作</h4>
      </template>
      
      <div class="batch-actions">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="false"
          accept=".xlsx,.xls"
          :on-change="handleImport"
        >
          <el-button type="primary">
            <el-icon><Upload /></el-icon>
            导入Excel项点
          </el-button>
        </el-upload>
        <el-button @click="downloadTemplate">
          <el-icon><Download /></el-icon>
          下载导入模板
        </el-button>
        <el-button @click="exportAllItems">
          <el-icon><Download /></el-icon>
          导出所有项点
        </el-button>
        <el-button type="danger" @click="clearAllItems">
          <el-icon><Delete /></el-icon>
          清空所有项点
        </el-button>
      </div>
    </el-card>

    <!-- 项点列表 -->
    <el-card class="list-card" shadow="never">
      <template #header>
        <div class="list-header">
          <h4>已存项点列表 (共{{ filteredItems.length }}个)</h4>
          <div class="list-actions">
            <el-statistic title="总项点数" :value="allItems.length" />
            <el-statistic title="已匹配使用" :value="usageStats.matched" />
            <el-statistic title="未使用" :value="usageStats.unused" />
          </div>
        </div>
      </template>
      
      <!-- 筛选条件 -->
      <el-row :gutter="20" class="filter-row">
        <el-col :span="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索项点描述或编号"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterCategory" placeholder="筛选分类" clearable>
            <el-option label="全部分类" value="" />
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterDepartment" placeholder="筛选负责部门" clearable>
            <el-option label="全部部门" value="" />
            <el-option label="科室" value="科室" />
            <el-option label="车队" value="车队" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterUsage" placeholder="使用状态" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="已使用" value="used" />
            <el-option label="未使用" value="unused" />
          </el-select>
        </el-col>
      </el-row>
      
      <!-- 数据表格 -->
      <el-table :data="pagedItems" stripe>
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="category" label="类别" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userCode" label="自定义编号" width="120" show-overflow-tooltip />
        <el-table-column prop="description" label="原始描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="maxScore" label="分值" width="80">
          <template #default="{ row }">
            <el-tag :type="row.maxScore < -5 ? 'danger' : 'warning'">
              {{ row.maxScore }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用情况" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getUsageCount(row.id) > 0 ? 'success' : 'info'" 
              size="small"
            >
              {{ getUsageCount(row.id) > 0 ? `已用${getUsageCount(row.id)}次` : '未使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="editItem(row)">编辑</el-button>
            <el-button type="danger" size="small" text @click="deleteItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="filteredItems.length"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
      />
      
      <el-empty v-if="filteredItems.length === 0" description="暂无项点数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download, Delete, Plus, Search } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useMainStore } from '@/stores'
import type { StandardAssessmentItem } from '@/types'

const mainStore = useMainStore()
const formRef = ref()

// 表单数据
const itemForm = reactive<Partial<StandardAssessmentItem>>({
  id: '',
  userCode: '',
  name: '',
  description: '',
  category: '',
  maxScore: -2,
  responsibleDepartment: '',
  defaultResponsibleEntities: [
    { level: '科室', department: '' }
  ]
})

// 状态
const editingItem = ref<StandardAssessmentItem | null>(null)
const searchKeyword = ref('')
const filterCategory = ref('')
const filterDepartment = ref('')
const filterUsage = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 表单验证规则
const rules = {
  description: [
    { required: true, message: '请输入项点描述', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  maxScore: [
    { required: true, message: '请输入分值', trigger: 'blur' }
  ],
  responsibleDepartment: [
    { required: true, message: '请输入负责部门', trigger: 'blur' }
  ]
}

// 计算属性
const allItems = computed(() => {
  if (!mainStore.database) return []
  return Object.values(mainStore.database.standardAssessmentItems || {})
})

const categories = computed(() => {
  const cats = new Set(allItems.value.map(item => item.category).filter(Boolean))
  return ['服务', '安全', '纪律', '其他', ...Array.from(cats)]
})

// 获取项点使用情况
const itemUsageMap = computed(() => {
  const usageMap = new Map<string, number>()
  const assessmentDB = mainStore.database?.assessmentDB || []
  
  // 确保assessmentDB是数组
  const records = Array.isArray(assessmentDB) ? assessmentDB : []
  
  records.forEach((record: any) => {
    record.details?.forEach((detail: any) => {
      if (detail.itemCode) {
        usageMap.set(detail.itemCode, (usageMap.get(detail.itemCode) || 0) + 1)
      }
    })
  })
  
  return usageMap
})

const getUsageCount = (itemId: string) => {
  return itemUsageMap.value.get(itemId) || 0
}

const usageStats = computed(() => {
  const matched = allItems.value.filter(item => getUsageCount(item.id) > 0).length
  return {
    matched,
    unused: allItems.value.length - matched
  }
})

const filteredItems = computed(() => {
  let items = [...allItems.value]
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    items = items.filter(item =>
      item.description.toLowerCase().includes(keyword) ||
      (item.userCode && item.userCode.toLowerCase().includes(keyword)) ||
      item.id.toLowerCase().includes(keyword)
    )
  }
  
  if (filterCategory.value) {
    items = items.filter(item => item.category === filterCategory.value)
  }
  
  if (filterDepartment.value) {
    items = items.filter(item =>
      item.defaultResponsibleEntities.some(e => e.level === filterDepartment.value)
    )
  }
  
  if (filterUsage.value) {
    items = items.filter(item => {
      const used = getUsageCount(item.id) > 0
      return filterUsage.value === 'used' ? used : !used
    })
  }
  
  return items
})

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredItems.value.slice(start, end)
})

// 方法实现
const generateItemId = (category: string) => {
  const prefix = category ? category.substring(0, 2).toUpperCase() : 'XX'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}_${timestamp}_${random}`
}

const addEntity = () => {
  itemForm.defaultResponsibleEntities!.push({ level: '科室', department: '' })
}

const removeEntity = (index: number) => {
  itemForm.defaultResponsibleEntities!.splice(index, 1)
}

const saveItem = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  const validEntities = itemForm.defaultResponsibleEntities!.filter(e => e.department)
  if (validEntities.length === 0) {
    ElMessage.error('请至少填写一个负责实体的部门名称')
    return
  }
  
  if (!itemForm.id) {
    itemForm.id = generateItemId(itemForm.category!)
  }
  
  const item: StandardAssessmentItem = {
    ...itemForm as StandardAssessmentItem,
    name: itemForm.description!,
    defaultResponsibleEntities: validEntities,
    createdAt: editingItem.value?.createdAt || Date.now(),
    updatedAt: Date.now()
  }
  
  if (!mainStore.database!.standardAssessmentItems) {
    mainStore.database!.standardAssessmentItems = {}
  }
  
  mainStore.database!.standardAssessmentItems[item.id] = item
  await mainStore.saveDatabase()
  
  ElMessage.success(editingItem.value ? '修改成功' : '添加成功')
  resetForm()
}

const editItem = (item: StandardAssessmentItem) => {
  editingItem.value = item
  Object.assign(itemForm, {
    ...item,
    defaultResponsibleEntities: item.defaultResponsibleEntities.map(e => ({ ...e }))
  })
}

const cancelEdit = () => {
  editingItem.value = null
  resetForm()
}

const deleteItem = async (item: StandardAssessmentItem) => {
  const usageCount = getUsageCount(item.id)
  if (usageCount > 0) {
    ElMessage.warning(`该项点已被使用${usageCount}次，无法删除`)
    return
  }
  
  const confirm = await ElMessageBox.confirm(
    `确定要删除项点"${item.description}"吗？`,
    '确认删除',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).catch(() => false)
  
  if (!confirm) return
  
  delete mainStore.database!.standardAssessmentItems[item.id]
  await mainStore.saveDatabase()
  ElMessage.success('删除成功')
}

const resetForm = () => {
  editingItem.value = null
  formRef.value?.resetFields()
  Object.assign(itemForm, {
    id: '', userCode: '', name: '', description: '', category: '', maxScore: -2,
    responsibleDepartment: '', defaultResponsibleEntities: [{ level: '科室', department: '' }]
  })
}

const clearAllItems = async () => {
  const confirm = await ElMessageBox.confirm(
    '确定要清空所有项点吗？此操作不可恢复！', '危险操作',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'error' }
  ).catch(() => false)
  
  if (!confirm) return
  
  mainStore.database!.standardAssessmentItems = {}
  await mainStore.saveDatabase()
  ElMessage.success('已清空所有项点')
}

const handleImport = async (file: any) => {
  if (!file.raw) return
  
  try {
    const data = await readExcelFile(file.raw)
    const items = processImportData(data)
    
    if (items.length === 0) {
      ElMessage.error('未找到有效的项点数据')
      return
    }
    
    items.forEach(item => {
      mainStore.database!.standardAssessmentItems[item.id] = item
    })
    
    await mainStore.saveDatabase()
    ElMessage.success(`成功导入${items.length}个项点`)
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败，请检查文件格式')
  }
}

const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

const processImportData = (rawData: any[]): StandardAssessmentItem[] => {
  return rawData.map(row => ({
    id: row['项点ID'] || generateItemId(row['类别'] || '其他'),
    userCode: row['自定义编号'] || '',
    name: row['项点名称'] || row['原始描述'] || '',
    description: row['原始描述'] || '',
    category: row['类别'] || '其他',
    maxScore: parseFloat(row['分值'] || '-2'),
    responsibleDepartment: row['原始负责部门'] || '',
    defaultResponsibleEntities: [{
      level: row['负责层级'] || '科室',
      department: row['负责部门'] || row['原始负责部门'] || ''
    }],
    createdAt: Date.now(),
    updatedAt: Date.now()
  })).filter(item => item.description)
}

const exportAllItems = () => {
  const data = allItems.value.map(item => ({
    项点ID: item.id,
    自定义编号: item.userCode || '',
    原始描述: item.description,
    类别: item.category,
    分值: item.maxScore,
    原始负责部门: item.responsibleDepartment,
    使用次数: getUsageCount(item.id),
    创建时间: new Date(item.createdAt || 0).toLocaleString()
  }))
  
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '标准项点')
  XLSX.writeFile(wb, `标准项点库_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

const downloadTemplate = () => {
  const template = [
    {
      '类别': '服务',
      '自定义编号': 'FW-001',
      '原始描述': '服务备品 / 列车整备、环境卫生、备品定位不达标',
      '分值': -2,
      '原始负责部门': '车队',
      '负责层级': '车队',
      '负责部门': '具体车队名称'
    }
  ]
  
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '标准项点')
  XLSX.writeFile(wb, '标准项点导入模板.xlsx')
}
</script>

<style lang="scss" scoped>
.standard-item-library {
  .form-card, .batch-card, .list-card {
    margin-bottom: 20px;
    
    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .list-actions {
      display: flex;
      gap: 20px;
    }
  }
  
  .responsible-entities .entity-item {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .batch-actions {
    display: flex;
    gap: 12px;
  }
  
  .filter-row {
    margin-bottom: 20px;
  }
  
  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }
}
</style> 