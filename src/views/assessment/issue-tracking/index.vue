<template>
  <div class="issue-tracking-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>问题追踪分析</h1>
      <p class="description">分析考核中的扣分项分布、频次和趋势，助力质量管理</p>
    </div>

    <!-- 筛选控件 -->
    <div class="filter-section">
      <el-card>
        <el-row :gutter="20">
          <el-col :span="5">
            <el-select v-model="selectedYear" placeholder="选择年份" @change="updateCharts">
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="year + '年'"
                :value="year"
              />
            </el-select>
          </el-col>
          <el-col :span="5">
            <el-select v-model="selectedMonth" placeholder="选择月份" @change="updateCharts">
              <el-option label="全年" value="all" />
              <el-option
                v-for="month in 12"
                :key="month"
                :label="month + '月'"
                :value="month"
              />
            </el-select>
          </el-col>
          <el-col :span="5">
            <el-select v-model="selectedDepartment" placeholder="选择部门" @change="updateCharts">
              <el-option label="全部部门" value="all" />
              <el-option
                v-for="dept in departments"
                :key="dept"
                :label="dept"
                :value="dept"
              />
            </el-select>
          </el-col>
          <el-col :span="5">
            <el-select v-model="selectedSeverity" placeholder="问题严重程度" @change="updateCharts">
              <el-option label="全部" value="all" />
              <el-option label="严重问题 (≥5分)" value="severe" />
              <el-option label="一般问题 (3-5分)" value="moderate" />
              <el-option label="轻微问题 (<3分)" value="minor" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="exportData" :loading="exporting">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon error">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-card-title">问题总数</div>
          <div class="stat-card-value">
            {{ statistics.totalIssues }}
            <span class="unit">个</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon warning">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-card-title">涉及人员</div>
          <div class="stat-card-value">
            {{ statistics.affectedPersons }}
            <span class="unit">人</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon primary">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-card-title">平均扣分</div>
          <div class="stat-card-value">
            {{ statistics.averageDeduction.toFixed(1) }}
            <span class="unit">分</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon success">
            <el-icon><OfficeBuilding /></el-icon>
          </div>
          <div class="stat-card-title">涉及部门</div>
          <div class="stat-card-value">
            {{ statistics.affectedDepartments }}
            <span class="unit">个</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 高频扣分项Top10 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <h3>高频扣分项 Top10</h3>
              <el-radio-group v-model="topIssuesChartType" size="small" @change="updateTopIssuesChart">
                <el-radio-button label="bar">横向柱状图</el-radio-button>
                <el-radio-button label="pie">饼图</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="topIssuesChartRef"></div>
        </el-card>
      </el-col>

      <!-- 问题严重程度分布 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <h3>问题严重程度分布</h3>
              <el-radio-group v-model="severityChartType" size="small" @change="updateSeverityChart">
                <el-radio-button label="doughnut">环形图</el-radio-button>
                <el-radio-button label="bar">柱状图</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="severityChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-section">
      <!-- 部门问题分布 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <h3>部门问题分布</h3>
              <el-select v-model="heatmapMetric" size="small" @change="updateHeatmapChart">
                <el-option label="问题数量" value="count" />
                <el-option label="扣分总计" value="deduction" />
                <el-option label="平均扣分" value="average" />
              </el-select>
            </div>
          </template>
          <div class="chart-container" ref="heatmapChartRef"></div>
        </el-card>
      </el-col>

      <!-- 问题趋势分析 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <h3>问题趋势分析</h3>
              <el-checkbox-group v-model="trendMetrics" size="small" @change="updateTrendChart">
                <el-checkbox label="count">问题数量</el-checkbox>
                <el-checkbox label="deduction">扣分总计</el-checkbox>
                <el-checkbox label="affected">涉及人员</el-checkbox>
              </el-checkbox-group>
            </div>
          </template>
          <div class="chart-container" ref="trendChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细问题列表 -->
    <el-card class="table-section">
      <template #header>
        <div class="card-header">
          <h3>问题详细列表</h3>
          <div class="table-controls">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索问题描述"
              style="width: 200px; margin-right: 10px"
              clearable
            />
            <el-button size="small" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table
        :data="filteredTableData"
        style="width: 100%"
        v-loading="loading"
        :default-sort="{ prop: 'count', order: 'descending' }"
      >
        <el-table-column prop="itemName" label="问题项目" width="200" />
        <el-table-column prop="category" label="问题类别" width="120" />
        <el-table-column prop="count" label="出现次数" width="100" sortable />
        <el-table-column prop="totalDeduction" label="总扣分" width="100" sortable>
          <template #default="{ row }">
            {{ row.totalDeduction.toFixed(1) }}
          </template>
        </el-table-column>
        <el-table-column prop="averageDeduction" label="平均扣分" width="100" sortable>
          <template #default="{ row }">
            {{ row.averageDeduction.toFixed(1) }}
          </template>
        </el-table-column>
        <el-table-column prop="affectedPersons" label="涉及人员" width="100" sortable />
        <el-table-column prop="affectedDepartments" label="涉及部门" width="100" sortable />
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getSeverityTagType(row.averageDeduction)"
            >
              {{ getSeverityText(row.averageDeduction) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trend" label="趋势" width="80">
          <template #default="{ row }">
            <el-icon 
              :color="getTrendColor(row.trend)"
              style="font-size: 16px"
            >
              <component :is="getTrendIcon(row.trend)" />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetails(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 问题详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="问题详情"
      width="80%"
      :before-close="closeDetailDialog"
    >
      <div v-if="selectedIssue">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="问题项目">{{ selectedIssue.itemName }}</el-descriptions-item>
          <el-descriptions-item label="问题类别">{{ selectedIssue.category }}</el-descriptions-item>
          <el-descriptions-item label="出现次数">{{ selectedIssue.count }}</el-descriptions-item>
          <el-descriptions-item label="总扣分">{{ selectedIssue.totalDeduction.toFixed(1) }}分</el-descriptions-item>
          <el-descriptions-item label="平均扣分">{{ selectedIssue.averageDeduction.toFixed(1) }}分</el-descriptions-item>
          <el-descriptions-item label="严重程度">
            <el-tag :type="getSeverityTagType(selectedIssue.averageDeduction)">
              {{ getSeverityText(selectedIssue.averageDeduction) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <div style="margin-top: 20px;">
          <h4>涉及人员详情</h4>
          <el-table :data="selectedIssueDetails" style="width: 100%">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="department" label="部门" width="150" />
            <el-table-column prop="deduction" label="扣分" width="80" />
            <el-table-column prop="date" label="发生时间" width="120" />
            <el-table-column prop="month" label="月份" width="80" />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMainStore } from '@/stores'
import * as echarts from 'echarts'
import type { EChartsType } from 'echarts'

const mainStore = useMainStore()

// 响应式数据
const selectedYear = ref(2025)
const selectedMonth = ref<number | 'all'>('all')
const selectedDepartment = ref<string>('all')
const selectedSeverity = ref<string>('all')
const topIssuesChartType = ref('bar')
const severityChartType = ref('doughnut')
const heatmapMetric = ref('count')
const trendMetrics = ref(['count', 'deduction'])
const loading = ref(false)
const exporting = ref(false)
const searchKeyword = ref('')
const detailDialogVisible = ref(false)
const selectedIssue = ref<any>(null)
const selectedIssueDetails = ref<any[]>([])

// 图表引用
const topIssuesChartRef = ref<HTMLDivElement>()
const severityChartRef = ref<HTMLDivElement>()
const heatmapChartRef = ref<HTMLDivElement>()
const trendChartRef = ref<HTMLDivElement>()

let topIssuesChart: EChartsType | null = null
let severityChart: EChartsType | null = null
let heatmapChart: EChartsType | null = null
let trendChart: EChartsType | null = null

// 计算属性
const availableYears = computed(() => {
  const years = new Set<number>()
  Object.keys(mainStore.assessmentDB).forEach(period => {
    const year = parseInt(period.split('-')[0])
    years.add(year)
  })
  return Array.from(years).sort((a, b) => b - a)
})

const departments = computed(() => {
  const depts = new Set<string>()
  mainStore.monthlyData.forEach(monthData => {
    monthData.data.forEach(conductor => {
      if (conductor.department) depts.add(conductor.department)
    })
  })
  return Array.from(depts).sort()
})

// 过滤后的考核数据
const filteredAssessmentData = computed(() => {
  const filtered: any[] = []
  
  Object.entries(mainStore.assessmentDB).forEach(([period, records]) => {
    const [year, month] = period.split('-').map(Number)
    
    if (year !== selectedYear.value) return
    if (selectedMonth.value !== 'all' && month !== selectedMonth.value) return
    
    records.forEach((record: any) => {
      if (selectedDepartment.value !== 'all' && record.department !== selectedDepartment.value) return
      
      // 处理扣分项
      if (record.details && Array.isArray(record.details)) {
        record.details.forEach((detail: any) => {
          if (detail.score < 0) { // 扣分项
            const deduction = Math.abs(detail.score)
            
            // 根据严重程度筛选
            if (selectedSeverity.value !== 'all') {
              if (selectedSeverity.value === 'severe' && deduction < 5) return
              if (selectedSeverity.value === 'moderate' && (deduction < 3 || deduction >= 5)) return
              if (selectedSeverity.value === 'minor' && deduction >= 3) return
            }
            
            filtered.push({
              ...detail,
              name: record.name,
              department: record.department,
              period,
              year,
              month,
              deduction
            })
          }
        })
      }
    })
  })
  
  return filtered
})

// 统计数据
const statistics = computed(() => {
  const totalIssues = filteredAssessmentData.value.length
  const affectedPersons = new Set(filteredAssessmentData.value.map(item => item.name)).size
  const affectedDepartments = new Set(filteredAssessmentData.value.map(item => item.department)).size
  const totalDeduction = filteredAssessmentData.value.reduce((sum, item) => sum + item.deduction, 0)
  const averageDeduction = totalIssues > 0 ? totalDeduction / totalIssues : 0

  return {
    totalIssues,
    affectedPersons,
    affectedDepartments,
    averageDeduction
  }
})

// 问题统计表格数据
const tableData = computed(() => {
  const issueStats = new Map<string, {
    itemName: string
    category: string
    count: number
    totalDeduction: number
    affectedPersons: Set<string>
    affectedDepartments: Set<string>
    records: any[]
  }>()

  filteredAssessmentData.value.forEach(item => {
    const key = item.item || item.description || '未知问题'
    
    if (!issueStats.has(key)) {
      issueStats.set(key, {
        itemName: key,
        category: getIssueCategory(key),
        count: 0,
        totalDeduction: 0,
        affectedPersons: new Set(),
        affectedDepartments: new Set(),
        records: []
      })
    }

    const stats = issueStats.get(key)!
    stats.count++
    stats.totalDeduction += item.deduction
    stats.affectedPersons.add(item.name)
    stats.affectedDepartments.add(item.department)
    stats.records.push(item)
  })

  return Array.from(issueStats.entries()).map(([key, stats]) => ({
    itemName: stats.itemName,
    category: stats.category,
    count: stats.count,
    totalDeduction: stats.totalDeduction,
    averageDeduction: stats.totalDeduction / stats.count,
    affectedPersons: stats.affectedPersons.size,
    affectedDepartments: stats.affectedDepartments.size,
    trend: calculateTrend(stats.records),
    records: stats.records
  })).sort((a, b) => b.count - a.count)
})

// 搜索过滤后的表格数据
const filteredTableData = computed(() => {
  if (!searchKeyword.value) return tableData.value
  
  return tableData.value.filter(item => 
    item.itemName.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    item.category.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

// 工具函数
const getIssueCategory = (itemName: string): string => {
  if (itemName.includes('服务') || itemName.includes('态度')) return '服务质量'
  if (itemName.includes('安全') || itemName.includes('违章')) return '安全问题'
  if (itemName.includes('制服') || itemName.includes('仪容')) return '形象问题'
  if (itemName.includes('操作') || itemName.includes('流程')) return '操作问题'
  if (itemName.includes('设备') || itemName.includes('故障')) return '设备问题'
  return '其他问题'
}

const getSeverityText = (deduction: number): string => {
  if (deduction >= 5) return '严重'
  if (deduction >= 3) return '一般'
  return '轻微'
}

const getSeverityTagType = (deduction: number): string => {
  if (deduction >= 5) return 'danger'
  if (deduction >= 3) return 'warning'
  return 'info'
}

const calculateTrend = (records: any[]): 'up' | 'down' | 'stable' => {
  if (records.length < 2) return 'stable'
  
  // 比较最近两个月的数据
  const recentRecords = records.slice(-10) // 最近10条记录
  const earlierRecords = records.slice(0, -10)
  
  if (earlierRecords.length === 0) return 'stable'
  
  const recentAvg = recentRecords.length / Math.max(1, recentRecords.length)
  const earlierAvg = earlierRecords.length / Math.max(1, earlierRecords.length)
  
  if (recentAvg > earlierAvg * 1.2) return 'up'
  if (recentAvg < earlierAvg * 0.8) return 'down'
  return 'stable'
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up': return 'ArrowUp'
    case 'down': return 'ArrowDown'
    default: return 'Minus'
  }
}

const getTrendColor = (trend: string): string => {
  switch (trend) {
    case 'up': return '#f56c6c'
    case 'down': return '#67c23a'
    default: return '#909399'
  }
}

// 初始化图表
const initCharts = () => {
  initTopIssuesChart()
  initSeverityChart()
  initHeatmapChart()
  initTrendChart()
}

// 高频问题图表
const initTopIssuesChart = () => {
  if (!topIssuesChartRef.value) return
  topIssuesChart = echarts.init(topIssuesChartRef.value)
  updateTopIssuesChart()
}

const updateTopIssuesChart = () => {
  if (!topIssuesChart) return

  const topIssues = tableData.value.slice(0, 10)

  if (topIssuesChartType.value === 'bar') {
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '20%'
      },
      xAxis: {
        type: 'value',
        name: '出现次数'
      },
      yAxis: {
        type: 'category',
        data: topIssues.map(item => item.itemName.length > 15 ? 
          item.itemName.substring(0, 15) + '...' : item.itemName),
        axisLabel: {
          interval: 0
        }
      },
      series: [{
        data: topIssues.map(item => item.count),
        type: 'bar',
        itemStyle: {
          color: '#f56c6c'
        }
      }]
    }
    topIssuesChart.setOption(option)
  } else {
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      series: [{
        name: '问题分布',
        type: 'pie',
        radius: ['40%', '70%'],
        data: topIssues.map(item => ({
          name: item.itemName.length > 10 ? 
            item.itemName.substring(0, 10) + '...' : item.itemName,
          value: item.count
        })),
        label: {
          formatter: '{b}: {d}%'
        }
      }]
    }
    topIssuesChart.setOption(option)
  }
}

// 严重程度分布图表
const initSeverityChart = () => {
  if (!severityChartRef.value) return
  severityChart = echarts.init(severityChartRef.value)
  updateSeverityChart()
}

const updateSeverityChart = () => {
  if (!severityChart) return

  const severityStats = {
    '严重问题': filteredAssessmentData.value.filter(item => item.deduction >= 5).length,
    '一般问题': filteredAssessmentData.value.filter(item => item.deduction >= 3 && item.deduction < 5).length,
    '轻微问题': filteredAssessmentData.value.filter(item => item.deduction < 3).length
  }

  if (severityChartType.value === 'doughnut') {
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        name: '严重程度',
        type: 'pie',
        radius: ['50%', '70%'],
        data: Object.entries(severityStats).map(([name, value]) => ({ name, value })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }
    severityChart.setOption(option)
  } else {
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'category',
        data: Object.keys(severityStats)
      },
      yAxis: {
        type: 'value',
        name: '问题数量'
      },
      series: [{
        data: Object.values(severityStats),
        type: 'bar',
        itemStyle: {
          color: (params: any) => {
            const colors = ['#f56c6c', '#e6a23c', '#409eff']
            return colors[params.dataIndex] || '#409eff'
          }
        }
      }]
    }
    severityChart.setOption(option)
  }
}

// 部门问题分布图表
const initHeatmapChart = () => {
  if (!heatmapChartRef.value) return
  heatmapChart = echarts.init(heatmapChartRef.value)
  updateHeatmapChart()
}

const updateHeatmapChart = () => {
  if (!heatmapChart) return

  // 获取部门问题统计
  const deptStats = new Map<string, { count: number, deduction: number }>()
  
  filteredAssessmentData.value.forEach(item => {
    if (!deptStats.has(item.department)) {
      deptStats.set(item.department, { count: 0, deduction: 0 })
    }
    const stats = deptStats.get(item.department)!
    stats.count++
    stats.deduction += item.deduction
  })

  const deptData = Array.from(deptStats.entries()).map(([dept, stats]) => {
    let value = stats.count
    if (heatmapMetric.value === 'deduction') value = stats.deduction
    if (heatmapMetric.value === 'average') value = stats.deduction / stats.count
    return { name: dept, value: value.toFixed(1) }
  }).sort((a, b) => Number(b.value) - Number(a.value))

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: deptData.map(d => d.name),
      axisLabel: {
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: heatmapMetric.value === 'count' ? '问题数量' : 
            heatmapMetric.value === 'deduction' ? '扣分总计' : '平均扣分'
    },
    series: [{
      data: deptData.map(d => Number(d.value)),
      type: 'bar',
      itemStyle: {
        color: (params: any) => {
          const maxValue = Math.max(...deptData.map(d => Number(d.value)))
          const ratio = Number(deptData[params.dataIndex].value) / maxValue
          const opacity = 0.3 + ratio * 0.7
          return `rgba(245, 108, 108, ${opacity})`
        }
      }
    }]
  }

  heatmapChart.setOption(option)
}

