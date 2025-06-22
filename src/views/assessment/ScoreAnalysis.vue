<template>
  <div class="score-analysis-container">
    <!-- 月份选择器 -->
    <div class="month-selector card">
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        placeholder="选择月份"
        format="YYYY年MM月"
        value-format="YYYY-MM"
        @change="handleMonthChange"
      />
      <span class="month-tips">当前查看：{{ currentMonthText }}</span>
    </div>
    
    <!-- 排行榜 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <div class="ranking-card card">
          <div class="card-header">
            <h3>得分排行榜 TOP 10</h3>
            <el-tag type="success" size="small">最高分</el-tag>
          </div>
          <div class="card-body">
            <div class="ranking-list">
              <div
                v-for="(item, index) in topScorers"
                :key="item.id"
                class="ranking-item"
              >
                <div class="rank-badge" :class="`rank-${index + 1}`">
                  {{ index + 1 }}
                </div>
                <div class="rank-info">
                  <div class="rank-name">{{ item.name }}</div>
                  <div class="rank-detail">{{ item.id }} - {{ item.department }}</div>
                </div>
                <div class="rank-score">{{ item.monthlyScore }}分</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :md="12">
        <div class="ranking-card card">
          <div class="card-header">
            <h3>得分排行榜 BOTTOM 10</h3>
            <el-tag type="danger" size="small">最低分</el-tag>
          </div>
          <div class="card-body">
            <div class="ranking-list">
              <div
                v-for="(item, index) in bottomScorers"
                :key="item.id"
                class="ranking-item"
              >
                <div class="rank-badge rank-bottom">
                  {{ totalActive - bottomScorers.length + index + 1 }}
                </div>
                <div class="rank-info">
                  <div class="rank-name">{{ item.name }}</div>
                  <div class="rank-detail">{{ item.id }} - {{ item.department }}</div>
                </div>
                <div class="rank-score">{{ item.monthlyScore }}分</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 部门对比分析 -->
    <div class="department-analysis card">
      <div class="card-header">
        <h3>部门对比分析</h3>
      </div>
      <div class="card-body">
        <div id="departmentCompareChart" class="chart-container"></div>
      </div>
    </div>
    
    <!-- 得分详细分析 -->
    <div class="score-detail-analysis card">
      <div class="card-header">
        <h3>得分详细分析</h3>
        <el-button-group>
          <el-button
            v-for="dept in ['全部', ...departments]"
            :key="dept"
            :type="selectedDept === dept ? 'primary' : 'default'"
            size="small"
            @click="selectedDept = dept"
          >
            {{ dept }}
          </el-button>
        </el-button-group>
      </div>
      <div class="card-body">
        <el-table :data="filteredAnalysisData" stripe>
          <el-table-column prop="id" label="工号" width="100" sortable />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="department" label="部门" min-width="150" />
          <el-table-column prop="monthlyScore" label="月度得分" width="100" sortable>
            <template #default="{ row }">
              <span :class="getScoreClass(row.monthlyScore)">
                {{ row.monthlyScore }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="得分等级" width="120">
            <template #default="{ row }">
              <el-tag :type="getScoreLevelType(row.monthlyScore)" size="small">
                {{ getScoreLevel(row.monthlyScore) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rewardAmount" label="奖励金额" width="120" sortable>
            <template #default="{ row }">
              ¥{{ row.rewardAmount }}
            </template>
          </el-table-column>
          <el-table-column label="与平均分差距" width="130">
            <template #default="{ row }">
              <span :class="row.monthlyScore >= averageScore ? 'positive' : 'negative'">
                {{ (row.monthlyScore - averageScore).toFixed(1) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useMainStore } from '@/stores'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { ConductorMonthlyData } from '@/types'

const mainStore = useMainStore()

// 选中的月份
const selectedMonth = ref('')
const selectedDept = ref('全部')

const currentMonthText = computed(() => {
  if (!selectedMonth.value) return '暂无数据'
  const [year, month] = selectedMonth.value.split('-')
  return `${year}年${month}月`
})

// 当前月份数据
const currentData = computed(() => {
  if (!selectedMonth.value) return null
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return mainStore.monthlyData.find(m => m.year === year && m.month === month)
})

// 在岗人员数据
const activeData = computed(() => {
  if (!currentData.value) return []
  return currentData.value.data.filter(d => d.isActive)
})

const totalActive = computed(() => activeData.value.length)

// 平均分
const averageScore = computed(() => {
  if (activeData.value.length === 0) return 0
  const total = activeData.value.reduce((sum, d) => sum + d.monthlyScore, 0)
  return total / activeData.value.length
})

// 部门列表
const departments = computed(() => {
  const deptSet = new Set<string>()
  activeData.value.forEach(d => {
    if (d.department) deptSet.add(d.department)
  })
  return Array.from(deptSet).sort()
})

// TOP 10 高分
const topScorers = computed(() => {
  return [...activeData.value]
    .sort((a, b) => b.monthlyScore - a.monthlyScore)
    .slice(0, 10)
})

// BOTTOM 10 低分
const bottomScorers = computed(() => {
  return [...activeData.value]
    .sort((a, b) => a.monthlyScore - b.monthlyScore)
    .slice(0, 10)
})

// 过滤后的分析数据
const filteredAnalysisData = computed(() => {
  if (selectedDept.value === '全部') {
    return activeData.value
  }
  return activeData.value.filter(d => d.department === selectedDept.value)
})

// 部门统计数据
const departmentStats = computed(() => {
  const stats = new Map<string, { scores: number[]; avg: number; max: number; min: number }>()
  
  activeData.value.forEach(conductor => {
    const dept = conductor.department
    if (!stats.has(dept)) {
      stats.set(dept, { scores: [], avg: 0, max: 0, min: 100 })
    }
    
    const deptStat = stats.get(dept)!
    deptStat.scores.push(conductor.monthlyScore)
  })
  
  // 计算统计值
  stats.forEach((stat, dept) => {
    if (stat.scores.length > 0) {
      stat.avg = stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length
      stat.max = Math.max(...stat.scores)
      stat.min = Math.min(...stat.scores)
    }
  })
  
  return Array.from(stats.entries()).map(([dept, stat]) => ({
    department: dept,
    average: stat.avg,
    max: stat.max,
    min: stat.min,
    count: stat.scores.length
  }))
})

// 图表实例
let departmentCompareChart: echarts.ECharts | null = null

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    const chartEl = document.getElementById('departmentCompareChart')
    if (chartEl) {
      departmentCompareChart = echarts.init(chartEl)
      updateCharts()
      
      window.addEventListener('resize', () => {
        departmentCompareChart?.resize()
      })
    }
  })
}

// 更新图表
const updateCharts = () => {
  if (!departmentCompareChart || departmentStats.value.length === 0) return
  
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['平均分', '最高分', '最低分'],
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
      data: departmentStats.value.map(d => d.department),
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: {
      type: 'value',
      name: '得分',
      min: 0,
      max: 100
    },
    series: [
      {
        name: '平均分',
        type: 'bar',
        data: departmentStats.value.map(d => d.average.toFixed(1)),
        itemStyle: { color: '#2196F3' }
      },
      {
        name: '最高分',
        type: 'bar',
        data: departmentStats.value.map(d => d.max),
        itemStyle: { color: '#4CAF50' }
      },
      {
        name: '最低分',
        type: 'bar',
        data: departmentStats.value.map(d => d.min),
        itemStyle: { color: '#FF9800' }
      }
    ]
  }
  
  departmentCompareChart.setOption(option)
}

