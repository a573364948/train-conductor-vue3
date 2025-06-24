<template>
  <div class="data-import">
    <!-- 步骤指示器 -->
    <div class="steps-container">
      <el-steps :active="currentStep" finish-status="success">
        <el-step title="上传文件" description="选择子系统数据文件" />
        <el-step title="冲突检测" description="分析数据冲突情况" />
        <el-step title="解决冲突" description="处理冲突数据" />
        <el-step title="确认导入" description="预览并执行导入" />
        <el-step title="完成" description="导入结果报告" />
      </el-steps>
    </div>

    <!-- 步骤1: 文件上传 -->
    <div v-if="currentStep === 0" class="step-content">
      <div class="upload-section">
        <el-card>
          <template #header>
            <h3>📁 上传子系统数据</h3>
          </template>
          
          <div class="upload-content">
            <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :show-file-list="true"
              :on-change="handleFileChange"
              accept=".json"
              drag
              class="upload-dragger"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将子系统数据文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持JSON格式，建议先备份原有数据
                </div>
              </template>
            </el-upload>

            <div class="upload-tips">
              <el-alert type="info" show-icon :closable="false">
                <template #title>
                  <strong>支持的数据格式：</strong>
                </template>
                <ul>
                  <li>📋 人员信息 (conductors.json)</li>
                  <li>📝 申请记录 (applications.json)</li>
                  <li>🏢 部门信息 (departments.json)</li>
                </ul>
              </el-alert>
            </div>

            <div class="action-buttons">
              <el-button 
                type="primary" 
                @click="analyzeData" 
                :disabled="uploadedFiles.length === 0"
                :loading="analyzing"
              >
                <el-icon><Search /></el-icon>
                分析数据冲突
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 步骤2: 冲突检测结果 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="conflict-analysis">
        <el-card>
          <template #header>
            <h3>🔍 数据冲突分析结果</h3>
          </template>

          <!-- 冲突统计 -->
          <div class="conflict-stats">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-statistic 
                  title="总记录数" 
                  :value="analysisResult.totalRecords"
                  suffix="条"
                >
                  <template #prefix>
                    <el-icon><Document /></el-icon>
                  </template>
                </el-statistic>
              </el-col>
              <el-col :span="6">
                <el-statistic 
                  title="无冲突" 
                  :value="analysisResult.noConflict"
                  suffix="条"
                  class="success-stat"
                >
                  <template #prefix>
                    <el-icon><Check /></el-icon>
                  </template>
                </el-statistic>
              </el-col>
              <el-col :span="6">
                <el-statistic 
                  title="有冲突" 
                  :value="analysisResult.hasConflict"
                  suffix="条"
                  class="warning-stat"
                >
                  <template #prefix>
                    <el-icon><Warning /></el-icon>
                  </template>
                </el-statistic>
              </el-col>
              <el-col :span="6">
                <el-statistic 
                  title="新增记录" 
                  :value="analysisResult.newRecords"
                  suffix="条"
                  class="info-stat"
                >
                  <template #prefix>
                    <el-icon><Plus /></el-icon>
                  </template>
                </el-statistic>
              </el-col>
            </el-row>
          </div>

          <!-- 冲突类型分布 -->
          <div class="conflict-types" v-if="analysisResult.hasConflict > 0">
            <h4>冲突类型分布</h4>
            <div class="conflict-list">
              <el-tag 
                v-for="(count, type) in analysisResult.conflictTypes" 
                :key="type"
                :type="getConflictTagType(type)"
                size="large"
                class="conflict-tag"
              >
                {{ getConflictTypeName(type) }}: {{ count }}条
              </el-tag>
            </div>
          </div>

          <!-- 数据映射警告 -->
          <div class="data-mapping-warning" v-if="showMappingWarning && mappingResult">
            <el-alert
              title="🔗 数据关联影响提醒"
              type="warning"
              show-icon
              :closable="false"
            >
              <template #default>
                <p><strong>检测到系统中存在现有的在岗和考核数据，导入后需要处理数据关联：</strong></p>
                <ul>
                  <li>✅ 成功映射：{{ mappingResult.summary.totalMapped }}条记录</li>
                  <li v-if="mappingResult.unmappedRecords.length > 0">
                    ⚠️ 未映射数据：{{ mappingResult.unmappedRecords.length }}条记录
                  </li>
                  <li>📊 月度数据映射：{{ mappingResult.summary.monthlyDataMapped }}条</li>
                  <li>📊 考核数据映射：{{ mappingResult.summary.assessmentDataMapped }}条</li>
                  <li v-if="mappingResult.summary.orphanedDataCount > 0" class="orphan-warning">
                    🚨 孤岛数据：{{ mappingResult.summary.orphanedDataCount }}人
                    <el-tag type="danger" size="small" style="margin-left: 8px;">需要处理</el-tag>
                  </li>
                </ul>
                <p><strong>建议：</strong>导入完成后，系统会自动处理数据关联，确保现有数据的完整性。</p>
                
                <!-- 孤岛数据详情 -->
                <div v-if="mappingResult.orphanedData.total > 0" class="orphan-details">
                  <el-divider>孤岛数据详情</el-divider>
                  <div class="orphan-summary">
                    <el-row :gutter="20">
                      <el-col :span="12">
                        <h5>📅 月度数据中的孤岛 ({{ mappingResult.orphanedData.monthlyRecords.length }}人)</h5>
                        <ul class="orphan-list">
                          <li v-for="orphan in mappingResult.orphanedData.monthlyRecords.slice(0, 5)" :key="orphan.name">
                            {{ orphan.name }} ({{ orphan.department }}) - {{ orphan.recordCount }}条记录
                            <el-tag v-if="orphan.employeeId" type="success" size="small" style="margin-left: 8px;">
                              工号: {{ orphan.employeeId }}
                            </el-tag>
                            <el-tag v-else type="warning" size="small" style="margin-left: 8px;">
                              无工号
                            </el-tag>
                          </li>
                          <li v-if="mappingResult.orphanedData.monthlyRecords.length > 5">
                            ...还有 {{ mappingResult.orphanedData.monthlyRecords.length - 5 }} 人
                          </li>
                        </ul>
                      </el-col>
                      <el-col :span="12">
                        <h5>📊 考核数据中的孤岛 ({{ mappingResult.orphanedData.assessmentRecords.length }}人)</h5>
                        <ul class="orphan-list">
                          <li v-for="orphan in mappingResult.orphanedData.assessmentRecords.slice(0, 5)" :key="orphan.name">
                            {{ orphan.name }} ({{ orphan.department }}) - {{ orphan.recordCount }}条记录
                            <el-tag v-if="orphan.employeeId" type="success" size="small" style="margin-left: 8px;">
                              工号: {{ orphan.employeeId }}
                            </el-tag>
                            <el-tag v-else type="warning" size="small" style="margin-left: 8px;">
                              无工号
                            </el-tag>
                          </li>
                          <li v-if="mappingResult.orphanedData.assessmentRecords.length > 5">
                            ...还有 {{ mappingResult.orphanedData.assessmentRecords.length - 5 }} 人
                          </li>
                        </ul>
                      </el-col>
                    </el-row>
                  </div>
                  
                  <el-alert type="error" show-icon :closable="false" style="margin-top: 12px;">
                    <template #title>⚠️ 孤岛数据处理建议</template>
                    <p>在岗和考核数据中存在这些人员，但导入的人员档案中没有对应记录。<br/>
                    <strong>请选择处理方式：</strong></p>
                    <div class="orphan-actions" style="margin-top: 8px;">
                      <el-button 
                        type="primary" 
                        size="small" 
                        @click="createBasicPersonnelForOrphans"
                      >
                        🏗️ 自动创建基本档案
                      </el-button>
                      <el-button 
                        type="warning" 
                        size="small" 
                        @click="downloadOrphanReport"
                      >
                        📋 下载孤岛数据报告
                      </el-button>
                      <el-button 
                        type="info" 
                        size="small" 
                        @click="showOrphanDetails = true"
                      >
                        📝 查看详细列表
                      </el-button>
                    </div>
                  </el-alert>
                </div>
              </template>
            </el-alert>
          </div>

          <div class="action-buttons">
            <el-button @click="currentStep = 0">
              <el-icon><ArrowLeft /></el-icon>
              返回上传
            </el-button>
            <el-button 
              type="primary" 
              @click="currentStep = 2"
              :disabled="analysisResult.hasConflict === 0 && analysisResult.newRecords === 0"
            >
              处理冲突
              <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-button 
              v-if="analysisResult.hasConflict === 0" 
              type="success" 
              @click="executeImport"
            >
              <el-icon><Check /></el-icon>
              直接导入
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 步骤3: 冲突解决 -->
    <div v-if="currentStep === 2" class="step-content">
      <div class="conflict-resolution">
        <el-card>
          <template #header>
            <div class="resolution-header">
              <h3>🛠️ 解决数据冲突</h3>
              <div class="batch-actions">
                <el-dropdown @command="handleBatchAction">
                  <el-button type="primary">
                    批量操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="useImported">✅ 全部使用导入数据</el-dropdown-item>
                      <el-dropdown-item command="keepExisting">🔄 全部保留现有数据</el-dropdown-item>
                      <el-dropdown-item command="merge">🔀 全部智能合并</el-dropdown-item>
                      <el-dropdown-item divided command="useImported-new">📝 仅新增记录 → 使用导入</el-dropdown-item>
                      <el-dropdown-item command="keepExisting-conflict">⚠️ 仅冲突记录 → 保留现有</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                
                <el-tag v-if="newRecordsCount > 0" type="success" size="small" style="margin-left: 8px;">
                  {{ newRecordsCount }}条新增已预选
                </el-tag>
              </div>
            </div>
          </template>

          <!-- 冲突数据表格 -->
          <div class="conflict-table">
            <el-table 
              :data="paginatedConflicts" 
              border 
              row-key="id"
              @selection-change="handleConflictSelection"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="employeeId" label="工号" width="120" />
              <el-table-column prop="name" label="姓名" width="120" />
              <el-table-column prop="conflictType" label="冲突类型" width="150">
                <template #default="{ row }">
                  <el-tag :type="getConflictTagType(row.conflictType)" size="small">
                    {{ getConflictTypeName(row.conflictType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="现有数据" min-width="200">
                <template #default="{ row }">
                  <div class="data-preview existing">
                    <div><strong>姓名:</strong> {{ row.existing?.name || '-' }}</div>
                    <div><strong>部门:</strong> {{ row.existing?.department || '-' }}</div>
                    <div><strong>状态:</strong> {{ row.existing?.status || '-' }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="导入数据" min-width="200">
                <template #default="{ row }">
                  <div class="data-preview imported">
                    <div><strong>姓名:</strong> {{ row.imported?.name || '-' }}</div>
                    <div><strong>部门:</strong> {{ row.imported?.department || '-' }}</div>
                    <div><strong>状态:</strong> {{ row.imported?.status || '-' }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="解决方案" width="200">
                <template #default="{ row }">
                  <div class="resolution-selector">
                    <el-select 
                      v-model="row.resolution" 
                      placeholder="选择方案"
                      size="small"
                      style="width: 100%"
                    >
                      <el-option label="保留现有" value="keepExisting" />
                      <el-option label="使用导入" value="useImported" />
                      <el-option label="智能合并" value="merge" />
                      <el-option label="手动处理" value="manual" />
                      <el-option label="跳过" value="skip" />
                    </el-select>
                    <el-tag 
                      v-if="row.conflictType === 'new' && row.resolution === 'useImported'" 
                      type="success" 
                      size="small" 
                      style="margin-top: 2px;"
                    >
                      已预选
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button 
                    type="primary" 
                    size="small" 
                    text 
                    @click="openDetailDialog(row)"
                  >
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="conflictPage"
                v-model:page-size="conflictPageSize"
                :total="conflictData.length"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
              />
            </div>
          </div>

          <div class="action-buttons">
            <el-button @click="currentStep = 1">
              <el-icon><ArrowLeft /></el-icon>
              返回分析
            </el-button>
            <el-button 
              type="primary" 
              @click="currentStep = 3"
              :disabled="!allConflictsResolved"
            >
              确认方案
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 步骤4: 确认导入 -->
    <div v-if="currentStep === 3" class="step-content">
      <div class="import-confirmation">
        <el-card>
          <template #header>
            <h3>✅ 确认导入方案</h3>
          </template>

          <div class="import-summary">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="总记录数">
                {{ importSummary.totalRecords }}
              </el-descriptions-item>
              <el-descriptions-item label="将要导入">
                {{ importSummary.willImport }}
              </el-descriptions-item>
              <el-descriptions-item label="跳过记录">
                {{ importSummary.willSkip }}
              </el-descriptions-item>
              <el-descriptions-item label="冲突解决">
                {{ importSummary.conflictsResolved }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="resolution-breakdown">
              <h4>解决方案分布</h4>
              <div class="resolution-stats">
                <el-tag 
                  v-for="(count, resolution) in importSummary.resolutionBreakdown" 
                  :key="resolution"
                  :type="getResolutionTagType(resolution)"
                  size="large"
                  class="resolution-tag"
                >
                  {{ getResolutionName(resolution) }}: {{ count }}条
                </el-tag>
              </div>
            </div>

            <el-alert type="warning" show-icon :closable="false">
              <template #title>
                <strong>⚠️ 重要提示</strong>
              </template>
              <p>导入操作将修改现有数据，建议在导入前：</p>
              <ul>
                <li>✅ 备份当前数据</li>
                <li>✅ 确认解决方案正确</li>
                <li>✅ 在非生产环境先测试</li>
              </ul>
            </el-alert>
          </div>

          <div class="action-buttons">
            <el-button @click="currentStep = 2">
              <el-icon><ArrowLeft /></el-icon>
              返回修改
            </el-button>
            <el-button @click="backupData">
              <el-icon><Download /></el-icon>
              备份数据
            </el-button>
            <el-button 
              type="primary" 
              @click="executeImport"
              :loading="importing"
            >
              <el-icon><Upload /></el-icon>
              确认导入
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 步骤5: 导入完成 -->
    <div v-if="currentStep === 4" class="step-content">
      <div class="import-result">
        <el-card>
          <template #header>
            <h3>🎉 导入完成</h3>
          </template>

          <div class="result-summary">
            <el-result
              :icon="importResult.success ? 'success' : 'error'"
              :title="importResult.success ? '导入成功' : '导入失败'"
              :sub-title="importResult.message"
            >
              <template #extra>
                <div class="result-details">
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="成功导入">
                      {{ importResult.successCount }}
                    </el-descriptions-item>
                    <el-descriptions-item label="失败记录">
                      {{ importResult.failCount }}
                    </el-descriptions-item>
                    <el-descriptions-item label="跳过记录">
                      {{ importResult.skipCount }}
                    </el-descriptions-item>
                    <el-descriptions-item label="处理时间">
                      {{ importResult.duration.toString() }}ms
                    </el-descriptions-item>
                  </el-descriptions>

                  <div class="action-buttons">
                    <el-button @click="downloadReport">
                      <el-icon><Download /></el-icon>
                      下载报告
                    </el-button>
                    <el-button @click="resetImport">
                      <el-icon><Refresh /></el-icon>
                      重新导入
                    </el-button>
                    <el-button type="primary" @click="goToPersonnelList">
                      <el-icon><User /></el-icon>
                      查看人员列表
                    </el-button>
                  </div>
                </div>
              </template>
            </el-result>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 冲突详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="冲突详情" width="800px">
      <div v-if="selectedConflict" class="conflict-detail">
        <el-tabs v-model="activeDetailTab">
          <el-tab-pane label="对比详情" name="compare">
            <div class="compare-section">
              <el-row :gutter="20">
                <el-col :span="12">
                  <h4>现有数据</h4>
                  <el-card class="data-card existing">
                    <el-descriptions :column="1" border>
                      <el-descriptions-item 
                        v-for="(value, key) in selectedConflict.existing" 
                        :key="key"
                        :label="getFieldLabel(key)"
                      >
                        {{ value || '-' }}
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <h4>导入数据</h4>
                  <el-card class="data-card imported">
                    <el-descriptions :column="1" border>
                      <el-descriptions-item 
                        v-for="(value, key) in selectedConflict.imported" 
                        :key="key"
                        :label="getFieldLabel(key)"
                      >
                        {{ value || '-' }}
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
          <el-tab-pane label="合并预览" name="merge">
            <div class="merge-preview">
              <h4>合并后结果</h4>
              <el-card>
                <el-descriptions :column="1" border>
                  <el-descriptions-item 
                    v-for="(value, key) in getMergedData(selectedConflict)" 
                    :key="key"
                    :label="getFieldLabel(key)"
                  >
                    {{ key === 'updatedAt' && typeof value === 'number' ? new Date(value).toLocaleString() : value }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  UploadFilled,
  Search,
  Document,
  Check,
  Warning,
  Plus,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Download,
  Upload,
  Refresh,
  User
} from '@element-plus/icons-vue'
import { usePersonnelStore } from '@/stores/personnel'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/stores'
import { DataMappingUtils, type DataMappingResult } from '@/utils/dataMapping'
import type { EnhancedConductor } from '@/types'

// Store和Router
const personnelStore = usePersonnelStore()
const mainStore = useMainStore()
const router = useRouter()

// 响应式数据
const currentStep = ref(0)
const uploadedFiles = ref<File[]>([])
const analyzing = ref(false)
const importing = ref(false)
const uploadRef = ref()
const detailDialogVisible = ref(false)
const activeDetailTab = ref('compare')

// 分析结果
const analysisResult = ref({
  totalRecords: 0,
  noConflict: 0,
  hasConflict: 0,
  newRecords: 0,
  conflictTypes: {} as Record<string, number>
})

// 冲突数据
const conflictData = ref<ConflictRecord[]>([])
const selectedConflict = ref<ConflictRecord | null>(null)
const conflictPage = ref(1)
const conflictPageSize = ref(10)

// 导入结果
const importResult = ref({
  success: false,
  message: '',
  successCount: 0,
  failCount: 0,
  skipCount: 0,
  duration: 0
})

// 数据映射结果
const mappingResult = ref<DataMappingResult | null>(null)
const showMappingWarning = ref(false)
const showOrphanDetails = ref(false)

// 类型定义
interface ConflictRecord {
  id: string
  employeeId: string
  name: string
  conflictType: string
  existing?: EnhancedConductor
  imported?: any
  resolution?: string
  details?: string[]
}

// 计算属性
const paginatedConflicts = computed(() => {
  const start = (conflictPage.value - 1) * conflictPageSize.value
  const end = start + conflictPageSize.value
  return conflictData.value.slice(start, end)
})

const allConflictsResolved = computed(() => {
  return conflictData.value.every(conflict => conflict.resolution)
})

// 新增记录数量计算
const newRecordsCount = computed(() => {
  return conflictData.value.filter(c => c.conflictType === 'new').length
})

const importSummary = computed(() => {
  const resolutionBreakdown: Record<string, number> = {}
  let willImport = 0
  let willSkip = 0
  
  conflictData.value.forEach(conflict => {
    const resolution = conflict.resolution || 'unresolved'
    resolutionBreakdown[resolution] = (resolutionBreakdown[resolution] || 0) + 1
    
    if (resolution === 'skip') {
      willSkip++
    } else {
      willImport++
    }
  })
  
  return {
    totalRecords: analysisResult.value.totalRecords,
    willImport: willImport + analysisResult.value.noConflict,
    willSkip,
    conflictsResolved: conflictData.value.length,
    resolutionBreakdown
  }
})

// 方法
const handleFileChange = (file: any, fileList: any[]) => {
  uploadedFiles.value = fileList.map(f => f.raw).filter(Boolean)
}

const analyzeData = async () => {
  if (uploadedFiles.value.length === 0) {
    ElMessage.warning('请先上传数据文件')
    return
  }
  
  analyzing.value = true
  
  try {
    // 读取和解析文件
    const fileContents = await Promise.all(
      uploadedFiles.value.map(file => readFileContent(file))
    )
    
    // 合并所有导入的人员数据
    const importedPersonnel: any[] = []
    fileContents.forEach(content => {
      console.log('解析的文件内容结构:', Object.keys(content))
      
      // 支持多种JSON格式
      let conductors: any[] = []
      
      if (content.data && content.data.conductors) {
        // 原子系统导出格式: { data: { conductors: [...] } }
        conductors = content.data.conductors
        console.log(`检测到原子系统格式，conductors数量: ${conductors.length}`)
      } else if (content.conductors) {
        // 直接格式: { conductors: [...] }
        conductors = content.conductors
        console.log(`检测到直接格式，conductors数量: ${conductors.length}`)
      } else if (Array.isArray(content)) {
        // 数组格式: [...]
        conductors = content
        console.log(`检测到数组格式，数量: ${conductors.length}`)
      }
      
      if (conductors.length > 0) {
        importedPersonnel.push(...conductors)
      }
    })
    
    // 执行冲突检测
    const conflicts = await detectConflicts(importedPersonnel)
    
    // 🔄 执行数据映射分析
    console.log('🔄 开始分析数据映射影响...')
    await analyzeDataMappingImpact(importedPersonnel)
    
    // 更新分析结果
    analysisResult.value = {
      totalRecords: importedPersonnel.length,
      noConflict: importedPersonnel.length - conflicts.length,
      hasConflict: conflicts.length,
      newRecords: conflicts.filter(c => c.conflictType === 'new').length,
      conflictTypes: conflicts.reduce((acc, conflict) => {
        acc[conflict.conflictType] = (acc[conflict.conflictType] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
    
    conflictData.value = conflicts
    currentStep.value = 1
    
  } catch (error: any) {
    ElMessage.error(`分析失败: ${error.message}`)
  } finally {
    analyzing.value = false
  }
}

const readFileContent = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string)
        resolve(content)
      } catch (error) {
        reject(new Error(`文件格式错误: ${file.name}`))
      }
    }
    reader.onerror = () => reject(new Error(`读取文件失败: ${file.name}`))
    reader.readAsText(file)
  })
}

const detectConflicts = async (importedData: any[]): Promise<ConflictRecord[]> => {
  const existingPersonnel = personnelStore.allConductors
  const conflicts: ConflictRecord[] = []
  
  for (const imported of importedData) {
    // 按工号查找现有记录
    const existingByEmployeeId = existingPersonnel.find(
      p => p.employeeId === imported.employeeId
    )
    
    // 按姓名查找现有记录
    const existingByName = existingPersonnel.find(
      p => p.name === imported.name
    )
    
    let conflictType = ''
    let existing: EnhancedConductor | undefined
    let details: string[] = []
    
    if (existingByEmployeeId && existingByName && existingByEmployeeId.id === existingByName.id) {
      // 工号和姓名都匹配同一个人
      existing = existingByEmployeeId
      
      // 检查其他字段是否有差异
      const differences = comparePersonnelData(existing, imported)
      if (differences.length > 0) {
        conflictType = 'dataConflict'
        details = differences
      } else {
        conflictType = 'duplicate'
      }
      
    } else if (existingByEmployeeId && !existingByName) {
      // 工号存在但姓名不同
      existing = existingByEmployeeId
      conflictType = 'employeeIdConflict'
      details = [`现有姓名: ${existing.name}, 导入姓名: ${imported.name}`]
      
    } else if (!existingByEmployeeId && existingByName) {
      // 姓名存在但工号不同
      existing = existingByName
      conflictType = 'nameConflict'
      details = [`现有工号: ${existing.employeeId}, 导入工号: ${imported.employeeId}`]
      
    } else if (existingByEmployeeId && existingByName && existingByEmployeeId.id !== existingByName.id) {
      // 工号和姓名分别匹配不同的人
      conflictType = 'complexConflict'
      details = [
        `工号 ${imported.employeeId} 已被 ${existingByEmployeeId.name} 使用`,
        `姓名 ${imported.name} 已被工号 ${existingByName.employeeId} 使用`
      ]
      
    } else {
      // 新记录
      conflictType = 'new'
    }
    
    if (conflictType !== 'duplicate') {
      // 为新增记录设置默认解决方案
      const defaultResolution = conflictType === 'new' ? 'useImported' : undefined
      
      conflicts.push({
        id: `conflict_${imported.employeeId}_${Date.now()}`,
        employeeId: imported.employeeId,
        name: imported.name,
        conflictType,
        existing,
        imported,
        details,
        resolution: defaultResolution
      })
    }
  }
  
  return conflicts
}

const comparePersonnelData = (existing: EnhancedConductor, imported: any): string[] => {
  const differences: string[] = []
  
  if (existing.department !== imported.department) {
    differences.push(`部门: ${existing.department} → ${imported.department}`)
  }
  if (existing.status !== imported.status) {
    differences.push(`状态: ${existing.status} → ${imported.status}`)
  }
  if (existing.note !== imported.note) {
    differences.push(`备注: ${existing.note || '无'} → ${imported.note || '无'}`)
  }
  
  return differences
}

const handleBatchAction = (command: string) => {
  let targetConflicts: ConflictRecord[] = []
  let operationDesc = ''
  
  switch (command) {
    case 'useImported':
    case 'keepExisting':
    case 'merge':
      // 全部操作
      targetConflicts = conflictData.value
      operationDesc = `全部${targetConflicts.length}条记录`
      break
      
    case 'useImported-new':
      // 仅新增记录
      targetConflicts = conflictData.value.filter(c => c.conflictType === 'new')
      operationDesc = `${targetConflicts.length}条新增记录`
      command = 'useImported' // 转换为实际的解决方案
      break
      
    case 'keepExisting-conflict':
      // 仅冲突记录
      targetConflicts = conflictData.value.filter(c => c.conflictType !== 'new')
      operationDesc = `${targetConflicts.length}条冲突记录`
      command = 'keepExisting' // 转换为实际的解决方案
      break
      
    default:
      ElMessage.warning('未知的批量操作命令')
      return
  }
  
  if (targetConflicts.length === 0) {
    ElMessage.warning('没有符合条件的记录')
    return
  }
  
  targetConflicts.forEach(conflict => {
    conflict.resolution = command
  })
  
  ElMessage.success(`已为${operationDesc}设置解决方案为"${getResolutionName(command)}"`)
}

const handleConflictSelection = (selection: ConflictRecord[]) => {
  // 处理选择变更
}

const openDetailDialog = (conflict: ConflictRecord) => {
  selectedConflict.value = conflict
  detailDialogVisible.value = true
}

const getMergedData = (conflict: ConflictRecord) => {
  // 根据选择的解决方案返回不同的预览结果
  const resolution = conflict.resolution || 'merge'
  
  switch (resolution) {
    case 'useImported':
      // 使用导入数据：显示导入的数据
      if (!conflict.imported) return {}
      return {
        employeeId: conflict.imported.employeeId,
        name: conflict.imported.name,
        department: conflict.imported.department,
        status: conflict.imported.status,
        note: conflict.imported.note || '无',
        updatedAt: Date.now(),
        '预览说明': '将使用导入的数据'
      }
      
    case 'keepExisting':
      // 保留现有数据：显示现有的数据
      if (!conflict.existing) return { '说明': '新增记录，无现有数据' }
      return {
        employeeId: conflict.existing.employeeId,
        name: conflict.existing.name,
        department: conflict.existing.department,
        status: conflict.existing.status,
        note: conflict.existing.note || '无',
        updatedAt: conflict.existing.updatedAt || Date.now(),
        '预览说明': '将保留现有数据'
      }
      
    case 'merge':
    default:
      // 智能合并：合并现有和导入的数据
      if (!conflict.existing && !conflict.imported) return {}
      
      if (!conflict.existing) {
        // 新增记录，没有现有数据，直接使用导入数据
        return {
          employeeId: conflict.imported?.employeeId || '',
          name: conflict.imported?.name || '',
          department: conflict.imported?.department || '',
          status: conflict.imported?.status || '',
          note: conflict.imported?.note || '无',
          updatedAt: Date.now(),
          '预览说明': '新增记录，将使用导入数据'
        }
      }
      
      if (!conflict.imported) {
        // 只有现有数据
        return {
          employeeId: conflict.existing.employeeId,
          name: conflict.existing.name,
          department: conflict.existing.department,
          status: conflict.existing.status,
          note: conflict.existing.note || '无',
          updatedAt: conflict.existing.updatedAt || Date.now(),
          '预览说明': '只有现有数据'
        }
      }
      
      // 真正的智能合并
      return {
        employeeId: conflict.existing.employeeId, // 保留现有工号
        name: conflict.existing.name, // 保留现有姓名
        department: conflict.imported.department || conflict.existing.department, // 优先导入部门
        status: conflict.imported.status || conflict.existing.status, // 优先导入状态
        note: conflict.imported.note || conflict.existing.note || '无', // 优先导入备注
        updatedAt: Date.now(),
        '预览说明': '智能合并现有数据和导入数据'
      }
  }
}

// 分析数据映射影响
const analyzeDataMappingImpact = async (importedPersonnel: any[]) => {
  try {
    // 获取现有数据库
    const database = mainStore.database
    if (!database) {
      console.log('⚠️ 现有数据库为空，跳过映射分析')
      return
    }
    
    // 检查现有数据量
    const monthlyRecords = (database.monthlyData || []).reduce((total, month) => {
      return total + (month.data ? month.data.length : 0)
    }, 0)
    
    const assessmentRecords = Object.values(database.assessmentDB || {}).reduce((total, records) => {
      return total + records.length
    }, 0)
    
    console.log(`📊 现有月度记录：${monthlyRecords}条`)
    console.log(`📊 现有考核记录：${assessmentRecords}条`)
    
    if (monthlyRecords > 0 || assessmentRecords > 0) {
      // 执行映射预分析 - 基于工号和姓名进行智能匹配
      const enhancedPersonnel = importedPersonnel.map(p => ({
        ...p,
        id: `enhanced_${p.employeeId}_${Date.now()}`
      }))
      
      const mappingAnalysis = await DataMappingUtils.executeDataMapping(
        enhancedPersonnel,
        database
      )
      
      mappingResult.value = mappingAnalysis
      
      // 如果存在未映射数据，显示警告
      if (!mappingAnalysis.success) {
        showMappingWarning.value = true
        console.warn('⚠️ 检测到数据映射问题:', mappingAnalysis.unmappedRecords)
      }
      
      console.log('📋 数据映射分析完成:', mappingAnalysis.summary)
    }
    
  } catch (error) {
    console.error('数据映射分析失败:', error)
  }
}

const executeImport = async () => {
  importing.value = true
  const startTime = Date.now()
  
  try {
    let successCount = 0
    let failCount = 0
    let skipCount = 0
    
    // 处理无冲突的数据
    // ... 导入逻辑
    
    // 处理有冲突的数据
    for (const conflict of conflictData.value) {
      try {
        switch (conflict.resolution) {
          case 'keepExisting':
            // 保留现有数据，不做操作
            skipCount++
            break
            
          case 'useImported':
            if (conflict.existing) {
              await personnelStore.updateConductor(conflict.existing.id, conflict.imported)
            } else {
              await personnelStore.addConductor(conflict.imported)
            }
            successCount++
            break
            
          case 'merge':
            const mergedData = getMergedData(conflict)
            if (conflict.existing) {
              await personnelStore.updateConductor(conflict.existing.id, mergedData)
            }
            successCount++
            break
            
          case 'skip':
            skipCount++
            break
            
          default:
            failCount++
        }
      } catch (error) {
        failCount++
      }
    }
    
    const duration = Date.now() - startTime
    
    importResult.value = {
      success: failCount === 0,
      message: failCount === 0 ? '所有数据导入成功' : `${failCount} 条记录导入失败`,
      successCount,
      failCount,
      skipCount,
      duration
    }
    
    currentStep.value = 4
    
  } catch (error: any) {
    ElMessage.error(`导入失败: ${error.message}`)
  } finally {
    importing.value = false
  }
}

const backupData = () => {
  const backup = {
    personnel: personnelStore.allConductors,
    timestamp: new Date().toISOString(),
    version: 'v1.0'
  }
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `personnel_backup_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('数据备份已下载')
}

const downloadReport = () => {
  const report = {
    importSummary: importSummary.value,
    importResult: importResult.value,
    conflicts: conflictData.value,
    timestamp: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `import_report_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const resetImport = () => {
  currentStep.value = 0
  uploadedFiles.value = []
  conflictData.value = []
  analysisResult.value = {
    totalRecords: 0,
    noConflict: 0,
    hasConflict: 0,
    newRecords: 0,
    conflictTypes: {}
  }
  uploadRef.value?.clearFiles()
}

const goToPersonnelList = () => {
  router.push('/personnel/archive')
}

// 孤岛数据处理方法
const createBasicPersonnelForOrphans = async () => {
  if (!mappingResult.value || mappingResult.value.orphanedData.total === 0) {
    ElMessage.warning('没有孤岛数据需要处理')
    return
  }

  try {
    const allOrphans = [
      ...mappingResult.value.orphanedData.monthlyRecords,
      ...mappingResult.value.orphanedData.assessmentRecords
    ]

    // 去重（同一人可能同时在月度和考核数据中）
    const uniqueOrphans = allOrphans.reduce((acc, orphan) => {
      const key = `${orphan.name}-${orphan.department}`
      if (!acc.find(o => `${o.name}-${o.department}` === key)) {
        acc.push(orphan)
      }
      return acc
    }, [] as typeof allOrphans)

         // 统计有真实工号和需要临时工号的人数
     const realEmployeeIdCount = uniqueOrphans.filter(o => o.employeeId).length
     const tempEmployeeIdCount = uniqueOrphans.length - realEmployeeIdCount
     
     let confirmMessage = `将为 ${uniqueOrphans.length} 人创建基本档案：\n`
     if (realEmployeeIdCount > 0) {
       confirmMessage += `✅ ${realEmployeeIdCount} 人将使用从现有数据ID中提取的真实工号\n`
       
       // 显示前几个真实工号示例
       const exampleIds = uniqueOrphans
         .filter(o => o.employeeId)
         .slice(0, 3)
         .map(o => `${o.name}[${o.employeeId}]`)
         .join(', ')
       
       confirmMessage += `   示例: ${exampleIds}${realEmployeeIdCount > 3 ? '...' : ''}\n`
     }
     if (tempEmployeeIdCount > 0) {
       confirmMessage += `⚠️ ${tempEmployeeIdCount} 人将生成临时工号（现有数据中未找到工号）\n`
     }
     confirmMessage += `\n是否继续？`
     
     ElMessageBox.confirm(
       confirmMessage,
       '确认创建基本档案',
       {
         confirmButtonText: '确认创建',
         cancelButtonText: '取消',
         type: 'warning',
         dangerouslyUseHTMLString: false
       }
     ).then(async () => {
      let successCount = 0
      
             for (const orphan of uniqueOrphans) {
         try {
           // 使用从现有数据中提取的真实工号，而不是生成临时工号
           const employeeId = orphan.employeeId || `TEMP_${Date.now()}_${orphan.name.slice(-2)}`
           const isRealEmployeeId = !!orphan.employeeId
           
           // 从现有数据中提取的信息
           const extractedData = orphan.extractedData || {}
           
           const basicPersonnel: EnhancedConductor = {
             id: `orphan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
             name: orphan.name,
             employeeId: employeeId, // 优先使用真实工号
             department: orphan.department,
             status: '后备',
             joinDate: '1900-01-01', // 占位日期
             createdAt: Date.now(),
             updatedAt: Date.now(),
             rewardAmount: extractedData.basicSalary || 0,
             note: isRealEmployeeId ? 
               `系统自动创建 - 使用真实工号[${employeeId}] - 来源：${orphan.dataType === 'monthly' ? '月度数据' : '考核数据'}孤岛记录` :
               `系统自动创建 - 临时工号[${employeeId}] - 来源：${orphan.dataType === 'monthly' ? '月度数据' : '考核数据'}孤岛记录`
           }
           
           await personnelStore.addConductor(basicPersonnel)
           successCount++
           
           if (isRealEmployeeId) {
             console.log(`✅ 使用从现有数据中提取的真实工号创建档案：${orphan.name} [${employeeId}] (${orphan.department})`)
           } else {
             console.log(`⚠️ 使用临时工号创建档案：${orphan.name} [${employeeId}] (${orphan.department})`)
           }
         } catch (error) {
           console.error(`创建基本档案失败：${orphan.name}`, error)
         }
       }
      
      ElMessage.success(`成功为 ${successCount} 人创建基本档案`)
      
      // 重新分析映射
      if (uploadedFiles.value.length > 0) {
        await analyzeData()
      }
    })
  } catch (error: any) {
    ElMessage.error(`创建基本档案失败: ${error.message}`)
  }
}

const downloadOrphanReport = () => {
  if (!mappingResult.value || mappingResult.value.orphanedData.total === 0) {
    ElMessage.warning('没有孤岛数据报告可下载')
    return
  }

  const report = {
    title: '孤岛数据详细报告',
    generatedAt: new Date().toLocaleString(),
    summary: {
      totalOrphans: mappingResult.value.orphanedData.total,
      monthlyOrphans: mappingResult.value.orphanedData.monthlyRecords.length,
      assessmentOrphans: mappingResult.value.orphanedData.assessmentRecords.length
    },
    monthlyOrphans: mappingResult.value.orphanedData.monthlyRecords.map(orphan => ({
      name: orphan.name,
      department: orphan.department,
      recordCount: orphan.recordCount,
      suggestion: orphan.suggestion
    })),
    assessmentOrphans: mappingResult.value.orphanedData.assessmentRecords.map(orphan => ({
      name: orphan.name,
      department: orphan.department,
      recordCount: orphan.recordCount,
      suggestion: orphan.suggestion
    })),
         recommendations: [
       '1. 检查孤岛人员的姓名和部门是否在导入数据中有对应记录',
       '2. 系统已从现有数据的ID/conductorId中提取真实工号（四位数字）',
       '3. 使用"自动创建基本档案"功能，优先使用提取的真实工号',
       '4. 手动核实并完善自动创建的档案信息',
       '5. 确保所有关联数据的完整性'
     ]
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orphaned_data_report_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('孤岛数据报告已下载')
}

// 工具方法
const getConflictTagType = (type: string): 'success' | 'primary' | 'warning' | 'info' | 'danger' => {
  const typeMap: Record<string, 'success' | 'primary' | 'warning' | 'info' | 'danger'> = {
    'new': 'success',
    'duplicate': 'info',
    'dataConflict': 'warning',
    'employeeIdConflict': 'danger',
    'nameConflict': 'danger',
    'complexConflict': 'danger'
  }
  return typeMap[type] || 'info'
}

const getConflictTypeName = (type: string) => {
  const nameMap: Record<string, string> = {
    'new': '新增记录',
    'duplicate': '重复记录',
    'dataConflict': '数据冲突',
    'employeeIdConflict': '工号冲突',
    'nameConflict': '姓名冲突',
    'complexConflict': '复杂冲突'
  }
  return nameMap[type] || type
}

const getResolutionTagType = (resolution: string): 'success' | 'primary' | 'warning' | 'info' | 'danger' => {
  const typeMap: Record<string, 'success' | 'primary' | 'warning' | 'info' | 'danger'> = {
    'keepExisting': 'info',
    'useImported': 'success',
    'merge': 'warning',
    'manual': 'danger',
    'skip': 'info'
  }
  return typeMap[resolution] || 'info'
}

const getResolutionName = (resolution: string) => {
  const nameMap: Record<string, string> = {
    'keepExisting': '保留现有',
    'useImported': '使用导入',
    'merge': '智能合并',
    'manual': '手动处理',
    'skip': '跳过'
  }
  return nameMap[resolution] || resolution
}

const getFieldLabel = (field: string) => {
  const labelMap: Record<string, string> = {
    'employeeId': '工号',
    'name': '姓名',
    'department': '部门',
    'status': '状态',
    'note': '备注',
    'createdAt': '创建时间',
    'updatedAt': '更新时间'
  }
  return labelMap[field] || field
}

// 生命周期
onMounted(() => {
  // 初始化
})
</script>

<style lang="scss" scoped>
.data-import {
  padding: 20px;
  
  .steps-container {
    margin-bottom: 30px;
    
    .el-steps {
      max-width: 800px;
      margin: 0 auto;
    }
  }
  
  .step-content {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .upload-section {
    .upload-content {
      .upload-dragger {
        width: 100%;
        margin-bottom: 20px;
      }
      
      .upload-tips {
        margin: 20px 0;
        
        ul {
          margin: 10px 0;
          padding-left: 20px;
          
          li {
            margin: 5px 0;
          }
        }
      }
    }
  }
  
  .conflict-stats {
    margin-bottom: 30px;
    
    .el-statistic {
      text-align: center;
      
      &.success-stat :deep(.el-statistic__number) {
        color: #67c23a;
      }
      
      &.warning-stat :deep(.el-statistic__number) {
        color: #e6a23c;
      }
      
      &.info-stat :deep(.el-statistic__number) {
        color: #409eff;
      }
    }
  }
  
  .conflict-types {
    margin: 20px 0;
    
    .conflict-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
      
      .conflict-tag {
        padding: 8px 16px;
        font-size: 14px;
      }
    }
  }
  
  .data-mapping-warning {
    margin: 20px 0;
    
    ul {
      margin: 10px 0;
      padding-left: 20px;
      
      li {
        margin: 5px 0;
        font-size: 14px;
      }
    }
    
    p {
      margin: 8px 0;
    }
    
    .orphan-details {
      margin-top: 16px;
      
      .orphan-summary {
        margin: 16px 0;
        
        h5 {
          margin: 8px 0;
          color: #303133;
          font-weight: 600;
        }
        
        .orphan-list {
          margin: 8px 0;
          padding-left: 16px;
          font-size: 13px;
          
          li {
            margin: 6px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            
            .el-tag {
              flex-shrink: 0;
            }
          }
        }
      }
      
      .orphan-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
    }
    
    .orphan-warning {
      font-weight: 600;
      color: #e6a23c;
    }
  }
  
  .resolution-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
    }
  }
  
  .conflict-table {
    .data-preview {
      font-size: 12px;
      line-height: 1.4;
      
      &.existing {
        border-left: 3px solid #409eff;
        padding-left: 8px;
      }
      
      &.imported {
        border-left: 3px solid #67c23a;
        padding-left: 8px;
      }
      
      div {
        margin: 2px 0;
      }
    }
    
    .resolution-selector {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .pagination-wrapper {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
  
  .import-summary {
    .resolution-breakdown {
      margin: 20px 0;
      
      .resolution-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
        
        .resolution-tag {
          padding: 8px 16px;
          font-size: 14px;
        }
      }
    }
    
    .el-alert {
      margin: 20px 0;
      
      ul {
        margin: 10px 0;
        padding-left: 20px;
        
        li {
          margin: 5px 0;
        }
      }
    }
  }
  
  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 30px;
  }
  
  .conflict-detail {
    .compare-section {
      .data-card {
        &.existing {
          border-left: 4px solid #409eff;
        }
        
        &.imported {
          border-left: 4px solid #67c23a;
        }
      }
    }
    
    .merge-preview {
      h4 {
        margin-bottom: 16px;
      }
    }
  }
  
  .result-details {
    .action-buttons {
      margin-top: 20px;
    }
  }
}
</style> 