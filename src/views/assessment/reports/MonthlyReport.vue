<template>
  <div class="monthly-report-container">
    <!-- 控制面板 -->
    <div class="control-panel" v-show="!printMode">
      <el-card>
        <div class="control-header">
          <h2>月度考核分析报表</h2>
          <div class="control-actions">
            <el-date-picker
              v-model="selectedDate"
              type="month"
              placeholder="选择月份"
              format="YYYY年MM月"
              value-format="YYYY-MM"
              @change="loadReportData"
            />
            <el-button type="primary" @click="generateReport" :loading="loading">
              <el-icon><Document /></el-icon>
              生成报表
            </el-button>
            <el-button type="success" @click="exportToPDF" :loading="exporting" :disabled="!hasData">
              <el-icon><Download /></el-icon>
              导出PDF
            </el-button>
            <el-button @click="togglePreview" v-if="hasData">
              <el-icon><View /></el-icon>
              {{ printMode ? '退出预览' : '打印预览' }}
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 报表内容 -->
    <div v-if="hasData" class="report-wrapper" :class="{ 'print-mode': printMode }">
      <div class="report-page" ref="reportContent">
        <!-- 报表头部 -->
        <div class="report-header">
          <div class="header-content">
            <div class="title-section">
              <h1>{{ reportPeriod }}列车长考核分析报表</h1>
              <div class="report-meta">
                <span>生成时间：{{ formatDateTime(new Date()) }}</span>
                <span>数据来源：列车长考核管理系统</span>
              </div>
            </div>
          </div>
          <div class="header-line"></div>
        </div>

        <!-- 执行摘要 -->
        <div class="section executive-summary">
          <h3 class="section-title">一、执行摘要</h3>
          <div class="summary-content">
            <div class="summary-metrics">
              <div class="metric-row">
                <div class="metric-item">
                  <div class="metric-label">考核总人次</div>
                  <div class="metric-value">{{ displayData.totalRecords }}</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">涉及人员</div>
                  <div class="metric-value">{{ displayData.uniquePersons }}</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">平均得分</div>
                  <div class="metric-value">{{ displayData.avgScore.toFixed(1) }}分</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">及格率</div>
                  <div class="metric-value">{{ displayData.passRate.toFixed(1) }}%</div>
                </div>
              </div>
            </div>
            
            <div class="summary-text">
              <div class="findings">
                <h4>关键发现</h4>
                <ul>
                  <li>本月共完成{{ displayData.totalRecords }}次考核，涉及{{ displayData.uniquePersons }}名列车长</li>
                  <li>平均得分{{ displayData.avgScore.toFixed(1) }}分，及格率{{ displayData.passRate.toFixed(1) }}%</li>
                  <li>表现优秀的部门持续保持高水准</li>
                </ul>
              </div>
              <div class="recommendations">
                <h4>管理建议</h4>
                <ol>
                  <li>继续保持优秀部门的管理经验</li>
                  <li>重点关注问题整改落实</li>
                  <li>加强对重点部门的指导</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <!-- 部门表现分析 -->
        <div class="section department-analysis">
          <h3 class="section-title">二、部门表现分析</h3>
          <div class="analysis-content">
            <table class="data-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>部门</th>
                  <th>平均分</th>
                  <th>及格率</th>
                  <th>考核人次</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dept, index) in displayData.departments" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td>{{ dept.name }}</td>
                  <td>{{ dept.score.toFixed(1) }}</td>
                  <td>{{ dept.passRate.toFixed(1) }}%</td>
                  <td>{{ dept.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 问题分析 -->
        <div class="section issue-analysis">
          <h3 class="section-title">三、问题分析</h3>
          <div class="issue-content">
            <table class="data-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>主要问题</th>
                  <th>出现次数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(issue, index) in displayData.issues" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td>{{ issue.name }}</td>
                  <td>{{ issue.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-empty description="正在生成报表..." />
    </div>

    <!-- 空状态 -->
    <div v-if="!hasData && !loading" class="empty-state">
      <el-empty description="请选择月份并生成报表" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Download, View } from '@element-plus/icons-vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useMainStore } from '@/stores'

const mainStore = useMainStore()

// 响应式数据
const selectedDate = ref('')
const loading = ref(false)
const hasData = ref(false)
const exporting = ref(false)
const printMode = ref(false)

// DOM引用
const reportContent = ref<HTMLElement>()

// 报表数据
const reportData = ref({
  totalRecords: 0,
  uniquePersons: 0,
  avgScore: 0,
  passRate: 0,
  departments: [] as any[],
  issues: [] as any[]
})

// 模拟数据（作为fallback）
const mockData = ref({
  totalRecords: 156,
  uniquePersons: 89,
  avgScore: 87.3,
  passRate: 94.2,
  departments: [
    { name: '客运一队', score: 92.1, passRate: 98.5, count: 25 },
    { name: '客运二队', score: 89.7, passRate: 96.3, count: 22 },
    { name: '客运三队', score: 85.4, passRate: 91.8, count: 28 },
    { name: '客运四队', score: 84.2, passRate: 89.2, count: 19 }
  ],
  issues: [
    { name: '服务态度问题', count: 12 },
    { name: '安全操作不规范', count: 8 },
    { name: '仪容仪表不整', count: 6 },
    { name: '业务流程不熟练', count: 4 }
  ]
})

// 计算属性
const reportPeriod = computed(() => {
  if (!selectedDate.value) return ''
  const [year, month] = selectedDate.value.split('-')
  return `${year}年${month}月`
})

const displayData = computed(() => {
  return reportData.value || mockData.value
})

// 方法
const loadReportData = () => {
  if (selectedDate.value) {
    generateReport()
  }
}

// 获取指定月份的考核记录
const getMonthlyRecords = (year: number, month: number) => {
  if (!mainStore.database?.assessmentDB) return []
  
  const allRecords: any[] = []
  Object.values(mainStore.database.assessmentDB).forEach(monthRecords => {
    allRecords.push(...monthRecords)
  })
  
  return allRecords.filter((record: any) => {
    const recordDate = new Date(record.assessDate)
    return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month
  })
}

// 分析月度数据
const analyzeMonthlyData = (records: any[]) => {
  if (records.length === 0) {
    // 如果没有数据，使用模拟数据
    return {
      totalRecords: mockData.value.totalRecords,
      uniquePersons: mockData.value.uniquePersons,
      avgScore: mockData.value.avgScore,
      passRate: mockData.value.passRate,
      departments: mockData.value.departments,
      issues: mockData.value.issues
    }
  }

  // 计算每条记录的最终得分
  const calculateFinalScore = (record: any) => {
    const baseScore = record.baseScore || 100 // 默认基础分100
    const netScore = record.details ? 
      record.details.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) : 0
    return baseScore + netScore
  }

  // 基础统计
  const totalRecords = records.length
  const uniquePersons = new Set(records.map(r => r.conductorId)).size
  const scores = records.map(calculateFinalScore)
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / totalRecords
  const passRate = (scores.filter(score => score >= 60).length / totalRecords) * 100

  // 部门分析
  const deptStats = new Map()
  records.forEach(record => {
    // 使用被考核人员的部门，而不是评分部门
    const dept = record.department || '未知部门'
    if (!deptStats.has(dept)) {
      deptStats.set(dept, { scores: [], count: 0 })
    }
    deptStats.get(dept).scores.push(calculateFinalScore(record))
    deptStats.get(dept).count++
  })

  const departments = Array.from(deptStats.entries()).map(([name, data]: [string, any]) => {
    const score = data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length
    const passRate = (data.scores.filter((score: number) => score >= 60).length / data.scores.length) * 100
    
    return {
      name,
      score,
      passRate,
      count: data.count
    }
  }).sort((a, b) => b.score - a.score)

  // 问题分析
  const issueStats = new Map()
  records.forEach(record => {
    if (record.details && Array.isArray(record.details)) {
      record.details.forEach((detail: any) => {
        // 只统计扣分项（负分）
        if (detail.deduction < 0) {
          const issue = detail.item || '未知问题'
          issueStats.set(issue, (issueStats.get(issue) || 0) + 1)
        }
      })
    }
  })

  const issues = Array.from(issueStats.entries())
    .map(([name, count]: [string, number]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // 只取前8个

  return {
    totalRecords,
    uniquePersons,
    avgScore,
    passRate,
    departments: departments.slice(0, 8), // 只取前8个部门
    issues
  }
}

const generateReport = async () => {
  if (!selectedDate.value) {
    ElMessage.warning('请先选择月份')
    return
  }

  loading.value = true
  
  try {
    // 获取指定月份的考核记录
    const [year, month] = selectedDate.value.split('-').map(Number)
    const records = getMonthlyRecords(year, month)
    
    // 分析数据
    const analyzedData = analyzeMonthlyData(records)
    reportData.value = analyzedData
    
    // 显示数据统计信息
    if (records.length === 0) {
      ElMessage.info(`${reportPeriod.value}暂无考核数据，显示示例数据`)
    } else {
      const deptNames = analyzedData.departments.map(d => d.name).join('、')
      const topIssues = analyzedData.issues.slice(0, 3).map(i => i.name).join('、')
      ElMessage.success(`${reportPeriod.value}分析完成：${records.length}条记录，部门[${deptNames}]，主要问题[${topIssues}]`)
    }
    
    hasData.value = true
  } catch (error) {
    ElMessage.error('生成报表失败')
  } finally {
    loading.value = false
  }
}

const formatDateTime = (date: Date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const exportToPDF = async () => {
  if (!hasData.value || !reportContent.value) {
    ElMessage.warning('请先生成报表')
    return
  }

  exporting.value = true
  
  try {
    // 临时进入打印模式
    const wasInPrintMode = printMode.value
    printMode.value = true
    
    await nextTick()
    
    // 使用html2canvas捕获内容
    const canvas = await html2canvas(reportContent.value, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: reportContent.value.scrollWidth,
      height: reportContent.value.scrollHeight
    })
    
    // 创建PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const imgWidth = 210 // A4宽度
    const pageHeight = 295 // A4高度
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    
    let position = 0
    
    // 添加第一页
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    
    // 如果内容超过一页，添加更多页面
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    
    // 下载PDF
    const fileName = `${reportPeriod.value}列车长考核分析报表.pdf`
    pdf.save(fileName)
    
    // 恢复之前的模式
    printMode.value = wasInPrintMode
    
    ElMessage.success('PDF导出成功')
  } catch (error) {
    console.error('PDF导出失败:', error)
    ElMessage.error('PDF导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

const togglePreview = () => {
  printMode.value = !printMode.value
}

// 初始化
onMounted(async () => {
  // 加载数据库
  await mainStore.loadDatabase()
  
  // 设置默认月份为当前月份
  const now = new Date()
  selectedDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})
</script>

<style lang="scss" scoped>
.monthly-report-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
  
  .control-panel {
    margin-bottom: 20px;
    
    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h2 {
        margin: 0;
        color: #333;
      }
      
      .control-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }
    }
  }
  
  .report-wrapper {
    display: flex;
    justify-content: center;
    
    &.print-mode {
      background: white;
      padding: 20px;
      
      .report-page {
        box-shadow: 0 0 30px rgba(0,0,0,0.2);
        transform: scale(0.95);
      }
    }
  }
  
  .report-page {
    width: 210mm;
    min-height: 297mm;
    background: white;
    padding: 30px;
    margin: 0 auto;
    font-family: 'Microsoft YaHei', sans-serif;
    line-height: 1.6;
    color: #333;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
    
    .report-header {
      margin-bottom: 30px;
      
      .header-content {
        margin-bottom: 20px;
        
        .title-section {
          text-align: center;
          
          h1 {
            margin: 0 0 12px 0;
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
          }
          
          .report-meta {
            display: flex;
            justify-content: center;
            gap: 30px;
            
            span {
              font-size: 14px;
              color: #666;
            }
          }
        }
      }
      
      .header-line {
        height: 3px;
        background: linear-gradient(to right, #409eff, #67c23a);
      }
    }
    
    .section {
      margin-bottom: 30px;
      
      .section-title {
        margin: 0 0 20px 0;
        font-size: 18px;
        font-weight: bold;
        color: #2c3e50;
        border-left: 4px solid #409eff;
        padding-left: 12px;
      }
    }
    
    .executive-summary {
      .summary-metrics {
        margin-bottom: 20px;
        
        .metric-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          
          .metric-item {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 8px;
            
            .metric-label {
              font-size: 14px;
              margin-bottom: 8px;
              opacity: 0.9;
            }
            
            .metric-value {
              font-size: 24px;
              font-weight: bold;
            }
          }
        }
      }
      
      .summary-text {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        
        h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #409eff;
        }
        
        ul, ol {
          margin: 0;
          padding-left: 20px;
          
          li {
            margin-bottom: 8px;
            font-size: 14px;
          }
        }
      }
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      
      th, td {
        padding: 12px 8px;
        border: 1px solid #e5e5e5;
        text-align: left;
      }
      
      th {
        background: #f8f9fa;
        font-weight: bold;
        color: #333;
        text-align: center;
      }
      
      td {
        text-align: center;
      }
      
      tbody tr:nth-child(even) {
        background: #fbfbfb;
      }
      
      tbody tr:hover {
        background: #f0f9ff;
      }
    }
  }
  
  .loading-state,
  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 400px;
  }
}

// 打印样式
@media print {
  .control-panel {
    display: none !important;
  }
  
  .report-wrapper {
    background: white !important;
    padding: 0 !important;
    
    .report-page {
      box-shadow: none !important;
      transform: none !important;
      margin: 0 !important;
      padding: 15mm !important;
      page-break-inside: avoid;
    }
  }
  
  .section {
    page-break-inside: avoid;
  }
  
  .data-table {
    page-break-inside: avoid;
  }
}
</style> 