// 问题趋势图表
const initTrendChart = () => {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

const updateTrendChart = () => {
  if (!trendChart) return

  // 获取月度趋势数据
  const monthlyTrend = new Map<string, { count: number, deduction: number, affected: Set<string> }>()

  Object.entries(mainStore.assessmentDB).forEach(([period, records]) => {
    const [year] = period.split('-').map(Number)
    if (year >= selectedYear.value - 1) {
      monthlyTrend.set(period, { count: 0, deduction: 0, affected: new Set() })
      
      records.forEach((record: any) => {
        if (record.details && Array.isArray(record.details)) {
          record.details.forEach((detail: any) => {
            if (detail.score < 0) {
              const stats = monthlyTrend.get(period)!
              stats.count++
              stats.deduction += Math.abs(detail.score)
              stats.affected.add(record.name)
            }
          })
        }
      })
    }
  })

  const sortedPeriods = Array.from(monthlyTrend.keys()).sort()
  const series: any[] = []

  if (trendMetrics.value.includes('count')) {
    series.push({
      name: '问题数量',
      type: 'line',
      yAxisIndex: 0,
      data: sortedPeriods.map(period => monthlyTrend.get(period)?.count || 0),
      itemStyle: { color: '#f56c6c' }
    })
  }

  if (trendMetrics.value.includes('deduction')) {
    series.push({
      name: '扣分总计',
      type: 'line',
      yAxisIndex: 1,
      data: sortedPeriods.map(period => monthlyTrend.get(period)?.deduction || 0),
      itemStyle: { color: '#e6a23c' }
    })
  }

  if (trendMetrics.value.includes('affected')) {
    series.push({
      name: '涉及人员',
      type: 'line',
      yAxisIndex: 0,
      data: sortedPeriods.map(period => monthlyTrend.get(period)?.affected.size || 0),
      itemStyle: { color: '#409eff' }
    })
  }

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: series.map(s => s.name)
    },
    xAxis: {
      type: 'category',
      data: sortedPeriods
    },
    yAxis: [
      {
        type: 'value',
        name: '数量/人数',
        position: 'left'
      },
      {
        type: 'value',
        name: '扣分',
        position: 'right'
      }
    ],
    series
  }

  trendChart.setOption(option)
}

