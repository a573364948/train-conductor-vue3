import { ElMessage, ElNotification } from 'element-plus'
import type { Database, EnhancedConductor, PersonnelChange, ConductorApplication, ApplicationSettings } from '@/types'

// 人员管理备份数据结构
export interface PersonnelBackupData {
  metadata: {
    backupTime: string
    version: string
    backupType: 'full' | 'selective'
    description?: string
    dataStats: {
      personnelCount: number
      changesCount: number
      applicationsCount: number
      monthlyDataCount: number
    }
  }
  data: {
    enhancedConductors?: Record<string, EnhancedConductor>
    personnelChanges?: PersonnelChange[]
    applications?: ConductorApplication[]
    applicationSettings?: ApplicationSettings
    conductorDB?: Record<string, any>
    monthlyData?: any[]
  }
}

// 备份选项
export interface BackupOptions {
  includePersonnel: boolean      // 人员档案
  includeChanges: boolean        // 异动记录
  includeApplications: boolean   // 申请记录
  includeSettings: boolean       // 申请设置
  includeLegacyData: boolean     // 兼容数据
  includeMonthlyData: boolean    // 月度数据
  description?: string           // 备份描述
}

export class PersonnelBackupManager {
  
  /**
   * 创建人员管理数据备份
   */
  static createBackup(database: Database, options: BackupOptions): PersonnelBackupData {
    const backupData: PersonnelBackupData = {
      metadata: {
        backupTime: new Date().toISOString(),
        version: '1.0.0',
        backupType: this.isFullBackup(options) ? 'full' : 'selective',
        description: options.description,
        dataStats: {
          personnelCount: 0,
          changesCount: 0,
          applicationsCount: 0,
          monthlyDataCount: 0
        }
      },
      data: {}
    }

    // 备份人员档案
    if (options.includePersonnel && database.enhancedConductors) {
      backupData.data.enhancedConductors = JSON.parse(JSON.stringify(database.enhancedConductors))
      backupData.metadata.dataStats.personnelCount = Object.keys(database.enhancedConductors).length
    }

    // 备份异动记录
    if (options.includeChanges && database.personnelChanges) {
      backupData.data.personnelChanges = JSON.parse(JSON.stringify(database.personnelChanges))
      backupData.metadata.dataStats.changesCount = database.personnelChanges.length
    }

    // 备份申请记录
    if (options.includeApplications && database.applications) {
      backupData.data.applications = JSON.parse(JSON.stringify(database.applications))
      backupData.metadata.dataStats.applicationsCount = database.applications.length
    }

    // 备份申请设置
    if (options.includeSettings && database.applicationSettings) {
      backupData.data.applicationSettings = JSON.parse(JSON.stringify(database.applicationSettings))
    }

    // 备份兼容数据
    if (options.includeLegacyData && database.conductorDB) {
      backupData.data.conductorDB = JSON.parse(JSON.stringify(database.conductorDB))
    }

    // 备份月度数据
    if (options.includeMonthlyData && database.monthlyData) {
      backupData.data.monthlyData = JSON.parse(JSON.stringify(database.monthlyData))
      backupData.metadata.dataStats.monthlyDataCount = database.monthlyData.length
    }

    return backupData
  }

  /**
   * 导出备份到文件
   */
  static async exportBackup(backupData: PersonnelBackupData): Promise<void> {
    try {
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const backupType = backupData.metadata.backupType
      const filename = `personnel-backup-${backupType}-${timestamp}.json`
      
      // 下载文件
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      ElNotification.success({
        title: '备份导出成功',
        message: `文件已保存为: ${filename}`,
        duration: 4000
      })

    } catch (error) {
      console.error('导出备份失败:', error)
      ElMessage.error('备份导出失败')
      throw error
    }
  }

  /**
   * 导入备份文件
   */
  static async importBackup(file: File): Promise<PersonnelBackupData> {
    try {
      const text = await file.text()
      const backupData = JSON.parse(text) as PersonnelBackupData
      
      // 验证备份数据格式
      if (!this.validateBackupData(backupData)) {
        throw new Error('备份文件格式不正确')
      }

      return backupData

    } catch (error) {
      console.error('导入备份失败:', error)
      ElMessage.error('备份文件导入失败：' + (error as Error).message)
      throw error
    }
  }

