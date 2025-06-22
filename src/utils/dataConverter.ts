/**
 * 数据转换工具 - 用于将原系统数据转换为Vue3系统格式
 */

import type { AssessmentRecord, StandardAssessmentItem } from '@/types'

// 原系统考核记录格式（实际格式）
interface OriginalAssessmentRecord {
  id: string
  assessDate: string
  conductorId: string
  conductorName: string
  department: string
  assessorPerson: string
  assessDeptType: string
  totalScore: number
  baseScore: number
  finalScore: number
  assessTime: string
  details: Array<{
    item: string
    itemCode?: string
    itemCategory?: string
    itemDetail?: string
    deduction: number
    times: number
    assessorDepartment: string
    assessDeptType: string
  }>
  assessorDepartmentName: string
}

// 原系统assessmentDB格式（实际格式：按年月分组）
interface OriginalAssessmentDB {
  [yearMonth: string]: OriginalAssessmentRecord[] // 如 "2025-01": []
}

// 原系统标准项点格式（实际格式）
interface OriginalStandardItem {
  id: string
  user_code?: string
  item_description_raw: string
  score_value_raw: number
  responsible_department_raw: string
  category: string
  default_responsible_entities?: Array<{
    level: string
    department: string
  }>
  isActive?: boolean
}

// 原系统完整数据格式
interface OriginalSystemData {
  exportInfo: {
    exportDate: string
    exportTime: string
    version: string
    system: string
  }
  data: {
    conductorDB: Record<string, any>
    monthlyData: any[]
    assessmentDB: OriginalAssessmentDB
    standardAssessmentItems: Record<string, OriginalStandardItem>
    settings?: any
  }
}

/**
 * 检测部门类型
 */
function detectDeptType(deptName: string): '车队' | '科室' | '其他' {
  if (!deptName) return '其他'
  if (deptName.includes('车队') || deptName === '车队') return '车队'
  if (deptName.includes('科')) return '科室'
  return '其他'
}

/**
 * 生成记录ID
 */
function generateRecordId(date: string, conductorId: string): string {
  const dateStr = date.replace(/-/g, '')
  return `rec_${dateStr}_${conductorId}_${Date.now()}`
}

/**
 * 转换考核记录数据
 */
export function convertAssessmentData(originalData: OriginalAssessmentDB | OriginalSystemData): AssessmentRecord[] {
  const convertedRecords: AssessmentRecord[] = []
  
  // 如果传入的是完整的系统数据，提取assessmentDB
  let assessmentDB: OriginalAssessmentDB
  if ('exportInfo' in originalData && 'data' in originalData) {
    assessmentDB = originalData.data.assessmentDB
  } else {
    assessmentDB = originalData as OriginalAssessmentDB
  }
  
  Object.keys(assessmentDB).forEach(yearMonth => {
    const records = assessmentDB[yearMonth]
    
    if (!Array.isArray(records)) {
      console.warn(`${yearMonth} 的数据格式不正确`)
      return
    }
    
    records.forEach(record => {
      // 计算总扣分（使用现有的details数据）
      const totalDeduction = Math.abs(record.totalScore || 0)
      
      const convertedRecord: AssessmentRecord = {
        id: record.id || generateRecordId(record.assessDate, record.conductorId),
        conductorId: record.conductorId,
        conductorName: record.conductorName,
        department: record.department,
        assessDate: record.assessDate,
        assessTime: record.assessTime || '',
        assessorDepartmentName: record.assessorDepartmentName === '车队' ? record.department : record.assessorDepartmentName,
        assessorPerson: record.assessorPerson || '',
        assessDeptType: detectDeptType(record.assessDeptType || record.assessorDepartmentName),
        baseScore: record.baseScore || 100,
        finalScore: record.finalScore || (100 - totalDeduction),
        totalScore: record.finalScore || (100 - totalDeduction),
        totalDeduction: totalDeduction,
        details: (record.details || []).map(detail => ({
          assessDeptType: detectDeptType(detail.assessDeptType || detail.assessorDepartment),
          assessorDepartment: detail.assessorDepartment,
          deduction: Math.abs(detail.deduction || 0),
          item: detail.item,
          itemCategory: detail.itemCategory || '',
          itemCode: detail.itemCode || '',
          itemDetail: detail.itemDetail || '',
          itemName: '', // 需要后续匹配标准项点填充
          times: detail.times || 1,
          length: 1
        })),
        createdAt: new Date(record.assessDate).getTime()
      }
      
      convertedRecords.push(convertedRecord)
    })
  })
  
  return convertedRecords
}

