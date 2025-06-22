<template>
  <div class="export-legacy-system">
    <div class="header-section">
      <el-card>
        <template #header>
          <div class="header-content">
            <h2>🔄 原子系统数据导出工具</h2>
            <el-tag type="warning">临时工具页面</el-tag>
          </div>
        </template>
        
                 <el-alert 
           type="info" 
           show-icon 
           :closable="false"
           title="数据导出说明"
         >
           <p>此页面用于从原子系统（列车长启用申请管理）中导出所有数据，导出的数据将用于主系统的数据融合。</p>
           <ul>
             <li>✅ 自动读取IndexedDB数据库 (conductorsystemDB)</li>
             <li>✅ 支持导出人员信息、申请记录、部门数据</li>
             <li>✅ 自动生成标准JSON格式</li>
             <li>✅ 包含完整的元数据信息</li>
           </ul>
         </el-alert>

         <!-- 数据库连接状态 -->
         <el-alert 
           v-if="loading"
           type="warning" 
           show-icon 
           :closable="false"
           title="正在读取数据"
           description="正在从 IndexedDB (conductorsystemDB) 数据库中读取原子系统数据，请稍候..."
         />
       </el-card>
    </div>

    <!-- 原子系统数据预览 -->
    <div class="preview-section">
      <el-card>
        <template #header>
          <h3>📊 原子系统数据概览</h3>
        </template>

        <div class="data-stats">
          <el-row :gutter="16">
            <el-col :span="6">
              <el-statistic 
                title="人员记录" 
                :value="legacyData.conductors.length"
                suffix="条"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-statistic>
            </el-col>
            <el-col :span="6">
              <el-statistic 
                title="申请记录" 
                :value="legacyData.applications.length"
                suffix="条"
              >
                <template #prefix>
                  <el-icon><Document /></el-icon>
                </template>
              </el-statistic>
            </el-col>
            <el-col :span="6">
              <el-statistic 
                title="部门信息" 
                :value="legacyData.departments.length"
                suffix="个"
              >
                                 <template #prefix>
                   <el-icon><OfficeBuilding /></el-icon>
                 </template>
              </el-statistic>
            </el-col>
            <el-col :span="6">
              <el-statistic 
                title="配置项" 
                :value="Object.keys(legacyData.systemSettings).length"
                suffix="项"
              >
                <template #prefix>
                  <el-icon><Setting /></el-icon>
                </template>
              </el-statistic>
            </el-col>
          </el-row>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button @click="loadLegacyData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
          <el-button 
            type="primary" 
            @click="exportData"
            :disabled="!hasData"
          >
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
          <el-button @click="previewData">
            <el-icon><View /></el-icon>
            预览JSON
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 数据详情Tab页 -->
    <div class="details-section">
      <el-card>
        <template #header>
          <h3>📋 数据详情</h3>
        </template>

        <el-tabs v-model="activeTab">
          <!-- 人员数据 -->
          <el-tab-pane label="人员数据" name="conductors">
            <div class="data-table">
              <el-table :data="legacyData.conductors" border stripe>
                <el-table-column prop="employeeId" label="工号" width="120" />
                <el-table-column prop="name" label="姓名" width="120" />
                <el-table-column prop="department" label="部门" />
                <el-table-column prop="status" label="状态" width="120" />
                <el-table-column prop="createTime" label="创建时间" width="180">
                  <template #default="{ row }">
                    {{ formatDate(row.createTime) }}
                  </template>
                </el-table-column>
                <el-table-column prop="note" label="备注" />
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 申请数据 -->
          <el-tab-pane label="申请记录" name="applications">
            <div class="data-table">
              <el-table :data="legacyData.applications" border stripe>
                <el-table-column prop="id" label="申请ID" width="120" />
                <el-table-column prop="employeeId" label="工号" width="120" />
                <el-table-column prop="name" label="姓名" width="120" />
                <el-table-column prop="type" label="申请类型" width="120" />
                <el-table-column prop="status" label="申请状态" width="120" />
                <el-table-column prop="submitTime" label="提交时间" width="180">
                  <template #default="{ row }">
                    {{ formatDate(row.submitTime) }}
                  </template>
                </el-table-column>
                <el-table-column prop="reason" label="申请理由" />
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 部门数据 -->
          <el-tab-pane label="部门信息" name="departments">
            <div class="data-table">
              <el-table :data="legacyData.departments" border stripe>
                <el-table-column prop="id" label="部门ID" width="120" />
                <el-table-column prop="name" label="部门名称" />
                <el-table-column prop="quota" label="定员" width="100" />
                <el-table-column prop="manager" label="负责人" width="120" />
                <el-table-column prop="description" label="描述" />
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 系统配置 -->
          <el-tab-pane label="系统配置" name="settings">
            <div class="settings-view">
              <el-descriptions :column="1" border>
                <el-descriptions-item 
                  v-for="(value, key) in legacyData.systemSettings" 
                  :key="key"
                  :label="key"
                >
                  {{ value }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <!-- JSON预览对话框 -->
    <el-dialog v-model="previewVisible" title="导出数据预览" width="80%">
      <div class="json-preview">
        <el-input
          v-model="previewJson"
          type="textarea"
          :rows="20"
          readonly
          placeholder="JSON数据预览"
        />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="previewVisible = false">关闭</el-button>
          <el-button type="primary" @click="copyToClipboard">
            <el-icon><CopyDocument /></el-icon>
            复制到剪贴板
          </el-button>
          <el-button type="success" @click="downloadFromPreview">
            <el-icon><Download /></el-icon>
            下载文件
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  User,
  Document,
  OfficeBuilding,
  Setting,
  Refresh,
  Download,
  View,
  CopyDocument
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const activeTab = ref('conductors')
const previewVisible = ref(false)
const previewJson = ref('')

// 原子系统数据
const legacyData = ref({
  conductors: [] as any[],
  applications: [] as any[],
  departments: [] as any[],
  departmentQuotas: {} as Record<string, number>,
  systemSettings: {} as Record<string, any>
})

// 计算属性
const hasData = computed(() => {
  return legacyData.value.conductors.length > 0 || 
         legacyData.value.applications.length > 0 ||
         legacyData.value.departments.length > 0
})

// 格式化日期
const formatDate = (timestamp: number | string) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 加载原子系统数据
const loadLegacyData = async () => {
  loading.value = true
  
  try {
    // 从 IndexedDB 中读取原子系统数据
    const dbData = await loadDataFromIndexedDB()
    
    // 更新本地数据
    legacyData.value.conductors = dbData.conductors || []
    legacyData.value.applications = dbData.applications || []
    legacyData.value.departments = dbData.departments || []
    legacyData.value.departmentQuotas = dbData.departmentQuotas || {}
    legacyData.value.systemSettings = dbData.systemSettings || {}

    // 如果没有数据，生成一些示例数据用于测试
    if (!hasData.value) {
      generateSampleData()
      ElMessage.info('IndexedDB中未找到原子系统数据，已生成示例数据')
    } else {
      ElMessage.success(`数据加载完成！共找到 ${legacyData.value.conductors.length} 条人员记录`)
    }
    
  } catch (error: any) {
    ElMessage.error(`数据加载失败: ${error.message}`)
    // 如果失败，生成示例数据
    generateSampleData()
  } finally {
    loading.value = false
  }
}

// 从 IndexedDB 加载数据
const loadDataFromIndexedDB = (): Promise<{
  conductors: any[]
  applications: any[]
  departments: any[]
  departmentQuotas: Record<string, number>
  systemSettings: Record<string, any>
}> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('conductorsystemDB')
    
    request.onerror = () => {
      reject(new Error('无法打开 IndexedDB 数据库'))
    }
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = db.transaction([
        'conductors', 
        'applications', 
        'departments', 
        'departmentQuotas', 
        'systemSettings'
      ], 'readonly')
      
      const result = {
        conductors: [] as any[],
        applications: [] as any[],
        departments: [] as any[],
        departmentQuotas: {} as Record<string, number>,
        systemSettings: {} as Record<string, any>
      }
      
      let completedStores = 0
      const totalStores = 5
      
      const checkComplete = () => {
        completedStores++
        if (completedStores === totalStores) {
          db.close()
          resolve(result)
        }
      }
      
      // 读取 conductors
      const conductorsStore = transaction.objectStore('conductors')
      const conductorsRequest = conductorsStore.getAll()
      conductorsRequest.onsuccess = () => {
        result.conductors = conductorsRequest.result || []
        console.log('加载到人员数据:', result.conductors.length, '条')
        checkComplete()
      }
      conductorsRequest.onerror = () => {
        console.warn('读取人员数据失败')
        checkComplete()
      }
      
      // 读取 applications
      const applicationsStore = transaction.objectStore('applications')
      const applicationsRequest = applicationsStore.getAll()
      applicationsRequest.onsuccess = () => {
        result.applications = applicationsRequest.result || []
        console.log('加载到申请数据:', result.applications.length, '条')
        checkComplete()
      }
      applicationsRequest.onerror = () => {
        console.warn('读取申请数据失败')
        checkComplete()
      }
      
      // 读取 departments
      const departmentsStore = transaction.objectStore('departments')
      const departmentsRequest = departmentsStore.getAll()
      departmentsRequest.onsuccess = () => {
        result.departments = departmentsRequest.result || []
        console.log('加载到部门数据:', result.departments.length, '条')
        checkComplete()
      }
      departmentsRequest.onerror = () => {
        console.warn('读取部门数据失败')
        checkComplete()
      }
      
      // 读取 departmentQuotas
      const quotasStore = transaction.objectStore('departmentQuotas')
      const quotasRequest = quotasStore.getAll()
      quotasRequest.onsuccess = () => {
        const quotasArray = quotasRequest.result || []
        // 将数组转换为对象格式
        quotasArray.forEach((item: any) => {
          if (item.department && typeof item.quota === 'number') {
            result.departmentQuotas[item.department] = item.quota
          }
        })
        console.log('加载到定员数据:', Object.keys(result.departmentQuotas).length, '项')
        checkComplete()
      }
      quotasRequest.onerror = () => {
        console.warn('读取定员数据失败')
        checkComplete()
      }
      
      // 读取 systemSettings
      const settingsStore = transaction.objectStore('systemSettings')
      const settingsRequest = settingsStore.getAll()
      settingsRequest.onsuccess = () => {
        const settingsArray = settingsRequest.result || []
        // 将设置数组转换为键值对对象
        settingsArray.forEach((item: any) => {
          if (item.key !== undefined) {
            result.systemSettings[item.key] = item.value
          }
        })
        console.log('加载到系统设置:', Object.keys(result.systemSettings).length, '项')
        checkComplete()
      }
      settingsRequest.onerror = () => {
        console.warn('读取系统设置失败')
        checkComplete()
      }
      
      transaction.onerror = () => {
        db.close()
        reject(new Error('IndexedDB 事务失败'))
      }
    }
    
    request.onupgradeneeded = () => {
      reject(new Error('IndexedDB 需要升级，可能是数据库版本不匹配'))
    }
  })
}

