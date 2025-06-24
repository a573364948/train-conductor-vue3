<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="人员管理数据备份"
    width="600px"
    @closed="resetDialog"
  >
    <el-tabs v-model="activeTab" class="backup-tabs">
      <!-- 创建备份 -->
      <el-tab-pane label="创建备份" name="backup">
        <div class="backup-section">
          <el-form :model="backupOptions" label-width="120px">
            <el-form-item label="备份描述">
              <el-input 
                v-model="backupOptions.description"
                placeholder="可选：为此备份添加描述信息"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="备份内容">
              <div class="backup-options">
                <el-checkbox 
                  v-model="backupOptions.includePersonnel"
                  :disabled="loading"
                >
                  <div class="option-item">
                    <el-icon><User /></el-icon>
                    <span class="option-label">人员档案</span>
                    <span class="option-desc">增强的人员档案数据</span>
                  </div>
                </el-checkbox>
                
                <el-checkbox 
                  v-model="backupOptions.includeChanges"
                  :disabled="loading"
                >
                  <div class="option-item">
                    <el-icon><RefreshLeft /></el-icon>
                    <span class="option-label">异动记录</span>
                    <span class="option-desc">人员状态变更历史</span>
                  </div>
                </el-checkbox>
                
                <el-checkbox 
                  v-model="backupOptions.includeApplications"
                  :disabled="loading"
                >
                  <div class="option-item">
                    <el-icon><DocumentCopy /></el-icon>
                    <span class="option-label">申请记录</span>
                    <span class="option-desc">启用、免职等申请数据</span>
                  </div>
                </el-checkbox>
                
                <el-checkbox 
                  v-model="backupOptions.includeSettings"
                  :disabled="loading"
                >
                  <div class="option-item">
                    <el-icon><Setting /></el-icon>
                    <span class="option-label">申请设置</span>
                    <span class="option-desc">申请流程相关配置</span>
                  </div>
                </el-checkbox>
                
                <el-divider>高级选项</el-divider>
                
                <el-checkbox 
                  v-model="backupOptions.includeLegacyData"
                  :disabled="loading"
                >
                  <div class="option-item">
                    <el-icon><Files /></el-icon>
                    <span class="option-label">兼容数据</span>
                    <span class="option-desc">旧系统的基础人员数据</span>
                  </div>
                </el-checkbox>
                
                <el-checkbox 
                  v-model="backupOptions.includeMonthlyData"
                  :disabled="loading"
                >
                  <div class="option-item">
                    <el-icon><Calendar /></el-icon>
                    <span class="option-label">月度数据</span>
                    <span class="option-desc">月度考核和统计数据</span>
                  </div>
                </el-checkbox>
              </div>
            </el-form-item>
          </el-form>
          
          <!-- 预估信息 -->
          <div class="backup-preview" v-if="backupPreview">
            <el-alert
              :title="backupPreview.title"
              :description="backupPreview.description"
              type="info"
              show-icon
              :closable="false"
            />
          </div>
          
          <!-- 快速选择 -->
          <div class="quick-select">
            <el-button-group>
              <el-button 
                size="small" 
                @click="selectDefaultOptions"
                :disabled="loading"
              >
                默认备份
              </el-button>
              <el-button 
                size="small" 
                @click="selectFullOptions"
                :disabled="loading"
              >
                完整备份
              </el-button>
              <el-button 
                size="small" 
                @click="clearAllOptions"
                :disabled="loading"
              >
                清除选择
              </el-button>
            </el-button-group>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- 恢复备份 -->
      <el-tab-pane label="恢复备份" name="restore">
        <div class="restore-section">
          <el-upload
            ref="uploadRef"
            class="backup-upload"
            drag
            accept=".json"
            :auto-upload="false"
            :on-change="handleFileSelect"
            :limit="1"
            :show-file-list="false"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将备份文件拖拽到此处，或<em>点击选择文件</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                只支持 .json 格式的人员管理备份文件
              </div>
            </template>
          </el-upload>
          
          <!-- 备份文件预览 -->
          <div v-if="selectedBackupFile" class="backup-file-info">
            <el-card class="preview-card">
              <template #header>
                <div class="card-header">
                  <span>📄 {{ selectedBackupFile.name }}</span>
                  <el-button 
                    type="text" 
                    size="small" 
                    @click="clearSelectedFile"
                    :disabled="loading"
                  >
                    移除
                  </el-button>
                </div>
              </template>
              
              <div v-if="restorePreview" class="restore-preview">
                <div v-for="line in restorePreview" :key="line" class="preview-line">
                  {{ line }}
                </div>
              </div>
              
              <div v-else class="loading-preview">
                <el-icon><Loading /></el-icon>
                <span>正在解析备份文件...</span>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false" :disabled="loading">
          取消
        </el-button>
        
        <template v-if="activeTab === 'backup'">
          <el-button 
            type="primary" 
            @click="createBackup"
            :loading="loading"
            :disabled="!hasSelectedOptions"
          >
            <el-icon><Download /></el-icon>
            创建并下载备份
          </el-button>
        </template>
        
        <template v-if="activeTab === 'restore'">
          <el-button 
            type="warning" 
            @click="restoreBackup"
            :loading="loading"
            :disabled="!selectedBackupFile"
          >
            <el-icon><RefreshRight /></el-icon>
            恢复备份数据
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { 
  User, 
  RefreshLeft, 
  DocumentCopy, 
  Setting, 
  Files, 
  Calendar,
  Download,
  UploadFilled,
  Loading,
  RefreshRight
} from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import { PersonnelBackupManager, type BackupOptions, type PersonnelBackupData } from '@/utils/personnelBackup'