// 获取得分等级
const getScoreLevel = (score: number) => {
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 70) return '中等'
  if (score >= 60) return '及格'
  return '不及格'
}

const getScoreLevelType = (score: number) => {
  if (score >= 90) return 'success'
  if (score >= 80) return 'primary'
  if (score >= 70) return 'warning'
  if (score >= 60) return 'info'
  return 'danger'
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 80) return 'score-good'
  if (score >= 60) return 'score-normal'
  return 'score-poor'
}

// 月份改变
const handleMonthChange = () => {
  selectedDept.value = '全部'
  updateCharts()
}

onMounted(() => {
  mainStore.loadDatabase().then(() => {
    const latestMonth = mainStore.latestMonthData
    if (latestMonth) {
      selectedMonth.value = `${latestMonth.year}-${String(latestMonth.month).padStart(2, '0')}`
    }
    initCharts()
  })
})

// 监听数据变化
watch(() => mainStore.monthlyData, () => {
  updateCharts()
})
</script>

<style lang="scss" scoped>
.score-analysis-container {
  .month-selector {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    margin-bottom: 20px;
    
    .month-tips {
      color: var(--text-secondary);
      font-size: 14px;
    }
  }
  
  .ranking-card {
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
    }
    
    .card-body {
      padding: 0;
    }
    
    .ranking-list {
      .ranking-item {
        display: flex;
        align-items: center;
        padding: 12px 20px;
        border-bottom: 1px solid var(--border-lighter);
        transition: background-color 0.3s;
        
        &:hover {
          background-color: var(--bg-hover);
        }
        
        &:last-child {
          border-bottom: none;
        }
        
        .rank-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 12px;
          
          &.rank-1 {
            background: #FFD700;
            color: #fff;
          }
          
          &.rank-2 {
            background: #C0C0C0;
            color: #fff;
          }
          
          &.rank-3 {
            background: #CD7F32;
            color: #fff;
          }
          
          &.rank-bottom {
            background: #f44336;
            color: #fff;
          }
          
          &:not(.rank-1):not(.rank-2):not(.rank-3):not(.rank-bottom) {
            background: var(--bg-page);
            color: var(--text-secondary);
          }
        }
        
        .rank-info {
          flex: 1;
          
          .rank-name {
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .rank-detail {
            font-size: 12px;
            color: var(--text-secondary);
          }
        }
        
        .rank-score {
          font-size: 18px;
          font-weight: bold;
          color: var(--color-primary);
        }
      }
    }
  }
  
  .department-analysis,
  .score-detail-analysis {
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
    }
    
    .card-body {
      padding: 20px;
    }
  }
  
  .chart-container {
    width: 100%;
    height: 400px;
  }
  
  // 得分样式
  .score-excellent { color: #4CAF50; font-weight: bold; }
  .score-good { color: #2196F3; font-weight: bold; }
  .score-normal { color: #FF9800; }
  .score-poor { color: #f44336; }
  
  .positive { color: #4CAF50; font-weight: bold; }
  .negative { color: #f44336; }
}
</style> 