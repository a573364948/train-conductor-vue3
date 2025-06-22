<template>
  <div class="reward-analysis-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>奖励金额分析</h1>
      <p class="description">分析各部门和个人的奖励金额分布及趋势</p>
    </div>

    <!-- 筛选控件 -->
    <div class="filter-section">
      <el-card>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-select v-model="selectedYear" placeholder="选择年份" @change="updateCharts">
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="year + '年'"
                :value="year"
              />
            </el-select>
          </el-col>
          <el-col :span="6">
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
          <el-col :span="6">
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
          <el-col :span="6">
            <el-button type="primary" @click="exportData" :loading="exporting">
              <el-icon><Download /></el-icon>
              导出报表
            </el-button>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon primary">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-card-title">总奖励金额</div>
          <div class="stat-card-value">
            {{ formatCurrency(statistics.totalReward) }}
            <span class="unit">元</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon success">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-card-title">获奖人数</div>
          <div class="stat-card-value">
            {{ statistics.rewardedCount }}
            <span class="unit">人</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon warning">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-card-title">平均奖励</div>
          <div class="stat-card-value">
            {{ formatCurrency(statistics.averageReward) }}
            <span class="unit">元</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-card-icon error">
            <el-icon><Star /></el-icon>
          </div>
          <div class="stat-card-title">最高奖励</div>
          <div class="stat-card-value">
            {{ formatCurrency(statistics.maxReward) }}
            <span class="unit">元</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 月度奖励分布图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <h3>月度奖励分布</h3>
              <el-radio-group v-model="monthlyChartType" size="small" @change="updateMonthlyChart">
                <el-radio-button label="bar">柱状图</el-radio-button>
                <el-radio-button label="line">折线图</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="monthlyRewardChartRef"></div>
        </el-card>
      </el-col>

      <!-- 部门奖励对比图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <h3>部门奖励对比</h3>
              <el-radio-group v-model="departmentChartType" size="small" @change="updateDepartmentChart">
                <el-radio-button label="bar">柱状图</el-radio-button>
                <el-radio-button label="pie">饼图</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="departmentRewardChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-section">
      <!-- 奖励趋势分析图 -->
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <h3>奖励趋势分析</h3>
              <div class="chart-controls">
                <el-checkbox-group v-model="trendMetrics" @change="updateTrendChart">
                  <el-checkbox label="totalAmount">总金额</el-checkbox>
                  <el-checkbox label="averageAmount">平均金额</el-checkbox>
                  <el-checkbox label="rewardedCount">获奖人数</el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </template>
          <div class="chart-container large" ref="trendChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细数据表格 -->
    <el-card class="table-section">
      <template #header>
        <div class="card-header">
          <h3>详细数据</h3>
          <el-button size="small" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <el-table
        :data="tableData"
        style="width: 100%"
        v-loading="loading"
        :default-sort="{ prop: 'totalAmount', order: 'descending' }"
      >
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="totalAmount" label="总奖励金额" sortable>
          <template #default="{ row }">
            {{ formatCurrency(row.totalAmount) }}元
          </template>
        </el-table-column>
        <el-table-column prop="rewardedCount" label="获奖人数" sortable />
        <el-table-column prop="averageAmount" label="平均奖励" sortable>
          <template #default="{ row }">
            {{ formatCurrency(row.averageAmount) }}元
          </template>
        </el-table-column>
        <el-table-column prop="maxAmount" label="最高奖励" sortable>
          <template #default="{ row }">
            {{ formatCurrency(row.maxAmount) }}元
          </template>
        </el-table-column>
        <el-table-column prop="percentage" label="占比" sortable>
          <template #default="{ row }">
            {{ row.percentage }}%
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMainStore } from '@/stores'
import { ExcelProcessor } from '@/utils/excel'
import * as echarts from 'echarts'
import type { EChartsType } from 'echarts'

const mainStore = useMainStore()

// 响应式数据
const selectedYear = ref(2025)
const selectedMonth = ref<number | 'all'>('all')
const selectedDepartment = ref<string>('all')
const monthlyChartType = ref('bar')
const departmentChartType = ref('bar')
const trendMetrics = ref(['totalAmount', 'rewardedCount'])
const loading = ref(false)
const exporting = ref(false)

// 图表引用
const monthlyRewardChartRef = ref<HTMLDivElement>()
const departmentRewardChartRef = ref<HTMLDivElement>()
const trendChartRef = ref<HTMLDivElement>()

