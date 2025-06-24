import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/api/database'
import { DataMigrationUtils } from '@/utils/dataMigration'
import type { Database, Conductor, MonthlyData } from '@/types'

export const useMainStore = defineStore('main', {
  state: () => ({
    database: null as Database | null,
    loading: false,
    error: null as string | null,
    selectedMonth: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1
    }
  }),
  
  getters: {
    // 获取月度数据列表
    monthlyData: (state) => {
      return state.database?.monthlyData || []
    },
    
    // 获取当前选中月份的数据
    currentMonthData: (state) => {
      if (!state.database) return null
      return state.database.monthlyData.find(
        m => m.year === state.selectedMonth.year && m.month === state.selectedMonth.month
      )
    },

    conductors: (state) => {
      if (!state.database) return []
      return Object.values(state.database.conductorDB)
    },

    departments: (state) => {
      const deptSet = new Set<string>()
      const conductors = state.database ? Object.values(state.database.conductorDB) : []
      conductors.forEach((conductor: Conductor) => {
        if (conductor.department) {
          deptSet.add(conductor.department)
        }
      })
      return Array.from(deptSet).sort()
    },

    latestMonthData: (state) => {
      const monthlyData = state.database?.monthlyData || []
      if (!monthlyData.length) return null
      
      return monthlyData.reduce((latest: MonthlyData | null, current: MonthlyData) => {
        if (!latest) return current
        if (current.year > latest.year) return current
        if (current.year === latest.year && current.month > latest.month) return current
        return latest
      }, null as MonthlyData | null)
    },

    // 获取部门分类配置
    departmentCategories: (state) => {
      return state.database?.departmentCategories || {}
    }
  },
  
  actions: {
    async loadDatabase() {
      this.loading = true
      this.error = null
      
      try {
        const data = await db.loadDatabase()
        if (data) {
          this.database = data
          console.log('数据库加载成功')
        } else {
          this.error = '数据库加载失败'
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : '未知错误'
        console.error('加载数据库失败:', err)
      } finally {
        this.loading = false
      }
    },

    async saveDatabase() {
      if (!this.database) return false
      
      this.loading = true
      this.error = null
      
      try {
        // 创建纯净的数据副本，移除响应式包装
        const cleanDatabase = JSON.parse(JSON.stringify(this.database))
        
        const success = await db.saveDatabase(cleanDatabase)
        if (success) {
          console.log('数据库保存成功')
        } else {
          this.error = '数据库保存失败'
        }
        return success
      } catch (err) {
        this.error = err instanceof Error ? err.message : '未知错误'
        console.error('保存数据库失败:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    async importData(jsonString: string) {
      this.loading = true
      this.error = null
      
      try {
        const data = await db.importFromJSON(jsonString)
        this.database = data
        console.log('数据导入成功')
        return true
      } catch (err) {
        this.error = err instanceof Error ? err.message : '未知错误'
        console.error('导入数据失败:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    async exportData() {
      try {
        const jsonString = await db.exportToJSON()
        return jsonString
      } catch (err) {
        this.error = err instanceof Error ? err.message : '未知错误'
        console.error('导出数据失败:', err)
        return null
      }
    },

    // 执行数据迁移
    async migrateHistoricalData() {
      if (!this.database) {
        this.error = '没有可迁移的数据'
        return false
      }

      this.loading = true
      this.error = null

      try {
        console.log('🚀 开始执行数据迁移...')
        
        // 执行迁移
        const migratedDatabase = DataMigrationUtils.migrateHistoricalData(this.database)
        
        // 验证迁移结果
        const isValid = DataMigrationUtils.validateMigration(migratedDatabase)
        if (!isValid) {
          throw new Error('迁移数据验证失败')
        }
        
        // 更新内存中的数据
        this.database = migratedDatabase
        
        // 保存到数据库
        const saveSuccess = await this.saveDatabase()
        if (!saveSuccess) {
          throw new Error('迁移后保存失败')
        }
        
        console.log('✅ 数据迁移完成并保存成功')
        return true
        
      } catch (err) {
        this.error = err instanceof Error ? err.message : '迁移失败'
        console.error('❌ 数据迁移失败:', err)
        return false
      } finally {
        this.loading = false
      }
    },

    // 获取统一的状态显示（兼容新旧数据）
    getUnifiedStatus(conductor: any) {
      return DataMigrationUtils.getUnifiedStatus(conductor)
    },

    // 获取状态对应的标签类型
    getStatusTagType(status: string) {
      return DataMigrationUtils.getStatusTagType(status as any)
    },

    // 获取状态对应的样式类
    getStatusClass(status: string) {
      return DataMigrationUtils.getStatusClass(status as any)
    }
  }
}) 