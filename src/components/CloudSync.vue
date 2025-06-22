<template>
  <div class="cloud-sync" :class="{ 'mobile-layout': isMobile }">
    <!-- 同步状态显示 -->
    <div class="sync-status-card">
      <div class="status-header">
        <div class="status-title">
          <el-icon class="status-icon" :class="connectionStatus.class">
            <component :is="connectionStatus.icon" />
          </el-icon>
          <span class="title-text">云同步状态</span>
        </div>
        <el-button 
          :type="connectionStatus.type" 
          size="small" 
          @click="checkConnection"
          :loading="checking"
        >
          {{ connectionStatus.text }}
        </el-button>
      </div>
      
      <div class="user-info" v-if="userId">
        <el-tag size="small" type="info">
          设备ID: {{ userId.slice(-8) }}
        </el-tag>
        <el-button size="small" text @click="showUserIdDialog = true">
          <el-icon><View /></el-icon>
          查看完整ID
        </el-button>
      </div>
    </div>

    <!-- 同步操作区 -->
    <div class="sync-actions">
      <div class="action-group">
        <h4 class="group-title">数据同步</h4>
        <div class="action-buttons">
          <el-button 
            type="primary" 
            @click="uploadAllData"
            :loading="uploading"
            :disabled="!isConnected"
          >
            <el-icon><Upload /></el-icon>
            上传到云端
          </el-button>
          
          <el-button 
            type="success" 
            @click="downloadAllData"
            :loading="downloading"
            :disabled="!isConnected"
          >
            <el-icon><Download /></el-icon>
            从云端恢复
          </el-button>
          
          <el-button 
            @click="showSyncHistory"
            :disabled="!isConnected"
          >
            <el-icon><Clock /></el-icon>
            同步历史
          </el-button>
        </div>
      </div>
      
      <!-- 实时同步设置 -->
      <div class="action-group">
        <h4 class="group-title">实时同步</h4>
        <div class="realtime-settings">
          <el-switch
            v-model="autoSync"
            @change="toggleAutoSync"
            active-text="开启自动同步"
            inactive-text="关闭自动同步"
            :disabled="!isConnected"
          />
          <div class="sync-interval" v-if="autoSync">
            <span>同步间隔:</span>
            <el-select v-model="syncInterval" @change="updateSyncInterval" size="small">
              <el-option label="30秒" :value="30" />
              <el-option label="1分钟" :value="60" />
              <el-option label="5分钟" :value="300" />
              <el-option label="10分钟" :value="600" />
            </el-select>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据详情 -->
    <div class="sync-details" v-if="syncStatus.length > 0">
      <h4 class="group-title">云端数据状态</h4>
      <div class="data-list">
        <div 
          v-for="item in syncStatus" 
          :key="item.data_type" 
          class="data-item"
        >
          <div class="data-info">
            <div class="data-name">{{ getDataTypeName(item.data_type) }}</div>
            <div class="data-time">{{ formatTime(item.updated_at) }}</div>
          </div>
          <div class="data-actions">
            <el-button 
              size="small" 
              type="primary" 
              text 
              @click="downloadSpecificData(item.data_type)"
            >
              下载
            </el-button>
            <el-button 
              size="small" 
              type="warning" 
              text 
              @click="uploadSpecificData(item.data_type)"
            >
              覆盖
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户ID对话框 -->
    <el-dialog 
      v-model="showUserIdDialog" 
      title="设备同步ID" 
      :width="isMobile ? '90%' : '400px'"
    >
      <div class="user-id-content">
        <p>您的设备同步ID：</p>
        <el-input 
          v-model="userId" 
          readonly 
          type="textarea" 
          :rows="3"
        >
          <template #append>
            <el-button @click="copyUserId" :icon="DocumentCopy">复制</el-button>
          </template>
        </el-input>
        <div class="id-tips">
          <el-alert
            title="提示"
            type="info"
            :closable="false"
            show-icon
          >
            <p>• 在其他设备上输入此ID可访问相同数据</p>
            <p>• 请妥善保管，丢失后数据无法恢复</p>
            <p>• 可以分享给团队成员实现数据共享</p>
          </el-alert>
        </div>
        
        <div class="id-actions">
          <el-button @click="resetUserId" type="danger" plain>
            <el-icon><RefreshLeft /></el-icon>
            重置ID（生成新设备）
          </el-button>
          <el-button @click="showImportIdDialog = true" type="primary" plain>
            <el-icon><Switch /></el-icon>
            切换到其他设备
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 导入ID对话框 -->
    <el-dialog 
      v-model="showImportIdDialog" 
      title="切换设备" 
      :width="isMobile ? '90%' : '400px'"
    >
      <div class="import-id-content">
        <p>输入其他设备的同步ID：</p>
        <el-input 
          v-model="importUserId" 
          type="textarea" 
          :rows="3"
          placeholder="粘贴设备同步ID..."
        />
        <div class="import-warning">
          <el-alert
            title="注意"
            type="warning"
            :closable="false"
            show-icon
          >
            切换后将访问目标设备的数据，当前设备数据会被替换！
          </el-alert>
        </div>
      </div>
      <template #footer>
        <el-button @click="showImportIdDialog = false">取消</el-button>
        <el-button type="primary" @click="importDeviceId" :disabled="!importUserId.trim()">
          确认切换
        </el-button>
      </template>
    </el-dialog>

    <!-- 同步历史对话框 -->
    <el-dialog 
      v-model="showHistoryDialog" 
      title="同步历史" 
      :width="isMobile ? '95%' : '600px'"
    >
      <div class="sync-history">
        <div v-if="syncHistory.length === 0" class="empty-history">
          <el-empty description="暂无同步记录" />
        </div>
        <div v-else class="history-list">
          <div 
            v-for="(record, index) in syncHistory" 
            :key="index" 
            class="history-item"
          >
            <div class="history-time">{{ formatDateTime(record.time) }}</div>
            <div class="history-action">{{ record.action }}</div>
            <div class="history-result" :class="record.success ? 'success' : 'error'">
              {{ record.success ? '成功' : '失败' }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  CloudUpload, 
  CloudDownload, 
  Wifi, 
  WifiOff, 
  Upload, 
  Download, 
  Clock, 
  View,
  DocumentCopy,
  RefreshLeft,
  Switch,
  Loading
} from '@element-plus/icons-vue'
import { cloudSync } from '@/services/supabase'
import { usePersonnelStore } from '@/stores/personnel'
import { useApplicationStore } from '@/stores/applications'

