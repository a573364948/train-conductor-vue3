import { ExcelHelper } from './excelHelper'
import { usePersonnelStore } from '@/stores/personnel'
import type { EnhancedConductor } from '@/types'
import type { 
  ImportOptions, 
  ParseResult, 
  MatchResult, 
  ValidationError, 
  FieldDifference,
  ConflictInfo
} from '@/types/importExport'

/**
 * 人员数据导入器
 */
export class PersonnelImporter {
  
  // 字段别名映射（支持多种表头格式）
  static readonly FIELD_ALIASES: Record<string, string[]> = {
    employeeId: ['工号', '员工号', 'ID', 'employeeId', '工号*', '员工工号'],
    name: ['姓名', '名称', 'name', '姓名*', '员工姓名'],
    department: ['部门', '科室', 'department', '部门*', '所属部门'],
    status: ['状态', '职务状态', 'status', '状态*', '当前状态'],
    joinDate: ['入职日期', '入职时间', 'joinDate', '入职'],
    enableDate: ['启用日期', '启用时间', 'enableDate', '启用'],
    note: ['备注', '说明', 'note', 'remark', '备注信息'],
    id: ['_系统ID', '系统ID', 'id', 'ID', '内部ID']
  }
  
  // 有效状态值
  static readonly VALID_STATUS_VALUES = ['正式启用', '临时启用', '后备', '免职']
  
