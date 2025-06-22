// 数据映射工具
// 解决导入原子系统数据与现有在岗/考核数据的关联问题

import type { 
  EnhancedConductor, 
  MonthlyData, 
  AssessmentRecord, 
  ConductorMonthlyData,
  Database 
} from '@/types'

export interface DataMappingResult {
  success: boolean
  mappedRecords: number
  unmappedRecords: string[]
  conflicts: string[]
  orphanedData: {
    monthlyRecords: OrphanedRecord[]
    assessmentRecords: OrphanedRecord[]
    total: number
  }
  summary: {
    monthlyDataMapped: number
    assessmentDataMapped: number
    totalMapped: number
    orphanedDataCount: number
  }
}

export interface OrphanedRecord {
  name: string
  department: string
  dataType: 'monthly' | 'assessment'
  recordCount: number
  suggestion: string
  employeeId?: string  // 从现有数据中提取的真实工号
  extractedData?: {    // 从现有数据中提取的其他信息
    phone?: string
    position?: string
    rank?: string
    [key: string]: any
  }
}

export class DataMappingUtils {
  
  /**
   * 执行完整的数据映射迁移
   */
  static async executeDataMapping(
    importedPersonnel: EnhancedConductor[],
    existingDatabase: Database
  ): Promise<DataMappingResult> {
    
    console.log('🔄 开始执行数据映射迁移...')
    
    // 1. 创建工号的映射表
    const employeeIdMap = this.createPersonnelMapping(importedPersonnel)
    
    // 2. 更新月度在岗数据的关联
    const monthlyResult = this.updateMonthlyDataMapping(
      existingDatabase.monthlyData || [],
      employeeIdMap
    )
    
    // 3. 更新考核数据的关联
    const assessmentResult = this.updateAssessmentDataMapping(
      existingDatabase.assessmentDB || {},
      employeeIdMap
    )
    
    // 4. 识别孤岛数据（在现有数据中存在但导入数据中不存在的人员）
    const orphanedResult = this.identifyOrphanedData(
      existingDatabase,
      importedPersonnel
    )
    
    // 5. 生成迁移报告
    const result: DataMappingResult = {
      success: monthlyResult.success && assessmentResult.success && orphanedResult.orphanedData.total === 0,
      mappedRecords: monthlyResult.mapped + assessmentResult.mapped,
      unmappedRecords: [...monthlyResult.unmapped, ...assessmentResult.unmapped],
      conflicts: [...monthlyResult.conflicts, ...assessmentResult.conflicts],
      orphanedData: orphanedResult.orphanedData,
      summary: {
        monthlyDataMapped: monthlyResult.mapped,
        assessmentDataMapped: assessmentResult.mapped,
        totalMapped: monthlyResult.mapped + assessmentResult.mapped,
        orphanedDataCount: orphanedResult.orphanedData.total
      }
    }
    
    console.log('✅ 数据映射迁移完成:', result.summary)
    return result
  }
  
  /**
   * 创建人员映射表：工号 -> 新的人员信息
   */
  private static createPersonnelMapping(
    personnel: EnhancedConductor[]
  ): Map<string, EnhancedConductor> {
    
    const mapping = new Map<string, EnhancedConductor>()
    
    personnel.forEach(person => {
      // 使用工号作为唯一键（工号是唯一标识）
      const employeeId = person.employeeId
      
      if (mapping.has(employeeId)) {
        console.warn(`⚠️ 发现重复工号：${employeeId} - ${person.name}`)
      }
      
      mapping.set(employeeId, person)
    })
    
    console.log(`📊 创建人员映射表：${mapping.size}条记录`)
    return mapping
  }
  
