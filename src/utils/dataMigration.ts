import type { Database, MonthlyData, ConductorMonthlyData } from '@/types'
import { ExcelProcessor } from './excel'

/**
 * 数据迁移工具类
 */
export class DataMigrationUtils {
  
  /**
   * 获取统一的状态显示
   * 兼容新旧数据格式
   */
  static getUnifiedStatus(conductor: ConductorMonthlyData): '在岗' | '不在岗' | '助勤' | '待确认' {
    // 优先使用新的status字段
    if (conductor.status) {
      return conductor.status
    }
    
    // 兜底：使用旧的isActive逻辑 + 智能判断
    if (!conductor.isActive) {
      return '不在岗'
    }
    
    // 对于旧数据，使用新的判断逻辑重新计算
    return ExcelProcessor.determineStatus(conductor.monthlyScore, conductor.rewardAmount)
  }

  /**
   * 重新计算单个列车长的状态
   */
  static recalculateStatus(conductor: ConductorMonthlyData): ConductorMonthlyData {
    const newStatus = ExcelProcessor.determineStatus(conductor.monthlyScore, conductor.rewardAmount)
    const newIsActive = newStatus === '在岗' || newStatus === '助勤'
    
    return {
      ...conductor,
      status: newStatus,
      isActive: newIsActive
    }
  }

  /**
   * 重新计算月度数据中所有列车长的状态
   */
  static recalculateMonthlyData(monthData: MonthlyData): MonthlyData {
    const updatedData = monthData.data.map(conductor => 
      this.recalculateStatus(conductor)
    )
    
    return {
      ...monthData,
      data: updatedData
    }
  }

  /**
   * 迁移整个数据库的历史数据
   */
  static migrateHistoricalData(database: Database): Database {
    console.log('🚀 开始数据迁移...')
    
    // 深度克隆原始数据，移除响应式包装
    const originalMonthlyData = JSON.parse(JSON.stringify(database.monthlyData))
    console.log(`📊 需要迁移 ${originalMonthlyData.length} 个月的数据`)
    
    try {
      // 重新计算所有月度数据
      const migratedMonthlyData = originalMonthlyData.map((monthData: any, index: number) => {
        console.log(`🔄 处理第 ${index + 1}/${originalMonthlyData.length} 个月: ${monthData.year}-${monthData.month}`)
        return this.recalculateMonthlyData(monthData)
      })
      
      // 统计迁移结果
      const migrationStats = this.generateMigrationStats(originalMonthlyData, migratedMonthlyData)
      console.log('📈 迁移统计结果:', migrationStats)
      
      // 创建纯净的数据库对象，移除所有可能的响应式包装
      const cleanDatabase = JSON.parse(JSON.stringify({
        ...database,
        monthlyData: migratedMonthlyData
      }))
      
      return cleanDatabase
      
    } catch (error) {
      console.error('❌ 数据迁移失败:', error)
      throw new Error(`数据迁移失败: ${error}`)
    }
  }

  /**
   * 生成迁移统计信息
   */
  static generateMigrationStats(originalData: MonthlyData[], migratedData: MonthlyData[]) {
    let totalConductors = 0
    let statusChanges = 0
    const statusDistribution = {
      '在岗': 0,
      '不在岗': 0,
      '助勤': 0,
      '待确认': 0
    }
    
    migratedData.forEach(monthData => {
      monthData.data.forEach(conductor => {
        totalConductors++
        statusDistribution[conductor.status]++
      })
    })
    
    // 统计状态变化（简化统计）
    originalData.forEach(monthData => {
      monthData.data.forEach(originalConductor => {
        const migratedMonth = migratedData.find(m => m.id === monthData.id)
        const migratedConductor = migratedMonth?.data.find(c => c.id === originalConductor.id)
        
        if (migratedConductor) {
          const oldStatus = this.getUnifiedStatus(originalConductor)
          const newStatus = migratedConductor.status
          if (oldStatus !== newStatus) {
            statusChanges++
          }
        }
      })
    })
    
    return {
      totalMonths: migratedData.length,
      totalConductors,
      statusChanges,
      statusDistribution,
      migrationTime: new Date().toISOString()
    }
  }

  /**
   * 验证迁移结果
   */
  static validateMigration(database: Database): boolean {
    try {
      let isValid = true
      const errors: string[] = []
      
      database.monthlyData.forEach(monthData => {
        monthData.data.forEach(conductor => {
          // 验证状态字段是否存在且有效
          if (!conductor.status || !['在岗', '不在岗', '助勤', '待确认'].includes(conductor.status)) {
            errors.push(`列车长 ${conductor.id} 的状态无效: ${conductor.status}`)
            isValid = false
          }
          
          // 验证isActive字段与status的一致性
          const expectedIsActive = conductor.status === '在岗' || conductor.status === '助勤'
          if (conductor.isActive !== expectedIsActive) {
            errors.push(`列车长 ${conductor.id} 的isActive字段不一致`)
            isValid = false
          }
        })
      })
      
      if (!isValid) {
        console.error('❌ 迁移验证失败:', errors)
      } else {
        console.log('✅ 迁移验证通过')
      }
      
      return isValid
    } catch (error) {
      console.error('❌ 验证过程出错:', error)
      return false
    }
  }

  /**
   * 获取状态对应的标签类型（用于UI显示）
   */
  static getStatusTagType(status: '在岗' | '不在岗' | '助勤' | '待确认'): 'success' | 'info' | 'warning' {
    switch (status) {
      case '在岗': return 'success'
      case '助勤': return 'warning'  
      case '待确认': return 'info'
      case '不在岗': 
      default: return 'info'
    }
  }

  /**
   * 获取状态对应的样式类
   */
  static getStatusClass(status: '在岗' | '不在岗' | '助勤' | '待确认'): string {
    switch (status) {
      case '在岗': return 'status-active'
      case '助勤': return 'status-helping'
      case '待确认': return 'status-pending'
      case '不在岗': 
      default: return 'status-inactive'
    }
  }
} 