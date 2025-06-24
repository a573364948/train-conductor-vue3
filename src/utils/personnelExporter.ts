import * as XLSX from 'xlsx'
import { ExcelHelper } from './excelHelper'
import type { EnhancedConductor } from '@/types'
import type { ExportOptions, TemplateField } from '@/types/importExport'

/**
 * 人员数据导出器
 */
export class PersonnelExporter {
  
  // 字段映射配置
  static readonly FIELD_MAPPING: Record<string, TemplateField> = {
    employeeId: { 
      key: 'employeeId', 
      header: '工号*', 
      width: 12, 
      required: true,
      type: 'text'
    },
    name: { 
      key: 'name', 
      header: '姓名*', 
      width: 10, 
      required: true,
      type: 'text'
    },
    department: { 
      key: 'department', 
      header: '部门*', 
      width: 15, 
      required: true,
      type: 'text'
    },
    status: { 
      key: 'status', 
      header: '状态*', 
      width: 12, 
      required: true,
      type: 'select',
      options: ['正式启用', '临时启用', '后备', '免职']
    },
    joinDate: { 
      key: 'joinDate', 
      header: '入职日期', 
      width: 12, 
      required: false,
      type: 'date'
    },
    enableDate: { 
      key: 'enableDate', 
      header: '启用日期', 
      width: 12, 
      required: false,
      type: 'date'
    },
    note: { 
      key: 'note', 
      header: '备注', 
      width: 20, 
      required: false,
      type: 'text'
    },
    id: { 
      key: 'id', 
      header: '_系统ID', 
      width: 0, 
      required: false,
      hidden: true,
      type: 'text'
    }
  }
  
  // 字段组映射
  static readonly FIELD_GROUPS: Record<string, string[]> = {
    basic: ['employeeId', 'name', 'department', 'status'],
    dates: ['joinDate', 'enableDate'],
    notes: ['note'],
    systemId: ['id']
  }
  
  /**
   * 导出人员数据到Excel
   */
  static async exportToExcel(
    conductors: EnhancedConductor[], 
    options: ExportOptions
  ): Promise<void> {
    try {
      // 准备导出数据
      const data = this.prepareExportData(conductors, options)
      
      // 生成文件名
      const filename = this.generateFilename(options)
      
      // 配置Excel写入选项
      const writeOptions = {
        sheetName: '人员数据',
        columnWidths: this.getColumnWidths(options),
        includeInstructions: options.includeInstructions
      }
      
      // 导出文件
      ExcelHelper.writeFile(data, filename, writeOptions)
      
    } catch (error: any) {
      throw new Error(`导出失败: ${error.message}`)
    }
  }
  
  /**
   * 准备导出数据
   */
  static prepareExportData(
    conductors: EnhancedConductor[], 
    options: ExportOptions
  ): any[] {
    // 获取要导出的字段
    const fieldsToExport = this.getFieldsToExport(options.fields)
    
    return conductors.map(conductor => {
      const row: any = {}
      
      fieldsToExport.forEach(fieldKey => {
        const mapping = this.FIELD_MAPPING[fieldKey]
        if (!mapping || mapping.hidden) return
        
        const value = this.formatFieldValue(conductor[fieldKey as keyof EnhancedConductor], fieldKey)
        row[mapping.header] = value
      })
      
      return row
    })
  }
  
  /**
   * 获取要导出的字段列表
   */
  static getFieldsToExport(fieldGroups: string[]): string[] {
    const fields = new Set<string>()
    
    // 基本信息总是包含
    this.FIELD_GROUPS.basic.forEach(field => fields.add(field))
    
    // 添加其他选择的字段组
    fieldGroups.forEach(group => {
      if (this.FIELD_GROUPS[group]) {
        this.FIELD_GROUPS[group].forEach(field => fields.add(field))
      }
    })
    
    return Array.from(fields)
  }
  
  /**
   * 格式化字段值
   */
  static formatFieldValue(value: any, fieldKey: string): string {
    if (value === null || value === undefined) return ''
    
    const mapping = this.FIELD_MAPPING[fieldKey]
    
    switch (mapping?.type) {
      case 'date':
        return ExcelHelper.formatDate(value)
      
      case 'select':
        return String(value || '后备') // 状态字段默认值
      
      default:
        return String(value)
    }
  }
  