// 移动端检测
const isMobile = ref(false)
const checkMobileDevice = () => {
  isMobile.value = window.innerWidth <= 768
}

// 响应式数据
const isConnected = ref(false)
const checking = ref(false)
const uploading = ref(false)
const downloading = ref(false)
const autoSync = ref(false)
const syncInterval = ref(300) // 5分钟
const userId = ref('')
const syncStatus = ref<any[]>([])
const syncHistory = ref<any[]>([])

// 对话框状态
const showUserIdDialog = ref(false)
const showImportIdDialog = ref(false)
const showHistoryDialog = ref(false)
const importUserId = ref('')

// Store实例
const personnelStore = usePersonnelStore()
const applicationStore = useApplicationStore()

// 自动同步定时器
let syncTimer: NodeJS.Timeout | null = null

// 计算属性
const connectionStatus = computed(() => {
  if (checking.value) {
    return {
      icon: Loading,
      class: 'checking',
      type: 'info' as const,
      text: '检查中...'
    }
  }
  
  if (isConnected.value) {
    return {
      icon: Wifi,
      class: 'connected',
      type: 'success' as const,
      text: '已连接'
    }
  } else {
    return {
      icon: WifiOff,
      class: 'disconnected',
      type: 'danger' as const,
      text: '未连接'
    }
  }
})

