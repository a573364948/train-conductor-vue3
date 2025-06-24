import type { Database, StandardAssessmentItem } from '@/types'

/**
 * 修复已导入的标准项点数据
 * 将原系统格式转换为Vue3格式
 */
export function repairStandardItems(database: Database): boolean {
  try {
    if (!database.standardAssessmentItems) {
      console.log('没有找到标准项点数据')
      return false
    }

    let repairCount = 0
    const repairedItems: Record<string, StandardAssessmentItem> = {}

    Object.entries(database.standardAssessmentItems).forEach(([id, item]: [string, any]) => {
      // 检测是否需要修复（包含原系统字段）
      if (item.item_description_raw || item.score_value_raw !== undefined) {
        console.log(`修复项点: ${id}`)
        
        // 转换为新格式
        repairedItems[id] = {
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
          createdAt: item.createdAt || Date.now(),
          updatedAt: Date.now()
        }
        repairCount++
      } else if (item.name && item.description) {
        // 已经是正确格式，直接保留
        repairedItems[id] = item
      } else {
        // 尝试修复缺失字段
        console.log(`修复缺失字段的项点: ${id}`)
        repairedItems[id] = {
          id: item.id || id,
          userCode: item.userCode || '',
          name: item.name || item.description || '未命名项点',
          description: item.description || item.name || '',
          category: item.category || '其他',
          maxScore: item.maxScore || 0,
          responsibleDepartment: item.responsibleDepartment || '',
          defaultResponsibleEntities: item.defaultResponsibleEntities || [{
            level: '科室' as const,
            department: ''
          }],
          createdAt: item.createdAt || Date.now(),
          updatedAt: Date.now()
        }
        repairCount++
      }
    })

    // 更新数据库
    database.standardAssessmentItems = repairedItems
    
    console.log(`修复完成，共修复 ${repairCount} 个项点，总计 ${Object.keys(repairedItems).length} 个项点`)
    return repairCount > 0
  } catch (error) {
    console.error('修复标准项点数据失败:', error)
    return false
  }
}

/**
 * 检查标准项点数据格式是否正确
 */
export function checkStandardItemsFormat(database: Database): {
  isValid: boolean
  needsRepair: boolean
  issues: string[]
} {
  const issues: string[] = []
  let needsRepair = false

  if (!database.standardAssessmentItems) {
    issues.push('缺少标准项点数据')
    return { isValid: false, needsRepair: false, issues }
  }

  const items = Object.values(database.standardAssessmentItems)
  
  items.forEach((item: any) => {
    // 检查是否包含原系统字段
    if (item.item_description_raw || item.score_value_raw !== undefined) {
      issues.push(`项点 ${item.id} 包含原系统格式字段`)
      needsRepair = true
    }
    
    // 检查必要字段
    if (!item.name) {
      issues.push(`项点 ${item.id} 缺少 name 字段`)
      needsRepair = true
    }
    
    if (!item.description) {
      issues.push(`项点 ${item.id} 缺少 description 字段`)
      needsRepair = true
    }
  })

  return {
    isValid: issues.length === 0,
    needsRepair,
    issues
  }
} 