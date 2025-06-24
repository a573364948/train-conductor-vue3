import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cloudSync, type SyncResponse } from '@/services/cloudSync'
import { useMainStore } from '@/stores'

export function useCloudSync() {
  const mainStore = useMainStore()
  
  // 响应式状态
  const isSyncing = ref(false)
  const isAutoSyncEnabled = ref(false)
  const syncStatus = ref(cloudSync.getSyncStatus())
  const lastSyncResult = ref<SyncResponse | null>(null)

  // 计算属性
  const canSync = computed(() => !isSyncing.value && mainStore.database)
  const syncStatusText = computed(() => {
    if (isSyncing.value) return '同步中...'
    if (!lastSyncResult.value) return '未同步'
    if (lastSyncResult.value.success) return '同步成功'
    return '同步失败'
  })

  /**
   * 手动上传数据到云端
   */
  const uploadToCloud = async () => {
    if (!canSync.value) {
      ElMessage.warning('数据未准备好或正在同步中')
      return false
    }

    try {
      isSyncing.value = true
      
      const result = await cloudSync.uploadData(mainStore.database)
      lastSyncResult.value = result
      updateSyncStatus()

      if (result.success) {
        ElMessage.success('数据上传成功')
        return true
      } else {
        ElMessage.error(`上传失败: ${result.message}`)
        return false
      }
    } catch (error: any) {
      ElMessage.error(`上传异常: ${error.message}`)
      return false
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * 从云端下载数据
   */
  const downloadFromCloud = async () => {
    if (isSyncing.value) {
      ElMessage.warning('正在同步中，请稍候')
      return false
    }

    try {
      isSyncing.value = true
      
      const result = await cloudSync.downloadData()
      lastSyncResult.value = result
      updateSyncStatus()

      if (result.success && result.data) {
        // 询问用户是否覆盖本地数据
        const confirm = await ElMessageBox.confirm(
          `发现云端数据(${new Date(result.timestamp!).toLocaleString()})，是否覆盖本地数据？`,
          '云端数据同步',
          {
            confirmButtonText: '覆盖本地',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).catch(() => false)

        if (confirm) {
          mainStore.database = result.data
          await mainStore.saveDatabase()
          ElMessage.success('云端数据已同步到本地')
          return true
        }
      } else if (!result.success) {
        ElMessage.error(`下载失败: ${result.message}`)
      }
      
      return false
    } catch (error: any) {
      ElMessage.error(`下载异常: ${error.message}`)
      return false
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * 智能同步（带冲突检测）
   */
  const smartSync = async () => {
    if (!canSync.value) {
      ElMessage.warning('数据未准备好或正在同步中')
      return false
    }

    try {
      isSyncing.value = true
      
      const localTimestamp = mainStore.database?.lastUpdated || Date.now()
      const result = await cloudSync.smartSync(mainStore.database, localTimestamp)
      lastSyncResult.value = result
      updateSyncStatus()

      if (result.success) {
        ElMessage.success('智能同步完成')
        return true
      } else if (result.message?.includes('冲突')) {
        // 处理数据冲突
        const resolution = await handleSyncConflict(result)
        return resolution
      } else {
        ElMessage.error(`同步失败: ${result.message}`)
        return false
      }
    } catch (error: any) {
      ElMessage.error(`同步异常: ${error.message}`)
      return false
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * 处理同步冲突
   */
  const handleSyncConflict = async (conflictResult: SyncResponse): Promise<boolean> => {
    try {
      const action = await ElMessageBox.confirm(
        `检测到数据冲突！\n\n本地数据可能已过时，云端有更新的数据(${new Date(conflictResult.serverTimestamp!).toLocaleString()})。\n\n请选择处理方式：`,
        '数据冲突',
        {
          distinguishCancelAndClose: true,
          confirmButtonText: '使用云端数据',
          cancelButtonText: '保留本地数据',
          type: 'warning'
        }
      )

      if (action === 'confirm' && conflictResult.serverData) {
        // 使用云端数据
        mainStore.database = conflictResult.serverData
        await mainStore.saveDatabase()
        ElMessage.success('已使用云端数据覆盖本地')
        return true
      } else {
        // 强制上传本地数据
        return await uploadToCloud()
      }
    } catch {
      // 用户取消，不做任何操作
      return false
    }
  }

  /**
   * 切换自动同步
   */
  const toggleAutoSync = async (enabled: boolean) => {
    isAutoSyncEnabled.value = enabled
    
    if (enabled) {
      cloudSync.updateConfig({ autoSync: true })
      cloudSync.startAutoSync(handleAutoSyncResult)
      ElMessage.success('自动同步已开启')
    } else {
      cloudSync.updateConfig({ autoSync: false })
      cloudSync.stopAutoSync()
      ElMessage.info('自动同步已关闭')
    }
  }

  /**
   * 处理自动同步结果
   */
  const handleAutoSyncResult = (result: SyncResponse) => {
    lastSyncResult.value = result
    updateSyncStatus()
    
    if (result.success && result.data) {
      // 静默同步云端数据（不覆盖本地数据，只提示）
      console.log('🔄 检测到云端数据更新')
      // 可以在这里添加一个小提示，告知用户云端有更新
    } else if (!result.success && !result.message?.includes('暂无数据')) {
      console.warn('自动同步失败:', result.message)
    }
  }

  /**
   * 更新同步状态
   */
  const updateSyncStatus = () => {
    syncStatus.value = cloudSync.getSyncStatus()
  }

  /**
   * 设置同步间隔
   */
  const setSyncInterval = (minutes: number) => {
    cloudSync.updateConfig({ syncInterval: minutes })
    updateSyncStatus()
    
    if (isAutoSyncEnabled.value) {
      // 重启自动同步应用新间隔
      cloudSync.stopAutoSync()
      cloudSync.startAutoSync(handleAutoSyncResult)
    }
    
    ElMessage.success(`同步间隔已设置为 ${minutes} 分钟`)
  }

  /**
   * 获取同步历史（简单版本）
   */
  const getSyncHistory = () => {
    return {
      lastSync: syncStatus.value.lastSyncTime,
      lastResult: lastSyncResult.value,
      deviceId: syncStatus.value.deviceId
    }
  }

  // 生命周期
  onMounted(() => {
    updateSyncStatus()
    
    // 检查是否启用了自动同步
    const config = cloudSync.getSyncStatus()
    if (config.isAutoSyncActive) {
      isAutoSyncEnabled.value = true
    }
  })

  onUnmounted(() => {
    // 组件卸载时停止自动同步
    cloudSync.stopAutoSync()
  })

  return {
    // 状态
    isSyncing: readonly(isSyncing),
    isAutoSyncEnabled: readonly(isAutoSyncEnabled),
    syncStatus: readonly(syncStatus),
    lastSyncResult: readonly(lastSyncResult),
    
    // 计算属性
    canSync,
    syncStatusText,
    
    // 方法
    uploadToCloud,
    downloadFromCloud,
    smartSync,
    toggleAutoSync,
    setSyncInterval,
    updateSyncStatus,
    getSyncHistory
  }
}

// 导出只读的ref
function readonly<T>(ref: import('vue').Ref<T>) {
  return computed(() => ref.value)
}