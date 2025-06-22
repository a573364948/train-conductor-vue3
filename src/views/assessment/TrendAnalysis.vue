<template>
  <div class="trend-analysis-container">
    <!-- 时间范围选择 -->
    <div class="time-selector card">
      <el-radio-group v-model="timeRange" @change="handleTimeRangeChange">
        <el-radio-button label="3months">近3个月</el-radio-button>
        <el-radio-button label="6months">近6个月</el-radio-button>
        <el-radio-button label="12months">近12个月</el-radio-button>
        <el-radio-button label="all">全部</el-radio-button>
      </el-radio-group>
      <span class="time-tips">数据范围：{{ dataRangeText }}</span>
    </div>
    
    <!-- 整体趋势图 -->
    <div class="overall-trend card">
      <div class="card-header">
        <h3>整体趋势分析</h3>
      </div>
      <div class="card-body">
        <div id="overallTrendChart" class="chart-container"></div>
      </div>
    </div>
    
    <!-- 部门趋势对比 -->
    <div class="department-trend card">
      <div class="card-header">
        <h3>部门趋势对比</h3>
        <el-select
          v-model="selectedDepartments"
          multiple
          placeholder="选择部门（最多5个）"
          :multiple-limit="5"
          @change="updateCharts"
        >
          <el-option
            v-for="dept in allDepartments"
            :key="dept"
            :label="dept"
            :value="dept"
          />
        </el-select>
      </div>
      <div class="card-body">
        <div id="departmentTrendChart" class="chart-container"></div>
      </div>
    </div>
    
    <!-- 个人趋势查询 -->
    <div class="personal-trend card">
      <div class="card-header">
        <h3>个人趋势查询</h3>
        <el-select
          v-model="selectedConductor"
          filterable
          placeholder="搜索列车长姓名或工号"
          @change="updatePersonalChart"
        >
          <el-option
            v-for="conductor in allConductors"
            :key="conductor.id"
            :label="`${conductor.name} (${conductor.id})`"
            :value="conductor.id"
          />
        </el-select>
      </div>
      <div class="card-body">
        <div v-if="selectedConductor" id="personalTrendChart" class="chart-container"></div>
        <div v-else class="empty-placeholder">
          <el-empty description="请选择列车长查看个人趋势" />
        </div>
      </div>
    </div>
    
    <!-- 趋势统计表格 -->
    <div class="trend-statistics card">
      <div class="card-header">
        <h3>趋势统计明细</h3>
      </div>
      <div class="card-body">
        <el-table :data="trendTableData" stripe>
          <el-table-column prop="yearMonth" label="月份" width="100" />
          <el-table-column prop="totalCount" label="总人数" width="100" />
          <el-table-column prop="activeCount" label="在岗人数" width="100" />
          <el-table-column prop="attendanceRate" label="在岗率" width="100">
            <template #default="{ row }">
              {{ row.attendanceRate }}%
            </template>
          </el-table-column>
          <el-table-column prop="averageScore" label="平均得分" width="100">
            <template #default="{ row }">
              {{ row.averageScore.toFixed(1) }}
            </template>
          </el-table-column>
          <el-table-column label="环比变化" width="120">
            <template #default="{ row }">
              <span :class="row.scoreChange >= 0 ? 'positive' : 'negative'">
                {{ row.scoreChange >= 0 ? '+' : '' }}{{ row.scoreChange.toFixed(1) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useMainStore } from '@/stores'
import { DataMigrationUtils } from '@/utils/dataMigration'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const mainStore = useMainStore()

// 时间范围
const timeRange = ref('6months')
const selectedDepartments = ref<string[]>([])
const selectedConductor = ref('')

// 获取所有部门
const allDepartments = computed(() => {
  const deptSet = new Set<string>()
  mainStore.monthlyData.forEach(month => {
    month.data.forEach(conductor => {
      if (conductor.department) deptSet.add(conductor.department)
    })
  })
  return Array.from(deptSet).sort()
})

// 获取所有列车长
const allConductors = computed(() => {
  const conductorMap = new Map<string, { id: string; name: string }>()
  mainStore.monthlyData.forEach(month => {
    month.data.forEach(conductor => {
      if (!conductorMap.has(conductor.id)) {
        conductorMap.set(conductor.id, {
          id: conductor.id,
          name: conductor.name
        })
      }
    })
  })
  return Array.from(conductorMap.values()).sort((a, b) => a.name.localeCompare(b.name))
})

// 过滤后的月度数据
const filteredMonthlyData = computed(() => {
  let months = [...mainStore.monthlyData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
  
  if (timeRange.value !== 'all') {
    const monthCount = timeRange.value === '3months' ? 3 : timeRange.value === '6months' ? 6 : 12
    months = months.slice(-monthCount)
  }
  
  return months
})

// 数据范围文本
const dataRangeText = computed(() => {
  if (filteredMonthlyData.value.length === 0) return '暂无数据'
  const first = filteredMonthlyData.value[0]
  const last = filteredMonthlyData.value[filteredMonthlyData.value.length - 1]
  return `${first.year}年${first.month}月 - ${last.year}年${last.month}月`
})

// 趋势表格数据
const trendTableData = computed(() => {
  return filteredMonthlyData.value.map((month, index) => {
    const activeData = month.data.filter(d => d.isActive)
    const totalScore = activeData.reduce((sum, d) => sum + d.monthlyScore, 0)
    const averageScore = activeData.length > 0 ? totalScore / activeData.length : 0
    
    // 计算环比变化
    let scoreChange = 0
    if (index > 0) {
      const prevMonth = filteredMonthlyData.value[index - 1]
      const prevActiveData = prevMonth.data.filter(d => d.isActive)
      const prevTotalScore = prevActiveData.reduce((sum, d) => sum + d.monthlyScore, 0)
      const prevAverageScore = prevActiveData.length > 0 ? prevTotalScore / prevActiveData.length : 0
      scoreChange = averageScore - prevAverageScore
    }
    
    return {
      yearMonth: `${month.year}-${String(month.month).padStart(2, '0')}`,
      totalCount: month.data.length,
      activeCount: activeData.length,
      attendanceRate: Math.round((activeData.length / month.data.length) * 100),
      averageScore,
      scoreChange
    }
  })
})

// 图表实例
let overallTrendChart: echarts.ECharts | null = null
let departmentTrendChart: echarts.ECharts | null = null
let personalTrendChart: echarts.ECharts | null = null

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    // 整体趋势图
    const overallEl = document.getElementById('overallTrendChart')
    if (overallEl) {
      overallTrendChart = echarts.init(overallEl)
    }
    
    // 部门趋势图
    const deptEl = document.getElementById('departmentTrendChart')
    if (deptEl) {
      departmentTrendChart = echarts.init(deptEl)
    }
    
    window.addEventListener('resize', () => {
      overallTrendChart?.resize()
      departmentTrendChart?.resize()
      personalTrendChart?.resize()
    })
    
    updateCharts()
  })
}