let monthlyRewardChart: EChartsType | null = null
let departmentRewardChart: EChartsType | null = null
let trendChart: EChartsType | null = null

// 计算属性
const availableYears = computed(() => {
  const years = new Set<number>()
  mainStore.monthlyData.forEach(data => years.add(data.year))
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

// 过滤后的数据
const filteredData = computed(() => {
  return mainStore.monthlyData.filter(monthData => {
    if (monthData.year !== selectedYear.value) return false
    if (selectedMonth.value !== 'all' && monthData.month !== selectedMonth.value) return false
    return true
  })
})

// 统计数据
const statistics = computed(() => {
  let totalReward = 0
  let rewardedCount = 0
  let maxReward = 0

  filteredData.value.forEach(monthData => {
    monthData.data.forEach(conductor => {
      if (conductor.isActive && conductor.rewardAmount > 0) {
        if (selectedDepartment.value === 'all' || conductor.department === selectedDepartment.value) {
          totalReward += conductor.rewardAmount
          rewardedCount++
          maxReward = Math.max(maxReward, conductor.rewardAmount)
        }
      }
    })
  })

  const averageReward = rewardedCount > 0 ? totalReward / rewardedCount : 0

  return {
    totalReward,
    rewardedCount,
    averageReward,
    maxReward
  }
})

// 表格数据
const tableData = computed(() => {
  const deptStats = new Map<string, {
    totalAmount: number
    rewardedCount: number
    maxAmount: number
  }>()

  filteredData.value.forEach(monthData => {
    monthData.data.forEach(conductor => {
      if (conductor.isActive && conductor.rewardAmount > 0) {
        const dept = conductor.department
        if (!deptStats.has(dept)) {
          deptStats.set(dept, {
            totalAmount: 0,
            rewardedCount: 0,
            maxAmount: 0
          })
        }

        const stats = deptStats.get(dept)!
        stats.totalAmount += conductor.rewardAmount
        stats.rewardedCount++
        stats.maxAmount = Math.max(stats.maxAmount, conductor.rewardAmount)
      }
    })
  })

  const totalAmount = Array.from(deptStats.values()).reduce((sum, stats) => sum + stats.totalAmount, 0)

  return Array.from(deptStats.entries()).map(([department, stats]) => ({
    department,
    totalAmount: stats.totalAmount,
    rewardedCount: stats.rewardedCount,
    averageAmount: stats.rewardedCount > 0 ? stats.totalAmount / stats.rewardedCount : 0,
    maxAmount: stats.maxAmount,
    percentage: totalAmount > 0 ? ((stats.totalAmount / totalAmount) * 100).toFixed(1) : '0.0'
  })).sort((a, b) => b.totalAmount - a.totalAmount)
})

// 工具函数
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

// 初始化图表
const initCharts = () => {
  initMonthlyRewardChart()
  initDepartmentRewardChart()
  initTrendChart()
}

// 月度奖励分布图
const initMonthlyRewardChart = () => {
  if (!monthlyRewardChartRef.value) return

  monthlyRewardChart = echarts.init(monthlyRewardChartRef.value)
  updateMonthlyChart()
}

const updateMonthlyChart = () => {
  if (!monthlyRewardChart) return

  const monthlyData = new Map<number, number>()
  
  // 初始化12个月
  for (let i = 1; i <= 12; i++) {
    monthlyData.set(i, 0)
  }

  filteredData.value.forEach(monthData => {
    let monthTotal = 0
    monthData.data.forEach(conductor => {
      if (conductor.isActive && conductor.rewardAmount > 0) {
        if (selectedDepartment.value === 'all' || conductor.department === selectedDepartment.value) {
          monthTotal += conductor.rewardAmount
        }
      }
    })
    monthlyData.set(monthData.month, monthTotal)
  })

  const months = Array.from(monthlyData.keys()).sort((a, b) => a - b)
  const values = months.map(month => monthlyData.get(month) || 0)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}月<br/>奖励总额: ${formatCurrency(data.value)}元`
      }
    },
    xAxis: {
      type: 'category',
      data: months.map(m => m + '月')
    },
    yAxis: {
      type: 'value',
      name: '奖励金额(元)',
      axisLabel: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    series: [{
      data: values,
      type: monthlyChartType.value,
      smooth: monthlyChartType.value === 'line',
      itemStyle: {
        color: '#1890ff'
      }
    }]
  }

  monthlyRewardChart.setOption(option)
}

// 部门奖励对比图
const initDepartmentRewardChart = () => {
  if (!departmentRewardChartRef.value) return

  departmentRewardChart = echarts.init(departmentRewardChartRef.value)
  updateDepartmentChart()
}

const updateDepartmentChart = () => {
  if (!departmentRewardChart) return

  const deptData = tableData.value.slice(0, 10) // 显示前10个部门

  if (departmentChartType.value === 'bar') {
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'category',
        data: deptData.map(d => d.department),
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: '奖励金额(元)',
        axisLabel: {
          formatter: (value: number) => formatCurrency(value)
        }
      },
      series: [{
        data: deptData.map(d => d.totalAmount),
        type: 'bar',
        itemStyle: {
          color: '#52c41a'
        }
      }]
    }
    departmentRewardChart.setOption(option)
  } else {
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c}元 ({d}%)'
      },
      series: [{
        name: '奖励金额',
        type: 'pie',
        radius: ['40%', '70%'],
        data: deptData.map(d => ({
          name: d.department,
          value: d.totalAmount
        })),
        label: {
          formatter: '{b}: {d}%'
        }
      }]
    }
    departmentRewardChart.setOption(option)
  }
}

// 趋势分析图
const initTrendChart = () => {
  if (!trendChartRef.value) return

  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

const updateTrendChart = () => {
  if (!trendChart) return

  // 获取最近12个月的数据
  const monthlyTrend = new Map<string, {
    totalAmount: number
    rewardedCount: number
  }>()

  mainStore.monthlyData
    .filter(data => data.year >= selectedYear.value - 1)
    .forEach(monthData => {
      const key = `${monthData.year}-${String(monthData.month).padStart(2, '0')}`
      let totalAmount = 0
      let rewardedCount = 0

      monthData.data.forEach(conductor => {
        if (conductor.isActive && conductor.rewardAmount > 0) {
          if (selectedDepartment.value === 'all' || conductor.department === selectedDepartment.value) {
            totalAmount += conductor.rewardAmount
            rewardedCount++
          }
        }
      })

      monthlyTrend.set(key, { totalAmount, rewardedCount })
    })

  const sortedKeys = Array.from(monthlyTrend.keys()).sort()
  const series: any[] = []

  if (trendMetrics.value.includes('totalAmount')) {
    series.push({
      name: '总金额',
      type: 'line',
      yAxisIndex: 0,
      data: sortedKeys.map(key => monthlyTrend.get(key)?.totalAmount || 0),
      itemStyle: { color: '#1890ff' }
    })
  }

  if (trendMetrics.value.includes('averageAmount')) {
    series.push({
      name: '平均金额',
      type: 'line',
      yAxisIndex: 0,
      data: sortedKeys.map(key => {
        const data = monthlyTrend.get(key)
        return data && data.rewardedCount > 0 ? data.totalAmount / data.rewardedCount : 0
      }),
      itemStyle: { color: '#52c41a' }
    })
  }

  if (trendMetrics.value.includes('rewardedCount')) {
    series.push({
      name: '获奖人数',
      type: 'line',
      yAxisIndex: 1,
      data: sortedKeys.map(key => monthlyTrend.get(key)?.rewardedCount || 0),
      itemStyle: { color: '#faad14' }
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
      data: sortedKeys
    },
    yAxis: [
      {
        type: 'value',
        name: '金额(元)',
        position: 'left',
        axisLabel: {
          formatter: (value: number) => formatCurrency(value)
        }
      },
      {
        type: 'value',
        name: '人数',
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
    updateMonthlyChart()
    updateDepartmentChart()
    updateTrendChart()
  })
}

// 导出数据
const exportData = async () => {
  exporting.value = true
  try {
    const exportData = [
      ['部门', '总奖励金额', '获奖人数', '平均奖励', '最高奖励', '占比'],
      ...tableData.value.map(row => [
        row.department,
        row.totalAmount,
        row.rewardedCount,
        row.averageAmount,
        row.maxAmount,
        row.percentage + '%'
      ])
    ]

    const filename = `奖励分析报表_${selectedYear.value}年${selectedMonth.value === 'all' ? '' : selectedMonth.value + '月'}`
    ExcelProcessor.exportToExcel(exportData, `${filename}.xlsx`)
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
  monthlyRewardChart?.resize()
  departmentRewardChart?.resize()
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
  monthlyRewardChart?.dispose()
  departmentRewardChart?.dispose()
  trendChart?.dispose()
})
</script>

<style lang="scss" scoped>
.reward-analysis-container {
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
    
    &.large {
      height: 400px;
    }
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
    
    .chart-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }

  .table-section {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
}
</style> 