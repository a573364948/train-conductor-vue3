import * as XLSX from 'xlsx'
import type { MonthlyData, ConductorMonthlyData } from '@/types'

export class ExcelProcessor {
  /**
   * 读取Excel文件
   */
  static async readFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // 获取第一个工作表
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          
          // 转换为JSON
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsArrayBuffer(file)
    })
  }
  
  /**
   * 验证Excel数据格式
   */
  static validateData(data: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // 检查数据是否为空
    if (!data || data.length < 2) {
      errors.push('文件为空或不包含数据行')
      return { isValid: false, errors }
    }
    
    // 检查表头
    const requiredHeaders = ['工号', '姓名', '部门', '奖励基数', '奖励金额', '月度得分']
    const headers = data[0]
    
    if (!headers || !Array.isArray(headers)) {
      errors.push('无法识别表头行')
      return { isValid: false, errors }
    }
    
    // 检查必需的列
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        errors.push(`缺少必需的列：${required}`)
      }
    }
    
    // 检查数据行
    if (data.length < 2) {
      errors.push('文件不包含数据行')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * 智能判断列车长状态
   */
  static determineStatus(monthlyScore: number, rewardAmount: number): '在岗' | '不在岗' | '助勤' | '待确认' {
    // 1. 无数据情况
    if ((!monthlyScore || monthlyScore === 0) && (!rewardAmount || rewardAmount === 0)) {
      return '不在岗'  // 当月没有数据
    }
    
    // 2. 助勤情况 (固定1500元)
    if (monthlyScore === 0 && rewardAmount === 1500) {
      return '助勤'  // 0分+1500元=助勤
    }
    
    // 3. 重大考核情况
    if (monthlyScore > 0 && monthlyScore < 70 && rewardAmount === 0) {
      return '在岗'  // 有重大考核扣分但仍算在岗
    }
    
    // 4. 得分>=70但无奖励的特殊情况
    if (monthlyScore >= 70 && rewardAmount === 0) {
      return '待确认'  // 特殊标记：可能是天数不够或考试末尾淘汰
    }
    
    // 5. 正常在岗情况
    if (monthlyScore > 0 && rewardAmount > 0) {
      return '在岗'  // 有分有钱=正常在岗
    }
    
    // 兜底情况
    return '不在岗'
  }
  
  /**
   * 处理月度考核数据
   */
  static processMonthlyData(
    data: any[],
    year: number,
    month: number
  ): MonthlyData {
    const headers = data[0]
    const rows = data.slice(1)
    
    // 获取列索引
    const colIndex = {
      id: headers.indexOf('工号'),
      name: headers.indexOf('姓名'),
      department: headers.indexOf('部门'),
      rewardBase: headers.indexOf('奖励基数'),
      rewardAmount: headers.indexOf('奖励金额'),
      monthlyScore: headers.indexOf('月度得分')
    }
    
    const conductorData: ConductorMonthlyData[] = []
    
    for (const row of rows) {
      if (!row[colIndex.id]) continue // 跳过空行
      
      const monthlyScore = Number(row[colIndex.monthlyScore]) || 0
      const rewardAmount = Number(row[colIndex.rewardAmount]) || 0
      const status = this.determineStatus(monthlyScore, rewardAmount)
      
      const conductor: ConductorMonthlyData = {
        id: String(row[colIndex.id]),
        name: String(row[colIndex.name] || ''),
        department: String(row[colIndex.department] || ''),
        rewardBase: Number(row[colIndex.rewardBase]) || 0,
        rewardAmount: rewardAmount,
        monthlyScore: monthlyScore,
        isActive: status === '在岗' || status === '助勤',
        status: status
      }
      
      conductorData.push(conductor)
    }
    
    return {
      id: `${year}_${month}`,
      year,
      month,
      data: conductorData
    }
  }
  
  /**
   * 导出Excel文件
   */
  static exportToExcel(data: any[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, filename)
  }
  
  /**
   * 下载Excel模板
   */
  static downloadTemplate() {
    const templateData = [
      ['工号', '姓名', '部门', '奖励基数', '奖励金额', '月度得分'],
      ['001', '张三', '高铁一队', 3000, 2800, 95],
      ['002', '李四', '动车二队', 3000, 2600, 92],
      ['003', '王五', '普速三队', 3000, 0, 0]
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '月度考核数据')
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 10 }, // 工号
      { wch: 10 }, // 姓名
      { wch: 15 }, // 部门
      { wch: 10 }, // 奖励基数
      { wch: 10 }, // 奖励金额
      { wch: 10 }  // 月度得分
    ]
    
    XLSX.writeFile(wb, '列车长月度考核数据模板.xlsx')
  }
} 