// 更新图表
const updateCharts = () => {
  updateOverallChart()
  updateDepartmentChart()
}

// 更新整体趋势图
const updateOverallChart = () => {
  if (!overallTrendChart || filteredMonthlyData.value.length === 0) return
  
  const xAxisData = filteredMonthlyData.value.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`)
  const averageScores: number[] = []
  const attendanceRates: number[] = []
  
  filteredMonthlyData.value.forEach(month => {
    const activeData = month.data.filter(d => d.isActive)
    const totalScore = activeData.reduce((sum, d) => sum + d.monthlyScore, 0)
    averageScores.push(activeData.length > 0 ? totalScore / activeData.length : 0)
    attendanceRates.push(Math.round((activeData.length / month.data.length) * 100))
  })
  
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['平均得分', '在岗率'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData
    },
    yAxis: [
      {
        type: 'value',
        name: '平均得分',
        min: 0,
        max: 100,
        position: 'left',
        axisLine: { show: true, lineStyle: { color: '#2196F3' } }
      },
      {
        type: 'value',
        name: '在岗率 (%)',
        min: 0,
        max: 100,
        position: 'right',
        axisLine: { show: true, lineStyle: { color: '#4CAF50' } }
      }
    ],
    series: [
      {
        name: '平均得分',
        type: 'line',
        data: averageScores.map(s => s.toFixed(1)),
        smooth: true,
        itemStyle: { color: '#2196F3' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(33, 150, 243, 0.3)' },
            { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
          ])
        }
      },
      {
        name: '在岗率',
        type: 'line',
        yAxisIndex: 1,
        data: attendanceRates,
        smooth: true,
        itemStyle: { color: '#4CAF50' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(76, 175, 80, 0.3)' },
            { offset: 1, color: 'rgba(76, 175, 80, 0.05)' }
          ])
        }
      }
    ]
  }
  
  overallTrendChart.setOption(option)
}

// 更新部门趋势图
const updateDepartmentChart = () => {
  if (!departmentTrendChart || selectedDepartments.value.length === 0) return
  
  const xAxisData = filteredMonthlyData.value.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`)
  const series: any[] = []
  
  selectedDepartments.value.forEach((dept, index) => {
    const deptScores: number[] = []
    
    filteredMonthlyData.value.forEach(month => {
      const deptData = month.data.filter(d => d.department === dept && d.isActive)
      const totalScore = deptData.reduce((sum, d) => sum + d.monthlyScore, 0)
      deptScores.push(deptData.length > 0 ? totalScore / deptData.length : 0)
    })
    
    series.push({
      name: dept,
      type: 'line',
      data: deptScores.map(s => s.toFixed(1)),
      smooth: true
    })
  })
  
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: selectedDepartments.value,
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData
    },
    yAxis: {
      type: 'value',
      name: '平均得分',
      min: 0,
      max: 100
    },
    series
  }
  
  departmentTrendChart.setOption(option)
}

