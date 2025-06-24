<template>
  <el-dialog
    v-model="visible"
    title="数据导入向导"
    width="800px"
    @closed="resetWizard"
  >
    <!-- 步骤指示器 -->
    <div class="steps-container">
      <el-steps :active="currentStep" finish-status="success">
        <el-step title="上传文件" />
        <el-step title="数据验证" />
        <el-step title="执行导入" />
      </el-steps>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <!-- 步骤1: 文件上传 -->
      <div v-if="currentStep === 0" class="upload-step">
        <div class="template-actions">
          <el-alert type="info" :closable="false">
            <template #title>📋 导入说明</template>
            <div>支持Excel和CSV格式。可先下载模板或导出现有数据进行编辑。</div>
          </el-alert>
          
          <div class="action-buttons">
            <el-button @click="downloadTemplate('empty')">
              <el-icon><Download /></el-icon>
              下载空模板
            </el-button>
            <el-button @click="downloadTemplate('example')">
              <el-icon><Document /></el-icon>
              下载示例
            </el-button>
            <el-button @click="exportForEdit">
              <el-icon><EditPen /></el-icon>
              导出现有数据
            </el-button>
          </div>
        </div>
        
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleFileChange"
          accept=".xlsx,.xls,.csv"
          drag
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处，或<em>点击选择文件</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式
            </div>
          </template>
        </el-upload>
      </div>
      
      <!-- 步骤2: 数据验证 -->
      <div v-if="currentStep === 1" class="validation-step">
        <div v-if="parsing">
          <el-skeleton :rows="3" animated />
          <div style="text-align: center; margin-top: 16px;">正在解析文件...</div>
        </div>
        
        <div v-else-if="parseResult">
          <el-row :gutter="16" style="margin-bottom: 16px;">
            <el-col :span="6">
              <el-statistic title="总记录" :value="parseResult.statistics.totalRows" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="有效记录" :value="parseResult.statistics.validRows" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="错误记录" :value="parseResult.statistics.errorRows" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="警告" :value="parseResult.warnings.length" />
            </el-col>
          </el-row>
          
          <!-- 错误信息 -->
          <div v-if="parseResult.errors.length > 0">
            <el-alert type="error" title="发现错误" :closable="false">
              <div v-for="error in parseResult.errors.slice(0, 5)" :key="error.row">
                第{{ error.row }}行 {{ error.field }}: {{ error.message }}
              </div>
            </el-alert>
          </div>
          
          <!-- 数据预览 -->
          <div v-if="parseResult.success" style="margin-top: 16px;">
            <h4>数据预览</h4>
            <el-table :data="parseResult.data.slice(0, 5)" border size="small">
              <el-table-column prop="employeeId" label="工号" width="100" />
              <el-table-column prop="name" label="姓名" width="100" />
              <el-table-column prop="department" label="部门" width="120" />
              <el-table-column prop="status" label="状态" width="100" />
            </el-table>
          </div>
        </div>
      </div>
      
      <!-- 步骤3: 执行导入 -->
      <div v-if="currentStep === 2" class="execute-step">
        <div v-if="importing">
          <el-progress :percentage="importProgress" stroke-width="10" />
          <div style="text-align: center; margin-top: 16px;">{{ importProgressText }}</div>
        </div>
        
        <div v-else-if="importCompleted">
          <el-result
            :icon="importSuccess ? 'success' : 'error'"
            :title="importSuccess ? '导入成功' : '导入失败'"
            :sub-title="importResultMessage"
          />
        </div>
        
        <div v-else>
          <el-alert type="warning" title="准备导入" :closable="false">
            <div>将要导入 {{ matchResults.length }} 条记录</div>
          </el-alert>
        </div>
      </div>
    </div>
    
    <!-- 底部按钮 -->
    <template #footer>
      <div class="footer-buttons">
        <el-button v-if="currentStep > 0" @click="previousStep">上一步</el-button>
        <el-button 
          v-if="currentStep < 2" 
          type="primary" 
          @click="nextStep"
          :disabled="!canProceed"
          :loading="processing"
        >
          下一步
        </el-button>
        <el-button 
          v-if="currentStep === 2 && !importing && !importCompleted" 
          type="success" 
          @click="executeImport"
        >
          执行导入
        </el-button>
        <el-button v-if="importCompleted" type="primary" @click="visible = false">
          完成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { UploadFilled, Download, Document, EditPen } from '@element-plus/icons-vue'