// Props & Emits
interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'backup-created'): void
  (e: 'backup-restored'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Store
const mainStore = useMainStore()

// 响应式数据
const activeTab = ref('backup')
const loading = ref(false)
const uploadRef = ref()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 备份选项
const backupOptions = ref<BackupOptions>(PersonnelBackupManager.getDefaultBackupOptions())

// 文件相关
const selectedBackupFile = ref<File | null>(null)
const restorePreview = ref<string[] | null>(null)

// 计算属性
const hasSelectedOptions = computed(() => {
  return backupOptions.value.includePersonnel ||
         backupOptions.value.includeChanges ||
         backupOptions.value.includeApplications ||
         backupOptions.value.includeSettings ||
         backupOptions.value.includeLegacyData ||
         backupOptions.value.includeMonthlyData
})

const backupPreview = computed(() => {
  if (!hasSelectedOptions.value || !mainStore.database) return null
  
  const stats = {
    personnel: mainStore.database.enhancedConductors ? Object.keys(mainStore.database.enhancedConductors).length : 0,
    changes: mainStore.database.personnelChanges ? mainStore.database.personnelChanges.length : 0,
    applications: mainStore.database.applications ? mainStore.database.applications.length : 0,
    monthly: mainStore.database.monthlyData ? mainStore.database.monthlyData.length : 0
  }
  
  const selectedCount = [
    backupOptions.value.includePersonnel,
    backupOptions.value.includeChanges,
    backupOptions.value.includeApplications,
    backupOptions.value.includeSettings,
    backupOptions.value.includeLegacyData,
    backupOptions.value.includeMonthlyData
  ].filter(Boolean).length
  
  return {
    title: `将备份 ${selectedCount} 类数据`,
    description: `人员档案: ${backupOptions.value.includePersonnel ? stats.personnel : 0} 人 | 异动记录: ${backupOptions.value.includeChanges ? stats.changes : 0} 条 | 申请记录: ${backupOptions.value.includeApplications ? stats.applications : 0} 条`
  }
})

// 方法
const resetDialog = () => {
  activeTab.value = 'backup'
  backupOptions.value = PersonnelBackupManager.getDefaultBackupOptions()
  selectedBackupFile.value = null
  restorePreview.value = null
  loading.value = false
}

const selectDefaultOptions = () => {
  backupOptions.value = PersonnelBackupManager.getDefaultBackupOptions()
}

const selectFullOptions = () => {
  backupOptions.value = PersonnelBackupManager.getFullBackupOptions()
}

const clearAllOptions = () => {
  Object.keys(backupOptions.value).forEach(key => {
    if (key !== 'description') {
      (backupOptions.value as any)[key] = false
    }
  })
}

// 创建备份
const createBackup = async () => {
  if (!mainStore.database) {
    ElMessage.error('数据库未加载')
    return
  }
  
  try {
    loading.value = true
    
    // 创建备份数据
    const backupData = PersonnelBackupManager.createBackup(mainStore.database, backupOptions.value)
    
    // 导出备份文件
    await PersonnelBackupManager.exportBackup(backupData)
    
    emit('backup-created')
    dialogVisible.value = false
    
  } catch (error) {
    console.error('创建备份失败:', error)
  } finally {
    loading.value = false
  }
}

// 文件选择处理
const handleFileSelect = async (file: any) => {
  selectedBackupFile.value = file.raw
  restorePreview.value = null
  
  try {
    // 解析备份文件预览
    const backupData = await PersonnelBackupManager.importBackup(file.raw)
    restorePreview.value = PersonnelBackupManager.getBackupPreview(backupData)
  } catch (error) {
    selectedBackupFile.value = null
    ElMessage.error('备份文件格式不正确')
  }
}

const clearSelectedFile = () => {
  selectedBackupFile.value = null
  restorePreview.value = null
  uploadRef.value?.clearFiles()
}

// 恢复备份
const restoreBackup = async () => {
  if (!selectedBackupFile.value || !mainStore.database) {
    ElMessage.error('请选择备份文件')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '恢复备份将覆盖当前的人员管理数据，此操作无法撤销。确定要继续吗？',
      '确认恢复备份',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    
    loading.value = true
    
    // 导入并恢复备份数据
    const backupData = await PersonnelBackupManager.importBackup(selectedBackupFile.value)
    const restoredDatabase = await PersonnelBackupManager.restoreBackup(backupData, mainStore.database)
    
    // 保存到数据库
    mainStore.database = restoredDatabase
    await mainStore.saveDatabase()
    
    ElNotification.success({
      title: '备份恢复成功',
      message: '人员管理数据已恢复，页面将自动刷新',
      duration: 3000
    })
    
    emit('backup-restored')
    dialogVisible.value = false
    
    // 刷新页面以重新加载数据
    setTimeout(() => {
      window.location.reload()
    }, 1000)
    
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('恢复备份失败:', error)
      ElMessage.error('备份恢复失败')
    }
  } finally {
    loading.value = false
  }
}