  /**
   * 解析导入文件
   */
  static async parseFile(file: File, options: ImportOptions = {}): Promise<ParseResult> {
    try {
      // 验证文件格式
      const formatErrors = ExcelHelper.validateFileFormat(file)
      if (formatErrors.length > 0) {
        return {
          success: false,
          data: [],
          errors: formatErrors,
          warnings: [],
          matching: [],
          statistics: { totalRows: 0, validRows: 0, errorRows: formatErrors.length }
        }
      }
      
      // 读取文件内容
      const rawData = await ExcelHelper.readFile(file)
      
      if (rawData.length === 0) {
        return {
          success: false,
          data: [],
          errors: [{ row: 0, field: 'file', message: '文件中没有数据' }],
          warnings: [],
          matching: [],
          statistics: { totalRows: 0, validRows: 0, errorRows: 1 }
        }
      }
      
      // 标准化字段名
      const normalizedData = this.normalizeFields(rawData)
      
      // 验证数据
      const validation = this.validateData(normalizedData)
      
      // 如果只是验证模式，不需要匹配
      let matching: MatchResult[] = []
      if (!options.validateOnly && validation.errors.length === 0) {
        matching = await this.matchRecords(normalizedData)
      }
      
      // 生成统计信息
      const statistics = this.generateStatistics(normalizedData, validation, matching)
      
      return {
        success: validation.errors.length === 0,
        data: normalizedData,
        errors: validation.errors,
        warnings: validation.warnings,
        matching,
        statistics
      }
      
    } catch (error: any) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, field: 'file', message: `文件解析失败: ${error.message}` }],
        warnings: [],
        matching: [],
        statistics: { totalRows: 0, validRows: 0, errorRows: 1 }
      }
    }
  }
  
  /**
   * 标准化字段名
   */
  static normalizeFields(rawData: any[]): any[] {
    if (rawData.length === 0) return []
    
    const headers = Object.keys(rawData[0])
    const fieldMapping = this.createFieldMapping(headers)
    
    return rawData.map((row, index) => {
      const normalizedRow: any = {
        _rowIndex: index + 2 // Excel行号（包含表头）
      }
      
      Object.entries(row).forEach(([key, value]) => {
        const standardField = fieldMapping[key]
        if (standardField) {
          // 清理数据
          let cleanValue = value
          if (typeof value === 'string') {
            cleanValue = value.trim()
          }
          normalizedRow[standardField] = cleanValue
        }
      })
      
      return normalizedRow
    })
  }
  
  /**
   * 创建字段映射
   */
  static createFieldMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {}
    
    headers.forEach(header => {
      const cleanHeader = header.trim()
      
      for (const [standardField, aliases] of Object.entries(this.FIELD_ALIASES)) {
        const isMatch = aliases.some(alias => {
          const cleanAlias = alias.toLowerCase().replace(/\*/g, '').trim()
          const cleanHeaderLower = cleanHeader.toLowerCase().replace(/\*/g, '').trim()
          
          return cleanHeaderLower === cleanAlias || 
                 cleanHeaderLower.includes(cleanAlias) || 
                 cleanAlias.includes(cleanHeaderLower)
        })
        
        if (isMatch) {
          mapping[header] = standardField
          break
        }
      }
    })
    
    return mapping
  }
  
  /**
   * 数据验证
   */
  static validateData(data: any[]): { errors: ValidationError[], warnings: string[] } {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const employeeIds = new Set<string>()
    
    data.forEach((row, index) => {
      const rowNumber = row._rowIndex || index + 2
      
      // 必填字段验证
      if (!row.employeeId?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'employeeId',
          message: '工号不能为空'
        })
      } else {
        // 检查工号重复
        const employeeId = row.employeeId.trim()
        if (employeeIds.has(employeeId)) {
          errors.push({
            row: rowNumber,
            field: 'employeeId',
            message: `工号"${employeeId}"在导入文件中重复`
          })
        } else {
          employeeIds.add(employeeId)
        }
      }
      
      if (!row.name?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'name',
          message: '姓名不能为空'
        })
      }
      
      if (!row.department?.trim()) {
        errors.push({
          row: rowNumber,
          field: 'department',
          message: '部门不能为空'
        })
      }
      
      // 状态值验证
      if (row.status) {
        const status = row.status.trim()
        if (!this.VALID_STATUS_VALUES.includes(status)) {
          errors.push({
            row: rowNumber,
            field: 'status',
            message: `状态值"${status}"无效，允许的值：${this.VALID_STATUS_VALUES.join('、')}`
          })
        }
      } else {
        warnings.push(`第${rowNumber}行：状态为空，将使用默认值"后备"`)
        row.status = '后备' // 设置默认值
      }
      
      // 日期格式验证
      if (row.joinDate && !ExcelHelper.isValidDate(row.joinDate)) {
        warnings.push(`第${rowNumber}行：入职日期格式可能不正确（${row.joinDate}）`)
      }
      
      if (row.enableDate && !ExcelHelper.isValidDate(row.enableDate)) {
        warnings.push(`第${rowNumber}行：启用日期格式可能不正确（${row.enableDate}）`)
      }
      
      // 数据完整性检查
      if (row.status === '正式启用' && !row.enableDate) {
        warnings.push(`第${rowNumber}行：正式启用状态建议填写启用日期`)
      }
      
      if (row.enableDate && !row.joinDate) {
        warnings.push(`第${rowNumber}行：有启用日期但缺少入职日期`)
      }
    })
    
    return { errors, warnings }
  }
  
  /**
   * 匹配现有记录
   */
  static async matchRecords(importData: any[]): Promise<MatchResult[]> {
    const personnelStore = usePersonnelStore()
    const existingConductors = personnelStore.allConductors
    
    const results: MatchResult[] = []
    
    for (const [index, row] of importData.entries()) {
      const matchResult = await this.findBestMatch(row, existingConductors)
      
      results.push({
        index,
        importRow: row,
        existingRecord: matchResult.record,
        action: matchResult.record ? 'update' : 'create',
        confidence: matchResult.confidence,
        differences: matchResult.record ? 
          this.findDifferences(row, matchResult.record) : undefined,
        conflicts: this.detectConflicts(row, matchResult.record, existingConductors)
      })
    }
    
    return results
  }
  
  /**
   * 查找最佳匹配
   */
  static async findBestMatch(
    importRow: any, 
    existing: EnhancedConductor[]
  ): Promise<{ record?: EnhancedConductor, confidence: number }> {
    
    // 1. 系统ID匹配（最高优先级）
    if (importRow.id?.trim()) {
      const match = existing.find(c => c.id === importRow.id.trim())
      if (match) {
        return { record: match, confidence: 1.0 }
      }
    }
    
    // 2. 工号精确匹配
    if (importRow.employeeId?.trim()) {
      const employeeId = importRow.employeeId.trim()
      const match = existing.find(c => c.employeeId === employeeId)
      
      if (match) {
        // 检查姓名是否也匹配
        const nameMatch = match.name === importRow.name?.trim()
        return { 
          record: match, 
          confidence: nameMatch ? 0.95 : 0.8 
        }
      }
    }
    
    // 3. 姓名+部门匹配
    if (importRow.name?.trim() && importRow.department?.trim()) {
      const name = importRow.name.trim()
      const department = importRow.department.trim()
      
      const matches = existing.filter(c => 
        c.name === name && c.department === department
      )
      
      if (matches.length === 1) {
        return { record: matches[0], confidence: 0.7 }
      } else if (matches.length > 1) {
        // 多个匹配，返回第一个但置信度较低
        return { record: matches[0], confidence: 0.3 }
      }
    }
    
    // 4. 模糊匹配（姓名相似度）
    if (importRow.name?.trim()) {
      const name = importRow.name.trim()
      const fuzzyMatches = existing
        .map(c => ({
          record: c,
          similarity: this.calculateSimilarity(name, c.name)
        }))
        .filter(m => m.similarity > 0.8)
        .sort((a, b) => b.similarity - a.similarity)
      
      if (fuzzyMatches.length > 0) {
        return { 
          record: fuzzyMatches[0].record, 
          confidence: fuzzyMatches[0].similarity * 0.5 
        }
      }
    }
    
    // 无匹配
    return { confidence: 0 }
  }
  
  /**
   * 计算字符串相似度（编辑距离算法）
   */
  static calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null))
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i
    for (let j = 0; j <= len2; j++) matrix[0][j] = j
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }
    
    const maxLen = Math.max(len1, len2)
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen
  }
  
  /**
   * 查找字段差异
   */
  static findDifferences(importRow: any, existing: EnhancedConductor): FieldDifference[] {
    const differences: FieldDifference[] = []
    
    const compareFields = [
      { key: 'employeeId', label: '工号' },
      { key: 'name', label: '姓名' },
      { key: 'department', label: '部门' },
      { key: 'status', label: '状态' },
      { key: 'joinDate', label: '入职日期' },
      { key: 'enableDate', label: '启用日期' },
      { key: 'note', label: '备注' }
    ]
    
    compareFields.forEach(({ key, label }) => {
      const importValue = importRow[key]?.trim?.() || importRow[key]
      const existingValue = existing[key as keyof EnhancedConductor]
      
      // 标准化比较值
      let normalizedImportValue = importValue
      let normalizedExistingValue = existingValue
      
      // 日期字段特殊处理
      if (key.includes('Date')) {
        normalizedImportValue = ExcelHelper.formatDate(importValue)
        normalizedExistingValue = ExcelHelper.formatDate(existingValue)
      }
      
      if (importValue !== undefined && normalizedImportValue !== normalizedExistingValue) {
        differences.push({
          field: key,
          fieldLabel: label,
          currentValue: normalizedExistingValue,
          newValue: normalizedImportValue,
          type: existingValue ? 'modification' : 'addition'
        })
      }
    })
    
    return differences
  }
  
  /**
   * 检测冲突
   */
  static detectConflicts(
    importRow: any, 
    existingRecord?: EnhancedConductor,
    allExisting?: EnhancedConductor[]
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []
    
    if (!allExisting) return conflicts
    
    const employeeId = importRow.employeeId?.trim()
    const name = importRow.name?.trim()
    
    // 工号冲突检查
    if (employeeId && existingRecord) {
      const employeeIdConflict = allExisting.find(c => 
        c.employeeId === employeeId && c.id !== existingRecord.id
      )
      
      if (employeeIdConflict) {
        conflicts.push({
          type: 'employeeId',
          description: `工号"${employeeId}"已被其他人员"${employeeIdConflict.name}"使用`,
          severity: 'high'
        })
      }
    }
    
    // 姓名冲突检查（在不同部门的同名人员）
    if (name && importRow.department) {
      const nameConflicts = allExisting.filter(c => 
        c.name === name && 
        c.department !== importRow.department?.trim() &&
        (!existingRecord || c.id !== existingRecord.id)
      )
      
      if (nameConflicts.length > 0) {
        conflicts.push({
          type: 'name',
          description: `存在同名人员在其他部门：${nameConflicts.map(c => c.department).join('、')}`,
          severity: 'medium'
        })
      }
    }
    
    return conflicts
  }
  
  /**
   * 生成统计信息
   */
  static generateStatistics(
    data: any[], 
    validation: { errors: ValidationError[], warnings: string[] },
    matching: MatchResult[]
  ) {
    const totalRows = data.length
    const errorRows = validation.errors.length
    const validRows = totalRows - errorRows
    
    return {
      totalRows,
      validRows,
      errorRows
    }
  }
  
  /**
   * 执行批量导入
   */
  static async executeImport(
    matches: MatchResult[], 
    options: ImportOptions = {}
  ): Promise<{ success: number, failed: number, errors: string[] }> {
    const personnelStore = usePersonnelStore()
    const results = { success: 0, failed: 0, errors: [] as string[] }
    
    for (const match of matches) {
      try {
        if (match.action === 'skip') {
          continue
        }
        
        const importData = this.prepareImportData(match.importRow)
        
        if (match.action === 'create') {
          await personnelStore.addConductor(importData)
        } else if (match.action === 'update' && match.existingRecord) {
          await personnelStore.updateConductor(match.existingRecord.id, importData)
        }
        
        results.success++
        
      } catch (error: any) {
        results.failed++
        const identifier = match.importRow.name || match.importRow.employeeId || '未知'
        results.errors.push(`${identifier}: ${error.message}`)
      }
    }
    
    return results
  }
  
  /**
   * 准备导入数据
   */
  static prepareImportData(row: any): Partial<EnhancedConductor> {
    const data: Partial<EnhancedConductor> = {
      employeeId: row.employeeId?.trim() || '',
      name: row.name?.trim() || '',
      department: row.department?.trim() || '',
      status: row.status?.trim() || '后备',
      note: row.note?.trim() || undefined
    }
    
    // 处理日期字段
    if (row.joinDate) {
      data.joinDate = ExcelHelper.formatDate(row.joinDate)
    }
    
    if (row.enableDate) {
      data.enableDate = ExcelHelper.formatDate(row.enableDate)
    }
    
    // 如果有系统ID，保留它用于更新
    if (row.id) {
      data.id = row.id
    }
    
    return data
  }
} 