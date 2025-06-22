import { ElMessage } from 'element-plus'

export function usePrint() {
  // 打印预览
  const printPreview = () => {
    window.print()
  }
  
  // 打印指定区域
  const printElement = (elementId: string, title?: string) => {
    const element = document.getElementById(elementId)
    if (!element) {
      ElMessage.error('找不到要打印的内容')
      return
    }
    
    // 创建打印窗口
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      ElMessage.error('无法打开打印窗口')
      return
    }
    
    // 获取样式
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(style => style.outerHTML)
      .join('\n')
    
    // 构建打印内容
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>${title || '打印预览'}</title>
        ${styles}
        <style>
          body { margin: 20px; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body data-print-time="${new Date().toLocaleString()}">
        ${element.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
  }
  
  // 打印表格
  const printTable = (tableData: any[], columns: any[], title?: string) => {
    // 构建表格HTML
    const tableHtml = `
      <div class="print-table-container">
        ${title ? `<h2 style="text-align: center; margin-bottom: 20px;">${title}</h2>` : ''}
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
          <thead>
            <tr>
              ${columns.map(col => `
                <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; text-align: left;">
                  ${col.label}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableData.map(row => `
              <tr>
                ${columns.map(col => `
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${row[col.prop] || '-'}
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: right; color: #666;">
          打印时间：${new Date().toLocaleString()}
        </div>
      </div>
    `
    
    // 创建临时元素
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = tableHtml
    tempDiv.id = 'temp-print-table'
    tempDiv.style.display = 'none'
    document.body.appendChild(tempDiv)
    
    // 打印
    printElement('temp-print-table', title)
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(tempDiv)
    }, 1000)
  }
  
  return {
    printPreview,
    printElement,
    printTable
  }
} 