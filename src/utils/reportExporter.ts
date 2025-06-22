import type { YearlyReportData } from '@/composables/useYearlyReport'

/**
 * PDF导出配置
 */
export interface PDFExportConfig {
  format: 'a4'
  orientation: 'landscape' | 'portrait'
  margin: {
    top: string
    right: string
    bottom: string
    left: string
  }
  printBackground: boolean
  displayHeaderFooter: boolean
  headerTemplate: string
  footerTemplate: string
}

/**
 * Excel导出数据结构
 */
export interface ExcelExportData {
  sheets: {
    name: string
    data: any[][]
    formatting?: {
      header?: any
      columns?: { width: number }[]
      conditionalFormatting?: any[]
      charts?: any[]
    }
  }[]
}

/**
 * 年度报表导出工具类
 */
export class YearlyReportExporter {
  
  /**
   * 导出为PDF
   */
  static async exportToPDF(reportData: YearlyReportData): Promise<void> {
    try {
      // 这里使用浏览器的打印功能作为PDF导出的临时方案
      // 在生产环境中，可以集成专业的PDF生成库如jsPDF、puppeteer等
      
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('无法打开打印窗口')
      }
      
      const htmlContent = this.generatePrintableHTML(reportData)
      
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // 等待内容加载完成后打印
      printWindow.onload = () => {
        printWindow.print()
        printWindow.close()
      }
      
    } catch (error) {
      console.error('PDF导出失败:', error)
      throw error
    }
  }
  
  /**
   * 导出为Excel
   */
  static async exportToExcel(reportData: YearlyReportData): Promise<void> {
    try {
      const excelData = this.generateExcelData(reportData)
      
      // 这里使用简单的CSV导出作为临时方案
      // 在生产环境中，可以集成XLSX库进行真正的Excel导出
      
      const csvContent = this.convertToCSV(excelData.sheets[0].data)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${reportData.title.replace(/\s+/g, '_')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Excel导出失败:', error)
      throw error
    }
  }
  
  /**
   * 生成可打印的HTML内容
   */
  private static generatePrintableHTML(reportData: YearlyReportData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportData.title}</title>
  <style>
    body {
      font-family: 'Microsoft YaHei', SimSun, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      margin: 0;
      padding: 20pt;
      color: #000;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 30pt;
      border-bottom: 2pt solid #000;
      padding-bottom: 20pt;
    }
    
    .report-title {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 20pt;
    }
    
    .report-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10pt;
      text-align: left;
      max-width: 500pt;
      margin: 0 auto;
    }
    
    .meta-row {
      display: flex;
      justify-content: space-between;
    }
    
    .section-title {
      font-size: 16pt;
      font-weight: bold;
      margin: 25pt 0 15pt 0;
      color: #000;
      page-break-after: avoid;
    }
    
    .subsection-title {
      font-size: 14pt;
      font-weight: bold;
      margin: 20pt 0 10pt 0;
      color: #333;
    }
    
    .metric-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15pt;
      margin: 20pt 0;
    }
    
    .metric-card {
      border: 1pt solid #ddd;
      padding: 15pt;
      text-align: center;
    }
    
    .metric-label {
      font-size: 10pt;
      color: #666;
      margin-bottom: 5pt;
    }
    
    .metric-value {
      font-size: 18pt;
      font-weight: bold;
      color: #333;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15pt 0;
    }
    
    .data-table th,
    .data-table td {
      border: 1pt solid #000;
      padding: 8pt;
      text-align: center;
      font-size: 10pt;
    }
    
    .data-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    .conclusion-list,
    .suggestion-list {
      list-style: none;
      padding: 0;
      margin: 15pt 0;
    }
    
    .conclusion-item,
    .suggestion-item {
      margin-bottom: 10pt;
      padding: 8pt;
      border-left: 3pt solid #409eff;
      background: #f9f9f9;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    @page {
      margin: 2cm;
      @bottom-center {
        content: "第 " counter(page) " 页";
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1 class="report-title">${reportData.title}</h1>
    <div class="report-meta">
      <div class="meta-row">
        <span>报告年度：</span>
        <span>${reportData.reportMeta.reportPeriod.split(' - ')[0].slice(0, 4)}年</span>
      </div>
      <div class="meta-row">
        <span>报告期间：</span>
        <span>${reportData.reportMeta.reportPeriod}</span>
      </div>
      <div class="meta-row">
        <span>生成时间：</span>
        <span>${reportData.reportMeta.generateDate}</span>
      </div>
      <div class="meta-row">
        <span>报告编号：</span>
        <span>${reportData.reportMeta.reportNumber}</span>
      </div>
    </div>
  </div>
  
  <h2 class="section-title">一、执行摘要</h2>
  
  <div class="metric-cards">
    ${reportData.coreMetrics.map(metric => `
      <div class="metric-card">
        <div class="metric-label">${metric.label}</div>
        <div class="metric-value">${metric.value}${metric.unit || ''}</div>
      </div>
    `).join('')}
  </div>
  
  <h2 class="section-title">二、部门绩效评估</h2>
  
  <table class="data-table">
    <thead>
      <tr>
        <th>排名</th>
        <th>部门</th>
        <th>平均得分</th>
        <th>考核次数</th>
        <th>改进程度</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.departmentYearlyStats.map(dept => `
        <tr>
          <td>${dept.yearlyRank}</td>
          <td>${dept.department}</td>
          <td>${dept.avgYearlyScore.toFixed(1)}分</td>
          <td>${dept.yearlyAssessmentCount}次</td>
          <td>${dept.improvement > 0 ? '+' : ''}${dept.improvement.toFixed(1)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="page-break"></div>
  
  <h2 class="section-title">三、月度统计详情</h2>
  
  <table class="data-table">
    <thead>
      <tr>
        <th>月份</th>
        <th>考核次数</th>
        <th>平均得分</th>
        <th>主要问题</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.monthlyStats.map(month => `
        <tr>
          <td>${month.month}</td>
          <td>${month.assessmentCount}</td>
          <td>${month.avgScore > 0 ? month.avgScore.toFixed(1) + '分' : '-'}</td>
          <td>${month.topIssue}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2 class="section-title">四、管理结论</h2>
  
  <div class="conclusion-list">
    ${reportData.conclusions.map(conclusion => `
      <div class="conclusion-item">
        ${conclusion.id}. ${conclusion.content}
      </div>
    `).join('')}
  </div>
  
  <h2 class="section-title">五、改进建议</h2>
  
  <div class="suggestion-list">
    ${reportData.suggestions.map(suggestion => `
      <div class="suggestion-item">
        ${suggestion.id}. ${suggestion.content}
      </div>
    `).join('')}
  </div>
  
</body>
</html>
    `
  }
  
  /**
   * 生成Excel数据
   */
  private static generateExcelData(reportData: YearlyReportData): ExcelExportData {
    return {
      sheets: [
        {
          name: '年度总览',
          data: [
            ['指标', '数值', '单位', '备注'],
            ...reportData.coreMetrics.map(metric => [
              metric.label,
              metric.value,
              metric.unit || '',
              metric.trend || ''
            ])
          ]
        },
        {
          name: '部门统计',
          data: [
            ['排名', '部门', '平均得分', '考核次数', '总扣分', '改进程度'],
            ...reportData.departmentYearlyStats.map(dept => [
              dept.yearlyRank,
              dept.department,
              dept.avgYearlyScore.toFixed(1),
              dept.yearlyAssessmentCount,
              Math.abs(dept.totalYearlyDeductions).toFixed(1),
              dept.improvement.toFixed(1) + '%'
            ])
          ]
        },
        {
          name: '月度明细',
          data: [
            ['月份', '考核次数', '平均得分', '总扣分', '主要问题', '月度排名'],
            ...reportData.monthlyStats.map(month => [
              month.month,
              month.assessmentCount,
              month.avgScore > 0 ? month.avgScore.toFixed(1) : 0,
              month.totalDeductions.toFixed(1),
              month.topIssue,
              month.monthRank > 0 ? month.monthRank : '-'
            ])
          ]
        },
        {
          name: '结论建议',
          data: [
            ['类型', '序号', '内容'],
            ...reportData.conclusions.map(item => ['结论', item.id, item.content]),
            ...reportData.suggestions.map(item => ['建议', item.id, item.content])
          ]
        }
      ]
    }
  }
  
  /**
   * 转换为CSV格式
   */
  private static convertToCSV(data: any[][]): string {
    return data.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    ).join('\n')
  }
}

/**
 * 验证数据完整性
 */
export function validateReportData(reportData: YearlyReportData): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 基础数据检查
  if (!reportData.coreMetrics || reportData.coreMetrics.length === 0) {
    errors.push('缺少核心指标数据')
  }
  
  if (!reportData.departmentYearlyStats || reportData.departmentYearlyStats.length === 0) {
    warnings.push('缺少部门统计数据')
  }
  
  if (!reportData.monthlyStats || reportData.monthlyStats.length === 0) {
    warnings.push('缺少月度统计数据')
  }
  
  // 数据完整性检查
  if (reportData.reportMeta.dataIntegrity < 80) {
    warnings.push(`数据完整性较低：${reportData.reportMeta.dataIntegrity}%`)
  }
  
  // 逻辑一致性检查
  if (reportData.departmentYearlyStats.length > 0) {
    const totalAssessments = reportData.departmentYearlyStats
      .reduce((sum, dept) => sum + dept.yearlyAssessmentCount, 0)
    
    if (totalAssessments !== reportData.reportMeta.totalRecords) {
      warnings.push('部门考核次数总和与记录总数不匹配')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
} 