// 监听tab切换，清理状态
watch(activeTab, () => {
  if (activeTab.value === 'backup') {
    clearSelectedFile()
  }
})
</script>

<style lang="scss" scoped>
.backup-tabs {
  :deep(.el-tabs__content) {
    padding-top: 16px;
  }
}

.backup-section {
  .backup-options {
    .option-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      
      .el-icon {
        color: var(--el-color-primary);
        font-size: 16px;
      }
      
      .option-label {
        font-weight: 500;
        color: var(--el-text-color-primary);
        min-width: 80px;
      }
      
      .option-desc {
        color: var(--el-text-color-regular);
        font-size: 12px;
      }
    }
    
    .el-checkbox {
      display: block;
      margin: 8px 0;
      width: 100%;
      
      :deep(.el-checkbox__label) {
        width: 100%;
      }
    }
  }
  
  .backup-preview {
    margin: 16px 0;
  }
  
  .quick-select {
    margin-top: 16px;
    text-align: center;
  }
}

.restore-section {
  .backup-upload {
    margin-bottom: 16px;
    
    :deep(.el-upload-dragger) {
      border-radius: 8px;
    }
  }
  
  .backup-file-info {
    .preview-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .restore-preview {
        .preview-line {
          padding: 2px 0;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.4;
          
          &:empty {
            height: 8px;
          }
        }
      }
      
      .loading-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px;
        color: var(--el-text-color-regular);
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style> 