import { PersonnelExporter } from '@/utils/personnelExporter'
import { PersonnelImporter } from '@/utils/personnelImporter'
import { usePersonnelStore } from '@/stores/personnel'
import type { ParseResult, MatchResult } from '@/types/importExport'

// Props & Emits
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'import-complete': [result: any]
}>()

// 响应式数据
const uploadRef = ref()
const currentStep = ref(0)
const uploadedFile = ref<File | null>(null)
const parsing = ref(false)
const importing = ref(false)
const processing = ref(false)
const parseResult = ref<ParseResult | null>(null)
const matchResults = ref<MatchResult[]>([])

// 导入状态
const importProgress = ref(0)
const importProgressText = ref('')
const importCompleted = ref(false)
const importSuccess = ref(false)
const importResultMessage = ref('')

// Store
const personnelStore = usePersonnelStore()

// 控制对话框显示
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 是否可以进入下一步
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0: return uploadedFile.value !== null
    case 1: return parseResult.value?.success === true
    default: return true
  }
})

// 文件处理
const handleFileChange = (file: any) => {
  uploadedFile.value = file.raw
}

// 下载模板
const downloadTemplate = async (type: 'empty' | 'example') => {
  try {
    await PersonnelExporter.exportTemplate(type)
    ElMessage.success('模板下载成功')
  } catch (error: any) {
    ElMessage.error(`下载失败: ${error.message}`)
  }
}

// 导出现有数据
const exportForEdit = async () => {
  try {
    const conductors = personnelStore.allConductors
    if (conductors.length === 0) {
      ElMessage.warning('当前没有数据可导出')
      return
    }
    await PersonnelExporter.exportForEdit(conductors)
    ElMessage.success('数据导出成功')
  } catch (error: any) {
    ElMessage.error(`导出失败: ${error.message}`)
  }
}

// 下一步
const nextStep = async () => {
  processing.value = true
  
  try {
    if (currentStep.value === 0) {
      await parseFile()
    }
    currentStep.value++
  } catch (error: any) {
    ElMessage.error(error.message)
  } finally {
    processing.value = false
  }
}

// 上一步
const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 解析文件
const parseFile = async () => {
  if (!uploadedFile.value) {
    throw new Error('请选择文件')
  }
  
  parsing.value = true
  
  try {
    const result = await PersonnelImporter.parseFile(uploadedFile.value)
    parseResult.value = result
    matchResults.value = result.matching || []
    
    if (!result.success) {
      throw new Error('文件解析失败')
    }
  } finally {
    parsing.value = false
  }
}

// 执行导入
const executeImport = async () => {
  importing.value = true
  importProgressText.value = '正在导入数据...'
  
  try {
    // 执行实际导入
    const result = await PersonnelImporter.executeImport(matchResults.value)
    
    importProgress.value = 100
    importCompleted.value = true
    importSuccess.value = result.failed === 0
    importResultMessage.value = `成功导入 ${result.success} 条记录${result.failed > 0 ? `，${result.failed} 条失败` : ''}`
    
    ElNotification.success({
      title: '导入完成',
      message: importResultMessage.value
    })
    
    emit('import-complete', result)
    
  } catch (error: any) {
    importCompleted.value = true
    importSuccess.value = false
    importResultMessage.value = error.message
    ElMessage.error(`导入失败: ${error.message}`)
  } finally {
    importing.value = false
  }
}

// 重置向导
const resetWizard = () => {
  currentStep.value = 0
  uploadedFile.value = null
  parseResult.value = null
  matchResults.value = []
  importing.value = false
  importCompleted.value = false
  uploadRef.value?.clearFiles()
}
</script>

<style lang="scss" scoped>
.steps-container {
  margin-bottom: 24px;
}

.step-content {
  min-height: 300px;
  margin-bottom: 24px;
}

.upload-step {
  .template-actions {
    margin-bottom: 24px;
    
    .action-buttons {
      margin-top: 12px;
      display: flex;
      gap: 8px;
    }
  }
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style> 