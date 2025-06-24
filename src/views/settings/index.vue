<template>
  <div class="settings-container">
    <el-tabs v-model="activeTab">
      <!-- 系统设置 -->
      <el-tab-pane label="系统设置" name="system">
        <div class="settings-section">
          <h3>基本设置</h3>
          <el-form :model="systemSettings" label-width="120px">
            <el-form-item label="系统名称">
              <el-input v-model="systemSettings.systemName" placeholder="列车长考核管理系统" />
            </el-form-item>
            <el-form-item label="数据保留时间">
              <el-select v-model="systemSettings.dataRetention">
                <el-option label="6个月" value="6" />
                <el-option label="12个月" value="12" />
                <el-option label="24个月" value="24" />
                <el-option label="永久保留" value="0" />
              </el-select>
            </el-form-item>
            <el-form-item label="自动备份">
              <el-switch v-model="systemSettings.autoBackup" />
              <span class="tips">开启后将自动备份数据</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveSystemSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
      
      <!-- 云端同步 -->
      <el-tab-pane label="云端同步" name="cloud">
        <CloudSyncSettings />
      </el-tab-pane>
      
      <!-- 考核标准 -->
      <el-tab-pane label="考核标准" name="standards">
        <div class="settings-section">
          <h3>得分等级设置</h3>
          <el-table :data="scoreStandards" stripe>
            <el-table-column prop="level" label="等级" width="100" />
            <el-table-column label="分数范围">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.min"
                  :min="0"
                  :max="row.max - 1"
                  size="small"
                  :disabled="$index === scoreStandards.length - 1"
                />
                -
                <el-input-number
                  v-model="row.max"
                  :min="row.min + 1"
                  :max="100"
                  size="small"
                  :disabled="$index === 0"
                />
              </template>
            </el-table-column>
            <el-table-column prop="color" label="显示颜色">
              <template #default="{ row }">
                <el-color-picker v-model="row.color" size="small" />
              </template>
            </el-table-column>
          </el-table>
          <div class="action-buttons">
            <el-button type="primary" @click="saveScoreStandards">保存标准</el-button>
            <el-button @click="resetScoreStandards">恢复默认</el-button>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- 标准项点库 -->
      <el-tab-pane label="标准项点库" name="items">
        <StandardItems />
      </el-tab-pane>
      
      <!-- 部门分类 -->
      <el-tab-pane label="部门分类" name="departments">
        <div class="settings-section">
          <h3>部门车型分类配置</h3>
          <el-alert
            title="部门分类说明"
            type="info"
            :closable="false"
            style="margin-bottom: 20px"
          >
            设置各部门所属的车型类别，用于管理力度分析中的车型对比功能。系统会根据部门名称自动分类，您也可以手动调整。
          </el-alert>
          
          <div v-if="departmentList.length > 0">
            <el-table :data="departmentList" stripe border style="width: 100%">
              <el-table-column prop="department" label="部门名称" min-width="200" />
              <el-table-column label="车型类别" width="150">
                <template #default="{ row, $index }">
                  <el-select 
                    v-model="row.category" 
                    placeholder="选择类别"
                    @change="markAsModified($index)"
                  >
                    <el-option label="高铁" value="高铁" />
                    <el-option label="动车" value="动车" />
                    <el-option label="普速" value="普速" />
                    <el-option label="其他" value="其他" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="自动分类" width="100">
                <template #default="{ row }">
                  <el-tag :type="getAutoTagType(row.autoCategory)" size="small">
                    {{ row.autoCategory }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag 
                    :type="row.isModified ? 'warning' : 'success'" 
                    size="small"
                  >
                    {{ row.isModified ? '已修改' : '已保存' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row, $index }">
                  <el-button 
                    type="text" 
                    size="small" 
                    @click="resetToAuto($index)"
                    :disabled="row.category === row.autoCategory"
                  >
                    恢复自动
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="action-buttons">
              <el-button 
                type="primary" 
                @click="saveDepartmentCategories"
                :disabled="!hasModifications"
              >
                保存设置
              </el-button>
              <el-button @click="resetAllToAuto">全部恢复自动分类</el-button>
              <el-button @click="refreshDepartmentList">刷新部门列表</el-button>
            </div>
          </div>
          
          <el-empty v-else description="暂无部门数据" />
        </div>
      </el-tab-pane>
      
      <!-- 数据转换 -->
      <el-tab-pane label="数据转换" name="converter">
        <DataConverter />
      </el-tab-pane>
      
      <!-- 数据管理 -->
      <el-tab-pane label="数据管理" name="data">
        <div class="settings-section">
          <h3>数据导入导出</h3>
                  <div class="data-actions">
          <el-button type="primary" @click="exportAllData">
            <el-icon><Download /></el-icon>
            导出全部数据
          </el-button>
          <el-button @click="importData">
            <el-icon><Upload /></el-icon>
            导入数据
          </el-button>
          <el-button type="warning" @click="repairData">
            <el-icon><Refresh /></el-icon>
            修复数据格式
          </el-button>
          <el-button type="danger" @click="migrateHistoricalData" :loading="migrating">
            <el-icon><Tools /></el-icon>
            迁移历史数据
          </el-button>
        </div>
        
        <el-alert
          v-if="showMigrationAlert"
          title="数据迁移说明"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top: 16px"
        >
          <template #default>
            此功能会重新计算所有历史数据的在岗状态，统一为新的状态判断逻辑（在岗/不在岗/助勤/待确认）。
            <br/>
            <strong>注意：此操作会修改现有数据，建议先导出数据备份！</strong>
          </template>
        </el-alert>
        </div>
        
        <!-- 备份管理 -->
        <div class="settings-section">
          <h3>自动备份管理</h3>
          <div class="backup-info">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="backup-status">
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="备份状态">
                      <el-tag type="success">自动备份已启用</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="备份间隔">每30分钟</el-descriptions-item>
                    <el-descriptions-item label="上次备份">
                      {{ lastBackupTime ? formatBackupTime(lastBackupTime) : '暂无备份' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="备份总数">{{ backupList.length }} 个</el-descriptions-item>
                    <el-descriptions-item label="占用空间">{{ totalBackupSize }} KB</el-descriptions-item>
                  </el-descriptions>
                  <el-button type="primary" @click="createManualBackup" :loading="isBackingUp" style="margin-top: 16px">
                    <el-icon><DocumentCopy /></el-icon>
                    立即备份
                  </el-button>
                </div>
              </el-col>
              <el-col :span="12">
                <el-alert
                  title="完整数据备份范围"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <div style="margin-bottom: 8px"><strong>备份包含所有系统数据：</strong></div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px">
                      <li>📊 月度考核数据（monthlyData）</li>
                      <li>👥 基础人员信息（conductorDB）</li>
                      <li>⭐ 增强人员档案（enhancedConductors）</li>
                      <li>📋 申请记录（applications）</li>
                      <li>🔄 人员异动记录（personnelChanges）</li>
                      <li>🏢 部门分类配置（departmentCategories）</li>
                      <li>📝 标准考核项点（standardAssessmentItems）</li>
                      <li>📈 考核结果数据（assessmentDB）</li>
                      <li>⚙️ 系统设置（settings & applicationSettings）</li>
                    </ul>
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                      ✨ 自动检测数据变化，相同数据不重复备份
                    </div>
                  </template>
                </el-alert>
              </el-col>
            </el-row>
          </div>
          
          <el-divider />
          
          <h4>备份历史</h4>
          <el-table v-if="backupList.length > 0" :data="backupList" stripe max-height="400">
            <el-table-column prop="name" label="备份名称" min-width="200" />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="row.type === 'auto' ? 'info' : 'success'" size="small">
                  {{ row.type === 'auto' ? '自动' : '手动' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="180">
              <template #default="{ row }">
                {{ formatBackupTime(row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column label="大小" width="100">
              <template #default="{ row }">
                {{ (row.size / 1024).toFixed(2) }} KB
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="handleRestore(row.id)">
                  恢复
                </el-button>
                <el-button type="danger" size="small" @click="handleDelete(row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无备份记录" />
        </div>
        
        <div class="settings-section">
          
          <h3>数据清理</h3>
          <el-alert
            title="警告"
            type="warning"
            description="清理数据将永久删除所选数据，请谨慎操作！"
            show-icon
            :closable="false"
          />
          <div class="data-clean">
            <el-form :model="cleanOptions" label-width="120px">
              <el-form-item label="清理范围">
                <el-date-picker
                  v-model="cleanDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM"
                  value-format="YYYY-MM"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="danger" @click="cleanData">清理数据</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- 关于系统 -->
      <el-tab-pane label="关于系统" name="about">
        <div class="about-section">
          <div class="system-info">
            <h2>列车长考核管理系统</h2>
            <p>版本：2.0.0</p>
            <p>基于 Vue 3 + TypeScript + Element Plus 开发</p>
          </div>
          
          <el-divider />
          
          <div class="features">
            <h3>主要功能</h3>
            <ul>
              <li>✓ 月度考核数据管理</li>
              <li>✓ 人员信息管理</li>
              <li>✓ 考核成绩分析</li>
              <li>✓ 趋势分析与预测</li>
              <li>✓ 多维度统计报表</li>
              <li>✓ 数据导入导出</li>
            </ul>
          </div>
          
          <el-divider />
          
          <div class="tech-stack">
            <h3>技术栈</h3>
            <el-tag v-for="tech in techStack" :key="tech" style="margin: 4px">
              {{ tech }}
            </el-tag>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 导入数据对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入数据"
      width="500px"
    >
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".json"
        :on-change="handleFileSelect"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将JSON文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只支持通过系统导出的JSON格式文件
          </div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Upload, UploadFilled, DocumentCopy, Refresh, Tools } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import { useBackup } from '@/composables/useBackup'
import { validateImportData, formatDataPreview } from '@/utils/dataImportHelper'
import { checkStandardItemsFormat, repairStandardItems } from '@/utils/dataRepair'
import { determineCategory } from '@/utils/department'
import { validateScoreStandards, saveScoreStandards as saveToStorage, DEFAULT_SCORE_STANDARDS } from '@/utils/scoreStandards'
import StandardItems from './StandardItems.vue'
import DataConverter from './DataConverter.vue'
import CloudSyncSettings from '@/components/CloudSyncSettings.vue'
import type { UploadFile } from 'element-plus'

const mainStore = useMainStore()

// 使用备份功能
const {
  isBackingUp,
  backupList,
  lastBackupTime,
  createBackup,
  restoreBackup,
  deleteBackup
} = useBackup()

// 当前标签
const activeTab = ref('system')

// 系统设置
const systemSettings = reactive({
  systemName: '列车长考核管理系统',
  dataRetention: '12',
  autoBackup: true
})

// 得分标准
const scoreStandards = ref([
  { level: '优秀', min: 90, max: 100, color: '#4CAF50' },
  { level: '良好', min: 80, max: 89, color: '#2196F3' },
  { level: '中等', min: 70, max: 79, color: '#FF9800' },
  { level: '及格', min: 60, max: 69, color: '#F44336' },
  { level: '不及格', min: 0, max: 59, color: '#9E9E9E' }
])

// 数据清理选项
const cleanOptions = reactive({})
const cleanDateRange = ref<string[]>([])

// 导入对话框
const importDialogVisible = ref(false)
const uploadRef = ref()
let selectedFile: File | null = null

// 数据迁移相关
const migrating = ref(false)
const showMigrationAlert = ref(true)

// 技术栈
const techStack = [
  'Vue 3',
  'TypeScript',
  'Vite',
  'Element Plus',
  'Pinia',
  'Vue Router',
  'ECharts',
  'SCSS',
  'IndexedDB'
]

// 部门分类管理
interface DepartmentItem {
  department: string
  category: '高铁' | '动车' | '普速' | '其他'
  autoCategory: '高铁' | '动车' | '普速' | '其他'
  isModified: boolean
}

const departmentList = ref<DepartmentItem[]>([])

// 计算是否有修改
const hasModifications = computed(() => {
  return departmentList.value.some(dept => dept.isModified)
})

// 保存系统设置
const saveSystemSettings = () => {
  // 这里应该保存到 localStorage 或数据库
  localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
  ElMessage.success('系统设置已保存')
}

// 保存得分标准
const saveScoreStandards = () => {
  // 使用工具函数验证分数标准
  const validation = validateScoreStandards(scoreStandards.value)
  
  if (!validation.isValid) {
    ElMessage.error(`保存失败: ${validation.errors.join('; ')}`)
    return
  }
  
  try {
    saveToStorage(scoreStandards.value)
    ElMessage.success('得分标准已保存')
  } catch (error) {
    ElMessage.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 重置得分标准
const resetScoreStandards = () => {
  scoreStandards.value = [...DEFAULT_SCORE_STANDARDS]
  ElMessage.success('已恢复默认设置')
}

// 导出全部数据
const exportAllData = async () => {
  const jsonData = await mainStore.exportData()
  if (jsonData) {
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `列车长考核数据备份_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('数据导出成功')
  } else {
    ElMessage.error('数据导出失败')
  }
}

// 导入数据
const importData = () => {
  importDialogVisible.value = true
}

// 选择文件
const handleFileSelect = (file: UploadFile) => {
  selectedFile = file.raw || null
}

// 确认导入
const confirmImport = async () => {
  if (!selectedFile) {
    ElMessage.warning('请选择文件')
    return
  }
  
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const jsonString = e.target?.result as string
      
      // 验证数据格式
      const validation = validateImportData(jsonString)
      
      if (!validation.isValid) {
        ElMessage.error(`数据验证失败: ${validation.errors.join('; ')}`)
        return
      }
      
      // 显示数据预览
      if (validation.dataPreview) {
        const previewText = formatDataPreview(validation.dataPreview)
        const formatText = validation.format === 'original' ? '原系统格式' : 'Vue3格式'
        
        const confirmResult = await ElMessageBox.confirm(
          `检测到${formatText}数据：${previewText}。确认导入吗？`,
          '数据导入确认',
          {
            confirmButtonText: '确认导入',
            cancelButtonText: '取消',
            type: 'info'
          }
        ).catch(() => false)
        
        if (!confirmResult) return
      }
      
      const success = await mainStore.importData(jsonString)
      
      if (success) {
        importDialogVisible.value = false
        uploadRef.value?.clearFiles()
        selectedFile = null
        ElMessage.success('数据导入成功，正在刷新页面...')
        
        // 刷新页面以确保数据更新
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        ElMessage.error('数据导入失败，请检查控制台获取详细错误信息')
      }
    } catch (error) {
      console.error('导入错误详情:', error)
      ElMessage.error(`导入失败: ${(error as Error).message}`)
    }
  }
  
  reader.readAsText(selectedFile)
}

// 执行数据迁移
const migrateHistoricalData = async () => {
  try {
    // 确认对话框
    const confirm = await ElMessageBox.confirm(
      '此操作将重新计算所有历史数据的在岗状态，统一为新的状态判断逻辑。建议先导出数据备份！',
      '数据迁移确认',
      {
        confirmButtonText: '开始迁移',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).catch(() => false)

    if (!confirm) return

    migrating.value = true
    showMigrationAlert.value = false

    // 执行迁移
    const success = await mainStore.migrateHistoricalData()

    if (success) {
      ElMessage.success('数据迁移完成！所有历史数据状态已更新')
    } else {
      ElMessage.error('数据迁移失败，请检查控制台错误信息')
    }

  } catch (error) {
    console.error('迁移过程出错:', error)
    ElMessage.error(`迁移失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    migrating.value = false
  }
}

// 清理数据
const cleanData = async () => {
  if (!cleanDateRange.value) {
    ElMessage.warning('请选择清理范围')
    return
  }
  
  const confirm = await ElMessageBox.confirm(
    `确定要清理 ${cleanDateRange.value[0]} 至 ${cleanDateRange.value[1]} 的数据吗？此操作不可恢复！`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (!confirm) return
  
  // 执行清理逻辑
  const [startDate, endDate] = cleanDateRange.value
  const [startYear, startMonth] = startDate.split('-').map(Number)
  const [endYear, endMonth] = endDate.split('-').map(Number)
  
  if (!mainStore.database) {
    await mainStore.loadDatabase()
  }
  
  // 过滤掉指定范围内的数据
  mainStore.database!.monthlyData = mainStore.database!.monthlyData.filter(month => {
    const monthDate = month.year * 100 + month.month
    const startDateNum = startYear * 100 + startMonth
    const endDateNum = endYear * 100 + endMonth
    
    return monthDate < startDateNum || monthDate > endDateNum
  })
  
  await mainStore.saveDatabase()
  
  ElMessage.success('数据清理完成')
  cleanDateRange.value = []
}

// 计算备份总大小
const totalBackupSize = computed(() => {
  const totalBytes = backupList.value.reduce((sum, backup) => sum + backup.size, 0)
  return (totalBytes / 1024).toFixed(2)
})

// 格式化备份时间
const formatBackupTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 创建手动备份
const createManualBackup = async () => {
  const name = `手动备份 - ${new Date().toLocaleString('zh-CN')}`
  await createBackup('manual', name)
}

// 恢复备份
const handleRestore = async (backupId: string) => {
  const confirm = await ElMessageBox.confirm(
    '恢复备份将覆盖当前所有数据，是否继续？',
    '确认恢复',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (confirm) {
    await restoreBackup(backupId)
  }
}

// 删除备份
const handleDelete = async (backupId: string) => {
  const confirm = await ElMessageBox.confirm(
    '确定要删除这个备份吗？',
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (confirm) {
    await deleteBackup(backupId)
  }
}

// 修复数据格式
const repairData = async () => {
  if (!mainStore.database) {
    ElMessage.warning('请先加载数据库')
    return
  }
  
  // 检查数据格式
  const checkResult = checkStandardItemsFormat(mainStore.database)
  
  if (checkResult.isValid) {
    ElMessage.success('数据格式正确，无需修复')
    return
  }
  
  if (!checkResult.needsRepair) {
    ElMessage.warning('未检测到可修复的数据')
    return
  }
  
  // 显示确认对话框
  const confirmResult = await ElMessageBox.confirm(
    `检测到 ${checkResult.issues.length} 个格式问题，是否立即修复？`,
    '数据格式修复',
    {
      confirmButtonText: '立即修复',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (!confirmResult) return
  
  // 执行修复
  const repaired = repairStandardItems(mainStore.database)
  
  if (repaired) {
    // 保存修复后的数据
    await mainStore.saveDatabase()
    ElMessage.success('数据格式修复成功，请刷新页面查看效果')
    
    // 刷新页面
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } else {
    ElMessage.error('数据修复失败，请查看控制台错误信息')
  }
}

// 部门分类相关函数
const refreshDepartmentList = async () => {
  try {
    console.log('开始刷新部门列表...')
    await mainStore.loadDatabase()
    
    if (!mainStore.database) {
      console.warn('数据库为空')
      ElMessage.warning('数据库未加载或为空')
      return
    }
    
    console.log('数据库对象:', mainStore.database)
    console.log('列车长数据:', Object.keys(mainStore.database.conductorDB || {}))
    
    // 获取所有部门
    const allDepartments = mainStore.departments
    console.log('从store获取的部门列表:', allDepartments)
    
    // 如果没有部门数据，可能是因为没有列车长数据
    if (!allDepartments || allDepartments.length === 0) {
      console.warn('没有部门数据，可能需要先导入列车长数据')
      // 创建一些示例部门用于测试
      const sampleDepartments = [
        '高铁一队', '高铁二队', '高铁三队',
        '动车一队', '动车二队', 
        '普速一队', '普速二队',
        '客运科', '安全科', '机务科'
      ]
      
      departmentList.value = sampleDepartments.map(dept => {
        const autoCategory = determineCategory(dept, {}) // 不传入已有配置，获取自动分类
        const currentCategories = mainStore.departmentCategories
        const currentCategory = currentCategories[dept] || autoCategory
        
        return {
          department: dept,
          category: currentCategory as '高铁' | '动车' | '普速' | '其他',
          autoCategory: autoCategory as '高铁' | '动车' | '普速' | '其他',
          isModified: false
        }
      })
      
      ElMessage.info('暂无实际部门数据，显示示例部门用于配置测试')
    } else {
      const currentCategories = mainStore.departmentCategories
      console.log('当前部门分类配置:', currentCategories)
      
      departmentList.value = allDepartments.map(dept => {
        const autoCategory = determineCategory(dept, {}) // 不传入已有配置，获取自动分类
        const currentCategory = currentCategories[dept] || autoCategory
        
        return {
          department: dept,
          category: currentCategory as '高铁' | '动车' | '普速' | '其他',
          autoCategory: autoCategory as '高铁' | '动车' | '普速' | '其他',
          isModified: false
        }
      })
    }
    
    console.log('部门列表已刷新:', departmentList.value)
    ElMessage.success(`部门列表已刷新，共${departmentList.value.length}个部门`)
  } catch (error) {
    console.error('刷新部门列表时发生错误:', error)
    ElMessage.error(`刷新部门列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const markAsModified = (index: number) => {
  departmentList.value[index].isModified = true
}

const resetToAuto = (index: number) => {
  const item = departmentList.value[index]
  item.category = item.autoCategory
  item.isModified = false
}

const resetAllToAuto = () => {
  departmentList.value.forEach(item => {
    item.category = item.autoCategory
    item.isModified = false
  })
  ElMessage.success('已重置所有部门为自动分类')
}

const getAutoTagType = (category: string) => {
  switch (category) {
    case '高铁': return 'success'
    case '动车': return 'primary'
    case '普速': return 'warning'
    default: return 'info'
  }
}

const saveDepartmentCategories = async () => {
  if (!mainStore.database) {
    ElMessage.warning('无法保存：数据库未加载')
    return
  }
  
  try {
    // 创建完全干净的部门分类配置对象
    const newCategories: Record<string, string> = {}
    departmentList.value.forEach(item => {
      // 只保存基本字符串值，去除任何可能的响应式包装
      const deptName = JSON.parse(JSON.stringify(item.department))
      const category = JSON.parse(JSON.stringify(item.category))
      newCategories[deptName] = category
    })
    
    console.log('准备保存的部门分类配置:', newCategories)
    
    // 直接调用IndexedDB操作，避免通过复杂的数据库对象
    const { db } = await import('@/api/database')
    const idb = await db.getDB()
    const transaction = idb.transaction(['departmentCategories'], 'readwrite')
    const store = transaction.objectStore('departmentCategories')
    
    // 清空现有数据
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => resolve()
      clearRequest.onerror = () => reject(clearRequest.error)
    })
    
    // 逐个添加新数据
    const promises: Promise<void>[] = []
    Object.entries(newCategories).forEach(([department, category]) => {
      const promise = new Promise<void>((resolve, reject) => {
        const addRequest = store.add({
          department: department,
          category: category
        })
        addRequest.onsuccess = () => resolve()
        addRequest.onerror = () => reject(addRequest.error)
      })
      promises.push(promise)
    })
    
    await Promise.all(promises)
    
    // 等待事务完成
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    
    // 更新store中的数据
    if (mainStore.database) {
      mainStore.database.departmentCategories = newCategories
    }
    
    // 标记所有项目为已保存
    departmentList.value.forEach(item => {
      item.isModified = false
    })
    
    ElMessage.success('部门分类配置已保存')
    console.log('部门分类配置保存成功')
    
  } catch (error) {
    console.error('保存部门分类配置时发生错误:', error)
    ElMessage.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 页面加载时初始化部门列表
onMounted(() => {
  refreshDepartmentList()
})
</script>

<style lang="scss" scoped>
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  
  :deep(.el-tabs__content) {
    padding: 20px 0;
  }
  
  .settings-section {
    background: var(--bg-white);
    border-radius: 4px;
    padding: 20px;
    margin-bottom: 20px;
    
    h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
    }
    
    .tips {
      margin-left: 12px;
      color: var(--text-secondary);
      font-size: 12px;
    }
  }
  
  .action-buttons {
    margin-top: 16px;
  }
  
  .data-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 32px;
  }
  
  .data-clean {
    margin-top: 16px;
  }
  
  .about-section {
    background: var(--bg-white);
    border-radius: 4px;
    padding: 40px;
    text-align: center;
    
    .system-info {
      h2 {
        margin: 0 0 16px 0;
        font-size: 24px;
      }
      
      p {
        margin: 8px 0;
        color: var(--text-secondary);
      }
    }
    
    .features {
      text-align: left;
      max-width: 400px;
      margin: 0 auto;
      
      ul {
        list-style: none;
        padding: 0;
        
        li {
          padding: 8px 0;
          color: var(--text-regular);
        }
      }
    }
    
    .tech-stack {
      h3 {
        margin-bottom: 16px;
      }
    }
  }
}
</style> 