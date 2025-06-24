<template>
  <el-dialog
    v-model="visible"
    title="导出人员数据"
    width="600px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" label-width="100px">
      <!-- 导出范围 -->
      <el-form-item label="导出范围">
        <el-radio-group v-model="form.range">
          <el-radio value="all">
            全部人员 ({{ totalCount }}人)
          </el-radio>
          <el-radio value="filtered" :disabled="filteredCount === totalCount">
            当前筛选结果 ({{ filteredCount }}人)
          </el-radio>
          <el-radio value="selected" :disabled="selectedCount === 0">
            已选择的人员 ({{ selectedCount }}人)
          </el-radio>
        </el-radio-group>
      </el-form-item>
      
      <!-- 导出字段 -->
      <el-form-item label="导出字段">
        <el-checkbox-group v-model="form.fields">
          <el-checkbox value="basic" disabled>
            <el-tooltip content="工号、姓名、部门、状态等基本信息，必须包含" placement="top">
              <span>基本信息（必选）</span>
            </el-tooltip>
          </el-checkbox>
          <el-checkbox value="dates">
            日期信息（入职日期、启用日期）
          </el-checkbox>
          <el-checkbox value="notes">
            备注信息
          </el-checkbox>
          <el-checkbox value="systemId">
            <el-tooltip content="包含系统内部ID，用于精确更新现有数据，强烈建议勾选" placement="top">
              <span>系统ID（推荐）</span>
            </el-tooltip>
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      
      <!-- 导出格式 -->
      <el-form-item label="文件格式">
        <el-radio-group v-model="form.format">
          <el-radio value="xlsx">
            <el-icon><Document /></el-icon>
            Excel格式 (.xlsx)
          </el-radio>
          <el-radio value="csv">
            <el-icon><Document /></el-icon>
            CSV格式 (.csv)
          </el-radio>
        </el-radio-group>
      </el-form-item>
      
      <!-- 附加选项 -->
      <el-form-item label="附加选项">
        <el-checkbox-group v-model="additionalOptions">
          <el-checkbox value="includeInstructions">
            包含使用说明页
          </el-checkbox>
          <el-checkbox value="openAfterExport" v-if="form.format === 'xlsx'">
            导出后尝试打开文件
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      
      <!-- 预览信息 -->
      <el-form-item label="导出预览">
        <el-alert 
          type="info" 
          :closable="false"
          show-icon
        >
          <template #title>
            将导出 <strong>{{ getExportCount() }}</strong> 条记录
          </template>
          <template #default>
            <div class="preview-details">
              <div>📁 文件格式：{{ getFormatDescription() }}</div>
              <div>📊 包含字段：{{ getFieldsDescription() }}</div>
              <div>📏 预计文件大小：{{ getEstimatedSize() }}</div>
            </div>
          </template>
        </el-alert>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button @click="exportTemplate('empty')">
          <el-icon><Download /></el-icon>
          下载空模板
        </el-button>
        <el-button @click="exportTemplate('example')">
          <el-icon><Document /></el-icon>
          下载示例模板
        </el-button>
        <el-button 
          type="primary" 
          @click="confirmExport"
          :loading="exporting"
          :disabled="getExportCount() === 0"
        >
          <el-icon><Upload /></el-icon>
          确认导出
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { Document, Download, Upload } from '@element-plus/icons-vue'
import { PersonnelExporter } from '@/utils/personnelExporter'
import type { ExportOptions } from '@/types/importExport'
import type { EnhancedConductor } from '@/types'

// Props
interface Props {
  modelValue: boolean
  totalCount: number
  filteredCount: number
  selectedCount: number
  conductors: EnhancedConductor[]
  filteredConductors?: EnhancedConductor[]
  selectedConductors?: EnhancedConductor[]
}