// 生成示例数据（用于测试）
const generateSampleData = () => {
  const currentTime = Date.now()
  
  legacyData.value.conductors = [
    {
      employeeId: 'TC001',
      name: '张三',
      department: '客运段',
      status: '正式启用',
      createTime: currentTime - 86400000 * 30,
      updateTime: currentTime - 86400000 * 5,
      note: '经验丰富的列车长'
    },
    {
      employeeId: 'TC002',
      name: '李四',
      department: '货运段',
      status: '临时启用',
      createTime: currentTime - 86400000 * 20,
      updateTime: currentTime - 86400000 * 2,
      note: '新入职人员'
    },
    {
      employeeId: 'TC003',
      name: '王五',
      department: '机务段',
      status: '后备',
      createTime: currentTime - 86400000 * 15,
      updateTime: currentTime - 86400000 * 1,
      note: '待培训状态'
    }
  ]

  legacyData.value.applications = [
    {
      id: 'APP001',
      employeeId: 'TC001',
      name: '张三',
      type: '正式启用',
      status: '已通过',
      submitTime: currentTime - 86400000 * 25,
      approveTime: currentTime - 86400000 * 24,
      reason: '完成培训，具备上岗条件',
      approver: '管理员'
    },
    {
      id: 'APP002',
      employeeId: 'TC002',
      name: '李四',
      type: '临时启用',
      status: '已通过',
      submitTime: currentTime - 86400000 * 18,
      approveTime: currentTime - 86400000 * 17,
      reason: '临时调配需要',
      approver: '管理员'
    }
  ]

  legacyData.value.departments = [
    {
      id: 'DEPT001',
      name: '客运段',
      quota: 50,
      manager: '张主任',
      description: '负责客运列车的运营管理'
    },
    {
      id: 'DEPT002',
      name: '货运段',
      quota: 30,
      manager: '李主任',
      description: '负责货运列车的运营管理'
    },
    {
      id: 'DEPT003',
      name: '机务段',
      quota: 40,
      manager: '王主任',
      description: '负责列车机务维护工作'
    }
  ]

  legacyData.value.departmentQuotas = {
    '客运段': 50,
    '货运段': 30,
    '机务段': 40
  }

  legacyData.value.systemSettings = {
    systemName: '列车长启用申请管理系统',
    version: '1.0.0',
    lastBackupTime: currentTime - 86400000,
    maxApplicationDays: 30,
    autoApprove: false,
    emailNotification: true
  }

  ElMessage.info('已生成示例数据用于测试')
}