  /**
   * 更新月度在岗数据的人员关联
   */
  private static updateMonthlyDataMapping(
    monthlyData: MonthlyData[],
    employeeIdMap: Map<string, EnhancedConductor>
  ) {
    
    let mapped = 0
    let unmapped: string[] = []
    let conflicts: string[] = []
    
    // 创建姓名到人员的映射，用于处理现有数据中只有姓名的情况
    const nameToPersonnelMap = this.createNameMapping(Array.from(employeeIdMap.values()))
    
    monthlyData.forEach(monthData => {
      if (!monthData.data) return
      
      monthData.data.forEach((record: ConductorMonthlyData) => {
        // 优先从employeeId字段获取，如果没有则从id中提取四位数字
        let existingEmployeeId = (record as any).employeeId
        if (!existingEmployeeId && record.id) {
          existingEmployeeId = this.extractEmployeeIdFromId(record.id)
        }
        
        console.log(`🔗 月度数据映射检查: ${record.name} (${record.department}) - ID: ${record.id} - 工号: ${existingEmployeeId}`)
        
        const matchResult = this.findPersonnelMatch(
          record.name, 
          record.department, 
          nameToPersonnelMap,
          existingEmployeeId
        )
        
        if (matchResult.success && matchResult.personnel) {
          // 更新关联ID
          const oldId = record.id
          record.id = matchResult.personnel.id
          
          const employeeIdInfo = existingEmployeeId ? `[现有:${existingEmployeeId}]` : ''
          console.log(`🔗 月度数据映射：${record.name} (${record.department}) ${employeeIdInfo} ${oldId} -> ${matchResult.personnel.id} [${matchResult.personnel.employeeId}]`)
          mapped++
        } else {
          // 记录无法映射的数据
          const reason = matchResult.reason || '未找到匹配人员'
          const employeeIdInfo = existingEmployeeId ? ` [工号:${existingEmployeeId}]` : ''
          unmapped.push(`月度数据：${record.name} (${record.department})${employeeIdInfo} - ${reason}`)
          console.warn(`❌ 无法映射月度数据：${record.name} (${record.department})${employeeIdInfo} - ${reason}`)
          
          if (matchResult.conflicts && matchResult.conflicts.length > 0) {
            conflicts.push(`月度数据重名冲突：${record.name} 在 ${record.department} - 匹配到 ${matchResult.conflicts.length} 个同名人员`)
          }
        }
      })
    })
    
    return {
      success: unmapped.length === 0,
      mapped,
      unmapped,
      conflicts
    }
  }
  
  /**
   * 创建姓名到人员列表的映射（处理重名情况）
   */
  private static createNameMapping(
    personnel: EnhancedConductor[]
  ): Map<string, EnhancedConductor[]> {
    
    const nameMap = new Map<string, EnhancedConductor[]>()
    
    personnel.forEach(person => {
      const name = person.name
      if (!nameMap.has(name)) {
        nameMap.set(name, [])
      }
      nameMap.get(name)!.push(person)
    })
    
    // 统计重名情况
    const duplicateNames = Array.from(nameMap.entries()).filter(([name, persons]) => persons.length > 1)
    if (duplicateNames.length > 0) {
      console.log(`⚠️ 发现 ${duplicateNames.length} 个重名情况:`)
      duplicateNames.forEach(([name, persons]) => {
        console.log(`  - ${name}: ${persons.length}人 (${persons.map(p => `${p.employeeId}-${p.department}`).join(', ')})`)
      })
    }
    
    return nameMap
  }
  
  /**
   * 智能匹配人员：工号优先，然后考虑姓名+部门
   */
  private static findPersonnelMatch(
    name: string, 
    department: string, 
    nameToPersonnelMap: Map<string, EnhancedConductor[]>,
    existingEmployeeId?: string  // 现有数据中的工号（如果有）
  ): {
    success: boolean
    personnel?: EnhancedConductor
    reason?: string
    conflicts?: EnhancedConductor[]
  } {
    
    const sameName = nameToPersonnelMap.get(name) || []
    
    if (sameName.length === 0) {
      return {
        success: false,
        reason: '未找到同名人员'
      }
    }
    
    // 如果现有数据中有工号，优先通过工号匹配
    if (existingEmployeeId) {
      const matchByEmployeeId = sameName.find(p => p.employeeId === existingEmployeeId)
      if (matchByEmployeeId) {
        // 工号匹配成功，即使部门不同也认为是同一人（可能调动了）
        if (matchByEmployeeId.department !== department) {
          console.log(`🔄 检测到人员调动：${name} [${existingEmployeeId}] ${department} → ${matchByEmployeeId.department}`)
        }
        return {
          success: true,
          personnel: matchByEmployeeId
        }
      }
    }
    
    if (sameName.length === 1) {
      // 只有一个同名人员，直接匹配
      return {
        success: true,
        personnel: sameName[0]
      }
    }
    
    // 多个同名人员，尝试通过部门匹配
    const sameNameAndDept = sameName.filter(p => p.department === department)
    
    if (sameNameAndDept.length === 1) {
      // 同名同部门只有一个，匹配成功
      return {
        success: true,
        personnel: sameNameAndDept[0]
      }
    }
    
    if (sameNameAndDept.length === 0) {
      // 检查是否有工号一致但部门不同的情况
      if (existingEmployeeId) {
        const matchByEmployeeIdOnly = sameName.find(p => p.employeeId === existingEmployeeId)
        if (matchByEmployeeIdOnly) {
          console.log(`🔄 工号匹配但部门不同：${name} [${existingEmployeeId}] ${department} → ${matchByEmployeeIdOnly.department}`)
          return {
            success: true,
            personnel: matchByEmployeeIdOnly
          }
        }
      }
      
      return {
        success: false,
        reason: `同名人员中无人在${department}部门${existingEmployeeId ? `且工号不匹配[${existingEmployeeId}]` : ''}`,
        conflicts: sameName
      }
    }
    
    // 同名同部门有多个人，检查工号是否能确定唯一性
    if (existingEmployeeId) {
      const exactMatch = sameNameAndDept.find(p => p.employeeId === existingEmployeeId)
      if (exactMatch) {
        return {
          success: true,
          personnel: exactMatch
        }
      }
    }
    
    // 无法确定唯一身份
    return {
      success: false,
      reason: `${department}部门存在多个同名人员${existingEmployeeId ? `，且无工号[${existingEmployeeId}]匹配` : ''}`,
      conflicts: sameNameAndDept
    }
  }

