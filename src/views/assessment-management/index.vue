<template>
  <div class="assessment-management-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>考核记录管理</h2>
      <div class="header-actions">
        <el-button @click="refreshAllData" :loading="refreshing">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- Tab页面 -->
    <el-tabs 
      v-model="activeTab" 
      @tab-change="handleTabChange" 
      class="management-tabs"
      type="border-card"
    >
      <!-- 记录管理Tab -->
      <el-tab-pane label="记录管理" name="management">
        <template #label>
          <div class="tab-label">
            <el-icon><Document /></el-icon>
            <span>记录管理</span>
          </div>
        </template>
        <RecordManagement ref="recordManagementRef" />
      </el-tab-pane>
      
      <!-- 数据导入Tab -->
      <el-tab-pane label="数据导入" name="import">
        <template #label>
          <div class="tab-label">
            <el-icon><Upload /></el-icon>
            <span>数据导入</span>
          </div>
        </template>
        <DataImport @import-success="handleImportSuccess" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Document, Upload } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import RecordManagement from './components/RecordManagement.vue'
import DataImport from './components/DataImport.vue'
import type { TabPaneName } from 'element-plus'

const mainStore = useMainStore()

// 状态
const activeTab = ref<string>('management')
const refreshing = ref(false)
const recordManagementRef = ref()

// Tab状态持久化
const TAB_STORAGE_KEY = 'assessment-management-active-tab'

// 方法
const handleTabChange = (tabName: TabPaneName) => {
  // 保存Tab状态到localStorage
  localStorage.setItem(TAB_STORAGE_KEY, String(tabName))
}

const handleImportSuccess = async (data: { year: number, month: number, recordCount: number }) => {
  ElMessage.success(`成功导入${data.year}年${data.month}月的${data.recordCount}条记录`)
  
  // 导入成功后刷新记录管理Tab的数据
  if (recordManagementRef.value?.refreshData) {
    await recordManagementRef.value.refreshData()
  }
  
  // 自动切换到记录管理Tab
  activeTab.value = 'management'
  localStorage.setItem(TAB_STORAGE_KEY, 'management')
}

const refreshAllData = async () => {
  refreshing.value = true
  try {
    await mainStore.loadDatabase()
    
    // 刷新当前Tab的数据
    if (activeTab.value === 'management' && recordManagementRef.value?.refreshData) {
      await recordManagementRef.value.refreshData()
    }
    
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 初始化
onMounted(() => {
  // 恢复Tab状态
  const savedTab = localStorage.getItem(TAB_STORAGE_KEY)
  if (savedTab && ['management', 'import'].includes(savedTab)) {
    activeTab.value = savedTab
  }
  
  // 初始化数据
  if (!mainStore.database) {
    mainStore.loadDatabase()
  }
})
</script>

<style lang="scss" scoped>
.assessment-management-container {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    
    h2 {
      margin: 0;
      color: var(--text-primary);
      font-size: 24px;
      font-weight: 600;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
  }
  
  .management-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 0;
      background: var(--bg-white);
      border-radius: 8px 8px 0 0;
    }
    
    :deep(.el-tabs__content) {
      padding: 0;
      background: transparent;
    }
    
    :deep(.el-tab-pane) {
      min-height: 500px;
    }
    
    .tab-label {
      display: flex;
      align-items: center;
      gap: 6px;
      
      .el-icon {
        font-size: 16px;
      }
      
      span {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }
}

// 全局Tab样式优化
:deep(.el-tabs--border-card) {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  
  .el-tabs__nav {
    border: none;
  }
  
  .el-tabs__item {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-weight: 500;
    transition: all 0.3s ease;
    
    &.is-active {
      background: var(--el-color-primary);
      color: white;
      border-radius: 6px 6px 0 0;
    }
    
    &:hover:not(.is-active) {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }
  }
  
  .el-tabs__content {
    border: none;
    padding: 24px;
    background: var(--bg-white);
    border-radius: 0 0 8px 8px;
    min-height: 600px;
  }
}
</style> 