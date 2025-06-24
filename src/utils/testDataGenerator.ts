import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { EnhancedConductor } from '@/types'

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  
  /**
   * 生成测试人员数据
   */
  static generateTestConductors(count: number = 20): EnhancedConductor[] {
    const departments = ['客运一队', '客运二队', '客运三队', '客运四队', '货运一队', '货运二队']
    const statuses = ['正式启用', '临时启用', '后备', '免职']
    const surnames = ['张', '李', '王', '赵', '钱', '孙', '周', '吴', '郑', '冯']
    const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英']
    
    const conductors: EnhancedConductor[] = []
    
    for (let i = 1; i <= count; i++) {
      const employeeId = String(i).padStart(3, '0')
      const surname = surnames[Math.floor(Math.random() * surnames.length)]
      const name = names[Math.floor(Math.random() * names.length)]
      const fullName = surname + name
      const department = departments[Math.floor(Math.random() * departments.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)] as '正式启用' | '临时启用' | '后备' | '免职'
      
      // 生成随机日期
      const joinDate = this.randomDate(new Date(2020, 0, 1), new Date(2024, 11, 31))
      const enableDate = status === '正式启用' || status === '临时启用' ? 
        this.randomDate(joinDate, new Date()) : undefined
      
      const conductor: EnhancedConductor = {
        id: `test_${employeeId}`,
        employeeId,
        name: fullName,
        department,
        status,
        joinDate: this.formatDate(joinDate),
        enableDate: enableDate ? this.formatDate(enableDate) : undefined,
        note: i % 5 === 0 ? `测试数据${i}` : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      conductors.push(conductor)
    }
    
    return conductors
  }
  
  /**
   * 生成测试Excel文件
   */
  static async generateTestExcelFile(filename: string = '测试导入数据.xlsx') {
    const testData = this.generateTestConductors(10)
    
    // 准备Excel数据
    const excelData = testData.map(conductor => ({
      '工号*': conductor.employeeId,
      '姓名*': conductor.name,
      '部门*': conductor.department,
      '状态*': conductor.status,
      '入职日期': conductor.joinDate || '',
      '启用日期': conductor.enableDate || '',
      '备注': conductor.note || '',
      '_系统ID': conductor.id
    }))
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 12 }, // 工号
      { wch: 10 }, // 姓名
      { wch: 15 }, // 部门
      { wch: 12 }, // 状态
      { wch: 12 }, // 入职日期
      { wch: 12 }, // 启用日期
      { wch: 20 }, // 备注
      { wch: 0 }   // 系统ID（隐藏）
    ]
    
    // 创建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '人员数据')
    
    // 添加说明页
    const instructionData = [
      ['测试数据说明'],
      [''],
      ['1. 这是用于测试导入功能的示例数据'],
      ['2. 工号、姓名、部门、状态为必填字段'],
      ['3. 状态只能是：正式启用、临时启用、后备、免职'],
      ['4. 日期格式：YYYY-MM-DD'],
      ['5. _系统ID用于精确匹配现有记录，请勿修改'],
      [''],
      ['测试场景:'],
      ['- 新增人员：删除_系统ID列或清空该列的值'],
      ['- 更新人员：保留_系统ID列的值'],
      ['- 混合操作：部分行有_系统ID，部分行没有']
    ]
    
    const instructionWs = XLSX.utils.aoa_to_sheet(instructionData)
    instructionWs['!cols'] = [{ wch: 50 }]
    XLSX.utils.book_append_sheet(wb, instructionWs, '说明')
    
    // 生成并下载文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    saveAs(blob, filename)
  }
  
  /**
   * 生成包含错误的测试文件
   */
  static async generateErrorTestFile(filename: string = '错误测试数据.xlsx') {
    const errorData = [
      // 正常数据
      { '工号*': '001', '姓名*': '张三', '部门*': '客运一队', '状态*': '正式启用', '入职日期': '2023-01-01', '启用日期': '2023-02-01' },
      
      // 错误数据 - 缺少必填字段
      { '工号*': '', '姓名*': '李四', '部门*': '客运二队', '状态*': '后备', '入职日期': '2023-02-01' },
      { '工号*': '003', '姓名*': '', '部门*': '客运三队', '状态*': '临时启用', '入职日期': '2023-03-01' },
      { '工号*': '004', '姓名*': '王五', '部门*': '', '状态*': '正式启用', '入职日期': '2023-04-01' },
      
      // 错误数据 - 无效状态值
      { '工号*': '005', '姓名*': '赵六', '部门*': '客运四队', '状态*': '无效状态', '入职日期': '2023-05-01' },
      
      // 错误数据 - 工号重复
      { '工号*': '001', '姓名*': '钱七', '部门*': '货运一队', '状态*': '后备', '入职日期': '2023-06-01' },
      
      // 错误数据 - 日期格式错误
      { '工号*': '007', '姓名*': '孙八', '部门*': '货运二队', '状态*': '正式启用', '入职日期': '无效日期', '启用日期': '2023/13/45' },
      
      // 正常数据
      { '工号*': '008', '姓名*': '周九', '部门*': '客运一队', '状态*': '后备', '入职日期': '2023-08-01' }
    ]
    
    const ws = XLSX.utils.json_to_sheet(errorData)
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, 
      { wch: 12 }, { wch: 12 }, { wch: 12 }
    ]
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '错误测试数据')
    
    // 添加错误说明
    const errorExplanation = [
      ['错误测试数据说明'],
      [''],
      ['此文件包含以下错误，用于测试验证功能：'],
      [''],
      ['第2行：工号为空'],
      ['第3行：姓名为空'],
      ['第4行：部门为空'],
      ['第5行：状态值无效（"无效状态"）'],
      ['第6行：工号重复（与第1行相同）'],
      ['第7行：日期格式错误'],
      [''],
      ['预期结果：'],
      ['- 应显示6个错误'],
      ['- 只有第1行和第8行的数据有效'],
      ['- 导入应被阻止直到错误修正']
    ]
    
    const errorWs = XLSX.utils.aoa_to_sheet(errorExplanation)
    errorWs['!cols'] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(wb, errorWs, '错误说明')
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    saveAs(blob, filename)
  }
  
  /**
   * 生成更新测试文件（包含系统ID）
   */
  static async generateUpdateTestFile(
    existingConductors: EnhancedConductor[], 
    filename: string = '更新测试数据.xlsx'
  ) {
    if (existingConductors.length === 0) {
      throw new Error('没有现有数据可用于生成更新测试文件')
    }
    
    // 选择前几个现有记录进行更新测试
    const selectedConductors = existingConductors.slice(0, Math.min(5, existingConductors.length))
    
    const updateData = selectedConductors.map((conductor, index) => {
      // 修改一些字段用于测试更新
      const modifications: any = {
        '工号*': conductor.employeeId,
        '姓名*': conductor.name,
        '部门*': conductor.department,
        '状态*': conductor.status,
        '入职日期': conductor.joinDate || '',
        '启用日期': conductor.enableDate || '',
        '备注': `更新测试${index + 1}`,
        '_系统ID': conductor.id
      }
      
      // 根据索引做不同的修改
      switch (index % 3) {
        case 0:
          // 修改状态
          modifications['状态*'] = conductor.status === '后备' ? '正式启用' : '后备'
          if (modifications['状态*'] === '正式启用' && !modifications['启用日期']) {
            modifications['启用日期'] = this.formatDate(new Date())
          }
          break
        case 1:
          // 修改部门
          modifications['部门*'] = conductor.department === '客运一队' ? '客运二队' : '客运一队'
          break
        case 2:
          // 修改备注
          modifications['备注'] = `已更新 - ${new Date().toLocaleDateString()}`
          break
      }
      
      return modifications
    })
    
    const ws = XLSX.utils.json_to_sheet(updateData)
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, 
      { wch: 12 }, { wch: 12 }, { wch: 12 }, 
      { wch: 20 }, { wch: 15 }
    ]
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '更新数据')
    
    // 添加更新说明
    const updateExplanation = [
      ['更新测试数据说明'],
      [''],
      ['此文件包含现有记录的修改版本，用于测试更新功能：'],
      [''],
      ['重要提示：'],
      ['1. _系统ID列必须保留，用于精确匹配现有记录'],
      ['2. 修改任意字段值后导入，将更新对应记录'],
      ['3. 如果删除_系统ID，将被识别为新增记录'],
      [''],
      ['测试场景：'],
      ['- 状态变更：部分记录的状态已修改'],
      ['- 部门调动：部分记录的部门已修改'],
      ['- 备注更新：部分记录的备注已修改'],
      [''],
      ['预期结果：'],
      ['- 系统应识别为更新操作'],
      ['- 显示字段差异对比'],
      ['- 成功更新现有记录而非创建新记录']
    ]
    
    const updateWs = XLSX.utils.aoa_to_sheet(updateExplanation)
    updateWs['!cols'] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(wb, updateWs, '更新说明')
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    saveAs(blob, filename)
  }
  
  /**
   * 生成随机日期
   */
  private static randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }
  
  /**
   * 格式化日期为YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
  
  /**
   * 生成CSV测试文件
   */
  static generateTestCSV(filename: string = '测试导入数据.csv') {
    const testData = this.generateTestConductors(5)
    
    const csvData = [
      ['工号*', '姓名*', '部门*', '状态*', '入职日期', '启用日期', '备注'],
      ...testData.map(conductor => [
        conductor.employeeId,
        conductor.name,
        conductor.department,
        conductor.status,
        conductor.joinDate || '',
        conductor.enableDate || '',
        conductor.note || ''
      ])
    ]
    
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    })
    
    saveAs(blob, filename)
  }
  
  /**
   * 验证导入导出一致性
   */
  static validateExportImportConsistency(
    originalData: EnhancedConductor[],
    importedData: any[]
  ): { isValid: boolean, differences: string[] } {
    const differences: string[] = []
    
    if (originalData.length !== importedData.length) {
      differences.push(`记录数量不一致：原始${originalData.length}条，导入${importedData.length}条`)
    }
    
    const minLength = Math.min(originalData.length, importedData.length)
    
    for (let i = 0; i < minLength; i++) {
      const original = originalData[i]
      const imported = importedData[i]
      
      // 检查关键字段
      const fieldsToCheck = ['employeeId', 'name', 'department', 'status']
      
      fieldsToCheck.forEach(field => {
        const originalValue = original[field as keyof EnhancedConductor]
        const importedValue = imported[field]
        
        if (originalValue !== importedValue) {
          differences.push(
            `第${i + 1}行${field}不一致：原始"${originalValue}"，导入"${importedValue}"`
          )
        }
      })
    }
    
    return {
      isValid: differences.length === 0,
      differences
    }
  }
} 