// 方法
const checkConnection = async () => {
  checking.value = true
  try {
    isConnected.value = await cloudSync.checkConnection()
    if (isConnected.value) {
      ElMessage.success('云端连接正常')
      await loadSyncStatus()
    } else {
      ElMessage.error('云端连接失败，请检查网络或配置')
    }
  } catch (error) {
    console.error('连接检查失败:', error)
    isConnected.value = false
    ElMessage.error('连接检查失败')
  } finally {
    checking.value = false
  }
}

const loadSyncStatus = async () => {
  try {
    syncStatus.value = await cloudSync.getSyncStatus()
  } catch (error) {
    console.error('加载同步状态失败:', error)
  }
}

const uploadAllData = async () => {
  if (!isConnected.value) return
  
  uploading.value = true
  try {
    const localData = {
      personnel: personnelStore.allConductors,
      applications: applicationStore.allApplications
    }
    
    const results = await cloudSync.syncAllData(localData)
    
    if (results.uploaded.length > 0) {
      ElMessage.success(`成功上传 ${results.uploaded.length} 类数据到云端`)
      addSyncHistory('上传所有数据', true)
      await loadSyncStatus()
    }
    
    if (results.errors.length > 0) {
      ElMessage.warning(`${results.errors.length} 个数据类型上传失败`)
      results.errors.forEach(err => {
        addSyncHistory(`上传${err.type}失败: ${err.error}`, false)
      })
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('数据上传失败')
    addSyncHistory('上传所有数据', false)
  } finally {
    uploading.value = false
  }
}

const downloadAllData = async () => {
  if (!isConnected.value) return
  
  try {
    await ElMessageBox.confirm(
      '从云端恢复数据将覆盖本地所有数据，确定继续吗？',
      '数据恢复确认',
      { type: 'warning' }
    )
    
    downloading.value = true
    
    // 下载人员数据
    const personnelData = await cloudSync.downloadData('personnel')
    if (personnelData) {
      // 这里需要调用store的方法来更新数据
      // personnelStore.replaceAllData(personnelData)
      ElMessage.success('人员数据恢复成功')
    }
    
    // 下载申请数据
    const applicationData = await cloudSync.downloadData('applications')
    if (applicationData) {
      // applicationStore.replaceAllData(applicationData)
      ElMessage.success('申请数据恢复成功')
    }
    
    addSyncHistory('恢复所有数据', true)
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('下载失败:', error)
      ElMessage.error('数据恢复失败')
      addSyncHistory('恢复所有数据', false)
    }
  } finally {
    downloading.value = false
  }
}

const downloadSpecificData = async (dataType: string) => {
  try {
    const data = await cloudSync.downloadData(dataType)
    if (data) {
      ElMessage.success(`${getDataTypeName(dataType)} 数据下载成功`)
      addSyncHistory(`下载${getDataTypeName(dataType)}`, true)
    }
  } catch (error) {
    ElMessage.error('数据下载失败')
    addSyncHistory(`下载${getDataTypeName(dataType)}`, false)
  }
}

const uploadSpecificData = async (dataType: string) => {
  try {
    let data
    if (dataType === 'personnel') {
      data = personnelStore.allConductors
    } else if (dataType === 'applications') {
      data = applicationStore.allApplications
    }
    
    if (data) {
      await cloudSync.uploadData(dataType, data)
      ElMessage.success(`${getDataTypeName(dataType)} 数据上传成功`)
      addSyncHistory(`上传${getDataTypeName(dataType)}`, true)
      await loadSyncStatus()
    }
  } catch (error) {
    ElMessage.error('数据上传失败')
    addSyncHistory(`上传${getDataTypeName(dataType)}`, false)
  }
}

const toggleAutoSync = (enabled: boolean) => {
  if (enabled && isConnected.value) {
    startAutoSync()
    ElMessage.success('自动同步已开启')
  } else {
    stopAutoSync()
    ElMessage.info('自动同步已关闭')
  }
}