  /**
   * 恢复备份数据到数据库
   */
  static async restoreBackup(backupData: PersonnelBackupData, database: Database): Promise<Database> {
    try {
      const restoredDatabase = JSON.parse(JSON.stringify(database))

      // 恢复人员档案
      if (backupData.data.enhancedConductors) {
        restoredDatabase.enhancedConductors = backupData.data.enhancedConductors
      }

      // 恢复异动记录
      if (backupData.data.personnelChanges) {
        restoredDatabase.personnelChanges = backupData.data.personnelChanges
      }

      // 恢复申请记录
      if (backupData.data.applications) {
        restoredDatabase.applications = backupData.data.applications
      }

      // 恢复申请设置
      if (backupData.data.applicationSettings) {
        restoredDatabase.applicationSettings = backupData.data.applicationSettings
      }

      // 恢复兼容数据
      if (backupData.data.conductorDB) {
        restoredDatabase.conductorDB = backupData.data.conductorDB
      }

      // 恢复月度数据
      if (backupData.data.monthlyData) {
        restoredDatabase.monthlyData = backupData.data.monthlyData
      }

      return restoredDatabase

    } catch (error) {
      console.error('恢复备份失败:', error)
      ElMessage.error('备份恢复失败')
      throw error
    }
  }

  /**
   * 获取备份预览信息
   */
  static getBackupPreview(backupData: PersonnelBackupData): string[] {
    const preview: string[] = []
    const { metadata, data } = backupData

    preview.push(`📅 备份时间: ${new Date(metadata.backupTime).toLocaleString('zh-CN')}`)
    preview.push(`📋 备份类型: ${metadata.backupType === 'full' ? '完整备份' : '选择性备份'}`)
    
    if (metadata.description) {
      preview.push(`📝 备份描述: ${metadata.description}`)
    }

    preview.push('') // 空行
    preview.push('📊 数据统计:')

    if (data.enhancedConductors) {
      preview.push(`  👥 人员档案: ${metadata.dataStats.personnelCount} 人`)
    }

    if (data.personnelChanges) {
      preview.push(`  🔄 异动记录: ${metadata.dataStats.changesCount} 条`)
    }

    if (data.applications) {
      preview.push(`  📋 申请记录: ${metadata.dataStats.applicationsCount} 条`)
    }

    if (data.applicationSettings) {
      preview.push(`  ⚙️ 申请设置: 已包含`)
    }

    if (data.conductorDB) {
      preview.push(`  🗄️ 兼容数据: 已包含`)
    }

    if (data.monthlyData) {
      preview.push(`  📅 月度数据: ${metadata.dataStats.monthlyDataCount} 条`)
    }

    return preview
  }

  /**
   * 验证是否为完整备份
   */
  private static isFullBackup(options: BackupOptions): boolean {
    return options.includePersonnel && 
           options.includeChanges && 
           options.includeApplications && 
           options.includeSettings
  }

  /**
   * 验证备份数据格式
   */
  private static validateBackupData(data: any): data is PersonnelBackupData {
    return data &&
           data.metadata &&
           data.metadata.backupTime &&
           data.metadata.version &&
           data.data &&
           typeof data.data === 'object'
  }

  /**
   * 获取默认备份选项
   */
  static getDefaultBackupOptions(): BackupOptions {
    return {
      includePersonnel: true,      // 默认包含人员档案
      includeChanges: true,        // 默认包含异动记录
      includeApplications: true,   // 默认包含申请记录
      includeSettings: true,       // 默认包含申请设置
      includeLegacyData: false,    // 默认不包含兼容数据
      includeMonthlyData: false    // 默认不包含月度数据
    }
  }

  /**
   * 获取完整备份选项
   */
  static getFullBackupOptions(): BackupOptions {
    return {
      includePersonnel: true,
      includeChanges: true,
      includeApplications: true,
      includeSettings: true,
      includeLegacyData: true,
      includeMonthlyData: true
    }
  }
} 