// 预览数据
const previewData = () => {
  const exportData = generateExportData()
  previewJson.value = JSON.stringify(exportData, null, 2)
  previewVisible.value = true
}

// 生成导出数据
const generateExportData = () => {
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    source: '列车长启用申请管理系统（原子系统）',
    metadata: {
      totalConductors: legacyData.value.conductors.length,
      totalApplications: legacyData.value.applications.length,
      totalDepartments: legacyData.value.departments.length,
      exportTool: '原子系统数据导出工具'
    },
    data: {
      conductors: legacyData.value.conductors,
      applications: legacyData.value.applications,
      departments: legacyData.value.departments,
      departmentQuotas: legacyData.value.departmentQuotas,
      systemSettings: legacyData.value.systemSettings
    }
  }
}

// 导出数据
const exportData = () => {
  try {
    const exportData = generateExportData()
    const jsonString = JSON.stringify(exportData, null, 2)
    
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `legacy_system_export_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('数据导出成功')
    
  } catch (error: any) {
    ElMessage.error(`导出失败: ${error.message}`)
  }
}

// 复制到剪贴板
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(previewJson.value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 从预览下载
const downloadFromPreview = () => {
  const blob = new Blob([previewJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `legacy_system_export_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('文件下载成功')
  previewVisible.value = false
}

// 生命周期
onMounted(() => {
  loadLegacyData()
})
</script>

<style lang="scss" scoped>
.export-legacy-system {
  padding: 20px;
  
  .header-section {
    margin-bottom: 20px;
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h2 {
        margin: 0;
        color: #409eff;
      }
    }
  }
  
  .preview-section {
    margin-bottom: 20px;
    
    .data-stats {
      margin-bottom: 20px;
      
      .el-statistic {
        text-align: center;
      }
    }
    
    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
  }
  
  .details-section {
    .data-table {
      .el-table {
        margin-top: 10px;
      }
    }
    
    .settings-view {
      margin-top: 10px;
    }
  }
  
  .json-preview {
    .el-input {
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style> 