  /**
   * 更新考核数据的人员关联
   */
  private static updateAssessmentDataMapping(
    assessmentDB: Record<string, AssessmentRecord[]>,
    employeeIdMap: Map<string, EnhancedConductor>
  ) {
    
    let mapped = 0
    let unmapped: string[] = []
    let conflicts: string[] = []
    
    // 创建姓名到人员的映射，用于处理现有数据中只有姓名的情况
    const nameToPersonnelMap = this.createNameMapping(Array.from(employeeIdMap.values()))
    
    Object.keys(assessmentDB).forEach(monthKey => {
      const records = assessmentDB[monthKey] || []
      
      records.forEach((record: AssessmentRecord) => {
        // 优先从employeeId字段获取，如果没有则从conductorId中提取四位数字
        let existingEmployeeId = (record as any).employeeId || (record as any).conductorEmployeeId
        if (!existingEmployeeId && record.conductorId) {
          existingEmployeeId = this.extractEmployeeIdFromId(record.conductorId)
        }
        
        console.log(`🔗 考核数据映射检查: ${record.conductorName} (${record.department}) - conductorId: ${record.conductorId} - 工号: ${existingEmployeeId}`)
        
        const matchResult = this.findPersonnelMatch(
          record.conductorName, 
          record.department, 
          nameToPersonnelMap,
          existingEmployeeId
        )
        
        if (matchResult.success && matchResult.personnel) {
          // 更新关联ID
          const oldId = record.conductorId
          record.conductorId = matchResult.personnel.id
          
          const employeeIdInfo = existingEmployeeId ? `[现有:${existingEmployeeId}]` : ''
          console.log(`🔗 考核数据映射：${record.conductorName} (${record.department}) ${employeeIdInfo} ${oldId} -> ${matchResult.personnel.id} [${matchResult.personnel.employeeId}]`)
          mapped++
        } else {
          // 记录无法映射的数据
          const reason = matchResult.reason || '未找到匹配人员'
          const employeeIdInfo = existingEmployeeId ? ` [工号:${existingEmployeeId}]` : ''
          unmapped.push(`考核数据：${record.conductorName} (${record.department})${employeeIdInfo} - ${reason}`)
          console.warn(`❌ 无法映射考核数据：${record.conductorName} (${record.department})${employeeIdInfo} - ${reason}`)
          
          if (matchResult.conflicts && matchResult.conflicts.length > 0) {
            conflicts.push(`考核数据重名冲突：${record.conductorName} 在 ${record.department} - 匹配到 ${matchResult.conflicts.length} 个同名人员`)
          }
        }
      })
    })
    
    return {
      success: unmapped.length === 0,
      mapped,
      unmapped,
      conflicts
    }
  }
  
