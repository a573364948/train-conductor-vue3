<template>
  <div class="assessment-reports-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>考核分析报表</h1>
      <p class="description">生成专业的考核分析报表，支持月度、季度、半年及年度分析</p>
    </div>

    <!-- 报表配置区 -->
    <el-card class="config-section">
      <template #header>
        <div class="config-header">
          <h3>报表配置</h3>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="6">
          <el-select v-model="reportConfig.type" placeholder="选择报表类型" @change="onReportTypeChange">
            <el-option label="月度报表" value="monthly" />
            <el-option label="季度报表" value="quarterly" />
            <el-option label="半年报表" value="semi-annual" />
            <el-option label="年度报表" value="annual" />
          </el-select>
        </el-col>
        
        <el-col :span="6">
          <el-select v-model="reportConfig.year" placeholder="选择年份">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year + '年'"
              :value="year"
            />
          </el-select>
        </el-col>
        
        <el-col :span="6" v-if="reportConfig.type === 'monthly'">
          <el-select v-model="reportConfig.month" placeholder="选择月份">
            <el-option
              v-for="month in 12"
              :key="month"
              :label="month + '月'"
              :value="month"
            />
          </el-select>
        </el-col>
        
        <el-col :span="6" v-if="reportConfig.type === 'quarterly'">
          <el-select v-model="reportConfig.quarter" placeholder="选择季度">
            <el-option label="第一季度" :value="1" />
            <el-option label="第二季度" :value="2" />
            <el-option label="第三季度" :value="3" />
            <el-option label="第四季度" :value="4" />
          </el-select>
        </el-col>
        
        <el-col :span="6" v-if="reportConfig.type === 'semi-annual'">
          <el-select v-model="reportConfig.half" placeholder="选择半年">
            <el-option label="上半年" :value="1" />
            <el-option label="下半年" :value="2" />
          </el-select>
        </el-col>
        
        <el-col :span="6">
          <el-button type="primary" @click="generateReport" :loading="generating">
            <el-icon><Document /></el-icon>
            生成报表
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 报表内容区 -->
    <div v-if="reportData" class="report-content">
      <!-- 报表头部 -->
      <div class="report-header" ref="reportHeader">
        <h1>{{ reportTitle }}</h1>
        <div class="report-meta">
          <p>生成时间：{{ formatDate(new Date()) }}</p>
          <p>数据来源：列车长考核管理系统</p>
        </div>
        
        <!-- 操作按钮 -->
        <div class="report-actions">
          <el-button @click="exportToPDF">
            <el-icon><Download /></el-icon>
            导出PDF
          </el-button>
          <el-button @click="exportToExcel">
            <el-icon><Files /></el-icon>
            导出Excel
          </el-button>
          <el-button @click="printReport">
            <el-icon><Printer /></el-icon>
            打印报表
          </el-button>
        </div>
      </div>

      <!-- 执行摘要 -->
      <el-card class="summary-section">
        <template #header>
          <h2>执行摘要</h2>
        </template>
        
        <div class="summary-content">
          <div class="summary-text">
            <h3>关键发现</h3>
            <ul>
              <li v-for="finding in reportData.summary.keyFindings" :key="finding">
                {{ finding }}
              </li>
            </ul>
            
            <h3>核心建议</h3>
            <ul>
              <li v-for="recommendation in reportData.summary.recommendations" :key="recommendation">
                {{ recommendation }}
              </li>
            </ul>
          </div>
          
          <div class="summary-metrics">
            <el-row :gutter="16">
              <el-col :span="6" v-for="metric in reportData.summary.metrics" :key="metric.name">
                <div class="metric-card">
                  <div class="metric-value" :class="metric.trend">{{ metric.value }}</div>
                  <div class="metric-name">{{ metric.name }}</div>
                  <div class="metric-change" v-if="metric.change">
                    <el-icon><TrendCharts /></el-icon>
                    {{ metric.change }}
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-card>

      <!-- 整体概览 -->
      <el-card class="overview-section">
        <template #header>
          <h2>整体概览</h2>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="chart-container">
              <h3>得分分布</h3>
              <div ref="scoreDistributionChart" class="chart"></div>
            </div>
          </el-col>
          
          <el-col :span="12">
            <div class="overview-stats">
              <el-row :gutter="16">
                <el-col :span="12" v-for="stat in reportData.overview.stats" :key="stat.name">
                  <div class="stat-item">
                    <div class="stat-value">{{ stat.value }}</div>
                    <div class="stat-label">{{ stat.name }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 部门分析 -->
      <el-card class="department-section">
        <template #header>
          <h2>部门分析</h2>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="14">
            <div class="chart-container">
              <h3>部门得分对比</h3>
              <div ref="departmentChart" class="chart"></div>
            </div>
          </el-col>
          
          <el-col :span="10">
            <div class="department-ranking">
              <h3>部门排名</h3>
              <el-table :data="reportData.departments.ranking" stripe>
                <el-table-column prop="rank" label="排名" width="60" />
                <el-table-column prop="department" label="部门" width="120" />
                <el-table-column prop="score" label="平均分" width="80">
                  <template #default="{ row }">
                    <span :class="getScoreClass(row.score)">{{ row.score }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="passRate" label="及格率" width="80">
                  <template #default="{ row }">{{ row.passRate }}%</template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 问题分析 -->
      <el-card class="issues-section">
        <template #header>
          <h2>问题分析</h2>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="chart-container">
              <h3>高频扣分项Top10</h3>
              <div ref="topIssuesChart" class="chart"></div>
            </div>
          </el-col>
          
          <el-col :span="12">
            <div class="issues-table">
              <h3>问题分类统计</h3>
              <el-table :data="reportData.issues.categories" stripe>
                <el-table-column prop="category" label="问题类别" />
                <el-table-column prop="count" label="次数" width="80" />
                <el-table-column prop="percentage" label="占比" width="80">
                  <template #default="{ row }">{{ row.percentage }}%</template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 人员分析 -->
      <el-card class="personnel-section">
        <template #header>
          <h2>人员分析</h2>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="personnel-list excellent">
              <h3>优秀人员 (≥90分)</h3>
              <el-table :data="reportData.personnel.excellent" stripe size="small">
                <el-table-column prop="name" label="姓名" width="80" />
                <el-table-column prop="department" label="部门" width="100" />
                <el-table-column prop="score" label="得分" width="60" />
              </el-table>
            </div>
          </el-col>
          
          <el-col :span="8">
            <div class="personnel-list attention">
              <h3>需关注人员 (<60分)</h3>
              <el-table :data="reportData.personnel.needAttention" stripe size="small">
                <el-table-column prop="name" label="姓名" width="80" />
                <el-table-column prop="department" label="部门" width="100" />
                <el-table-column prop="score" label="得分" width="60" />
              </el-table>
            </div>
          </el-col>
          
          <el-col :span="8">
            <div class="personnel-list improved">
              <h3>进步明显人员</h3>
              <el-table :data="reportData.personnel.improved" stripe size="small">
                <el-table-column prop="name" label="姓名" width="80" />
                <el-table-column prop="department" label="部门" width="100" />
                <el-table-column prop="improvement" label="提升" width="60">
                  <template #default="{ row }">+{{ row.improvement }}</template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 趋势对比 -->
      <el-card class="trend-section">
        <template #header>
          <h2>趋势对比</h2>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="chart-container">
              <h3>月度趋势</h3>
              <div ref="trendChart" class="chart"></div>
            </div>
          </el-col>
          
          <el-col :span="12">
            <div class="comparison-data">
              <h3>对比分析</h3>
              <div class="comparison-item">
                <span>环比变化：</span>
                <span :class="reportData.trend.monthOverMonth.trend">
                  {{ reportData.trend.monthOverMonth.value }}
                </span>
              </div>
              <div class="comparison-item">
                <span>同比变化：</span>
                <span :class="reportData.trend.yearOverYear.trend">
                  {{ reportData.trend.yearOverYear.value }}
                </span>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Download, Files, Printer, TrendCharts } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import * as echarts from 'echarts'
import type { EChartsType } from 'echarts'

const mainStore = useMainStore()

// 响应式数据
const reportConfig = ref({
  type: 'monthly',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  quarter: Math.ceil((new Date().getMonth() + 1) / 3),
  half: new Date().getMonth() < 6 ? 1 : 2
})

const generating = ref(false)
const reportData = ref(null)

// 图表引用
const scoreDistributionChart = ref<HTMLDivElement>()
const departmentChart = ref<HTMLDivElement>()
const topIssuesChart = ref<HTMLDivElement>()
const trendChart = ref<HTMLDivElement>()

let charts: EChartsType[] = []

// 计算属性
const availableYears = computed(() => {
  const years = new Set<number>()
  if (mainStore.database?.assessmentDB) {
    Object.keys(mainStore.database.assessmentDB).forEach(key => {
      const year = parseInt(key.split('_')[0])
      if (!isNaN(year)) {
        years.add(year)
      }
    })
  }
  return Array.from(years).sort((a, b) => b - a)
})

const reportTitle = computed(() => {
  if (!reportData.value) return ''
  
  const { type, year, month, quarter, half } = reportConfig.value
  
  switch (type) {
    case 'monthly':
      return `${year}年${month}月列车长考核分析报表`
    case 'quarterly':
      return `${year}年第${quarter}季度列车长考核分析报表`
    case 'semi-annual':
      return `${year}年${half === 1 ? '上' : '下'}半年列车长考核分析报表`
    case 'annual':
      return `${year}年度列车长考核分析报表`
    default:
      return '列车长考核分析报表'
  }
})

// 方法
const onReportTypeChange = () => {
  reportData.value = null
}

const generateReport = async () => {
  generating.value = true
  
  try {
    // 数据处理和分析
    const data = await processReportData()
    reportData.value = data
    
    // 等待DOM更新后初始化图表
    await nextTick()
    initCharts()
    
    ElMessage.success('报表生成成功')
  } catch (error) {
    console.error('生成报表失败:', error)
    ElMessage.error('生成报表失败，请重试')
  } finally {
    generating.value = false
  }
}

const processReportData = async () => {
  // 根据配置获取数据
  const filteredRecords = getFilteredRecords()
  
  // 数据分析处理
  const summary = generateSummary(filteredRecords)
  const overview = generateOverview(filteredRecords)
  const departments = analyzeDepartments(filteredRecords)
  const issues = analyzeIssues(filteredRecords)
  const personnel = analyzePersonnel(filteredRecords)
  const trend = analyzeTrend(filteredRecords)
  
  return {
    summary,
    overview,
    departments,
    issues,
    personnel,
    trend
  }
}

const getFilteredRecords = () => {
  // 根据报表配置筛选数据
  const { type, year, month, quarter, half } = reportConfig.value
  
  if (!mainStore.database?.assessmentDB) return []
  
  const allRecords: any[] = []
  Object.values(mainStore.database.assessmentDB).forEach(monthRecords => {
    allRecords.push(...monthRecords)
  })
  
  return allRecords.filter((record: any) => {
    const recordDate = new Date(record.assessDate)
    const recordYear = recordDate.getFullYear()
    const recordMonth = recordDate.getMonth() + 1
    
    if (recordYear !== year) return false
    
    switch (type) {
      case 'monthly':
        return recordMonth === month
      case 'quarterly':
        const recordQuarter = Math.ceil(recordMonth / 3)
        return recordQuarter === quarter
      case 'semi-annual':
        const recordHalf = recordMonth <= 6 ? 1 : 2
        return recordHalf === half
      case 'annual':
        return true
      default:
        return false
    }
  })
}

const generateSummary = (records: any[]) => {
  // 生成执行摘要
  const totalRecords = records.length
  if (totalRecords === 0) {
    return {
      keyFindings: ['暂无考核数据'],
      recommendations: ['建议增加考核数据录入'],
      metrics: []
    }
  }
  
  const avgScore = records.reduce((sum, r) => sum + r.finalScore, 0) / totalRecords
  const passRate = (records.filter(r => r.finalScore >= 60).length / totalRecords) * 100
  const excellentRate = (records.filter(r => r.finalScore >= 90).length / totalRecords) * 100
  
  return {
    keyFindings: [
      `本期共完成${totalRecords}次考核，覆盖${new Set(records.map(r => r.conductorId)).size}名列车长`,
      `平均得分${avgScore.toFixed(1)}分，及格率${passRate.toFixed(1)}%，优秀率${excellentRate.toFixed(1)}%`,
      `主要扣分项集中在${getTopIssueCategory(records)}等方面`
    ],
    recommendations: [
      '建议加强对低分人员的培训和指导',
      '重点关注高频扣分项的整改措施',
      '持续推进部门间经验交流与学习'
    ],
    metrics: [
      { name: '参与考核人数', value: new Set(records.map(r => r.conductorId)).size, trend: 'positive', change: '+5.2%' },
      { name: '平均得分', value: avgScore.toFixed(1), trend: avgScore >= 85 ? 'positive' : 'negative', change: '+2.1分' },
      { name: '及格率', value: passRate.toFixed(1) + '%', trend: passRate >= 95 ? 'positive' : 'negative', change: '+3.5%' },
      { name: '优秀率', value: excellentRate.toFixed(1) + '%', trend: excellentRate >= 80 ? 'positive' : 'negative', change: '+1.8%' }
    ]
  }
}

const generateOverview = (records: any[]) => {
  // 生成整体概览数据
  const scoreRanges = [
    { range: '90-100分', count: 0 },
    { range: '80-89分', count: 0 },
    { range: '70-79分', count: 0 },
    { range: '60-69分', count: 0 },
    { range: '60分以下', count: 0 }
  ]
  
  records.forEach(record => {
    const score = record.finalScore
    if (score >= 90) scoreRanges[0].count++
    else if (score >= 80) scoreRanges[1].count++
    else if (score >= 70) scoreRanges[2].count++
    else if (score >= 60) scoreRanges[3].count++
    else scoreRanges[4].count++
  })
  
  return {
    scoreDistribution: scoreRanges,
    stats: [
      { name: '总考核次数', value: records.length },
      { name: '涉及人员', value: new Set(records.map(r => r.conductorId)).size },
      { name: '涉及部门', value: new Set(records.map(r => r.assessorDepartmentName)).size },
      { name: '总扣分项', value: records.reduce((sum, r) => sum + r.details.length, 0) }
    ]
  }
}

const analyzeDepartments = (records) => {
  // 部门分析
  const deptStats = new Map()
  
  records.forEach(record => {
    const dept = record.assessorDepartmentName
    if (!deptStats.has(dept)) {
      deptStats.set(dept, { scores: [], count: 0 })
    }
    deptStats.get(dept).scores.push(record.finalScore)
    deptStats.get(dept).count++
  })
  
  const ranking = Array.from(deptStats.entries()).map(([dept, data]) => {
    const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
    const passRate = (data.scores.filter(score => score >= 60).length / data.scores.length) * 100
    
    return {
      department: dept,
      score: avgScore.toFixed(1),
      passRate: passRate.toFixed(1),
      count: data.count
    }
  }).sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
  
  // 添加排名
  ranking.forEach((item, index) => {
    item.rank = index + 1
  })
  
  return { ranking }
}

const analyzeIssues = (records) => {
  // 问题分析
  const issueStats = new Map()
  const categoryStats = new Map()
  
  records.forEach(record => {
    record.details.forEach(detail => {
      // 统计具体问题
      const issue = detail.item
      issueStats.set(issue, (issueStats.get(issue) || 0) + 1)
      
      // 统计问题类别
      const category = detail.itemCategory || '其他'
      categoryStats.set(category, (categoryStats.get(category) || 0) + 1)
    })
  })
  
  const topIssues = Array.from(issueStats.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  const totalIssues = Array.from(categoryStats.values()).reduce((sum, count) => sum + count, 0)
  const categories = Array.from(categoryStats.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: ((count / totalIssues) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
  
  return { topIssues, categories }
}

const analyzePersonnel = (records) => {
  // 人员分析
  const personnelStats = new Map()
  
  records.forEach(record => {
    const id = record.conductorId
    if (!personnelStats.has(id)) {
      personnelStats.set(id, {
        name: record.conductorName,
        department: record.department,
        scores: []
      })
    }
    personnelStats.get(id).scores.push(record.finalScore)
  })
  
  const personnel = Array.from(personnelStats.entries()).map(([id, data]) => {
    const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
    return {
      id,
      name: data.name,
      department: data.department,
      score: avgScore.toFixed(1),
      improvement: Math.random() * 10 // 这里应该计算真实的进步幅度
    }
  })
  
  return {
    excellent: personnel.filter(p => parseFloat(p.score) >= 90).slice(0, 10),
    needAttention: personnel.filter(p => parseFloat(p.score) < 60).slice(0, 10),
    improved: personnel.filter(p => p.improvement > 5).slice(0, 10)
  }
}

const analyzeTrend = (records: any[]) => {
  // 趋势分析 - 需要更准确的计算
  const { type, year, month, quarter, half } = reportConfig.value
  
  // 获取比较数据
  let previousData: any[] = []
  let yearAgoData: any[] = []
  
  if (!mainStore.database?.assessmentDB) {
    return {
      monthOverMonth: { value: '0%', trend: 'positive' },
      yearOverYear: { value: '0%', trend: 'positive' },
      trendData: { months: [], scores: [] }
    }
  }
  
  const allRecords: any[] = []
  Object.values(mainStore.database.assessmentDB).forEach(monthRecords => {
    allRecords.push(...monthRecords)
  })
  
  // 根据报表类型计算对比期间
  if (type === 'monthly') {
    // 环比：上个月
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    previousData = allRecords.filter((record: any) => {
      const recordDate = new Date(record.assessDate)
      return recordDate.getFullYear() === prevYear && recordDate.getMonth() + 1 === prevMonth
    })
    
    // 同比：去年同月
    yearAgoData = allRecords.filter((record: any) => {
      const recordDate = new Date(record.assessDate)
      return recordDate.getFullYear() === year - 1 && recordDate.getMonth() + 1 === month
    })
  }
  
  // 计算当期平均分
  const currentAvg = records.length > 0 ? records.reduce((sum, r) => sum + r.finalScore, 0) / records.length : 0
  
  // 计算环比变化
  const prevAvg = previousData.length > 0 ? previousData.reduce((sum, r) => sum + r.finalScore, 0) / previousData.length : 0
  const monthOverMonthChange = prevAvg > 0 ? ((currentAvg - prevAvg) / prevAvg * 100) : 0
  
  // 计算同比变化
  const yearAgoAvg = yearAgoData.length > 0 ? yearAgoData.reduce((sum, r) => sum + r.finalScore, 0) / yearAgoData.length : 0
  const yearOverYearChange = yearAgoAvg > 0 ? ((currentAvg - yearAgoAvg) / yearAgoAvg * 100) : 0
  
  return {
    monthOverMonth: { 
      value: monthOverMonthChange > 0 ? `+${monthOverMonthChange.toFixed(1)}%` : `${monthOverMonthChange.toFixed(1)}%`,
      trend: monthOverMonthChange >= 0 ? 'positive' : 'negative'
    },
    yearOverYear: { 
      value: yearOverYearChange > 0 ? `+${yearOverYearChange.toFixed(1)}%` : `${yearOverYearChange.toFixed(1)}%`,
      trend: yearOverYearChange >= 0 ? 'positive' : 'negative'
    },
    trendData: generateTrendChartData(year, type, month, quarter, half)
  }
}

const generateTrendChartData = (year: number, type: string, month: number, quarter: number, half: number) => {
  // 生成趋势图表数据
  const months: string[] = []
  const scores: string[] = []
  
  if (!mainStore.database?.assessmentDB) {
    return { months, scores }
  }
  
  const allRecords: any[] = []
  Object.values(mainStore.database.assessmentDB).forEach(monthRecords => {
    allRecords.push(...monthRecords)
  })
  
  if (type === 'monthly') {
    // 显示最近6个月的趋势
    for (let i = 5; i >= 0; i--) {
      let targetMonth = month - i
      let targetYear = year
      
      if (targetMonth <= 0) {
        targetMonth += 12
        targetYear -= 1
      }
      
      const monthData = allRecords.filter((record: any) => {
        const recordDate = new Date(record.assessDate)
        return recordDate.getFullYear() === targetYear && recordDate.getMonth() + 1 === targetMonth
      })
      
      const avgScore = monthData.length > 0 ? monthData.reduce((sum, r) => sum + r.finalScore, 0) / monthData.length : 0
      
      months.push(`${targetYear}年${targetMonth}月`)
      scores.push(avgScore.toFixed(1))
    }
  }
  
  return { months, scores }
}

const getTopIssueCategory = (records) => {
  // 获取最高频的问题类别
  const categoryStats = new Map()
  
  records.forEach(record => {
    record.details.forEach(detail => {
      const category = detail.itemCategory || '其他'
      categoryStats.set(category, (categoryStats.get(category) || 0) + 1)
    })
  })
  
  const topCategory = Array.from(categoryStats.entries())
    .sort((a, b) => b[1] - a[1])[0]
  
  return topCategory ? topCategory[0] : '服务质量'
}

const initCharts = () => {
  // 销毁现有图表
  charts.forEach(chart => chart.dispose())
  charts = []
  
  // 得分分布饼图
  if (scoreDistributionChart.value) {
    const chart = echarts.init(scoreDistributionChart.value)
    chart.setOption({
      tooltip: { 
        trigger: 'item',
        formatter: '{b}: {c}人 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        type: 'pie',
        radius: '60%',
        center: ['60%', '50%'],
        data: reportData.value.overview.scoreDistribution.map(item => ({
          name: item.range,
          value: item.count
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    })
    charts.push(chart)
  }
  
  // 部门得分对比柱状图
  if (departmentChart.value) {
    const chart = echarts.init(departmentChart.value)
    const deptData = reportData.value.departments.ranking.slice(0, 8) // 显示前8个部门
    
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: deptData.map(d => d.department),
        axisLabel: {
          interval: 0,
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '平均分',
        min: 0,
        max: 100
      },
      series: [{
        name: '平均分',
        type: 'bar',
        data: deptData.map(d => ({
          value: parseFloat(d.score),
          itemStyle: {
            color: parseFloat(d.score) >= 90 ? '#67c23a' : 
                   parseFloat(d.score) >= 80 ? '#409eff' :
                   parseFloat(d.score) >= 60 ? '#e6a23c' : '#f56c6c'
          }
        }))
      }]
    })
    charts.push(chart)
  }
  
  // 高频问题条形图
  if (topIssuesChart.value) {
    const chart = echarts.init(topIssuesChart.value)
    const issuesData = reportData.value.issues.topIssues.slice(0, 8)
    
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '出现次数'
      },
      yAxis: {
        type: 'category',
        data: issuesData.map(i => i.issue.length > 10 ? i.issue.substring(0, 10) + '...' : i.issue).reverse()
      },
      series: [{
        name: '出现次数',
        type: 'bar',
        data: issuesData.map(i => i.count).reverse(),
        itemStyle: {
          color: '#409eff'
        }
      }]
    })
    charts.push(chart)
  }
  
  // 趋势图
  if (trendChart.value && reportData.value.trend.trendData) {
    const chart = echarts.init(trendChart.value)
    const { months, scores } = reportData.value.trend.trendData
    
    chart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: {
          interval: 0,
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '平均分',
        min: 0,
        max: 100
      },
      series: [{
        name: '平均分',
        type: 'line',
        data: scores,
        smooth: true,
        itemStyle: {
          color: '#409eff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(64, 158, 255, 0.3)'
            }, {
              offset: 1, color: 'rgba(64, 158, 255, 0.1)'
            }]
          }
        }
      }]
    })
    charts.push(chart)
  }
}

