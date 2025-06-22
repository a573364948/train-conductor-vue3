<template>
  <div class="data-export-import">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>📊 数据导入导出</h3>
          <div class="header-actions">
            <el-button-group>
              <el-button 
                type="primary" 
                @click="showExportDialog = true"
                :icon="Download"
              >
                导出数据
              </el-button>
              <el-button 
                @click="showImportWizard = true"
                :icon="Upload"
              >
                导入数据
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>
      
      <!-- 功能介绍 -->
      <div class="feature-intro">
        <el-row :gutter="24">
          <el-col :span="12">
            <div class="feature-card export-card">
              <el-icon class="feature-icon" size="48"><Download /></el-icon>
              <h4>数据导出</h4>
              <ul>
                <li>导出全部或筛选后的人员数据</li>
                <li>支持Excel和CSV格式</li>
                <li>可选择导出字段</li>
                <li>包含系统ID用于精确更新</li>
              </ul>
              <el-button @click="showExportDialog = true">开始导出</el-button>
            </div>
          </el-col>
          
          <el-col :span="12">
            <div class="feature-card import-card">
              <el-icon class="feature-icon" size="48"><Upload /></el-icon>
              <h4>数据导入</h4>
              <ul>
                <li>批量导入新人员或更新现有信息</li>
                <li>智能匹配和冲突检测</li>
                <li>支持Excel和CSV格式</li>
                <li>提供导入模板和示例</li>
              </ul>
              <el-button @click="showImportWizard = true">开始导入</el-button>
            </div>
          </el-col>
        </el-row>
      </div>
      
      <!-- 使用流程 -->
      <div class="workflow-guide">
        <h4>💡 推荐工作流程</h4>
        <el-steps direction="horizontal" :active="4">
          <el-step title="导出现有数据" description="获取最新的人员信息Excel文件" />
          <el-step title="编辑Excel文件" description="在Excel中修改或添加人员信息" />
          <el-step title="保存文件" description="确保数据格式正确，保存文件" />
          <el-step title="导入更新" description="上传修改后的文件完成批量更新" />
        </el-steps>
      </div>
      
      <!-- 测试功能 -->
      <div class="test-section">
        <h4>🧪 测试功能</h4>
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          <template #title>开发测试工具</template>
          <div>提供各种测试数据文件，用于验证导入导出功能的正确性。</div>
        </el-alert>
        
        <div class="test-buttons">
          <el-button-group>
            <el-button @click="generateTestData">
              📊 生成测试数据
            </el-button>
            <el-button @click="generateErrorData">
              ❌ 生成错误数据
            </el-button>
            <el-button @click="generateUpdateData" :disabled="allConductors.length === 0">
              🔄 生成更新数据
            </el-button>
            <el-button @click="generateCSVData">
              📄 生成CSV数据
            </el-button>
          </el-button-group>
        </div>
      </div>
      
      <!-- 最近操作记录 -->
      <div class="recent-operations" v-if="recentOperations.length > 0">
        <h4>📝 最近操作记录</h4>
        <el-table :data="recentOperations" size="small">
          <el-table-column prop="type" label="操作类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 'export' ? 'success' : 'primary'">
                {{ row.type === 'export' ? '导出' : '导入' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="操作描述" />
          <el-table-column prop="time" label="操作时间" width="160" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                {{ row.status === 'success' ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
    
    <!-- 导出对话框 -->
    <ExportDialog 
      v-model="showExportDialog"
      :total-count="totalCount"
      :filtered-count="filteredCount"
      :selected-count="selectedCount"
      :conductors="conductors"
      :filtered-conductors="filteredConductors"
      :selected-conductors="selectedConductors"
      @export="handleExport"
    />
    
    <!-- 导入向导 -->
    <ImportWizard 
      v-model="showImportWizard"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ExportDialog from './ExportDialog.vue'
import ImportWizard from './ImportWizard.vue'
import { TestDataGenerator } from '@/utils/testDataGenerator'
import { usePersonnelStore } from '@/stores/personnel'
import type { EnhancedConductor } from '@/types'
import type { ExportOptions, OperationRecord } from '@/types/importExport'

// Props
interface Props {
  // 可以接收外部传入的数据，用于与人员列表页面集成
  conductors?: EnhancedConductor[]
  filteredConductors?: EnhancedConductor[]
  selectedConductors?: EnhancedConductor[]
}

const props = withDefaults(defineProps<Props>(), {
  conductors: () => [],
  filteredConductors: () => [],
  selectedConductors: () => []
})

// Store
const personnelStore = usePersonnelStore()

// 响应式数据
const showExportDialog = ref(false)
const showImportWizard = ref(false)
const recentOperations = ref<OperationRecord[]>([])

// 计算属性
const allConductors = computed(() => {
  return props.conductors.length > 0 ? props.conductors : personnelStore.allConductors
})

const totalCount = computed(() => allConductors.value.length)
const filteredCount = computed(() => {
  return props.filteredConductors.length > 0 ? props.filteredConductors.length : totalCount.value
})
const selectedCount = computed(() => props.selectedConductors.length)

// 事件处理
const handleExport = (options: ExportOptions, conductors: EnhancedConductor[]) => {
  // 记录导出操作
  addOperationRecord({
    id: Date.now().toString(),
    type: 'export',
    description: `导出${conductors.length}条人员数据（${options.format.toUpperCase()}格式）`,
    time: new Date().toLocaleString(),
    status: 'success'
  })
}

const handleImportComplete = (result: any) => {
  // 记录导入操作
  addOperationRecord({
    id: Date.now().toString(),
    type: 'import',
    description: `导入${result.successCount || 0}条记录${result.failCount > 0 ? `，${result.failCount}条失败` : ''}`,
    time: new Date().toLocaleString(),
    status: result.failCount === 0 ? 'success' : 'failed'
  })
  
  // 刷新人员数据
  personnelStore.loadFromDatabase()
}

// 添加操作记录
const addOperationRecord = (record: OperationRecord) => {
  recentOperations.value.unshift(record)
  
  // 只保留最近10条记录
  if (recentOperations.value.length > 10) {
    recentOperations.value = recentOperations.value.slice(0, 10)
  }
  
  // 保存到本地存储
  try {
    localStorage.setItem('import-export-operations', JSON.stringify(recentOperations.value))
  } catch (error) {
    console.warn('保存操作记录失败:', error)
  }
}

// 测试数据生成方法
const generateTestData = async () => {
  try {
    await TestDataGenerator.generateTestExcelFile()
    ElMessage.success('测试数据文件已生成并下载')
  } catch (error: any) {
    ElMessage.error(`生成失败: ${error.message}`)
  }
}

const generateErrorData = async () => {
  try {
    await TestDataGenerator.generateErrorTestFile()
    ElMessage.success('错误测试数据文件已生成并下载')
  } catch (error: any) {
    ElMessage.error(`生成失败: ${error.message}`)
  }
}

const generateUpdateData = async () => {
  try {
    const conductors = allConductors.value
    if (conductors.length === 0) {
      ElMessage.warning('当前没有数据，无法生成更新测试文件')
      return
    }
    await TestDataGenerator.generateUpdateTestFile(conductors)
    ElMessage.success('更新测试数据文件已生成并下载')
  } catch (error: any) {
    ElMessage.error(`生成失败: ${error.message}`)
  }
}

const generateCSVData = async () => {
  try {
    TestDataGenerator.generateTestCSV()
    ElMessage.success('CSV测试数据文件已生成并下载')
  } catch (error: any) {
    ElMessage.error(`生成失败: ${error.message}`)
  }
}

// 生命周期
onMounted(() => {
  // 加载历史操作记录
  try {
    const stored = localStorage.getItem('import-export-operations')
    if (stored) {
      recentOperations.value = JSON.parse(stored)
    }
  } catch (error) {
    console.warn('加载操作记录失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.data-export-import {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      color: var(--el-text-color-primary);
    }
  }
  
  .feature-intro {
    margin-bottom: 32px;
    
    .feature-card {
      height: 100%;
      padding: 24px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 8px;
      text-align: center;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: var(--el-color-primary);
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      }
      
      .feature-icon {
        color: var(--el-color-primary);
        margin-bottom: 16px;
      }
      
      h4 {
        margin: 0 0 16px 0;
        color: var(--el-text-color-primary);
        font-size: 18px;
      }
      
      ul {
        text-align: left;
        margin: 0 0 20px 0;
        padding-left: 20px;
        
        li {
          margin-bottom: 8px;
          color: var(--el-text-color-regular);
          font-size: 14px;
        }
      }
    }
    
    .export-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    }
    
    .import-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    }
  }
  
  .workflow-guide {
    margin-bottom: 32px;
    padding: 24px;
    background: #f8f9fa;
    border-radius: 8px;
    
    h4 {
      margin: 0 0 20px 0;
      color: var(--el-text-color-primary);
    }
    
    :deep(.el-step__title) {
      font-size: 14px;
    }
    
    :deep(.el-step__description) {
      font-size: 12px;
    }
  }
  
  .test-section {
    margin-bottom: 32px;
    padding: 24px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: #fafbfc;
    
    h4 {
      margin: 0 0 16px 0;
      color: var(--el-text-color-primary);
    }
    
    .test-buttons {
      :deep(.el-button-group) {
        .el-button {
          font-size: 13px;
          padding: 8px 16px;
        }
      }
    }
  }
  
  .recent-operations {
    h4 {
      margin: 0 0 16px 0;
      color: var(--el-text-color-primary);
    }
    
    :deep(.el-table) {
      font-size: 13px;
    }
  }
}
</style> 