  /**
   * 验证映射结果的数据完整性
   */
  static validateMappingIntegrity(
    database: Database,
    importedPersonnel: EnhancedConductor[]
  ): boolean {
    
    console.log('🔍 验证数据映射完整性...')
    
    // 检查月度数据关联
    const monthlyIds = new Set<string>()
    database.monthlyData?.forEach(month => {
      month.data?.forEach(record => {
        monthlyIds.add(record.id)
      })
    })
    
    // 检查考核数据关联
    const assessmentIds = new Set<string>()
    Object.values(database.assessmentDB || {}).forEach(records => {
      records.forEach(record => {
        assessmentIds.add(record.conductorId)
      })
    })
    
    // 检查人员ID存在性
    const personnelIds = new Set(importedPersonnel.map(p => p.id))
    
    const monthlyValid = [...monthlyIds].every(id => personnelIds.has(id))
    const assessmentValid = [...assessmentIds].every(id => personnelIds.has(id))
    
    console.log(`📊 月度数据关联完整性: ${monthlyValid ? '✅' : '❌'}`)
    console.log(`📊 考核数据关联完整性: ${assessmentValid ? '✅' : '❌'}`)
    
    return monthlyValid && assessmentValid
  }
  
  /**
   * 从ID或conductorId中提取四位数字工号
   */
  private static extractEmployeeIdFromId(id: string): string | null {
    console.log(`🔍 尝试从ID提取工号: ${id}`)
    
    // 先尝试常见的ID格式模式
    const patterns = [
      /enhanced_(\d{4})_/, // enhanced_1234_timestamp (这是主要格式)
      /conductor_(\d{4})_/, // conductor_1234_xxx
      /(\d{4})_\w+/,       // 1234_name
      /_(\d{4})_/,         // xxx_1234_xxx  
      /^(\d{4})/,          // 开头的四位数字
      // 移除结尾匹配，避免匹配到时间戳
    ]
    
    for (const pattern of patterns) {
      const match = id.match(pattern)
      if (match) {
        const employeeId = match[1]
        console.log(`✅ 从ID "${id}" 提取工号: ${employeeId} (使用模式: ${pattern})`)
        
        // 验证是否是合理的工号（避免提取到年份等）
        const num = parseInt(employeeId)
        if (num >= 1000 && num <= 9999) {
          return employeeId
        } else {
          console.log(`⚠️ 工号 ${employeeId} 不在合理范围内，跳过`)
        }
      }
    }
    
    console.log(`❌ 无法从ID "${id}" 提取工号`)
    return null
  }

