import type { Database, Settings } from '@/types'

// 数据库名称和版本
const DB_NAME = 'TrainConductorDB'
const DB_VERSION = 8

// 数据库对象存储区名称
export const STORES = {
  CONDUCTORS: 'conductors',
  MONTHLY_DATA: 'monthlyData',
  SETTINGS: 'settings',
  CATEGORIES: 'departmentCategories',
  STANDARD_ITEMS: 'standardAssessmentItems',
  DEPARTMENTS: 'departments',
  ASSESSMENT_DETAILS: 'assessmentDetails',
  ASSESSMENT_DB: 'assessmentDB',
  // 新增：人员管理相关存储
  ENHANCED_CONDUCTORS: 'enhancedConductors',
  APPLICATIONS: 'applications',
  PERSONNEL_CHANGES: 'personnelChanges',
  APPLICATION_SETTINGS: 'applicationSettings'
} as const

class DatabaseService {
  private db: IDBDatabase | null = null

  // 打开数据库连接
  async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      // 数据库升级
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 创建对象存储区
        if (!db.objectStoreNames.contains(STORES.CONDUCTORS)) {
          db.createObjectStore(STORES.CONDUCTORS, { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains(STORES.MONTHLY_DATA)) {
          db.createObjectStore(STORES.MONTHLY_DATA, { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          db.createObjectStore(STORES.CATEGORIES, { keyPath: 'department' })
        }

        if (!db.objectStoreNames.contains(STORES.STANDARD_ITEMS)) {
          const itemsStore = db.createObjectStore(STORES.STANDARD_ITEMS, { keyPath: 'id' })
          itemsStore.createIndex('by_category', 'category', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.DEPARTMENTS)) {
          const departmentStore = db.createObjectStore(STORES.DEPARTMENTS, { keyPath: 'name' })
          departmentStore.createIndex('by_level', 'level', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.ASSESSMENT_DETAILS)) {
          const detailsStore = db.createObjectStore(STORES.ASSESSMENT_DETAILS, { autoIncrement: true })
          detailsStore.createIndex('by_conductor_id', 'conductor_id', { unique: false })
          detailsStore.createIndex('by_assessment_date', 'assessment_date', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.ASSESSMENT_DB)) {
          db.createObjectStore(STORES.ASSESSMENT_DB, { keyPath: 'yearMonth' })
        }
        
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' })
        }
        
        // 新增：人员管理相关存储区
        if (!db.objectStoreNames.contains(STORES.ENHANCED_CONDUCTORS)) {
          db.createObjectStore(STORES.ENHANCED_CONDUCTORS, { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains(STORES.APPLICATIONS)) {
          db.createObjectStore(STORES.APPLICATIONS, { keyPath: 'employeeId' })
        }
        
        if (!db.objectStoreNames.contains(STORES.PERSONNEL_CHANGES)) {
          const changesStore = db.createObjectStore(STORES.PERSONNEL_CHANGES, { keyPath: 'id' })
          changesStore.createIndex('by_employee', 'employeeId', { unique: false })
          changesStore.createIndex('by_date', 'changeDate', { unique: false })
        }
        
        if (!db.objectStoreNames.contains(STORES.APPLICATION_SETTINGS)) {
          db.createObjectStore(STORES.APPLICATION_SETTINGS, { keyPath: 'id' })
        }
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }
      
      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 获取数据库连接
  async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await this.openDatabase()
    }
    return this.db
  }

  // 清空对象存储区
  private clearStore(store: IDBObjectStore): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 从对象存储区获取所有数据
  private getAllFromStore<T>(store: IDBObjectStore): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 从对象存储区获取单个数据
  private getFromStore<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 保存数据库
  async saveDatabase(database: Database): Promise<boolean> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(Object.values(STORES), 'readwrite')
      
      // 保存各个数据存储
      const promises: Promise<void>[] = []
      
      // 保存列车长数据
      const conductorStore = transaction.objectStore(STORES.CONDUCTORS)
      await this.clearStore(conductorStore)
      for (const id in database.conductorDB) {
        const cleanConductor = JSON.parse(JSON.stringify(database.conductorDB[id]))
        conductorStore.add(cleanConductor)
      }
      
      // 保存月度数据
      const monthlyStore = transaction.objectStore(STORES.MONTHLY_DATA)
      await this.clearStore(monthlyStore)
      for (const monthData of database.monthlyData) {
        const cleanMonthData = JSON.parse(JSON.stringify({
          ...monthData,
          id: `${monthData.year}_${monthData.month}`
        }))
        monthlyStore.add(cleanMonthData)
      }
      
      // 保存设置
      const settingsStore = transaction.objectStore(STORES.SETTINGS)
      await this.clearStore(settingsStore)
      const cleanSettings = JSON.parse(JSON.stringify({
        id: 'appSettings',
        ...database.settings,
        lastSaved: Date.now()
      }))
      settingsStore.add(cleanSettings)
      
      // 保存部门分类配置
      const categoriesStore = transaction.objectStore(STORES.CATEGORIES)
      await this.clearStore(categoriesStore)
      for (const department in database.departmentCategories) {
        const cleanCategory = JSON.parse(JSON.stringify({
          department,
          category: database.departmentCategories[department]
        }))
        categoriesStore.add(cleanCategory)
      }
      
      // 保存标准项点
      const itemsStore = transaction.objectStore(STORES.STANDARD_ITEMS)
      await this.clearStore(itemsStore)
      for (const id in database.standardAssessmentItems) {
        const cleanItem = JSON.parse(JSON.stringify(database.standardAssessmentItems[id]))
        itemsStore.add(cleanItem)
      }
      
      // 保存考核记录
      if (database.assessmentDB) {
        const assessmentStore = transaction.objectStore(STORES.ASSESSMENT_DB)
        await this.clearStore(assessmentStore)
        for (const yearMonth in database.assessmentDB) {
          const cleanAssessment = JSON.parse(JSON.stringify({
            yearMonth,
            records: database.assessmentDB[yearMonth]
          }))
          assessmentStore.add(cleanAssessment)
        }
      }

      // 保存增强的人员数据
      if (database.enhancedConductors) {
        const enhancedConductorStore = transaction.objectStore(STORES.ENHANCED_CONDUCTORS)
        await this.clearStore(enhancedConductorStore)
        for (const id in database.enhancedConductors) {
          const cleanConductor = JSON.parse(JSON.stringify(database.enhancedConductors[id]))
          enhancedConductorStore.add(cleanConductor)
        }
      }

      // 保存申请数据
      if (database.applications) {
        const applicationsStore = transaction.objectStore(STORES.APPLICATIONS)
        await this.clearStore(applicationsStore)
        for (const employeeId in database.applications) {
          const cleanApplications = JSON.parse(JSON.stringify({
            employeeId,
            applications: database.applications[employeeId]
          }))
          applicationsStore.add(cleanApplications)
        }
      }

      // 保存异动记录
      if (database.personnelChanges) {
        const changesStore = transaction.objectStore(STORES.PERSONNEL_CHANGES)
        await this.clearStore(changesStore)
        for (const change of database.personnelChanges) {
          const cleanChange = JSON.parse(JSON.stringify(change))
          changesStore.add(cleanChange)
        }
      }

      // 保存申请配置
      if (database.applicationSettings) {
        const appSettingsStore = transaction.objectStore(STORES.APPLICATION_SETTINGS)
        await this.clearStore(appSettingsStore)
        const cleanAppSettings = JSON.parse(JSON.stringify({
          id: 'applicationSettings',
          ...database.applicationSettings
        }))
        appSettingsStore.add(cleanAppSettings)
      }
      
      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          console.log('数据已保存到 IndexedDB')
          resolve(true)
        }
        
        transaction.onerror = () => {
          console.error('保存数据失败:', transaction.error)
          resolve(false)
        }
      })
    } catch (error) {
      console.error('保存数据过程中发生错误:', error)
      return false
    }
  }

  // 加载数据库
  async loadDatabase(): Promise<Database | null> {
    try {
      const db = await this.getDB()
      
      // 检查哪些存储区存在
      const existingStores = []
      const storeNames = db.objectStoreNames
      
      for (const store of Object.values(STORES)) {
        if (storeNames.contains(store)) {
          existingStores.push(store)
        }
      }
      
      console.log('现有存储区:', existingStores)
      console.log('所有存储区:', Object.values(STORES))
      
      const transaction = db.transaction(existingStores, 'readonly')
      
                    // 加载所有数据
      const conductorData = await this.getAllFromStore<any>(
        transaction.objectStore(STORES.CONDUCTORS)
      )
      const monthlyData = await this.getAllFromStore<any>(
        transaction.objectStore(STORES.MONTHLY_DATA)
      )
      const settingsData = await this.getFromStore<any>(
        transaction.objectStore(STORES.SETTINGS),
        'appSettings'
      )
      const assessmentDbData = await this.getAllFromStore<any>(
        transaction.objectStore(STORES.ASSESSMENT_DB)
      )
      const standardItemsData = await this.getAllFromStore<any>(
        transaction.objectStore(STORES.STANDARD_ITEMS)
      )
      const categoriesData = await this.getAllFromStore<any>(
        transaction.objectStore(STORES.CATEGORIES)
      )

      // 加载人员管理相关数据（仅当存储区存在时）
      let enhancedConductorData: any[] = []
      let applicationsData: any[] = []
      let personnelChangesData: any[] = []
      let applicationSettingsData: any = null

      if (existingStores.includes(STORES.ENHANCED_CONDUCTORS)) {
        enhancedConductorData = await this.getAllFromStore<any>(
          transaction.objectStore(STORES.ENHANCED_CONDUCTORS)
        )
      }

      if (existingStores.includes(STORES.APPLICATIONS)) {
        applicationsData = await this.getAllFromStore<any>(
          transaction.objectStore(STORES.APPLICATIONS)
        )
      }

      if (existingStores.includes(STORES.PERSONNEL_CHANGES)) {
        personnelChangesData = await this.getAllFromStore<any>(
          transaction.objectStore(STORES.PERSONNEL_CHANGES)
        )
      }

      if (existingStores.includes(STORES.APPLICATION_SETTINGS)) {
        applicationSettingsData = await this.getFromStore<any>(
          transaction.objectStore(STORES.APPLICATION_SETTINGS),
          'applicationSettings'
        )
      }
      
              // 转换数据格式
        const conductorDB: Database['conductorDB'] = {}
        conductorData.forEach(item => {
          conductorDB[item.id] = item
        })
        
        const assessmentDB: Database['assessmentDB'] = {}
        assessmentDbData.forEach(item => {
          assessmentDB[item.yearMonth] = item.records
        })
        
        const standardAssessmentItems: Database['standardAssessmentItems'] = {}
        standardItemsData.forEach(item => {
          standardAssessmentItems[item.id] = item
        })
        
        // 转换部门分类数据
        const departmentCategories: Database['departmentCategories'] = {}
        categoriesData.forEach(item => {
          departmentCategories[item.department] = item.category
        })

        // 转换人员管理相关数据
        const enhancedConductors: Database['enhancedConductors'] = {}
        enhancedConductorData.forEach(item => {
          enhancedConductors[item.id] = item
        })

        const applications: Database['applications'] = {}
        applicationsData.forEach(item => {
          applications[item.employeeId] = item.applications
        })

        const personnelChanges: Database['personnelChanges'] = personnelChangesData || []

        const applicationSettings: Database['applicationSettings'] = applicationSettingsData || {
          tempPeriod: 3,
          autoExpiry: false,
          approvalRequired: false
        }
        
        // 如果没有部门分类配置，创建默认配置
        if (Object.keys(departmentCategories).length === 0) {
          console.log('创建默认部门分类配置...')
          // 从列车长数据中提取所有部门
          const allDepartments = new Set<string>()
          Object.values(conductorDB).forEach(conductor => {
            if (conductor.department) {
              allDepartments.add(conductor.department)
            }
          })
          
          // 根据部门名称自动分类
          allDepartments.forEach(dept => {
            if (dept.includes('高铁')) {
              departmentCategories[dept] = '高铁'
            } else if (dept.includes('动车')) {
              departmentCategories[dept] = '动车'
            } else if (dept.includes('普速') || dept.includes('普客') || dept.includes('特快') || dept.includes('普通')) {
              departmentCategories[dept] = '普速'
            } else {
              // 默认归类为普速（用户要求）
              departmentCategories[dept] = '普速'
            }
          })
          
          console.log('默认部门分类配置:', departmentCategories)
        }
        
        const database: Database = {
          conductorDB,
          monthlyData,
          settings: settingsData || {
            showInactive: false,
            highlightAnomaly: true,
            assessmentPassScore: 60,
            assessmentExcellentScore: 90,
            assessmentMaxScore: 100
          },
          departmentCategories,
          standardAssessmentItems,
          departments: {},
          assessmentDetails: [],
          assessmentDB,
          // 新增：人员管理相关数据
          enhancedConductors,
          applications,
          personnelChanges,
          applicationSettings
        }
      
      console.log('数据已从 IndexedDB 加载')
      return database
    } catch (error) {
      console.error('加载数据失败:', error)
      return null
    }
  }

  // 导出数据为JSON
  async exportToJSON(): Promise<string> {
    const database = await this.loadDatabase()
    if (!database) {
      throw new Error('没有可导出的数据')
    }
    
    const exportData = {
      ...database,
      exportDate: new Date().toISOString()
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  // 从JSON导入数据
  async importFromJSON(jsonString: string): Promise<Database> {
    try {
      const importData = JSON.parse(jsonString)
      
      // 检查是否是原系统格式（有 exportInfo 和 data 包装）
      let actualData = importData
      if (importData.exportInfo && importData.data) {
        console.log('检测到原系统备份格式，正在解包数据...')
        console.log('exportInfo:', importData.exportInfo)
        actualData = importData.data
        console.log('解包后的数据属性:', Object.keys(actualData))
      } else {
        console.log('检测到Vue3格式数据')
        console.log('数据属性:', Object.keys(actualData))
      }
      
      // 验证数据结构 - 支持多种格式
      let hasConductorDB = false
      let hasMonthlyData = false  
      let hasAssessmentDB = false
      let hasApplications = false
      
      // 检查Vue3系统格式
      if (actualData.conductorDB || actualData.monthlyData || actualData.assessmentDB) {
        hasConductorDB = actualData.conductorDB && Object.keys(actualData.conductorDB).length >= 0
        hasMonthlyData = Array.isArray(actualData.monthlyData)
        hasAssessmentDB = actualData.assessmentDB && Object.keys(actualData.assessmentDB).length >= 0
      }
      
      // 检查原系统格式（有data包装）
      if (actualData.data) {
        hasConductorDB = hasConductorDB || (actualData.data.conductors && Array.isArray(actualData.data.conductors))
        hasApplications = actualData.data.applications && Array.isArray(actualData.data.applications)
      }
      
      // 检查直接的applications数组格式
      if (actualData.applications && Array.isArray(actualData.applications)) {
        hasApplications = true
      }
      
      console.log('数据验证结果:', {
        hasConductorDB,
        hasMonthlyData,
        hasAssessmentDB,
        hasApplications,
        hasDataWrapper: !!actualData.data,
        conductorDBType: typeof actualData.conductorDB,
        monthlyDataType: typeof actualData.monthlyData,
        assessmentDBType: typeof actualData.assessmentDB
      })
      
      if (!hasConductorDB && !hasMonthlyData && !hasAssessmentDB && !hasApplications) {
        console.error('数据验证失败！')
        console.error('actualData 内容:', JSON.stringify(actualData).substring(0, 500))
        throw new Error('导入数据格式不正确：缺少核心数据')
      }
      
      // 处理数据格式差异
      let processedMonthlyData = actualData.monthlyData || []
      
      // 如果 monthlyData 不是数组，尝试转换
      if (!Array.isArray(processedMonthlyData)) {
        console.log('monthlyData 不是数组格式，尝试转换...')
        processedMonthlyData = []
      }
      
      // 处理标准项点数据格式转换
      let processedStandardItems: Database['standardAssessmentItems'] = {}
      if (actualData.standardAssessmentItems) {
        Object.entries(actualData.standardAssessmentItems).forEach(([id, item]: [string, any]) => {
          // 检测是否是原系统格式（包含 item_description_raw 等字段）
          if (item.item_description_raw || item.score_value_raw !== undefined) {
            // 转换原系统格式
            processedStandardItems[id] = {
              id: item.id || id,
              userCode: item.user_code || '',
              name: item.item_description_raw || '未命名项点',
              description: item.item_description_raw || '',
              category: item.category || '其他',
              maxScore: Math.abs(item.score_value_raw || 0),
              responsibleDepartment: item.responsible_department_raw || '',
              defaultResponsibleEntities: item.default_responsible_entities || [{
                level: '科室' as const,
                department: item.responsible_department_raw || ''
              }],
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          } else {
            // 保持Vue3格式
            processedStandardItems[id] = item
          }
        })
        console.log(`处理了 ${Object.keys(processedStandardItems).length} 个标准项点`)
      }

      // 处理申请数据：支持多种数据格式
      const processedApplications: Database['applications'] = {}
      let applicationsArray: any[] = []
      
      // 从不同位置获取申请数据
      if (actualData.data && actualData.data.applications && Array.isArray(actualData.data.applications)) {
        // 原系统格式：在data.applications中
        applicationsArray = actualData.data.applications
        console.log('检测到原系统格式申请数据')
      } else if (actualData.applications && Array.isArray(actualData.applications)) {
        // 直接的applications数组格式
        applicationsArray = actualData.applications
        console.log('检测到直接申请数组格式')
      } else if (actualData.applications && typeof actualData.applications === 'object') {
        // 已经是按员工ID分组的格式
        Object.assign(processedApplications, actualData.applications)
        console.log('检测到分组格式申请数据')
      }
      
      // 如果有数组格式的申请数据，进行转换
      if (applicationsArray.length > 0) {
        console.log(`转换申请数据格式：从数组转换为按员工ID分组，共 ${applicationsArray.length} 条记录`)
        applicationsArray.forEach((app: any) => {
          // 确保状态值正确
          let status: '已通过' | '待处理' | '已拒绝' = '已通过'
          if (app.status === '待处理') {
            status = '待处理'
          } else if (app.status === '已拒绝') {
            status = '已拒绝'
          } else if (app.status === '已处理') {
            status = '已通过'
          }
          
          // 转换字段格式以匹配新的数据结构
          const convertedApp = {
            id: app.id?.toString() || `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: app.type,
            employeeId: app.employeeId,
            applicantName: app.name || app.applicantName || '',
            currentDepartment: app.department || app.currentDepartment || '',
            targetDepartment: app.targetDepartment || app.department || app.currentDepartment || '',
            applicationDate: app.date || app.applicationDate || '',
            status,
            note: app.note || '',
            createdAt: app.createdAt || Date.now(),
            updatedAt: app.updatedAt || Date.now(),
            approver: app.approver,
            approvalDate: app.approvalDate
          }
          
          if (!processedApplications[app.employeeId]) {
            processedApplications[app.employeeId] = []
          }
          processedApplications[app.employeeId].push(convertedApp)
        })
        console.log(`成功处理了 ${applicationsArray.length} 个申请记录`)
      }

      // 处理异动记录数据
      const processedPersonnelChanges: Database['personnelChanges'] = []
      if (actualData.personnelChanges && Array.isArray(actualData.personnelChanges)) {
        processedPersonnelChanges.push(...actualData.personnelChanges)
        console.log(`处理了 ${processedPersonnelChanges.length} 条异动记录`)
      }

      // 处理人员数据：支持原系统格式
      let processedConductorDB: Database['conductorDB'] = {}
      let processedEnhancedConductors: Database['enhancedConductors'] = {}
      
      if (actualData.conductorDB) {
        // Vue3格式：已经是对象格式
        processedConductorDB = actualData.conductorDB
      } else if (actualData.data && actualData.data.conductors && Array.isArray(actualData.data.conductors)) {
        // 原系统格式：需要转换数组为对象
        console.log(`转换人员数据格式：从数组转换为对象，共 ${actualData.data.conductors.length} 条记录`)
        actualData.data.conductors.forEach((conductor: any) => {
          processedConductorDB[conductor.id || conductor.employeeId] = {
            id: conductor.id || conductor.employeeId,
            name: conductor.name,
            department: conductor.department
          }
        })
        
        // 同时转换为增强的人员数据格式
        actualData.data.conductors.forEach((conductor: any) => {
          processedEnhancedConductors[conductor.id || conductor.employeeId] = {
            id: conductor.id || conductor.employeeId,
            employeeId: conductor.employeeId,
            name: conductor.name,
            department: conductor.department,
            status: conductor.status || '后备',
            note: conductor.note || '',
            lastStatusChange: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        })
      }
      
      // 如果有现有的增强人员数据，合并进来
      if (actualData.enhancedConductors) {
        Object.assign(processedEnhancedConductors, actualData.enhancedConductors)
      }

      const database: Database = {
        conductorDB: processedConductorDB,
        monthlyData: processedMonthlyData,
        departmentCategories: actualData.departmentCategories || {},
        settings: actualData.settings || {
          showInactive: false,
          highlightAnomaly: true,
          assessmentPassScore: 60,
          assessmentExcellentScore: 90,
          assessmentMaxScore: 100
        },
        standardAssessmentItems: processedStandardItems,
        departments: actualData.departments || {},
        assessmentDetails: actualData.assessmentDetails || [],
        assessmentDB: actualData.assessmentDB || {},
        // 新增：人员管理相关数据
        enhancedConductors: processedEnhancedConductors,
        applications: processedApplications,
        personnelChanges: processedPersonnelChanges,
        applicationSettings: actualData.applicationSettings || {
          tempPeriod: 3,
          autoExpiry: false,
          approvalRequired: false
        }
      }
      
      // 保存到数据库
      const result = await this.saveDatabase(database)
      if (!result) {
        throw new Error('导入数据保存失败')
      }
      
      console.log('数据导入成功，统计信息:', {
        conductors: Object.keys(database.conductorDB || {}).length,
        enhancedConductors: Object.keys(database.enhancedConductors || {}).length,
        applications: Object.keys(database.applications || {}).length,
        personnelChanges: (database.personnelChanges || []).length,
        monthlyData: database.monthlyData.length,
        standardItems: Object.keys(database.standardAssessmentItems).length,
        assessmentPeriods: Object.keys(database.assessmentDB).length
      })
      
      return database
    } catch (error) {
      console.error('导入数据时出错:', error)
      throw error
    }
  }
}

// 导出单例
export const db = new DatabaseService() 