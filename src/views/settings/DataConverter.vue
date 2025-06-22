<template>
  <div class="data-converter">
    <el-card>
      <template #header>
        <h3>原系统数据转换工具</h3>
        <p class="help-text">将原系统的JSON格式数据转换为Vue3系统格式</p>
      </template>

      <!-- 步骤指示器 -->
      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 20px">
        <el-step title="上传数据" description="选择原系统备份文件" />
        <el-step title="预览转换" description="检查转换结果" />
        <el-step title="导入系统" description="完成数据迁移" />
      </el-steps>

      <!-- 第一步：上传文件 -->
      <div v-if="currentStep === 0" class="step-content">
        <el-alert
          title="使用说明"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <template #default>
            <ol style="margin: 8px 0; padding-left: 20px">
              <li>从原系统导出完整的JSON备份文件</li>
              <li>确保文件包含 assessmentDB 和 standardAssessmentItems 数据</li>
              <li>系统将自动验证和转换数据格式</li>
              <li>转换过程中会保留原有数据的完整性</li>
            </ol>
          </template>
        </el-alert>

        <el-upload
          ref="uploadRef"
          class="upload-area"
          drag
          :auto-upload="false"
          :limit="1"
          accept=".json"
          :on-change="handleFileSelect"
          :on-remove="handleFileRemove"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            将原系统JSON备份文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .json 格式文件，文件大小不超过 50MB
            </div>
          </template>
        </el-upload>

        <div class="step-actions">
          <el-button 
            type="primary" 
            @click="parseFile" 
            :disabled="!selectedFile"
            :loading="isLoading"
          >
            解析文件
          </el-button>
        </div>
      </div>

      <!-- 第二步：预览转换结果 -->
      <div v-if="currentStep === 1" class="step-content">
        <div v-if="conversionReport" class="preview-content">
          <!-- 转换统计 -->
          <el-row :gutter="20" style="margin-bottom: 20px">
            <el-col :span="6">
              <el-statistic title="考核记录" :value="conversionReport.validation.convertedRecordCount" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="标准项点" :value="conversionReport.standardItems.total" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="项点匹配率" :value="conversionReport.matching.matchRate" suffix="%" />
            </el-col>
            <el-col :span="6">
              <el-statistic 
                title="转换状态" 
                :value="conversionReport.summary.success ? '成功' : '有差异'"
                :value-style="{ color: conversionReport.summary.success ? '#67C23A' : '#F56C6C' }"
              />
            </el-col>
          </el-row>

          <!-- 详细信息 -->
          <el-collapse v-model="activeCollapse">
            <el-collapse-item title="数据验证结果" name="validation">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="原始记录数">
                  {{ conversionReport.validation.originalRecordCount }}
                </el-descriptions-item>
                <el-descriptions-item label="转换后记录数">
                  {{ conversionReport.validation.convertedRecordCount }}
                </el-descriptions-item>
                <el-descriptions-item label="原始总扣分">
                  {{ conversionReport.validation.originalDeductionSum }}
                </el-descriptions-item>
                <el-descriptions-item label="转换后总扣分">
                  {{ conversionReport.validation.convertedDeductionSum }}
                </el-descriptions-item>
                <el-descriptions-item label="记录数是否匹配">
                  <el-tag :type="conversionReport.validation.recordCountMatch ? 'success' : 'danger'">
                    {{ conversionReport.validation.recordCountMatch ? '匹配' : '不匹配' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="扣分总数是否匹配">
                  <el-tag :type="conversionReport.validation.deductionSumMatch ? 'success' : 'danger'">
                    {{ conversionReport.validation.deductionSumMatch ? '匹配' : '不匹配' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-collapse-item>

            <el-collapse-item title="项点匹配情况" name="matching">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="总考核项">
                  {{ conversionReport.matching.totalItems }}
                </el-descriptions-item>
                <el-descriptions-item label="已匹配">
                  {{ conversionReport.matching.matched }}
                </el-descriptions-item>
                <el-descriptions-item label="未匹配">
                  {{ conversionReport.matching.unmatched }}
                </el-descriptions-item>
                <el-descriptions-item label="匹配率">
                  {{ conversionReport.matching.matchRate }}%
                </el-descriptions-item>
              </el-descriptions>
            </el-collapse-item>

            <el-collapse-item title="标准项点信息" name="standardItems">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="标准项点总数">
                  {{ conversionReport.standardItems.total }}
                </el-descriptions-item>
                <el-descriptions-item label="项点类别">
                  <el-tag 
                    v-for="category in conversionReport.standardItems.categories" 
                    :key="category"
                    style="margin-right: 8px"
                  >
                    {{ category }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-collapse-item>
          </el-collapse>

          <!-- 转换结果提示 -->
          <el-alert
            :title="conversionReport.summary.message"
            :type="conversionReport.summary.success ? 'success' : 'warning'"
            :closable="false"
            show-icon
            style="margin: 20px 0"
          />

          <!-- 操作按钮 -->
          <div class="step-actions">
            <el-button @click="prevStep">上一步</el-button>
            <el-button @click="exportConverted" :disabled="!convertedData">
              <el-icon><Download /></el-icon>
              导出转换结果
            </el-button>
            <el-button 
              type="primary" 
              @click="nextStep"
              :disabled="!conversionReport.summary.success"
            >
              下一步
            </el-button>
          </div>
        </div>
      </div>

      <!-- 第三步：导入系统 -->
      <div v-if="currentStep === 2" class="step-content">
        <el-alert
          title="导入确认"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <template #default>
            <p><strong>注意：导入操作将会：</strong></p>
            <ul style="margin: 8px 0; padding-left: 20px">
              <li>替换当前系统中的考核记录数据</li>
              <li>合并标准项点库数据（重复ID会被覆盖）</li>
              <li>操作不可撤销，建议先备份当前数据</li>
            </ul>
          </template>
        </el-alert>

        <div class="import-summary">
          <h4>即将导入的数据：</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="考核记录">
              {{ convertedData?.assessmentDB?.length || 0 }} 条
            </el-descriptions-item>
            <el-descriptions-item label="标准项点">
              {{ Object.keys(convertedData?.standardAssessmentItems || {}).length }} 个
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="step-actions">
          <el-button @click="prevStep">上一步</el-button>
          <el-button @click="reset">重新开始</el-button>
          <el-button 
            type="primary" 
            @click="importToSystem"
            :loading="isImporting"
          >
            确认导入
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Download } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import { useMainStore } from '@/stores'
import { 
  convertAssessmentData, 
  convertStandardItems, 
  matchStandardItems,
  generateConversionReport,
  exportConvertedData
} from '@/utils/dataConverter'
import type { AssessmentRecord, StandardAssessmentItem } from '@/types'

const mainStore = useMainStore()

// 状态管理
const currentStep = ref(0)
const isLoading = ref(false)
const isImporting = ref(false)
const uploadRef = ref()
const selectedFile = ref<File | null>(null)
const activeCollapse = ref(['validation'])

// 数据状态
const originalData = ref<any>(null)
const convertedData = ref<any>(null)
const conversionReport = ref<any>(null)

// 处理文件选择
const handleFileSelect = (file: UploadFile) => {
  selectedFile.value = file.raw || null
}

// 处理文件移除
const handleFileRemove = () => {
  selectedFile.value = null
  originalData.value = null
  convertedData.value = null
  conversionReport.value = null
}

// 解析文件
const parseFile = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择文件')
    return
  }

  isLoading.value = true
  
  try {
    const fileContent = await readFile(selectedFile.value)
    const jsonData = JSON.parse(fileContent)
    
    // 验证数据格式
    if (!jsonData.assessmentDB && !jsonData.standardAssessmentItems) {
      throw new Error('文件格式不正确，缺少必要的数据字段')
    }
    
    originalData.value = jsonData
    
    // 转换数据
    await convertData()
    
    currentStep.value = 1
    ElMessage.success('文件解析成功')
    
  } catch (error) {
    ElMessage.error(`文件解析失败: ${(error as Error).message}`)
  } finally {
    isLoading.value = false
  }
}

// 读取文件内容
const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

// 转换数据
const convertData = async () => {
  try {
    console.log('开始转换数据...', originalData.value)
    
    // 检查数据结构
    let assessmentDB, standardItems
    
    if (originalData.value.data) {
      // 完整的系统备份格式
      assessmentDB = originalData.value.data.assessmentDB || {}
      standardItems = originalData.value.data.standardAssessmentItems || {}
    } else {
      // 直接的数据格式
      assessmentDB = originalData.value.assessmentDB || {}
      standardItems = originalData.value.standardAssessmentItems || {}
    }
    
    console.log('提取的数据:', { 
      assessmentDBKeys: Object.keys(assessmentDB),
      standardItemsKeys: Object.keys(standardItems).slice(0, 5)
    })
    
    // 转换考核记录
    const convertedRecords: AssessmentRecord[] = []
    
    Object.keys(assessmentDB).forEach(yearMonth => {
      const records = assessmentDB[yearMonth]
      
      if (!Array.isArray(records)) {
        console.warn(`${yearMonth} 的数据格式不正确`)
        return
      }
      
      records.forEach(record => {
        // 计算总扣分
        const totalDeduction = Math.abs(record.totalScore || 0)
        
        const convertedRecord: AssessmentRecord = {
          id: record.id || `rec_${record.assessDate.replace(/-/g, '')}_${record.conductorId}_${Date.now()}`,
          conductorId: record.conductorId,
          conductorName: record.conductorName,
          department: record.department,
          assessDate: record.assessDate,
          assessTime: record.assessTime || '',
          assessorDepartmentName: record.assessorDepartmentName === '车队' ? record.department : record.assessorDepartmentName,
          assessorPerson: record.assessorPerson || '',
          assessDeptType: detectDeptType(record.assessDeptType || record.assessorDepartmentName),
          baseScore: record.baseScore || 100,
          finalScore: record.finalScore || (100 - totalDeduction),
          totalScore: record.finalScore || (100 - totalDeduction),
          totalDeduction: totalDeduction,
          details: (record.details || []).map(detail => ({
            assessDeptType: detectDeptType(detail.assessDeptType || detail.assessorDepartment),
            assessorDepartment: detail.assessorDepartment,
            deduction: Math.abs(detail.deduction || 0),
            item: detail.item,
            itemCategory: detail.itemCategory || '',
            itemCode: detail.itemCode || '',
            itemDetail: detail.itemDetail || '',
            itemName: '',
            times: detail.times || 1,
            length: 1
          })),
          createdAt: new Date(record.assessDate).getTime()
        }
        
        convertedRecords.push(convertedRecord)
      })
    })
    
    // 转换标准项点
    const itemsArray = Array.isArray(standardItems) ? standardItems : Object.values(standardItems)
    const convertedStandardItems: StandardAssessmentItem[] = itemsArray
      .filter(item => item.isActive !== false)
      .map(item => ({
        id: item.id,
        name: item.item_description_raw || `项点-${item.user_code || '未知'}`,
        description: item.item_description_raw,
        category: item.category || '其他',
        maxScore: Math.abs(item.score_value_raw || 0),
        responsibleDepartment: item.responsible_department_raw || '其他',
        defaultResponsibleEntities: (item.default_responsible_entities || []).map(entity => ({
          level: entity.level === '车队' ? '车队' : '科室' as '车队' | '科室',
          department: entity.department
        })),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }))
    
    // 匹配标准项点
    const matchedRecords = convertedRecords.map(record => ({
      ...record,
      details: record.details.map(detail => {
        // 如果已经有itemCode，先尝试精确匹配
        if (detail.itemCode) {
          const exactMatch = convertedStandardItems.find(item => item.id === detail.itemCode)
          if (exactMatch) {
            return {
              ...detail,
              itemCode: exactMatch.id,
              itemName: exactMatch.name,
              itemCategory: exactMatch.category
            }
          }
        }
        
        // 否则尝试描述匹配
        const matched = findMatchingItem(detail.item, convertedStandardItems)
        if (matched) {
          return {
            ...detail,
            itemCode: matched.id,
            itemName: matched.name,
            itemCategory: matched.category
          }
        }
        return detail
      })
    }))
    
    // 生成转换报告
    const report = generateConversionReport(assessmentDB, matchedRecords, convertedStandardItems)
    
    // 保存转换结果
    convertedData.value = {
      assessmentDB: matchedRecords,
      standardAssessmentItems: convertedStandardItems.reduce((acc, item) => {
        acc[item.id] = item
        return acc
      }, {} as Record<string, any>)
    }
    
    conversionReport.value = report
    
    console.log('转换完成', { report, convertedData: convertedData.value })
    
  } catch (error) {
    console.error('数据转换失败:', error)
    throw new Error(`数据转换失败: ${(error as Error).message}`)
  }
}

// 辅助函数
const detectDeptType = (deptName: string): '车队' | '科室' | '其他' => {
  if (!deptName) return '其他'
  if (deptName.includes('车队') || deptName === '车队') return '车队'
  if (deptName.includes('科')) return '科室'
  return '其他'
}

const findMatchingItem = (description: string, items: StandardAssessmentItem[]): StandardAssessmentItem | null => {
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
    const keywords = descLower.split(/[,，、\/\s]/).map(k => k.trim()).filter(k => k.length > 2)
    if (keywords.length > 0) {
      matched = items.find(item => {
        const itemText = `${item.name} ${item.description}`.toLowerCase()
        return keywords.some(keyword => itemText.includes(keyword))
      })
    }
  }
  
  return matched || null
}

const generateConversionReport = (originalAssessmentDB: any, convertedRecords: AssessmentRecord[], standardItems: StandardAssessmentItem[]) => {
  // 统计原始数据
  let originalRecordCount = 0
  let originalDeductionSum = 0
  
  Object.values(originalAssessmentDB).forEach((monthRecords: any) => {
    if (Array.isArray(monthRecords)) {
      originalRecordCount += monthRecords.length
      monthRecords.forEach((record: any) => {
        originalDeductionSum += Math.abs(record.totalScore || 0)
      })
    }
  })
  
  // 统计转换后数据
  const convertedRecordCount = convertedRecords.length
  const convertedDeductionSum = convertedRecords.reduce((sum, record) => 
    sum + record.totalDeduction, 0
  )
  
  // 统计匹配情况
  let matchedCount = 0
  let unmatchedCount = 0
  
  convertedRecords.forEach(record => {
    record.details.forEach(detail => {
      if (detail.itemCode) {
        matchedCount++
      } else {
        unmatchedCount++
      }
    })
  })
  
  const matchRate = matchedCount + unmatchedCount > 0 
    ? matchedCount / (matchedCount + unmatchedCount) * 100 
    : 0
  
  return {
    validation: {
      recordCountMatch: originalRecordCount === convertedRecordCount,
      deductionSumMatch: Math.abs(originalDeductionSum - convertedDeductionSum) < 0.01,
      originalRecordCount,
      convertedRecordCount,
      originalDeductionSum,
      convertedDeductionSum
    },
    matching: {
      totalItems: matchedCount + unmatchedCount,
      matched: matchedCount,
      unmatched: unmatchedCount,
      matchRate: Math.round(matchRate * 100) / 100
    },
    standardItems: {
      total: standardItems.length,
      categories: [...new Set(standardItems.map(item => item.category))]
    },
    summary: {
      success: originalRecordCount === convertedRecordCount && Math.abs(originalDeductionSum - convertedDeductionSum) < 0.01,
      message: originalRecordCount === convertedRecordCount && Math.abs(originalDeductionSum - convertedDeductionSum) < 0.01
        ? '数据转换成功，记录数和扣分总数都匹配'
        : '数据转换存在差异，请检查具体数据'
    }
  }
}

// 导出转换结果
const exportConverted = () => {
  if (!convertedData.value) return
  
  exportConvertedData(
    convertedData.value.assessmentDB,
    Object.values(convertedData.value.standardAssessmentItems)
  )
  
  ElMessage.success('转换结果已导出')
}

// 导入到系统
const importToSystem = async () => {
  if (!convertedData.value) return
  
  const confirm = await ElMessageBox.confirm(
    '确定要将转换后的数据导入到系统中吗？此操作会覆盖现有数据！',
    '确认导入',
    {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (!confirm) return
  
  isImporting.value = true
  
  try {
    // 加载当前数据库
    if (!mainStore.database) {
      await mainStore.loadDatabase()
    }
    
    // 导入考核记录
    if (convertedData.value.assessmentDB) {
      mainStore.database!.assessmentDB = convertedData.value.assessmentDB
    }
    
    // 导入标准项点（合并而不是覆盖）
    if (convertedData.value.standardAssessmentItems) {
      if (!mainStore.database!.standardAssessmentItems) {
        mainStore.database!.standardAssessmentItems = {}
      }
      Object.assign(
        mainStore.database!.standardAssessmentItems,
        convertedData.value.standardAssessmentItems
      )
    }
    
    // 更新数据库版本
    mainStore.database!.version = Math.max(mainStore.database!.version || 1, 8)
    
    // 保存到数据库
    await mainStore.saveDatabase()
    
    ElMessage.success('数据导入成功！')
    
    // 重置状态
    reset()
    
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error(`数据导入失败: ${(error as Error).message}`)
  } finally {
    isImporting.value = false
  }
}

// 步骤控制
const nextStep = () => {
  if (currentStep.value < 2) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 重置
const reset = () => {
  currentStep.value = 0
  selectedFile.value = null
  originalData.value = null
  convertedData.value = null
  conversionReport.value = null
  uploadRef.value?.clearFiles()
}
</script>

<style lang="scss" scoped>
.data-converter {
  .help-text {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
  
  .step-content {
    margin: 20px 0;
    
    .upload-area {
      margin: 20px 0;
      
      :deep(.el-upload-dragger) {
        width: 100%;
        height: 200px;
      }
    }
    
    .preview-content {
      .import-summary {
        margin: 20px 0;
        padding: 20px;
        background: var(--el-fill-color-light);
        border-radius: 4px;
        
        h4 {
          margin: 0 0 16px 0;
          color: var(--el-text-color-primary);
        }
      }
    }
    
    .step-actions {
      margin-top: 30px;
      text-align: center;
      
      .el-button {
        margin: 0 8px;
      }
    }
  }
}
</style> 