  /**
   * 识别孤岛数据：在现有数据中存在但导入数据中不存在的人员
   */
  static identifyOrphanedData(
    existingDatabase: Database,
    importedPersonnel: EnhancedConductor[]
  ): {
    orphanedData: {
      monthlyRecords: OrphanedRecord[]
      assessmentRecords: OrphanedRecord[]
      total: number
    }
  } {
    
    console.log('🔍 识别孤岛数据...')
    
    // 创建导入人员的姓名+部门映射
    const importedNamesMap = new Set<string>()
    const importedEmployeeIds = new Set<string>()
    
    importedPersonnel.forEach(person => {
      importedNamesMap.add(`${person.name}-${person.department}`)
      importedEmployeeIds.add(person.employeeId)
    })
    
    console.log(`📊 导入人员工号集合:`, Array.from(importedEmployeeIds).slice(0, 10))
    
    // 调试：检查现有数据库中的真实ID格式
    console.log('🔍 检查现有数据库中的ID格式...')
    if (existingDatabase.monthlyData && existingDatabase.monthlyData.length > 0) {
      const sampleMonthlyData = existingDatabase.monthlyData[0]?.data?.slice(0, 5) || []
      console.log('📅 月度数据ID样本:', sampleMonthlyData.map(r => ({ name: r.name, id: r.id })))
    }
    
    if (existingDatabase.assessmentDB) {
      const assessmentKeys = Object.keys(existingDatabase.assessmentDB)
      if (assessmentKeys.length > 0) {
        const sampleAssessmentData = existingDatabase.assessmentDB[assessmentKeys[0]]?.slice(0, 5) || []
        console.log('📊 考核数据ID样本:', sampleAssessmentData.map(r => ({ name: r.conductorName, conductorId: r.conductorId })))
      }
    }
    
    const orphanedMonthly: OrphanedRecord[] = []
    const orphanedAssessment: OrphanedRecord[] = []
    
    // 检查月度数据中的孤岛
    const monthlyOrphans = new Map<string, {name: string, department: string, count: number, employeeId?: string, extractedData?: any}>()
    
    existingDatabase.monthlyData?.forEach(monthData => {
      monthData.data?.forEach(record => {
        const key = `${record.name}-${record.department}`
        
        // 优先从employeeId字段获取，如果没有则从id中提取四位数字
        let employeeId = (record as any).employeeId
        if (!employeeId && record.id) {
          employeeId = this.extractEmployeeIdFromId(record.id)
        }
        
        console.log(`🔍 月度数据检查: ${record.name} (${record.department}) - ID: ${record.id} - 提取工号: ${employeeId}`)
        
        // 调试：检查是否所有人都被分配了相同的工号
        if (employeeId === '1750') {
          console.warn(`⚠️ 检测到工号1750，可能存在问题：${record.name} - ID: ${record.id}`)
        }
        
        // 检查是否在导入数据中存在（优先工号，其次姓名+部门）
        const existsInImported = employeeId ? 
          importedEmployeeIds.has(employeeId) : 
          importedNamesMap.has(key)
        
        if (!existsInImported) {
          const orphanKey = key
          if (!monthlyOrphans.has(orphanKey)) {
            monthlyOrphans.set(orphanKey, {
              name: record.name,
              department: record.department,
              count: 0,
              employeeId: employeeId, // 保存从ID中提取的真实工号
              extractedData: {
                // 从月度数据中提取可用信息
                position: (record as any).position,
                rank: (record as any).rank,
                phone: (record as any).phone,
                status: record.status,
                rewardAmount: record.rewardAmount,
                rewardBase: record.rewardBase,
                monthlyScore: record.monthlyScore
              }
            })
          } else {
            // 如果没有工号，尝试从其他记录中获取
            const existing = monthlyOrphans.get(orphanKey)!
            if (!existing.employeeId && employeeId) {
              existing.employeeId = employeeId
            }
          }
          monthlyOrphans.get(orphanKey)!.count++
        }
      })
    })
    
    // 检查考核数据中的孤岛
    const assessmentOrphans = new Map<string, {name: string, department: string, count: number, employeeId?: string, extractedData?: any}>()
    
    Object.values(existingDatabase.assessmentDB || {}).forEach(records => {
      records.forEach(record => {
        const key = `${record.conductorName}-${record.department}`
        
        // 优先从employeeId字段获取，如果没有则从conductorId中提取四位数字
        let employeeId = (record as any).employeeId || (record as any).conductorEmployeeId
        if (!employeeId && record.conductorId) {
          employeeId = this.extractEmployeeIdFromId(record.conductorId)
        }
        
        console.log(`🔍 考核数据检查: ${record.conductorName} (${record.department}) - conductorId: ${record.conductorId} - 提取工号: ${employeeId}`)
        
        // 调试：检查是否所有人都被分配了相同的工号
        if (employeeId === '1750') {
          console.warn(`⚠️ 检测到工号1750，可能存在问题：${record.conductorName} - conductorId: ${record.conductorId}`)
        }
        
        // 检查是否在导入数据中存在（优先工号，其次姓名+部门）
        const existsInImported = employeeId ? 
          importedEmployeeIds.has(employeeId) : 
          importedNamesMap.has(key)
        
        if (!existsInImported) {
          const orphanKey = key
          if (!assessmentOrphans.has(orphanKey)) {
            assessmentOrphans.set(orphanKey, {
              name: record.conductorName,
              department: record.department,
              count: 0,
              employeeId: employeeId, // 保存从conductorId中提取的真实工号
              extractedData: {
                // 从考核数据中提取可用信息
                position: (record as any).position,
                rank: (record as any).rank,
                phone: (record as any).phone,
                baseScore: record.baseScore,
                finalScore: record.finalScore,
                totalScore: record.totalScore,
                totalDeduction: record.totalDeduction
              }
            })
          } else {
            // 如果没有工号，尝试从其他记录中获取
            const existing = assessmentOrphans.get(orphanKey)!
            if (!existing.employeeId && employeeId) {
              existing.employeeId = employeeId
            }
            // 合并提取的数据
            if (existing.extractedData) {
              existing.extractedData.baseScore = existing.extractedData.baseScore || record.baseScore
              existing.extractedData.finalScore = existing.extractedData.finalScore || record.finalScore
            }
          }
          assessmentOrphans.get(orphanKey)!.count++
        }
      })
    })
    
    // 转换为结果格式
    monthlyOrphans.forEach(orphan => {
      orphanedMonthly.push({
        name: orphan.name,
        department: orphan.department,
        dataType: 'monthly',
        recordCount: orphan.count,
        employeeId: orphan.employeeId,
        extractedData: orphan.extractedData,
        suggestion: orphan.employeeId ? 
          `已找到工号[${orphan.employeeId}]，建议使用真实工号创建档案` : 
          '建议在导入前为此人员创建基本档案，或检查姓名/部门是否一致'
      })
    })
    
    assessmentOrphans.forEach(orphan => {
      orphanedAssessment.push({
        name: orphan.name,
        department: orphan.department,
        dataType: 'assessment',
        recordCount: orphan.count,
        employeeId: orphan.employeeId,
        extractedData: orphan.extractedData,
        suggestion: orphan.employeeId ? 
          `已找到工号[${orphan.employeeId}]，建议使用真实工号创建档案` : 
          '建议在导入前为此人员创建基本档案，或检查姓名/部门是否一致'
      })
    })
    
    const totalOrphans = orphanedMonthly.length + orphanedAssessment.length
    
    console.log(`📊 孤岛数据统计：月度数据 ${orphanedMonthly.length}人，考核数据 ${orphanedAssessment.length}人，共 ${totalOrphans}人`)
    
    if (totalOrphans > 0) {
      console.warn('⚠️ 发现孤岛数据，建议处理后再导入：')
      orphanedMonthly.forEach(orphan => {
        console.warn(`  - 月度数据：${orphan.name} (${orphan.department}) - ${orphan.recordCount}条记录`)
      })
      orphanedAssessment.forEach(orphan => {
        console.warn(`  - 考核数据：${orphan.name} (${orphan.department}) - ${orphan.recordCount}条记录`)
      })
    }
    
    return {
      orphanedData: {
        monthlyRecords: orphanedMonthly,
        assessmentRecords: orphanedAssessment,
        total: totalOrphans
      }
    }
  }
  
