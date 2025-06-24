import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConductorApplication } from '@/types'
import { useMainStore } from './index'
import { usePersonnelStore } from './personnel'

export const useApplicationStore = defineStore('applications', () => {
  // 状态
  const applications = ref<Record<string, ConductorApplication[]>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取其他Store实例
  const mainStore = useMainStore()
  const personnelStore = usePersonnelStore()

  // 计算属性
  const allApplications = computed(() => {
    const allApps: ConductorApplication[] = []
    Object.values(applications.value).forEach(apps => {
      allApps.push(...apps)
    })
    return allApps.sort((a, b) => b.createdAt - a.createdAt)
  })

  const pendingApplications = computed(() => 
    allApplications.value.filter(app => app.status === '待处理')
  )

  const approvedApplications = computed(() => 
    allApplications.value.filter(app => app.status === '已通过')
  )

  const rejectedApplications = computed(() => 
    allApplications.value.filter(app => app.status === '已拒绝')
  )

  const getApplicationsByType = computed(() => {
    return (type: string) => 
      allApplications.value.filter(app => app.type === type)
  })

  const getApplicationsByDepartment = computed(() => {
    return (department: string) =>
      allApplications.value.filter(app => app.currentDepartment === department)
  })

  const getApplicationsByDateRange = computed(() => {
    return (startDate: string, endDate: string) =>
      allApplications.value.filter(app => 
        app.applicationDate >= startDate && app.applicationDate <= endDate
      )
  })

  const applicationStatistics = computed(() => {
    const stats = {
      total: allApplications.value.length,
      待处理: pendingApplications.value.length,
      已通过: approvedApplications.value.length,
      已拒绝: rejectedApplications.value.length,
      byType: {
        正式启用: getApplicationsByType.value('正式启用').length,
        临时启用: getApplicationsByType.value('临时启用').length,
        免职: getApplicationsByType.value('免职').length
      },
      byMonth: {} as Record<string, number>
    }

    // 按月统计
    allApplications.value.forEach(app => {
      const month = app.applicationDate.substring(0, 7)
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1
    })

    return stats
  })

  // 操作方法
  const submitApplication = async (applicationData: Partial<ConductorApplication>) => {
    try {
      loading.value = true
      error.value = null

      // 验证必填字段
      if (!applicationData.employeeId || !applicationData.applicantName || !applicationData.type) {
        throw new Error('请填写完整的申请信息')
      }

      // 检查是否存在待处理的同类型申请
      const existingApp = allApplications.value.find(app => 
        app.employeeId === applicationData.employeeId &&
        app.type === applicationData.type &&
        app.status === '待处理'
      )

      if (existingApp) {
        throw new Error(`该员工已有待处理的${applicationData.type}申请`)
      }

      const id = generateId()
      const newApplication: ConductorApplication = {
        id,
        type: applicationData.type!,
        employeeId: applicationData.employeeId!,
        applicantName: applicationData.applicantName!,
        currentDepartment: applicationData.currentDepartment || '',
        targetDepartment: applicationData.targetDepartment,
        applicationDate: applicationData.applicationDate || new Date().toISOString().split('T')[0],
        status: '待处理',
        note: applicationData.note || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      // 按员工ID分组存储
      if (!applications.value[applicationData.employeeId!]) {
        applications.value[applicationData.employeeId!] = []
      }
      applications.value[applicationData.employeeId!].push(newApplication)

      await saveToDatabase()
      return newApplication
    } catch (err) {
      error.value = err instanceof Error ? err.message : '提交申请失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateApplicationStatus = async (
    applicationId: string, 
    status: '已通过' | '已拒绝', 
    approver?: string
  ) => {
    try {
      loading.value = true
      error.value = null

      // 查找申请
      let targetApplication: ConductorApplication | null = null
      let employeeId: string | null = null

      for (const [empId, apps] of Object.entries(applications.value)) {
        const app = apps.find(a => a.id === applicationId)
        if (app) {
          targetApplication = app
          employeeId = empId
          break
        }
      }

      if (!targetApplication || !employeeId) {
        throw new Error('申请不存在')
      }

      if (targetApplication.status !== '待处理') {
        throw new Error('申请已处理，无法重复操作')
      }

      // 更新申请状态
      targetApplication.status = status
      targetApplication.approver = approver || '系统'
      targetApplication.approvalDate = new Date().toISOString().split('T')[0]
      targetApplication.updatedAt = Date.now()

      // 如果申请通过，更新人员状态并创建异动记录
      if (status === '已通过') {
        const conductor = personnelStore.getConductorByEmployeeId(employeeId)
        if (conductor) {
          const oldStatus = conductor.status
          let newStatus = conductor.status
          
          switch (targetApplication.type) {
            case '正式启用':
              newStatus = '正式启用'
              break
            case '临时启用':
              newStatus = '临时启用'
              break
            case '免职':
              newStatus = '免职'
              break
          }

          // 更新人员状态
          await personnelStore.updateConductor(conductor.id, {
            status: newStatus,
            department: targetApplication.targetDepartment || conductor.department,
            lastStatusChange: Date.now()
          })

          // 创建与申请相关的异动记录
          await personnelStore.createApplicationRelatedChange(
            targetApplication,
            { ...conductor, status: newStatus },
            oldStatus
          )
        }
      }

      await saveToDatabase()
      return targetApplication
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新申请状态失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteApplication = async (applicationId: string) => {
    try {
      loading.value = true
      error.value = null

      // 查找并删除申请
      let found = false
      for (const [employeeId, apps] of Object.entries(applications.value)) {
        const index = apps.findIndex(a => a.id === applicationId)
        if (index !== -1) {
          apps.splice(index, 1)
          // 如果该员工没有其他申请，删除整个记录
          if (apps.length === 0) {
            delete applications.value[employeeId]
          }
          found = true
          break
        }
      }

      if (!found) {
        throw new Error('申请不存在')
      }

      await saveToDatabase()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除申请失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  const batchApproveApplications = async (applicationIds: string[], approver?: string) => {
    try {
      loading.value = true
      error.value = null

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (const id of applicationIds) {
        try {
          await updateApplicationStatus(id, '已通过', approver)
          results.success++
        } catch (err) {
          results.failed++
          results.errors.push(`申请${id}处理失败: ${err instanceof Error ? err.message : '未知错误'}`)
        }
      }

      return results
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量审批失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getApplicationsByEmployee = (employeeId: string) => {
    return applications.value[employeeId] || []
  }

  const getApplicationTrend = (months: number = 6) => {
    const now = new Date()
    const monthsData: Array<{
      month: string
      label: string
      正式启用: number
      临时启用: number
      免职: number
      total: number
    }> = []
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      
      monthsData.push({
        month: monthKey,
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
        正式启用: 0,
        临时启用: 0,
        免职: 0,
        total: 0
      })
    }

    allApplications.value.forEach(app => {
      const monthKey = app.applicationDate.substring(0, 7)
      const monthData = monthsData.find(m => m.month === monthKey)
      if (monthData) {
        if (app.type === '正式启用') monthData.正式启用++
        else if (app.type === '临时启用') monthData.临时启用++
        else if (app.type === '免职') monthData.免职++
        monthData.total++
      }
    })

    return monthsData
  }

  const saveToDatabase = async () => {
    if (!mainStore.database) return false

    // 更新数据库
    mainStore.database.applications = applications.value

    return await mainStore.saveDatabase()
  }

  const loadFromDatabase = () => {
    if (!mainStore.database) return

    // 加载申请数据
    if (mainStore.database.applications) {
      // 兼容旧格式数据：如果是数组格式，转换为按员工ID分组的格式
      if (Array.isArray(mainStore.database.applications)) {
        const groupedApplications: Record<string, ConductorApplication[]> = {}
        
        mainStore.database.applications.forEach((app: any) => {
          // 转换字段格式以匹配新的数据结构
          const convertedApp: ConductorApplication = {
            id: app.id?.toString() || generateId(),
            type: app.type,
            employeeId: app.employeeId,
            applicantName: app.name || app.applicantName || '',
            currentDepartment: app.department || app.currentDepartment || '',
            targetDepartment: app.targetDepartment || app.department || app.currentDepartment || '',
            applicationDate: app.date || app.applicationDate || '',
            status: app.status === '已处理' ? '已通过' : (app.status === '待处理' ? '待处理' : '已通过'),
            note: app.note || '',
            createdAt: app.createdAt || Date.now(),
            updatedAt: app.updatedAt || Date.now(),
            approver: app.approver,
            approvalDate: app.approvalDate
          }
          
          if (!groupedApplications[app.employeeId]) {
            groupedApplications[app.employeeId] = []
          }
          groupedApplications[app.employeeId].push(convertedApp)
        })
        
        applications.value = groupedApplications
      } else {
        // 新格式数据直接使用
        applications.value = mainStore.database.applications
      }
    }
  }

  // 工具函数
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  return {
    // 状态
    applications,
    loading,
    error,

    // 计算属性
    allApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    getApplicationsByType,
    getApplicationsByDepartment,
    getApplicationsByDateRange,
    applicationStatistics,

    // 操作方法
    submitApplication,
    updateApplicationStatus,
    deleteApplication,
    batchApproveApplications,
    getApplicationsByEmployee,
    getApplicationTrend,
    saveToDatabase,
    loadFromDatabase
  }
}) 