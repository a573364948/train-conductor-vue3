<template>
  <div class="standard-items-container">
    <!-- 项点表单 -->
    <div class="card">
      <h3>{{ editingItem ? '编辑项点' : '新增项点' }}</h3>
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
                <el-option label="+ 新增分类" value="__new__" />
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
              v-for="(entity, index) in itemForm.defaultResponsibleEntities"
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
                :disabled="itemForm.defaultResponsibleEntities.length === 1"
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
    </div>

    <!-- 批量操作 -->
    <div class="card">
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
        <el-button type="danger" @click="clearAllItems">
          <el-icon><Delete /></el-icon>
          清空所有项点
        </el-button>
      </div>
    </div>

    <!-- 项点列表 -->
    <div class="card">
      <h3>已存项点列表</h3>
      
      <!-- 筛选条件 -->
      <el-row :gutter="20" class="filter-row">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索项点描述或编号"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="8">
          <el-select v-model="filterCategory" placeholder="筛选分类" clearable @change="handleSearch">
            <el-option label="全部分类" value="" />
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select v-model="filterDepartment" placeholder="筛选负责部门" clearable @change="handleSearch">
            <el-option label="全部部门" value="" />
            <el-option label="科室" value="科室" />
            <el-option label="车队" value="车队" />
          </el-select>
        </el-col>
      </el-row>
      
      <!-- 数据表格 -->
      <el-table :data="filteredItems" stripe style="margin-top: 20px">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="category" label="类别" width="100" />
        <el-table-column prop="id" label="ID" width="150" show-overflow-tooltip />
        <el-table-column prop="userCode" label="自定义编号" width="120" />
        <el-table-column prop="description" label="原始描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="maxScore" label="分值" width="80">
          <template #default="{ row }">
            <el-tag :type="row.maxScore < -5 ? 'danger' : 'warning'">
              {{ row.maxScore }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responsibleDepartment" label="原始负责部门" width="120" />
        <el-table-column label="默认负责实体" min-width="200">
          <template #default="{ row }">
            <div class="entity-tags">
              <el-tag
                v-for="(entity, index) in row.defaultResponsibleEntities"
                :key="index"
                size="small"
                style="margin-right: 4px"
              >
                {{ entity.level }}-{{ entity.department }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="editItem(row)">编辑</el-button>
            <el-button type="danger" size="small" text @click="deleteItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-if="filteredItems.length === 0" description="暂无项点数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
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
const newCategoryDialogVisible = ref(false)
const newCategoryName = ref('')

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
  
  return items
})

// 方法
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
  
  // 验证负责实体
  const validEntities = itemForm.defaultResponsibleEntities!.filter(e => e.department)
  if (validEntities.length === 0) {
    ElMessage.error('请至少填写一个负责实体的部门名称')
    return
  }
  
  // 生成ID
  if (!itemForm.id) {
    itemForm.id = generateItemId(itemForm.category!)
  }
  
  // 保存数据
  const item: StandardAssessmentItem = {
    ...itemForm as StandardAssessmentItem,
    name: itemForm.description!, // 使用描述作为名称
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
  const confirm = await ElMessageBox.confirm(
    `确定要删除项点"${item.description}"吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
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
}

const handleSearch = () => {
  // 触发计算属性更新
}

const clearAllItems = async () => {
  const confirm = await ElMessageBox.confirm(
    '确定要清空所有项点吗？此操作不可恢复！',
    '危险操作',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    }
  ).catch(() => false)
  
  if (!confirm) return
  
  mainStore.database!.standardAssessmentItems = {}
  await mainStore.saveDatabase()
  
  ElMessage.success('已清空所有项点')
}

// Excel导入
const handleImport = async (file: any) => {
  if (!file.raw) return
  
  try {
    const data = await readExcelFile(file.raw)
    const items = processImportData(data)
    
    if (items.length === 0) {
      ElMessage.error('未找到有效的项点数据')
      return
    }
    
    // 批量导入
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

// 下载模板
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
    },
    {
      '类别': '安全',
      '自定义编号': 'AQ-001',
      '原始描述': '安全隐患 / 违反安全操作规程',
      '分值': -5,
      '原始负责部门': '安全科',
      '负责层级': '科室',
      '负责部门': '安全科'
    }
  ]
  
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '标准项点')
  XLSX.writeFile(wb, '标准项点导入模板.xlsx')
}

// 生命周期
onMounted(() => {
  if (!mainStore.database) {
    mainStore.loadDatabase()
  }
})
</script>

<style lang="scss" scoped>
.standard-items-container {
  .card {
    background: var(--bg-white);
    border-radius: 4px;
    padding: 20px;
    margin-bottom: 20px;
    
    h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
    }
  }
  
  .responsible-entities {
    .entity-item {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
  }
  
  .batch-actions {
    display: flex;
    gap: 12px;
  }
  
  .filter-row {
    margin-bottom: 20px;
  }
  
  .entity-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}
</style> 