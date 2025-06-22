<template>
  <div class="data-import">
    <!-- 导入步骤指示器 -->
    <div class="import-steps">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择文件" description="选择年月并上传Excel文件" />
        <el-step title="数据预览" description="预览数据并选择导入模式" />
        <el-step title="确认导入" description="确认信息并完成导入" />
      </el-steps>
    </div>

    <!-- 步骤1: 文件选择 -->
    <div v-if="currentStep === 0" class="step-content">
      <!-- 时间选择器 -->
      <div class="card">
        <div class="month-selector">
          <h3>选择考核月份</h3>
          <div class="selector-group">
            <el-select v-model="selectedYear" placeholder="选择年份" size="default" style="width: 120px;">
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="`${year}年`"
                :value="year"
              />
            </el-select>
            <el-select v-model="selectedMonth" placeholder="选择月份" size="default" style="width: 120px;">
              <el-option
                v-for="month in 12"
                :key="month"
                :label="`${month}月`"
                :value="month"
              />
            </el-select>
            <el-tag v-if="selectedYear && selectedMonth" type="info" class="selected-tag">
              {{ selectedYear }}年{{ selectedMonth }}月
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 上传区域 -->
      <div class="card">
        <h3>上传考核扣分记录</h3>
        <p class="upload-description">此功能用于上传列车长<strong>考核扣分数据</strong>，包含各类违规行为的扣分记录</p>
        <div class="upload-area">
          <el-upload
            v-if="selectedYear && selectedMonth"
            class="upload-demo"
            drag
            :auto-upload="false"
            :file-list="fileList"
            :on-change="handleFileChange"
            :on-remove="handleRemove"
            accept=".xlsx,.xls"
            :limit="1"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将Excel文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                只支持 .xlsx 和 .xls 格式的Excel文件，建议使用标准模板
              </div>
            </template>
          </el-upload>
          <el-alert
            v-else
            title="请先选择考核年月"
            type="warning"
            :closable="false"
          />
        </div>
        
        <!-- 模板下载 -->
        <div class="template-section">
          <el-divider content-position="left">数据模板</el-divider>
          <div class="template-actions">
            <el-button @click="downloadTemplate" type="primary" plain>
              <el-icon><Download /></el-icon>
              下载标准模板
            </el-button>
            <el-button @click="viewTemplate" type="info" plain>
              <el-icon><View /></el-icon>
              查看模板格式
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤2: 数据预览 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="card">
        <h3>数据预览与配置</h3>
        
        <!-- 冲突检测 -->
        <el-alert
          v-if="existingRecords"
          title="检测到已有考核记录"
          type="warning"
          show-icon
          class="mb-4"
        >
          <template #default>
            <p>{{ selectedYear }}年{{ selectedMonth }}月已有 {{ existingRecords }} 条考核记录。</p>
            <el-radio-group v-model="importMode" class="mt-2">
              <el-radio label="overwrite">覆盖模式（清除现有数据）</el-radio>
              <el-radio label="append">追加模式（保留现有数据）</el-radio>
            </el-radio-group>
          </template>
        </el-alert>
        
        <!-- 数据统计 -->
        <div class="preview-stats mb-4">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总记录数" :value="previewData.length" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="涉及人员" :value="uniqueConductors" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="总扣分项" :value="totalDeductions" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="考核部门" :value="uniqueDepartments" />
            </el-col>
          </el-row>
        </div>

        <!-- 数据质量检查 -->
        <div v-if="dataQuality" class="data-quality mb-4">
          <el-alert
            :title="`数据质量检查 - ${dataQuality.score}分`"
            :type="dataQuality.score >= 80 ? 'success' : dataQuality.score >= 60 ? 'warning' : 'error'"
            :closable="false"
          >
            <div class="quality-details">
              <el-tag v-if="dataQuality.duplicates > 0" type="warning" size="small">
                重复记录: {{ dataQuality.duplicates }}条
              </el-tag>
              <el-tag v-if="dataQuality.missingFields > 0" type="danger" size="small">
                缺失字段: {{ dataQuality.missingFields }}条
              </el-tag>
              <el-tag v-if="dataQuality.invalidData > 0" type="danger" size="small">
                异常数据: {{ dataQuality.invalidData }}条
              </el-tag>
            </div>
          </el-alert>
        </div>

        <!-- 预览表格 -->
        <el-table :data="previewData.slice(0, 10)" stripe max-height="400">
          <el-table-column prop="conductorId" label="工号" width="100" />
          <el-table-column prop="conductorName" label="姓名" width="100" />
          <el-table-column prop="department" label="所属部门" min-width="150" />
          <el-table-column prop="assessDate" label="考核日期" width="120" />
          <el-table-column prop="assessorDepartmentName" label="考核部门" min-width="150" />
          <el-table-column label="扣分详情" min-width="200">
            <template #default="{ row }">
              <el-popover placement="top" width="400" trigger="hover">
                <div v-for="(item, index) in row.details" :key="index" class="mb-2">
                  <el-tag size="small">{{ item.deduction }}分</el-tag>
                  {{ item.item }}
                </div>
                <template #reference>
                  <span>{{ row.details.length }}项，共{{ row.totalDeduction }}分</span>
                </template>
              </el-popover>
            </template>
          </el-table-column>
        </el-table>
        
        <div v-if="previewData.length > 10" class="text-center mt-2 text-gray-500">
          仅显示前10条记录，共{{ previewData.length }}条
        </div>
      </div>
    </div>

    <!-- 步骤3: 确认导入 -->
    <div v-if="currentStep === 2" class="step-content">
      <div class="card">
        <h3>确认导入信息</h3>
        <div class="import-summary">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="导入月份">
              {{ selectedYear }}年{{ selectedMonth }}月
            </el-descriptions-item>
            <el-descriptions-item label="文件名称">
              {{ fileName }}
            </el-descriptions-item>
            <el-descriptions-item label="导入模式">
              <el-tag :type="importMode === 'overwrite' ? 'danger' : 'success'">
                {{ importMode === 'overwrite' ? '覆盖模式' : '追加模式' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="记录数量">
              {{ previewData.length }}条
            </el-descriptions-item>
            <el-descriptions-item label="涉及人员">
              {{ uniqueConductors }}人
            </el-descriptions-item>
            <el-descriptions-item label="数据质量">
              <el-tag :type="(dataQuality?.score ?? 0) >= 80 ? 'success' : (dataQuality?.score ?? 0) >= 60 ? 'warning' : 'danger'">
                {{ dataQuality?.score ?? 0 }}分
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
          
          <div v-if="importMode === 'overwrite' && existingRecords" class="warning-notice mt-4">
            <el-alert
              title="重要提醒"
              type="warning"
              show-icon
              :closable="false"
            >
              覆盖模式将删除{{ selectedYear }}年{{ selectedMonth }}月现有的{{ existingRecords }}条记录，此操作不可撤销！
            </el-alert>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
      <el-button @click="cancelImport">取消</el-button>
      
      <el-button 
        v-if="currentStep < 2" 
        type="primary" 
        @click="nextStep"
        :disabled="!canProceed"
      >
        下一步
      </el-button>
      
      <el-button 
        v-if="currentStep === 2" 
        type="primary" 
        @click="confirmImport" 
        :loading="uploading"
      >
        <el-icon><Check /></el-icon>
        确认导入
      </el-button>
    </div>



    <!-- 模板查看对话框 -->
    <el-dialog v-model="templateDialogVisible" title="Excel模板格式说明" width="60%">
      <div class="template-guide">
        <el-alert title="必填字段说明" type="info" :closable="false" class="mb-4">
          <p>Excel文件必须包含以下列（列名需完全匹配）：</p>
          <ul>
            <li><strong>工号</strong> - 列车长工号</li>
            <li><strong>姓名</strong> - 列车长姓名</li>
            <li><strong>部门</strong> - 所属部门</li>
            <li><strong>考核日期</strong> - 格式：YYYY-MM-DD</li>
            <li><strong>考核部门</strong> - 执行考核的部门</li>
            <li><strong>扣分</strong> - 扣分值（数字）</li>
            <li><strong>考核项</strong> - 扣分项描述</li>
          </ul>
        </el-alert>
        
        <el-table :data="templateData" border>
          <el-table-column prop="col1" label="工号" width="80" />
          <el-table-column prop="col2" label="姓名" width="80" />
          <el-table-column prop="col3" label="部门" width="120" />
          <el-table-column prop="col4" label="考核日期" width="120" />
          <el-table-column prop="col5" label="考核部门" width="120" />
          <el-table-column prop="col6" label="扣分" width="80" />
          <el-table-column prop="col7" label="考核项" min-width="200" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  UploadFilled, 
  Download, 
  View,
  Check
} from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { useMainStore } from '@/stores'
import type { AssessmentRecord, AssessmentDetail } from '@/types'

// Props和Emits
const emit = defineEmits<{
  importSuccess: [data: { year: number, month: number, recordCount: number }]
}>()

const mainStore = useMainStore()

// 状态
const currentStep = ref(0)
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const fileList = ref<any[]>([])
const fileName = ref('')
const previewData = ref<AssessmentRecord[]>([])
const uploading = ref(false)
const importMode = ref<'overwrite' | 'append'>('overwrite')
const templateDialogVisible = ref(false)

// 计算属性
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - i)
})