  /**
   * 为孤岛数据创建基本人员档案
   */
  static createBasicPersonnelForOrphans(
    orphanedRecords: OrphanedRecord[]
  ): EnhancedConductor[] {
    
    console.log('🏗️ 为孤岛数据创建基本人员档案...')
    
    const createdPersonnel: EnhancedConductor[] = []
    
    orphanedRecords.forEach(orphan => {
      // 生成基本人员信息
      const personnel: EnhancedConductor = {
        id: `orphan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: orphan.name,
        employeeId: `TEMP_${Date.now()}_${orphan.name.slice(-2)}`, // 临时工号
        idNumber: '',
        phone: '',
        department: orphan.department,
        position: '列车长',
        rank: '高级',
        status: '后备',
        isActive: true,
        hireDate: new Date('1900-01-01').getTime(), // 占位时间戳
        basicSalary: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: `系统自动创建 - 来源：${orphan.dataType === 'monthly' ? '月度数据' : '考核数据'}孤岛记录`
      }
      
      createdPersonnel.push(personnel)
      console.log(`🆕 创建基本档案：${personnel.name} (${personnel.department}) [临时工号: ${personnel.employeeId}]`)
    })
    
    return createdPersonnel
  }

  /**
   * 生成数据映射报告
   */
  static generateMappingReport(result: DataMappingResult): string {
    
    const report = `
# 数据映射迁移报告

## 🎯 迁移概况
- **总体状态**: ${result.success ? '✅ 成功' : '❌ 存在问题'}
- **成功映射**: ${result.mappedRecords}条记录
- **月度数据映射**: ${result.summary.monthlyDataMapped}条
- **考核数据映射**: ${result.summary.assessmentDataMapped}条

## ⚠️ 未映射数据
${result.unmappedRecords.length > 0 ? 
  result.unmappedRecords.map(record => `- ${record}`).join('\n') : 
  '无未映射数据'}

## 🔍 数据冲突
${result.conflicts.length > 0 ? 
  result.conflicts.map(conflict => `- ${conflict}`).join('\n') : 
  '无数据冲突'}

## 📋 建议操作
${result.success ? 
  '✅ 数据映射完全成功，可以安全导入。' : 
  '⚠️ 存在未映射数据，建议手动处理后再导入。'}
`
    
    return report
  }
} 