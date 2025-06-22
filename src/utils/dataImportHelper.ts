// 数据导入助手工具
export interface ImportValidationResult {
  isValid: boolean
  format: 'vue3' | 'original' | 'unknown'
  errors: string[]
  warnings: string[]
  dataPreview?: {
    conductorCount: number
    monthlyDataCount: number
    assessmentPeriodsCount: number
    standardItemsCount: number
  }
}

export function validateImportData(jsonString: string): ImportValidationResult {
  const result: ImportValidationResult = {
    isValid: false,
    format: 'unknown',
    errors: [],
    warnings: []
  }

  try {
    const data = JSON.parse(jsonString)
    
    // 检测原系统格式
    if (data.exportInfo && data.data) {
      result.format = 'original'
      const actualData = data.data
      
      // 验证原系统必要字段 - 更宽松的验证
      const hasConductorDB = actualData.conductorDB && typeof actualData.conductorDB === 'object'
      const hasMonthlyData = Array.isArray(actualData.monthlyData)
      const hasAssessmentDB = actualData.assessmentDB && typeof actualData.assessmentDB === 'object'
      
      if (!hasConductorDB && !hasMonthlyData && !hasAssessmentDB) {
        result.errors.push('缺少核心数据（至少需要 conductorDB、monthlyData 或 assessmentDB 中的一个）')
      }
      
      if (result.errors.length === 0) {
        result.isValid = true
        result.dataPreview = {
          conductorCount: Object.keys(actualData.conductorDB || {}).length,
          monthlyDataCount: Array.isArray(actualData.monthlyData) ? actualData.monthlyData.length : 0,
          assessmentPeriodsCount: Object.keys(actualData.assessmentDB || {}).length,
          standardItemsCount: Object.keys(actualData.standardAssessmentItems || {}).length
        }
      }
    }
    // 检测Vue3格式
    else if (data.conductorDB || data.monthlyData) {
      result.format = 'vue3'
      
      if (!data.conductorDB) {
        result.errors.push('缺少 conductorDB 数据')
      }
      
      if (!data.monthlyData) {
        result.errors.push('缺少 monthlyData 数据')
      }
      
      if (result.errors.length === 0) {
        result.isValid = true
        result.dataPreview = {
          conductorCount: Object.keys(data.conductorDB || {}).length,
          monthlyDataCount: Array.isArray(data.monthlyData) ? data.monthlyData.length : 0,
          assessmentPeriodsCount: Object.keys(data.assessmentDB || {}).length,
          standardItemsCount: Object.keys(data.standardAssessmentItems || {}).length
        }
      }
    }
    else {
      result.errors.push('无法识别的数据格式')
    }
    
  } catch (error) {
    result.errors.push(`JSON 解析失败: ${(error as Error).message}`)
  }

  return result
}

export function formatDataPreview(preview: ImportValidationResult['dataPreview']): string {
  if (!preview) return ''
  
  return [
    `列车长信息: ${preview.conductorCount} 条`,
    `月度数据: ${preview.monthlyDataCount} 个月`,
    `考核记录: ${preview.assessmentPeriodsCount} 个月`,
    `标准项点: ${preview.standardItemsCount} 个`
  ].join('，')
} 