const existingRecords = computed(() => {
  if (!mainStore.database) return 0
  const key = `${selectedYear.value}_${selectedMonth.value}`
  return mainStore.database.assessmentDB[key]?.length || 0
})

const uniqueConductors = computed(() => {
  const ids = new Set(previewData.value.map(r => r.conductorId))
  return ids.size
})

const totalDeductions = computed(() => {
  return previewData.value.reduce((sum, r) => sum + r.details.length, 0)
})

const uniqueDepartments = computed(() => {
  const depts = new Set(previewData.value.map(r => r.assessorDepartmentName))
  return depts.size
})

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return selectedYear.value && selectedMonth.value && previewData.value.length > 0
  }
  if (currentStep.value === 1) {
    return previewData.value.length > 0
  }
  return true
})

// 数据质量评估
const dataQuality = computed(() => {
  if (previewData.value.length === 0) return null
  
  const duplicates = 0 // TODO: 实现重复检测
  const missingFields = previewData.value.filter(r => 
    !r.conductorId || !r.conductorName || !r.department
  ).length
  const invalidData = previewData.value.filter(r => 
    r.totalDeduction < 0 || !r.assessDate
  ).length
  
  const totalIssues = duplicates + missingFields + invalidData
  const score = Math.max(0, 100 - (totalIssues / previewData.value.length) * 100)
  
  return {
    score: Math.round(score),
    duplicates,
    missingFields,
    invalidData
  }
})