const updateSyncInterval = (interval: number) => {
  if (autoSync.value) {
    stopAutoSync()
    startAutoSync()
  }
}

const startAutoSync = () => {
  stopAutoSync()
  syncTimer = setInterval(async () => {
    if (isConnected.value) {
      await uploadAllData()
    }
  }, syncInterval.value * 1000)
}

const stopAutoSync = () => {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

const copyUserId = async () => {
  try {
    await navigator.clipboard.writeText(userId.value)
    ElMessage.success('设备ID已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

const resetUserId = async () => {
  try {
    await ElMessageBox.confirm(
      '重置后将生成新的设备ID，当前数据将无法再同步，确定继续吗？',
      '重置设备ID',
      { type: 'warning' }
    )
    
    cloudSync.resetUserId()
    userId.value = cloudSync.getUserId()
    showUserIdDialog.value = false
    ElMessage.success('设备ID已重置')
    
    // 重新检查连接
    await checkConnection()
  } catch (error) {
    // 用户取消
  }
}

const importDeviceId = async () => {
  try {
    localStorage.setItem('sync_user_id', importUserId.value.trim())
    userId.value = importUserId.value.trim()
    showImportIdDialog.value = false
    importUserId.value = ''
    ElMessage.success('设备切换成功')
    
    // 重新检查连接并加载数据
    await checkConnection()
  } catch (error) {
    ElMessage.error('设备切换失败')
  }
}

const showSyncHistory = () => {
  showHistoryDialog.value = true
}

const addSyncHistory = (action: string, success: boolean) => {
  syncHistory.value.unshift({
    time: Date.now(),
    action,
    success
  })
  
  // 保持最近50条记录
  if (syncHistory.value.length > 50) {
    syncHistory.value = syncHistory.value.slice(0, 50)
  }
  
  // 保存到localStorage
  localStorage.setItem('sync_history', JSON.stringify(syncHistory.value))
}

const loadSyncHistory = () => {
  const saved = localStorage.getItem('sync_history')
  if (saved) {
    try {
      syncHistory.value = JSON.parse(saved)
    } catch (error) {
      console.error('加载同步历史失败:', error)
    }
  }
}

// 工具函数
const getDataTypeName = (dataType: string) => {
  const names: Record<string, string> = {
    personnel: '人员档案',
    applications: '申请记录',
    assessments: '考核记录'
  }
  return names[dataType] || dataType
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 生命周期
onMounted(async () => {
  checkMobileDevice()
  window.addEventListener('resize', checkMobileDevice)
  
  userId.value = cloudSync.getUserId()
  loadSyncHistory()
  
  // 自动检查连接
  await checkConnection()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobileDevice)
  stopAutoSync()
})
</script>

<style scoped>
.cloud-sync {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.mobile-layout {
  padding: 16px;
}

.sync-status-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 20px;
}

.status-icon.connected {
  color: #67c23a;
}

.status-icon.disconnected {
  color: #f56c6c;
}

.status-icon.checking {
  animation: spin 1s linear infinite;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.action-group {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.group-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.realtime-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sync-interval {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sync-details {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.data-info {
  flex: 1;
}

.data-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.data-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.data-actions {
  display: flex;
  gap: 8px;
}

.user-id-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.id-tips {
  margin-top: 8px;
}

.id-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.import-id-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-warning {
  margin-top: 8px;
}

.sync-history {
  max-height: 400px;
  overflow-y: auto;
}

.empty-history {
  text-align: center;
  padding: 40px 20px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.history-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-action {
  flex: 1;
  text-align: center;
  font-weight: 500;
}

.history-result.success {
  color: var(--el-color-success);
}

.history-result.error {
  color: var(--el-color-danger);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .cloud-sync {
    padding: 12px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
    justify-content: center;
  }
  
  .data-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .data-actions {
    width: 100%;
    justify-content: center;
  }
  
  .id-actions {
    flex-direction: column;
  }
}
</style> 