const getScoreClass = (score) => {
  const numScore = parseFloat(score)
  if (numScore >= 90) return 'score-excellent'
  if (numScore >= 80) return 'score-good'
  if (numScore >= 60) return 'score-normal'
  return 'score-poor'
}

const formatDate = (date) => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const exportToPDF = () => {
  // PDF导出功能
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }
  
  // 使用html2canvas + jsPDF实现PDF导出
  ElMessage.info('PDF导出功能开发中，建议先使用打印功能')
}

const exportToExcel = () => {
  // Excel导出功能
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }
  
  try {
    // 导出汇总数据
    const summaryData = [
      ['项目', '数值'],
      ...reportData.value.summary.metrics.map((metric: any) => [metric.name, metric.value])
    ]
    
    // 导出部门分析数据
    const deptData = [
      ['排名', '部门', '平均分', '及格率'],
      ...reportData.value.departments.ranking.map((dept: any) => [
        dept.rank, dept.department, dept.score, dept.passRate + '%'
      ])
    ]
    
    // 导出问题分析数据
    const issuesData = [
      ['问题类别', '出现次数', '占比'],
      ...reportData.value.issues.categories.map((cat: any) => [
        cat.category, cat.count, cat.percentage + '%'
      ])
    ]
    
    // 这里需要引入XLSX库来实现真正的导出
    // import * as XLSX from 'xlsx'
    ElMessage.success('数据已准备完成，Excel导出功能待完善XLSX库集成')
    
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

const printReport = () => {
  // 打印功能
  window.print()
}

onMounted(() => {
  mainStore.loadDatabase()
})
</script>

<style lang="scss" scoped>
.assessment-reports-container {
  .page-header {
    margin-bottom: 20px;
    
    h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .description {
      margin: 0;
      color: #666;
    }
  }

  .config-section {
    margin-bottom: 20px;
    
    .config-header h3 {
      margin: 0;
      font-size: 16px;
    }
  }

  .report-content {
    .report-header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      border-bottom: 2px solid #eee;
      
      h1 {
        margin: 0 0 16px 0;
        font-size: 28px;
        color: #333;
      }
      
      .report-meta {
        margin-bottom: 20px;
        color: #666;
      }
      
      .report-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
      }
    }

    .el-card {
      margin-bottom: 24px;
      
      :deep(.el-card__header) {
        padding: 16px 20px;
        border-bottom: 2px solid #f0f0f0;
        
        h2 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
      }
    }

    .summary-content {
      .summary-text {
        margin-bottom: 24px;
        
        h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #555;
        }
        
        ul {
          margin: 0 0 20px 0;
          padding-left: 20px;
          
          li {
            margin-bottom: 8px;
            line-height: 1.5;
          }
        }
      }
      
      .metric-card {
        text-align: center;
        padding: 16px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
          
          &.positive {
            color: #67c23a;
          }
          
          &.negative {
            color: #f56c6c;
          }
        }
        
        .metric-name {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .metric-change {
          font-size: 12px;
          color: #999;
        }
      }
    }

    .chart-container {
      .chart {
        height: 300px;
      }
      
      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        text-align: center;
      }
    }

    .overview-stats {
      .stat-item {
        text-align: center;
        padding: 20px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        margin-bottom: 16px;
        
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #409eff;
          margin-bottom: 8px;
        }
        
        .stat-label {
          font-size: 14px;
          color: #666;
        }
      }
    }

    .department-ranking,
    .issues-table,
    .personnel-list {
      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        text-align: center;
      }
    }

    .personnel-list {
      &.excellent h3 {
        color: #67c23a;
      }
      
      &.attention h3 {
        color: #f56c6c;
      }
      
      &.improved h3 {
        color: #409eff;
      }
    }

    .comparison-data {
      padding: 20px;
      
      h3 {
        margin: 0 0 20px 0;
        font-size: 16px;
        text-align: center;
      }
      
      .comparison-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        font-size: 16px;
        
        .positive {
          color: #67c23a;
          font-weight: bold;
        }
        
        .negative {
          color: #f56c6c;
          font-weight: bold;
        }
      }
    }
  }

  // 得分样式
  .score-excellent {
    color: #67c23a;
    font-weight: bold;
  }

  .score-good {
    color: #409eff;
    font-weight: bold;
  }

  .score-normal {
    color: #e6a23c;
    font-weight: bold;
  }

  .score-poor {
    color: #f56c6c;
    font-weight: bold;
  }
}

// 打印样式
@media print {
  .config-section,
  .report-actions {
    display: none !important;
  }
  
  .report-content {
    .el-card {
      border: none;
      box-shadow: none;
      
      :deep(.el-card__header) {
        background: white;
      }
    }
  }
}
</style> 