// 模板数据
const templateData = [
  {
    col1: '1001',
    col2: '张三',
    col3: '车队一',
    col4: '2025-01-01',
    col5: '安全科',
    col6: '5',
    col7: '列车进路办理不当'
  },
  {
    col1: '1002',
    col2: '李四',
    col3: '车队二',
    col4: '2025-01-02',
    col5: '车队一',
    col6: '3',
    col7: '机车操纵不规范'
  }
]

// 方法
const nextStep = () => {
  if (canProceed.value) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const handleFileChange = async (file: any) => {
  if (!file.raw) return
  
  fileName.value = file.name
  
  try {
    const data = await readExcelFile(file.raw)
    previewData.value = processAssessmentData(data)
    
    if (previewData.value.length === 0) {
      ElMessage.error('未找到有效的考核数据')
      fileList.value = []
      fileName.value = ''
    }
  } catch (error) {
    console.error('读取文件失败:', error)
    ElMessage.error('读取文件失败，请检查文件格式')
    fileList.value = []
    fileName.value = ''
  }
}

const handleRemove = () => {
  previewData.value = []
  fileName.value = ''
  currentStep.value = 0
}

// 读取Excel文件
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

// 处理考核数据
const processAssessmentData = (rawData: any[]): AssessmentRecord[] => {
  const recordsMap = new Map<string, AssessmentRecord>()
  
  // 获取标准项点库
  const standardItems = mainStore.database?.standardAssessmentItems || {}
  const itemsList = Object.values(standardItems)
  
  rawData.forEach((row) => {
    // 提取基本信息
    const conductorId = String(row['工号'] || row['列车长工号'] || '')
    const conductorName = row['姓名'] || row['列车长姓名'] || ''
    const department = row['部门'] || row['所属部门'] || ''
    const assessDate = formatDate(row['考核日期'] || row['检查日期'] || '')
    const assessorDept = row['考核部门'] || row['检查部门'] || ''
    const assessDeptType = detectDeptType(assessorDept)
    
    if (!conductorId || !conductorName) return
    
    // 生成记录ID
    const recordKey = `${conductorId}_${assessDate}`
    
    // 获取或创建记录
    if (!recordsMap.has(recordKey)) {
      recordsMap.set(recordKey, {
        id: generateId(),
        conductorId,
        conductorName,
        department,
        assessDate: assessDate,
        assessTime: row['考核时间'] || '',
        assessorDepartmentName: assessorDept === '车队' ? department : assessorDept,
        assessorPerson: row['考核人'] || '',
        assessDeptType,
        baseScore: 100,
        finalScore: 0,
        totalScore: 0,
        totalDeduction: 0,
        details: [],
        createdAt: Date.now()
      })
    }
    
    const record = recordsMap.get(recordKey)!
    
    // 添加扣分项
    const deductionScore = parseFloat(row['扣分'] || row['扣分值'] || '0')
    if (deductionScore !== 0) {
      const itemDescription = row['考核项'] || row['扣分项'] || row['问题描述'] || ''
      
      // 尝试匹配标准项点
      const matchedItem = findMatchingStandardItem(itemDescription, itemsList)
      
      const detail: AssessmentDetail = {
        assessDeptType: assessDeptType,
        assessorDepartment: assessorDept,
        deduction: Math.abs(deductionScore),
        item: itemDescription,
        itemCategory: matchedItem?.category || row['类别'] || row['分类'] || '',
        itemCode: matchedItem?.id || row['项点编号'] || row['项点ID'] || '',
        itemDetail: row['详情'] || row['备注'] || '',
        itemName: matchedItem?.name || row['项点名称'] || '',
        times: 1,
        length: 1
      }
      
      record.details.push(detail)
      record.totalDeduction += Math.abs(deductionScore)
    }
  })
  
  // 计算最终得分
  const records = Array.from(recordsMap.values())
  records.forEach(record => {
    record.finalScore = record.baseScore - record.totalDeduction
    record.totalScore = record.finalScore
  })
  
  return records
}

// 查找匹配的标准项点
const findMatchingStandardItem = (description: string, items: any[]) => {
  if (!description) return null
  
  const descLower = description.toLowerCase()
  
  // 精确匹配
  let matched = items.find(item => 
    item.description.toLowerCase() === descLower ||
    item.name.toLowerCase() === descLower
  )
  
  // 包含匹配
  if (!matched) {
    matched = items.find(item => 
      item.description.toLowerCase().includes(descLower) ||
      descLower.includes(item.description.toLowerCase()) ||
      item.name.toLowerCase().includes(descLower) ||
      descLower.includes(item.name.toLowerCase())
    )
  }
  
  // 关键词匹配
  if (!matched) {
    const keywords = descLower.split(/[,，、\/]/).map(k => k.trim()).filter(k => k.length > 2)
    matched = items.find(item => {
      const itemDesc = item.description.toLowerCase()
      const itemName = item.name.toLowerCase()
      return keywords.some(keyword => 
        itemDesc.includes(keyword) || itemName.includes(keyword)
      )
    })
  }
  
  return matched
}

// 检测部门类型
const detectDeptType = (deptName: string): '科室' | '车队' | '其他' => {
  if (deptName.includes('车队') || deptName === '车队') return '车队'
  if (deptName.includes('科')) return '科室'
  return '其他'
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  
  // 尝试解析日期
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  
  // 处理 Excel 数字格式日期
  const excelDate = parseFloat(dateStr)
  if (!isNaN(excelDate)) {
    const utcDays = Math.floor(excelDate - 25569)
    const utcValue = utcDays * 86400
    const dateInfo = new Date(utcValue * 1000)
    return dateInfo.toISOString().split('T')[0]
  }
  
  return dateStr
}

// 生成ID
const generateId = (): string => {
  return `AR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 取消导入
const cancelImport = () => {
  fileList.value = []
  previewData.value = []
  fileName.value = ''
  currentStep.value = 0
  importMode.value = 'overwrite'
}

// 确认导入
const confirmImport = async () => {
  if (existingRecords.value > 0 && importMode.value === 'overwrite') {
    const confirm = await ElMessageBox.confirm(
      `确定要覆盖${selectedYear.value}年${selectedMonth.value}月的${existingRecords.value}条考核记录吗？`,
      '确认覆盖',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).catch(() => false)
    
    if (!confirm) return
  }
  
  uploading.value = true
  
  try {
    // 保存数据
    const key = `${selectedYear.value}_${selectedMonth.value}`
    
    if (!mainStore.database!.assessmentDB) {
      mainStore.database!.assessmentDB = {}
    }
    
    if (importMode.value === 'overwrite') {
      mainStore.database!.assessmentDB[key] = previewData.value
    } else {
      const existing = mainStore.database!.assessmentDB[key] || []
      mainStore.database!.assessmentDB[key] = [...existing, ...previewData.value]
    }
    
    // 保存到数据库
    await mainStore.saveDatabase()
    
    ElMessage.success(`成功导入${previewData.value.length}条考核记录`)
    
    // 通知父组件导入成功
    emit('importSuccess', {
      year: selectedYear.value,
      month: selectedMonth.value,
      recordCount: previewData.value.length
    })
    
    // 清理
    cancelImport()
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败，请重试')
  } finally {
    uploading.value = false
  }
}

// 下载模板
const downloadTemplate = () => {
  const templateWs = XLSX.utils.json_to_sheet(templateData.map(row => ({
    '工号': row.col1,
    '姓名': row.col2,
    '部门': row.col3,
    '考核日期': row.col4,
    '考核部门': row.col5,
    '扣分': row.col6,
    '考核项': row.col7
  })))
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, templateWs, '考核记录模板')
  XLSX.writeFile(wb, '考核记录导入模板.xlsx')
  
  ElMessage.success('模板下载成功')
}

// 查看模板
const viewTemplate = () => {
  templateDialogVisible.value = true
}



// 初始化
onMounted(() => {
  if (!mainStore.database) {
    mainStore.loadDatabase()
  }
})
</script>

<style lang="scss" scoped>
.data-import {
  .import-steps {
    margin-bottom: 32px;
    
    :deep(.el-steps) {
      .el-step__title {
        font-size: 14px;
        font-weight: 500;
      }
      
      .el-step__description {
        font-size: 12px;
      }
    }
  }
  
  .step-content {
    min-height: 400px;
  }
  
  .card {
    background: var(--bg-white);
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    h3 {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .upload-description {
      margin: 12px 0 20px 0;
      padding: 12px 16px;
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-size: 14px;
      color: #1e40af;
      line-height: 1.5;
      
      strong {
        color: #1d4ed8;
        font-weight: 600;
      }
    }
  }
  
  .month-selector {
    .selector-group {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .selected-tag {
        font-weight: 500;
      }
    }
    
    h3 {
      margin-bottom: 12px !important;
    }
  }
  
  .upload-area {
    margin-bottom: 24px;
    
    .upload-demo {
      :deep(.el-upload) {
        width: 100%;
      }
      
      :deep(.el-upload-dragger) {
        width: 100%;
        height: 180px;
        border-radius: 8px;
        border: 2px dashed var(--el-border-color);
        
        &:hover {
          border-color: var(--el-color-primary);
        }
      }
    }
  }
  
  .template-section {
    .template-actions {
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }
  }
  
  .preview-stats {
    :deep(.el-statistic) {
      text-align: center;
      
      .el-statistic__content {
        font-size: 20px;
        font-weight: 600;
        color: var(--el-color-primary);
      }
    }
  }
  
  .data-quality {
    .quality-details {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
  }
  
  .import-summary {
    .warning-notice {
      margin-top: 20px;
    }
  }
  
  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 32px;
    padding: 24px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }
  
  .template-guide {
    ul {
      margin: 12px 0;
      padding-left: 24px;
      
      li {
        margin-bottom: 8px;
        line-height: 1.5;
      }
    }
  }
}

.mb-4 {
  margin-bottom: 16px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.text-center {
  text-align: center;
}

.text-gray-500 {
  color: var(--text-secondary);
}
</style> 