const props = withDefaults(defineProps<Props>(), {
  filteredConductors: () => [],
  selectedConductors: () => []
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  export: [options: ExportOptions, conductors: EnhancedConductor[]]
}>()

// 响应式数据
const formRef = ref()
const exporting = ref(false)

const form = ref<ExportOptions>({
  range: 'all',
  fields: ['basic', 'dates', 'systemId'],
  includeSystemId: true,
  includeInstructions: true,
  format: 'xlsx'
})

const additionalOptions = ref<string[]>(['includeInstructions'])

// 控制对话框显示
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 监听附加选项变化
watch(additionalOptions, (newOptions) => {
  form.value.includeInstructions = newOptions.includes('includeInstructions')
}, { deep: true })

// 监听字段变化，自动更新includeSystemId
watch(() => form.value.fields, (newFields) => {
  form.value.includeSystemId = newFields.includes('systemId')
}, { deep: true })

// 计算属性
const getExportCount = () => {
  switch (form.value.range) {
    case 'filtered':
      return props.filteredCount
    case 'selected':
      return props.selectedCount
    default:
      return props.totalCount
  }
}

const getFormatDescription = () => {
  switch (form.value.format) {
    case 'csv':
      return 'CSV格式（兼容性好，但样式简单）'
    default:
      return 'Excel格式（支持样式和多工作表）'
  }
}

const getFieldsDescription = () => {
  const descriptions = []
  
  if (form.value.fields.includes('basic')) {
    descriptions.push('基本信息')
  }
  if (form.value.fields.includes('dates')) {
    descriptions.push('日期信息')
  }
  if (form.value.fields.includes('notes')) {
    descriptions.push('备注信息')
  }
  if (form.value.fields.includes('systemId')) {
    descriptions.push('系统ID')
  }
  
  return descriptions.join('、') || '基本信息'
}

const getEstimatedSize = () => {
  const recordCount = getExportCount()
  const fieldCount = form.value.fields.length + 3 // 基本字段总是包含
  const estimatedBytes = recordCount * fieldCount * 50 // 每个字段大约50字节
  
  if (estimatedBytes < 1024) {
    return `< 1 KB`
  } else if (estimatedBytes < 1024 * 1024) {
    return `~${Math.round(estimatedBytes / 1024)} KB`
  } else {
    return `~${Math.round(estimatedBytes / (1024 * 1024))} MB`
  }
}

// 获取要导出的数据
const getExportData = (): EnhancedConductor[] => {
  switch (form.value.range) {
    case 'filtered':
      return props.filteredConductors.length > 0 ? props.filteredConductors : props.conductors
    case 'selected':
      return props.selectedConductors
    default:
      return props.conductors
  }
}

// 导出确认
const confirmExport = async () => {
  if (getExportCount() === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  
  try {
    exporting.value = true
    
    const exportData = getExportData()
    const options = { ...form.value }
    
    // 确保基本字段总是包含
    if (!options.fields.includes('basic')) {
      options.fields.unshift('basic')
    }
    
    await PersonnelExporter.exportToExcel(exportData, options)
    
    ElNotification.success({
      title: '导出成功',
      message: `已成功导出 ${exportData.length} 条人员数据`,
      duration: 3000
    })
    
    // 触发导出事件
    emit('export', options, exportData)
    
    // 关闭对话框
    visible.value = false
    
  } catch (error: any) {
    ElMessage.error(`导出失败: ${error.message}`)
  } finally {
    exporting.value = false
  }
}

// 导出模板
const exportTemplate = async (type: 'empty' | 'example') => {
  try {
    await PersonnelExporter.exportTemplate(type)
    
    ElMessage.success(`${type === 'empty' ? '空白' : '示例'}模板下载成功`)
    
  } catch (error: any) {
    ElMessage.error(`模板下载失败: ${error.message}`)
  }
}

// 重置表单
const resetForm = () => {
  form.value = {
    range: 'all',
    fields: ['basic', 'dates', 'systemId'],
    includeSystemId: true,
    includeInstructions: true,
    format: 'xlsx'
  }
  
  additionalOptions.value = ['includeInstructions']
  exporting.value = false
}

// 智能推荐导出范围
watch(visible, (isVisible) => {
  if (isVisible) {
    // 根据当前状态智能推荐导出范围
    if (props.selectedCount > 0) {
      form.value.range = 'selected'
    } else if (props.filteredCount < props.totalCount) {
      form.value.range = 'filtered'
    } else {
      form.value.range = 'all'
    }
  }
})
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .el-button {
    margin-left: 8px;
    
    &:first-child {
      margin-left: 0;
    }
  }
}

.preview-details {
  div {
    margin-bottom: 4px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-checkbox__label) {
  font-size: 14px;
}

:deep(.el-radio__label) {
  font-size: 14px;
}

:deep(.el-alert__title) {
  font-size: 14px;
}

:deep(.el-alert__content) {
  font-size: 13px;
}
</style> 