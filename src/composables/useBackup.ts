import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import * as pako from 'pako'
import { useMainStore } from '@/stores'
import { db, STORES } from '@/api/database'

export interface Backup {
  id: string
  name: string
  type: 'auto' | 'manual'
  timestamp: number
  size: number
  data: string
  checksum: string
}

export function useBackup() {
  const mainStore = useMainStore()
  const isBackingUp = ref(false)
  const backupList = ref<Backup[]>([])
  const lastBackupTime = ref<number>(0)
  
  let backupInterval: number | null = null
  
  // 备份设置
  const BACKUP_INTERVAL = 30 * 60 * 1000 // 30分钟
  const MAX_BACKUPS = 20 // 最多保留20个备份
  const MAX_BACKUP_DAYS = 7 // 最多保留7天
  
  // 计算校验和
  const calculateChecksum = (data: string): string => {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }
  
  // 压缩数据
  const compressData = (data: string): string => {
    try {
      const compressed = pako.deflate(data)
      // 使用更安全的方式转换为base64，避免栈溢出
      let binary = ''
      for (let i = 0; i < compressed.length; i++) {
        binary += String.fromCharCode(compressed[i])
      }
      return btoa(binary)
    } catch (error) {
      console.error('数据压缩失败:', error)
      // 如果压缩失败，返回原始数据的base64编码
      return btoa(unescape(encodeURIComponent(data)))
    }
  }
  
  // 解压数据
  const decompressData = (compressed: string): string => {
    try {
      const binary = atob(compressed)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const decompressed = pako.inflate(bytes)
      return new TextDecoder().decode(decompressed)
    } catch (error) {
      console.error('数据解压失败:', error)
      // 如果解压失败，尝试直接解码base64
      try {
        return decodeURIComponent(escape(atob(compressed)))
      } catch (e) {
        throw new Error('数据解压失败')
      }
    }
  }
  
  // 检查数据是否与最近的备份完全一致
  const isDataIdenticalToLastBackup = async (currentData: string): Promise<boolean> => {
    try {
      if (backupList.value.length === 0) {
        return false // 没有历史备份，需要创建新备份
      }
      
      // 获取最新的备份
      const latestBackup = backupList.value[0]
      const currentChecksum = calculateChecksum(currentData)
      
      console.log('📊 数据完整性检查:', {
        当前数据校验和: currentChecksum,
        最新备份校验和: latestBackup.checksum,
        是否一致: currentChecksum === latestBackup.checksum
      })
      
      return currentChecksum === latestBackup.checksum
    } catch (error) {
      console.error('检查数据一致性时出错:', error)
      return false // 出错时默认创建备份
    }
  }

  // 获取完整的数据统计信息
  const getDataStatistics = (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData)
      return {
        conductors: Object.keys(data.conductorDB || {}).length,
        enhancedConductors: Object.keys(data.enhancedConductors || {}).length,
        monthlyData: (data.monthlyData || []).length,
        assessmentDB: Object.keys(data.assessmentDB || {}).length,
        applications: Object.keys(data.applications || {}).length,
        personnelChanges: (data.personnelChanges || []).length,
        standardItems: Object.keys(data.standardAssessmentItems || {}).length,
        departments: Object.keys(data.departmentCategories || {}).length,
        总数据大小: Math.round(jsonData.length / 1024) + 'KB'
      }
    } catch (error) {
      return { 错误: '无法解析数据统计' }
    }
  }

  // 创建备份
  const createBackup = async (type: 'auto' | 'manual' = 'manual', name?: string) => {
    if (isBackingUp.value) {
      ElMessage.warning('正在进行备份，请稍候...')
      return
    }
    
    isBackingUp.value = true
    
    try {
      // 获取当前数据
      const jsonData = await mainStore.exportData()
      if (!jsonData) {
        throw new Error('无法获取数据')
      }
      
      // 🔍 备份前数据完整性核实
      const dataStats = getDataStatistics(jsonData)
      console.log('📋 当前系统数据统计:', dataStats)
      
      // 检查数据是否与最近备份完全一致
      const isIdentical = await isDataIdenticalToLastBackup(jsonData)
      
      if (isIdentical && type === 'auto') {
        console.log('✅ 数据未发生变化，跳过自动备份')
        console.log('📅 上次备份时间:', new Date(lastBackupTime.value).toLocaleString('zh-CN'))
        return // 自动备份时，如果数据相同则跳过
      }
      
      if (isIdentical && type === 'manual') {
        console.log('⚠️ 检测到数据与最新备份完全一致')
        // 手动备份时，即使数据相同也继续执行，但会在名称中标注
        name = (name || `手动备份 - ${new Date().toLocaleString('zh-CN')}`) + ' (数据无变化)'
      }
      
      // 压缩数据
      const compressedData = compressData(jsonData)
      
      // 创建备份对象
      const backup: Backup = {
        id: Date.now().toString(),
        name: name || `${type === 'auto' ? '自动' : '手动'}备份 - ${new Date().toLocaleString('zh-CN')}`,
        type,
        timestamp: Date.now(),
        size: compressedData.length,
        data: compressedData,
        checksum: calculateChecksum(jsonData)
      }
      
      // 保存到 IndexedDB
      await saveBackup(backup)
      
      lastBackupTime.value = backup.timestamp
      
      if (type === 'manual') {
        ElMessage.success('备份成功')
      } else {
        console.log('✅ 自动备份完成:', backup.name)
        console.log('📊 备份数据统计:', dataStats)
      }
      
      // 清理旧备份
      await cleanOldBackups()
      
      // 刷新备份列表
      await loadBackupList()
      
    } catch (error) {
      console.error('❌ 备份失败:', error)
      ElMessage.error('备份失败: ' + (error as Error).message)
    } finally {
      isBackingUp.value = false
    }
  }
  
  // 保存备份到 IndexedDB
  const saveBackup = async (backup: Backup) => {
    const database = await db.getDB()
    
    // 确保备份存储区存在
    if (!database.objectStoreNames.contains('backups')) {
      // 需要升级数据库版本来添加新的存储区
      database.close()
      
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('TrainConductorDB', 6) // 增加版本号
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('backups')) {
            db.createObjectStore('backups', { keyPath: 'id' })
          }
        }
        
        request.onsuccess = () => {
          request.result.close()
          resolve(true)
        }
        
        request.onerror = () => reject(request.error)
      })
    }
    
    // 重新获取数据库连接
    const newDb = await db.getDB()
    const transaction = newDb.transaction(['backups'], 'readwrite')
    const store = transaction.objectStore('backups')
    
    return new Promise((resolve, reject) => {
      const request = store.put(backup)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }
  
  // 加载备份列表
  const loadBackupList = async () => {
    try {
      const database = await db.getDB()
      
      if (!database.objectStoreNames.contains('backups')) {
        backupList.value = []
        return
      }
      
      const transaction = database.transaction(['backups'], 'readonly')
      const store = transaction.objectStore('backups')
      
      const backups = await new Promise<Backup[]>((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      
      // 按时间倒序排序
      backupList.value = backups.sort((a, b) => b.timestamp - a.timestamp)
      
      // 更新最后备份时间
      if (backups.length > 0) {
        lastBackupTime.value = backups[0].timestamp
      }
    } catch (error) {
      console.error('加载备份列表失败:', error)
      backupList.value = []
    }
  }
  
  // 清理旧备份
  const cleanOldBackups = async () => {
    const now = Date.now()
    const maxAge = MAX_BACKUP_DAYS * 24 * 60 * 60 * 1000
    
    const database = await db.getDB()
    const transaction = database.transaction(['backups'], 'readwrite')
    const store = transaction.objectStore('backups')
    
    const backups = await new Promise<Backup[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    // 按时间排序
    backups.sort((a, b) => b.timestamp - a.timestamp)
    
    // 删除超过限制的备份
    const toDelete: string[] = []
    
    backups.forEach((backup, index) => {
      // 保留最近的 MAX_BACKUPS 个
      if (index >= MAX_BACKUPS) {
        toDelete.push(backup.id)
      }
      // 删除超过 MAX_BACKUP_DAYS 天的
      else if (now - backup.timestamp > maxAge) {
        toDelete.push(backup.id)
      }
    })
    
    // 执行删除
    for (const id of toDelete) {
      await new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve(true)
        request.onerror = () => reject(request.error)
      })
    }
    
    if (toDelete.length > 0) {
      console.log(`清理了 ${toDelete.length} 个旧备份`)
    }
  }
  
  // 恢复备份
  const restoreBackup = async (backupId: string) => {
    try {
      const database = await db.getDB()
      const transaction = database.transaction(['backups'], 'readonly')
      const store = transaction.objectStore('backups')
      
      const backup = await new Promise<Backup>((resolve, reject) => {
        const request = store.get(backupId)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      
      if (!backup) {
        throw new Error('备份不存在')
      }
      
      // 解压数据
      const jsonData = decompressData(backup.data)
      
      // 验证校验和
      const checksum = calculateChecksum(jsonData)
      if (checksum !== backup.checksum) {
        throw new Error('备份数据已损坏')
      }
      
      // 恢复数据
      const success = await mainStore.importData(jsonData)
      
      if (success) {
        ElMessage.success('备份恢复成功')
        
        // 重新加载页面以确保数据更新
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error('恢复失败')
      }
    } catch (error) {
      console.error('恢复备份失败:', error)
      ElMessage.error('恢复备份失败: ' + (error as Error).message)
    }
  }
  
  // 删除备份
  const deleteBackup = async (backupId: string) => {
    try {
      const database = await db.getDB()
      const transaction = database.transaction(['backups'], 'readwrite')
      const store = transaction.objectStore('backups')
      
      await new Promise((resolve, reject) => {
        const request = store.delete(backupId)
        request.onsuccess = () => resolve(true)
        request.onerror = () => reject(request.error)
      })
      
      ElMessage.success('备份已删除')
      await loadBackupList()
    } catch (error) {
      console.error('删除备份失败:', error)
      ElMessage.error('删除备份失败')
    }
  }
  
  // 启动自动备份
  const startAutoBackup = () => {
    if (backupInterval) return
    
    // 立即执行一次检查
    checkAutoBackup()
    
    // 设置定时器
    backupInterval = window.setInterval(() => {
      checkAutoBackup()
    }, BACKUP_INTERVAL)
    
    console.log('自动备份已启动')
  }
  
  // 检查是否需要自动备份
  const checkAutoBackup = () => {
    const now = Date.now()
    const timeSinceLastBackup = now - lastBackupTime.value
    
    // 如果超过备份间隔，执行备份
    if (timeSinceLastBackup >= BACKUP_INTERVAL) {
      createBackup('auto')
    }
  }
  
  // 停止自动备份
  const stopAutoBackup = () => {
    if (backupInterval) {
      clearInterval(backupInterval)
      backupInterval = null
      console.log('自动备份已停止')
    }
  }
  
  // 生命周期
  onMounted(async () => {
    await loadBackupList()
    
    // 显示自动备份通知
    if (lastBackupTime.value === 0 || Date.now() - lastBackupTime.value > BACKUP_INTERVAL) {
      ElNotification({
        title: '自动备份提醒',
        message: '系统将每30分钟自动备份您的数据',
        type: 'info',
        duration: 5000
      })
    }
    
    startAutoBackup()
  })
  
  onUnmounted(() => {
    stopAutoBackup()
  })
  
  return {
    isBackingUp,
    backupList,
    lastBackupTime,
    createBackup,
    restoreBackup,
    deleteBackup,
    loadBackupList,
    startAutoBackup,
    stopAutoBackup
  }
} 