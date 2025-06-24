import { ElMessage } from 'element-plus'
import { useMainStore } from '@/stores'
import { usePersonnelStore } from '@/stores/personnel'
import { useApplicationStore } from '@/stores/applications'

export function useDataInit() {
  const mainStore = useMainStore()
  const personnelStore = usePersonnelStore()
  const applicationStore = useApplicationStore()

  // 初始化所有必要数据
  const initializeAllData = async () => {
    try {
      console.log('🚀 开始数据初始化...')
      
      // 1. 首先确保主数据库已加载
      if (!mainStore.database) {
        console.log('📂 加载主数据库...')
        await mainStore.loadDatabase()
      }
      
      // 2. 加载和同步人员数据
      console.log('👥 加载人员数据...')
      await personnelStore.loadFromDatabase()
      
      // 3. 加载申请数据
      console.log('📋 加载申请数据...')
      applicationStore.loadFromDatabase()
      
      const stats = {
        basic: mainStore.conductors.length,
        enhanced: personnelStore.allConductors.length,
        applications: applicationStore.allApplications.length,
        changes: personnelStore.personnelChanges.length
      }
      
      console.log('✅ 数据初始化完成', stats)
      
      return stats
      
    } catch (error) {
      console.error('❌ 数据初始化失败:', error)
      ElMessage.error('数据加载失败，请刷新页面重试')
      throw error
    }
  }

  // 检查数据一致性
  const checkDataConsistency = () => {
    const basicCount = mainStore.conductors.length
    const enhancedCount = personnelStore.allConductors.length
    
    if (basicCount > 0 && enhancedCount === 0) {
      console.warn('⚠️ 数据不一致：基础数据存在但增强数据为空，将触发同步')
      return false
    }
    
    return true
  }

  // 强制同步数据
  const forceSyncData = async () => {
    try {
      console.log('🔄 强制同步数据...')
      await personnelStore.syncWithMainStore()
      console.log('✅ 数据同步完成')
      ElMessage.success('数据同步完成')
    } catch (error) {
      console.error('❌ 数据同步失败:', error)
      ElMessage.error('数据同步失败')
      throw error
    }
  }

  return {
    initializeAllData,
    checkDataConsistency,
    forceSyncData
  }
} 