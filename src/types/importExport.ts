import type { EnhancedConductor } from './index'

// 导出选项
export interface ExportOptions {
  range: 'all' | 'filtered' | 'selected'
  fields: string[]
  includeSystemId: boolean
  includeInstructions: boolean
  format: 'xlsx' | 'csv'
}



// 导入选项
export interface ImportOptions {
  mode?: 'create' | 'update' | 'smart'
  conflictResolution?: 'manual' | 'auto'
  validateOnly?: boolean
}

// 解析结果
export interface ParseResult {
  success: boolean
  data: any[]
  errors: ValidationError[]
  warnings: string[]
  matching: MatchResult[]
  statistics: {
    totalRows: number
    validRows: number
    errorRows: number
  }
}

// 验证错误
export interface ValidationError {
  row: number
  field: string
  message: string
}

// 匹配结果
export interface MatchResult {
  index: number
  importRow: any
  existingRecord?: EnhancedConductor
  action: 'create' | 'update' | 'skip'
  confidence: number
  differences?: FieldDifference[]
  conflicts?: ConflictInfo[]
}

// 字段差异
export interface FieldDifference {
  field: string
  fieldLabel: string
  currentValue: any
  newValue: any
  type: 'addition' | 'modification' | 'deletion'
}

// 冲突信息
export interface ConflictInfo {
  type: 'employeeId' | 'name' | 'complex'
  description: string
  severity: 'low' | 'medium' | 'high'
}

// Excel写入选项
export interface WriteOptions {
  sheetName?: string
  columnWidths?: Array<{ wch: number }>
  includeInstructions?: boolean
}

// 模板字段定义
export interface TemplateField {
  key: string
  header: string
  width: number
  required: boolean
  hidden?: boolean
  type?: 'text' | 'date' | 'select'
  options?: string[]
}

// 导入进度
export interface ImportProgress {
  total: number
  processed: number
  success: number
  failed: number
  currentOperation: string
}

// 导入结果
export interface ImportResult {
  success: boolean
  message: string
  successCount: number
  failCount: number
  skipCount: number
  duration: number
  errors?: string[]
  details?: ImportDetail[]
}

// 导入详情
export interface ImportDetail {
  row: number
  action: 'created' | 'updated' | 'skipped' | 'failed'
  employeeId: string
  name: string
  message?: string
}

// 操作记录
export interface OperationRecord {
  id: string
  type: 'export' | 'import'
  description: string
  time: string
  status: 'success' | 'failed'
  details?: any
} 