/**
 * 转换标准项点数据
 */
export function convertStandardItems(originalItems: OriginalStandardItem[] | Record<string, OriginalStandardItem> | OriginalSystemData): StandardAssessmentItem[] {
  let itemsToConvert: OriginalStandardItem[]
  
  // 如果传入的是完整的系统数据，提取standardAssessmentItems
  if ('exportInfo' in originalItems && 'data' in originalItems) {
    const items = originalItems.data.standardAssessmentItems || {}
    itemsToConvert = Object.values(items)
  } else if (Array.isArray(originalItems)) {
    itemsToConvert = originalItems
  } else {
    itemsToConvert = Object.values(originalItems as Record<string, OriginalStandardItem>)
  }
  
  return itemsToConvert
    .filter(item => item.isActive !== false) // 过滤掉非活跃项
    .map(item => ({
      id: item.id,
      name: item.item_description_raw || `项点-${item.user_code || '未知'}`,
      description: item.item_description_raw,
      category: item.category || '其他',
      maxScore: Math.abs(item.score_value_raw || 0), // 确保是正数
      responsibleDepartment: item.responsible_department_raw || '其他',
      defaultResponsibleEntities: (item.default_responsible_entities || []).map(entity => ({
        level: entity.level === '车队' ? '车队' : '科室' as '车队' | '科室',
        department: entity.department
      })),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))
}

/**
 * 验证转换后的数据
 */
export function validateConvertedData(
  originalData: OriginalAssessmentDB | OriginalSystemData,
  convertedRecords: AssessmentRecord[]
) {
  // 提取assessmentDB
  let assessmentDB: OriginalAssessmentDB
  if ('exportInfo' in originalData && 'data' in originalData) {
    assessmentDB = originalData.data.assessmentDB
  } else {
    assessmentDB = originalData as OriginalAssessmentDB
  }
  
  // 统计原始数据
  let originalRecordCount = 0
  let originalDeductionSum = 0
  
  Object.values(assessmentDB).forEach(monthRecords => {
    if (Array.isArray(monthRecords)) {
      originalRecordCount += monthRecords.length
      monthRecords.forEach(record => {
        originalDeductionSum += Math.abs(record.totalScore || 0)
      })
    }
  })
  
  // 统计转换后数据
  const convertedRecordCount = convertedRecords.length
  const convertedDeductionSum = convertedRecords.reduce((sum, record) => 
    sum + record.totalDeduction, 0
  )
  
  console.log('数据转换验证结果：')
  console.log(`原始记录数: ${originalRecordCount}, 转换后记录数: ${convertedRecordCount}`)
  console.log(`原始总扣分: ${originalDeductionSum}, 转换后总扣分: ${convertedDeductionSum}`)
  
  return {
    recordCountMatch: originalRecordCount === convertedRecordCount,
    deductionSumMatch: Math.abs(originalDeductionSum - convertedDeductionSum) < 0.01,
    originalRecordCount,
    convertedRecordCount,
    originalDeductionSum,
    convertedDeductionSum
  }
}

/**
 * 批量匹配标准项点
 */
export function matchStandardItems(
  records: AssessmentRecord[],
  standardItems: StandardAssessmentItem[]
): AssessmentRecord[] {
  const updatedRecords = records.map(record => ({
    ...record,
    details: record.details.map(detail => {
      // 如果已经有itemCode，先尝试精确匹配
      if (detail.itemCode) {
        const exactMatch = standardItems.find(item => item.id === detail.itemCode)
        if (exactMatch) {
          return {
            ...detail,
            itemCode: exactMatch.id,
            itemName: exactMatch.name,
            itemCategory: exactMatch.category
          }
        }
      }
      
      // 否则尝试描述匹配
      const matched = findMatchingItem(detail.item, standardItems)
      if (matched) {
        return {
          ...detail,
          itemCode: matched.id,
          itemName: matched.name,
          itemCategory: matched.category
        }
      }
      return detail
    })
  }))
  
  return updatedRecords
}

/**
 * 查找匹配的标准项点
 */
function findMatchingItem(description: string, items: StandardAssessmentItem[]): StandardAssessmentItem | null {
  if (!description) return null
  
  const descLower = description.toLowerCase()
  
  // 精确匹配
  let matched = items.find(item => 
    item.description.toLowerCase() === descLower ||
    item.name.toLowerCase() === descLower
  )
  
  // 包含匹配
  if (!matched) {
    matched = items.find(item => 
      item.description.toLowerCase().includes(descLower) ||
      descLower.includes(item.description.toLowerCase()) ||
      item.name.toLowerCase().includes(descLower) ||
      descLower.includes(item.name.toLowerCase())
    )
  }
  
  // 关键词匹配
  if (!matched) {
    const keywords = descLower.split(/[,，、\/\s]/).map(k => k.trim()).filter(k => k.length > 2)
    if (keywords.length > 0) {
      matched = items.find(item => {
        const itemText = `${item.name} ${item.description}`.toLowerCase()
        return keywords.some(keyword => itemText.includes(keyword))
      })
    }
  }
  
  return matched || null
}

/**
 * 导出转换后的数据为JSON
 */
export function exportConvertedData(
  assessmentRecords: AssessmentRecord[],
  standardItems: StandardAssessmentItem[]
) {
  const data = {
    assessmentDB: assessmentRecords,
    standardAssessmentItems: standardItems.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {} as Record<string, StandardAssessmentItem>),
    convertedAt: new Date().toISOString(),
    version: '1.0'
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `converted_data_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * 生成数据转换报告
 */
export function generateConversionReport(
  originalData: OriginalAssessmentDB | OriginalSystemData,
  convertedRecords: AssessmentRecord[],
  standardItems: StandardAssessmentItem[]
) {
  const validation = validateConvertedData(originalData, convertedRecords)
  
  // 统计匹配情况
  let matchedCount = 0
  let unmatchedCount = 0
  
  convertedRecords.forEach(record => {
    record.details.forEach(detail => {
      if (detail.itemCode) {
        matchedCount++
      } else {
        unmatchedCount++
      }
    })
  })
  
  const matchRate = matchedCount + unmatchedCount > 0 
    ? matchedCount / (matchedCount + unmatchedCount) * 100 
    : 0
  
  return {
    validation,
    matching: {
      totalItems: matchedCount + unmatchedCount,
      matched: matchedCount,
      unmatched: unmatchedCount,
      matchRate: Math.round(matchRate * 100) / 100
    },
    standardItems: {
      total: standardItems.length,
      categories: [...new Set(standardItems.map(item => item.category))]
    },
    summary: {
      success: validation.recordCountMatch && validation.deductionSumMatch,
      message: validation.recordCountMatch && validation.deductionSumMatch
        ? '数据转换成功，记录数和扣分总数都匹配'
        : '数据转换存在差异，请检查具体数据'
    }
  }
}

/**
 * 处理完整的原系统备份数据
 */
export function processOriginalSystemBackup(backupData: OriginalSystemData) {
  console.log('处理原系统备份数据...', {
    exportInfo: backupData.exportInfo,
    hasAssessmentDB: !!backupData.data.assessmentDB,
    hasStandardItems: !!backupData.data.standardAssessmentItems,
    hasConductorDB: !!backupData.data.conductorDB
  })
  
  // 转换考核记录
  const convertedRecords = convertAssessmentData(backupData)
  
  // 转换标准项点
  const convertedStandardItems = convertStandardItems(backupData)
  
  // 匹配项点
  const matchedRecords = matchStandardItems(convertedRecords, convertedStandardItems)
  
  // 生成报告
  const report = generateConversionReport(backupData, matchedRecords, convertedStandardItems)
  
  return {
    convertedRecords: matchedRecords,
    convertedStandardItems,
    report
  }
} 