  /**
   * 获取列宽配置
   */
  static getColumnWidths(options: ExportOptions): Array<{ wch: number }> {
    const fieldsToExport = this.getFieldsToExport(options.fields)
    
    return fieldsToExport
      .filter(fieldKey => {
        const mapping = this.FIELD_MAPPING[fieldKey]
        return mapping && !mapping.hidden
      })
      .map(fieldKey => ({
        wch: this.FIELD_MAPPING[fieldKey].width
      }))
  }
  
  /**
   * 生成导出文件名
   */
  static generateFilename(options: ExportOptions): string {
    let prefix = '列车长人员数据'
    
    // 根据导出范围调整文件名
    switch (options.range) {
      case 'filtered':
        prefix += '_筛选结果'
        break
      case 'selected':
        prefix += '_已选择'
        break
      default:
        prefix += '_全部'
    }
    
    const extension = options.format === 'csv' ? 'csv' : 'xlsx'
    return ExcelHelper.generateFilename(prefix, extension)
  }
  
  /**
   * 导出空白模板
   */
  static async exportTemplate(type: 'empty' | 'example'): Promise<void> {
    try {
      const headers = this.getTemplateHeaders()
      let data = [headers]
      
      // 添加示例数据
      if (type === 'example') {
        data.push(...this.getExampleData())
      }
      
      const ws = XLSX.utils.aoa_to_sheet(data)
      
      // 应用模板样式
      this.applyTemplateStyles(ws)
      
      // 添加数据验证
      this.addDataValidation(ws)
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '人员导入模板')
      
      // 添加说明页
      const instructionSheet = ExcelHelper.createInstructionSheet()
      XLSX.utils.book_append_sheet(wb, instructionSheet, '使用说明')
      
      const filename = `列车长导入模板_${type}_${this.getDateString()}.xlsx`
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const { saveAs } = await import('file-saver')
      saveAs(blob, filename)
      
    } catch (error: any) {
      throw new Error(`模板导出失败: ${error.message}`)
    }
  }
  
  /**
   * 获取模板表头
   */
  static getTemplateHeaders(): string[] {
    return Object.values(this.FIELD_MAPPING)
      .filter(mapping => !mapping.hidden)
      .map(mapping => mapping.header)
  }
  
  /**
   * 获取示例数据
   */
  static getExampleData(): string[][] {
    return [
      ['001', '张三', '客运一队', '正式启用', '2023-01-01', '2023-02-01', '示例数据'],
      ['002', '李四', '客运二队', '后备', '2024-01-15', '', '新员工'],
      ['003', '王五', '客运三队', '临时启用', '2024-02-01', '2024-03-01', '临时调配'],
      ['004', '赵六', '客运四队', '免职', '2022-01-01', '2022-12-31', '已离职']
    ]
  }
  
  /**
   * 应用模板样式
   */
  static applyTemplateStyles(ws: XLSX.WorkSheet): void {
    // 设置列宽
    ws['!cols'] = Object.values(this.FIELD_MAPPING)
      .filter(mapping => !mapping.hidden)
      .map(mapping => ({ wch: mapping.width }))
    
    // 冻结首行
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    // 设置表头样式
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellRef]) continue
      
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2F5597' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }
  }
  
  /**
   * 添加数据验证
   */
  static addDataValidation(ws: XLSX.WorkSheet): void {
    // 为状态列添加下拉选项（假设状态列是第4列，索引为3）
    const statusColumnIndex = 3
    const statusOptions = this.FIELD_MAPPING.status.options
    
    if (statusOptions) {
      // 这里可以添加Excel数据验证功能
      // 注意：XLSX库的数据验证功能可能有限，实际使用时可能需要其他方案
    }
  }
  
  /**
   * 导出当前数据用于编辑
   */
  static async exportForEdit(
    conductors: EnhancedConductor[]
  ): Promise<void> {
    const options: ExportOptions = {
      range: 'all',
      fields: ['basic', 'dates', 'notes', 'systemId'],
      includeSystemId: true,
      includeInstructions: true,
      format: 'xlsx'
    }
    
    await this.exportToExcel(conductors, options)
  }
  
  /**
   * 获取当前日期字符串
   */
  static getDateString(): string {
    return new Date().toISOString().split('T')[0]
  }
} 