// 更新个人趋势图
const updatePersonalChart = () => {
  if (!selectedConductor.value) return
  
  nextTick(() => {
    const personalEl = document.getElementById('personalTrendChart')
    if (personalEl && !personalTrendChart) {
      personalTrendChart = echarts.init(personalEl)
    }
    
    if (!personalTrendChart) return
    
    const personalData: { month: string; score: number; status: string }[] = []
    
    filteredMonthlyData.value.forEach(month => {
      const conductor = month.data.find(d => d.id === selectedConductor.value)
      if (conductor) {
        personalData.push({
          month: `${month.year}-${String(month.month).padStart(2, '0')}`,
          score: conductor.monthlyScore,
          status: DataMigrationUtils.getUnifiedStatus(conductor)
        })
      }
    })
    
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0]
          const item = personalData[data.dataIndex]
          return `${data.name}<br/>得分：${data.value}<br/>状态：${item.status}`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: personalData.map(d => d.month)
      },
      yAxis: {
        type: 'value',
        name: '得分',
        min: 0,
        max: 100
      },
      series: [{
        type: 'line',
        data: personalData.map(d => d.score),
        smooth: true,
        lineStyle: { width: 3 },
        itemStyle: {
          color: (params: any) => {
            const status = personalData[params.dataIndex].status
            if (status === '在岗') return '#2196F3'
            if (status === '助勤') return '#FF9800'
            if (status === '待确认') return '#9E9E9E'
            return '#999'
          }
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(33, 150, 243, 0.3)' },
            { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
          ])
        }
      }]
    }
    
    personalTrendChart.setOption(option)
  })
}

// 时间范围改变
const handleTimeRangeChange = () => {
  updateCharts()
  if (selectedConductor.value) {
    updatePersonalChart()
  }
}

onMounted(() => {
  mainStore.loadDatabase().then(() => {
    // 默认选择前3个部门
    selectedDepartments.value = allDepartments.value.slice(0, 3)
    initCharts()
  })
})
</script>

<style lang="scss" scoped>
.trend-analysis-container {
  .time-selector {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    margin-bottom: 20px;
    
    .time-tips {
      margin-left: auto;
      color: var(--text-secondary);
      font-size: 14px;
    }
  }
  
  .overall-trend,
  .department-trend,
  .personal-trend,
  .trend-statistics {
    margin-bottom: 20px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-light);
      
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
      
      .el-select {
        width: 300px;
      }
    }
    
    .card-body {
      padding: 20px;
    }
  }
  
  .chart-container {
    width: 100%;
    height: 400px;
  }
  
  .empty-placeholder {
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .positive {
    color: #4CAF50;
    font-weight: bold;
  }
  
  .negative {
    color: #f44336;
  }
}
</style> 