// 更新所有图表
const updateCharts = () => {
  nextTick(() => {
    updateTopIssuesChart()
    updateSeverityChart()
    updateHeatmapChart()
    updateTrendChart()
  })
}

// 查看问题详情
const viewDetails = (issue: any) => {
  selectedIssue.value = issue
  selectedIssueDetails.value = issue.records.map((record: any) => ({
    name: record.name,
    department: record.department,
    deduction: record.deduction.toFixed(1),
    date: record.date || '-',
    month: record.period
  }))
  detailDialogVisible.value = true
}

const closeDetailDialog = () => {
  detailDialogVisible.value = false
  selectedIssue.value = null
  selectedIssueDetails.value = []
}

// 导出数据
const exportData = async () => {
  exporting.value = true
  try {
    // 实现导出逻辑
    console.log('导出问题追踪数据')
  } finally {
    exporting.value = false
  }
}

// 刷新数据
const refreshData = () => {
  updateCharts()
}

// 监听窗口大小变化
const handleResize = () => {
  topIssuesChart?.resize()
  severityChart?.resize()
  heatmapChart?.resize()
  trendChart?.resize()
}

onMounted(async () => {
  await mainStore.loadDatabase()
  await nextTick()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  topIssuesChart?.dispose()
  severityChart?.dispose()
  heatmapChart?.dispose()
  trendChart?.dispose()
})
</script>

<style lang="scss" scoped>
.issue-tracking-container {
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

  .filter-section {
    margin-bottom: 20px;
  }

  .stat-cards {
    margin-bottom: 20px;
  }

  .charts-section {
    margin-bottom: 20px;
  }

  .chart-container {
    height: 350px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .table-section {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .table-controls {
        display: flex;
        align-items: center;
      }
    }
  }
}
</style> 