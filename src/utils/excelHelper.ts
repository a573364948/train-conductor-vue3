import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { WriteOptions, ValidationError } from '@/types/importExport'

/**
 * Excel操作帮助类
 */
export class ExcelHelper {
  
  /**
   * 读取Excel文件
   */
  static async readFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { 
            type: 'binary',
            cellDates: true,
            cellNF: false,
            cellText: false
          })
          
          // 读取第一个工作表
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // 转换为JSON，空值用空字符串填充
          const data = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            raw: false // 确保日期等格式正确显示
          })
          
          resolve(data)
        } catch (error: any) {
          reject(new Error(`文件解析失败: ${error.message}`))
        }
      }
      
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsBinaryString(file)
    })
  }
  
  /**
   * 写入Excel文件
   */
  static writeFile(data: any[], filename: string, options: WriteOptions = {}) {
    try {
      // 创建工作表
      const ws = XLSX.utils.json_to_sheet(data)
      
      // 应用样式和格式
      this.applyStyles(ws, options)
      
      // 创建工作簿
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, options.sheetName || '数据')
      
      // 添加说明页
      if (options.includeInstructions) {
        const instructionSheet = this.createInstructionSheet()
        XLSX.utils.book_append_sheet(wb, instructionSheet, '使用说明')
      }
      
      // 生成文件并下载
      const wbout = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true
      })
      
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      saveAs(blob, filename)
      
    } catch (error: any) {
      throw new Error(`文件写入失败: ${error.message}`)
    }
  }
  
  /**
   * 应用Excel样式
   */
  static applyStyles(ws: XLSX.WorkSheet, options: WriteOptions) {
    // 设置列宽
    if (options.columnWidths) {
      ws['!cols'] = options.columnWidths
    }
    
    // 获取数据范围
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    
    // 冻结首行
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    // 设置表头样式
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellRef]) continue
      
      // 表头样式
      ws[cellRef].s = {
        font: { 
          bold: true, 
          color: { rgb: 'FFFFFF' },
          sz: 11
        },
        fill: { 
          fgColor: { rgb: '4F81BD' } 
        },
        alignment: { 
          horizontal: 'center', 
          vertical: 'center',
          wrapText: true
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }
    
    // 设置数据行样式
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        if (!ws[cellRef]) continue
        
        ws[cellRef].s = {
          alignment: { 
            vertical: 'center',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        }
      }
    }
  }
  
  /**
   * 创建使用说明工作表
   */
  static createInstructionSheet(): XLSX.WorkSheet {
    const instructions = [
      ['列车长人员数据导入说明'],
      [''],
      ['字段说明:', ''],
      ['工号*', '员工工号，必填，用于唯一标识'],
      ['姓名*', '员工姓名，必填'],
      ['部门*', '所属部门，必填'],
      ['状态*', '当前状态，必填（正式启用/临时启用/后备/免职）'],
      ['入职日期', '入职时间，格式：YYYY-MM-DD'],
      ['启用日期', '启用时间，格式：YYYY-MM-DD'],
      ['备注', '其他信息，选填'],
      ['_系统ID', '内部标识，用于精确匹配，请勿修改'],
      [''],
      ['注意事项:', ''],
      ['1. 带*号的字段为必填项'],
      ['2. 日期格式请使用 YYYY-MM-DD（如：2024-01-01）'],
      ['3. 状态值只能是：正式启用、临时启用、后备、免职'],
      ['4. 工号在系统中必须唯一'],
      ['5. 如需更新现有人员，请保留_系统ID列'],
      ['6. 导入前建议先备份现有数据'],
      [''],
      ['示例数据:', ''],
      ['工号', '姓名', '部门', '状态', '入职日期', '启用日期', '备注'],
      ['001', '张三', '客运一队', '正式启用', '2023-01-01', '2023-02-01', '示例数据'],
      ['002', '李四', '客运二队', '后备', '2024-01-15', '', '新员工']
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(instructions)
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 第一列
      { wch: 40 }  // 第二列
    ]
    
    // 设置标题样式
    const titleCell = ws['A1']
    if (titleCell) {
      titleCell.s = {
        font: { bold: true, sz: 14, color: { rgb: '000000' } },
        alignment: { horizontal: 'center' }
      }
    }
    
    return ws
  }
  
  /**
   * 验证文件格式
   */
  static validateFileFormat(file: File): ValidationError[] {
    const errors: ValidationError[] = []
    
    // 检查文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      errors.push({
        row: 0,
        field: 'file',
        message: '文件大小不能超过10MB'
      })
    }
    
    // 检查文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]
    
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const allowedExtensions = ['xlsx', 'xls', 'csv']
    
    if (!allowedExtensions.includes(fileExtension || '')) {
      errors.push({
        row: 0,
        field: 'file',
        message: '不支持的文件格式，请使用Excel (.xlsx, .xls) 或CSV (.csv) 文件'
      })
    }
    
    return errors
  }
  
  /**
   * 生成带时间戳的文件名
   */
  static generateFilename(prefix: string, extension: string = 'xlsx'): string {
    const now = new Date()
    const timestamp = now.toISOString().split('T')[0] // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
    return `${prefix}_${timestamp}_${time}.${extension}`
  }
  
  /**
   * 检查日期格式是否有效
   */
  static isValidDate(dateString: string): boolean {
    if (!dateString || dateString.trim() === '') return true // 空值允许
    
    // 支持多种日期格式
    const dateFormats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-M-D
      /^\d{4}\/\d{1,2}\/\d{1,2}$/ // YYYY/M/D
    ]
    
    const isFormatValid = dateFormats.some(format => format.test(dateString.trim()))
    if (!isFormatValid) return false
    
    // 检查日期是否真实存在
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }
  
  /**
   * 标准化日期格式
   */
  static formatDate(dateValue: any): string {
    if (!dateValue) return ''
    
    let date: Date
    
    if (dateValue instanceof Date) {
      date = dateValue
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue)
    } else if (typeof dateValue === 'number') {
      // Excel日期序列号
      date = new Date((dateValue - 25569) * 86400 * 1000)
    } else {
      return ''
    }
    
    if (isNaN(date.getTime())) return ''
    
    // 返回 YYYY-MM-DD 格式
    return date.toISOString().split('T')[0]
  }
} 