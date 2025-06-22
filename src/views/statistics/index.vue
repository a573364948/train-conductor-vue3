<template>
  <div class="statistics-container">
    <!-- 报表类型选择 -->
    <div class="report-selector card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="月度报表" name="monthly">
          <div class="tab-content">
            <el-date-picker
              v-model="selectedMonth"
              type="month"
              placeholder="选择月份"
              format="YYYY年MM月"
              value-format="YYYY-MM"
            />
            <el-button type="primary" @click="generateMonthlyReport">
              生成报表
            </el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="季度报表" name="quarterly">
          <div class="tab-content">
            <el-select v-model="selectedYear" placeholder="选择年份">
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="`${year}年`"
                :value="year"
              />
            </el-select>
            <el-select v-model="selectedQuarter" placeholder="选择季度">
              <el-option label="第一季度" :value="1" />
              <el-option label="第二季度" :value="2" />
              <el-option label="第三季度" :value="3" />
              <el-option label="第四季度" :value="4" />
            </el-select>
            <el-button type="primary" @click="generateQuarterlyReport">
              生成报表
            </el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="年度报表" name="yearly">
          <div class="tab-content">
            <el-select v-model="selectedYear" placeholder="选择年份">
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="`${year}年`"
                :value="year"
              />
            </el-select>
            <el-button type="primary" @click="generateYearlyReport">
              生成报表
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <!-- 报表内容 -->
    <div v-if="reportData" class="report-content">
      <!-- 报表标题 -->
      <div class="report-header card">
        <h2>{{ reportTitle }}</h2>
        <div class="report-actions">
          <el-button type="primary" @click="exportReport">
            <el-icon><Download /></el-icon>
            导出Excel
          </el-button>
          <el-button @click="printReport">
            <el-icon><Printer /></el-icon>
            打印
          </el-button>
        </div>
      </div>
      
      <!-- 汇总统计 -->
      <div class="summary-stats card">
        <h3>汇总统计</h3>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-item">
              <div class="stat-value">{{ reportData.totalCount }}</div>
              <div class="stat-label">总人数</div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-item">
              <div class="stat-value">{{ reportData.activeCount }}</div>
              <div class="stat-label">在岗人数</div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-item">
              <div class="stat-value">{{ reportData.averageScore.toFixed(1) }}</div>
              <div class="stat-label">平均得分</div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="stat-item">
              <div class="stat-value">{{ reportData.attendanceRate }}%</div>
              <div class="stat-label">在岗率</div>
            </div>
          </el-col>
        </el-row>
      </div>
      
      <!-- 部门统计 -->
      <div class="department-stats card">
        <h3>部门统计</h3>
        <el-table :data="reportData.departmentStats" stripe>
          <el-table-column prop="department" label="部门" width="120" />
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
          <el-table-column prop="maxScore" label="最高分" width="100" />
          <el-table-column prop="minScore" label="最低分" width="100" />
        </el-table>
      </div>
      
      <!-- 得分分布 -->
      <div class="score-distribution card">
        <h3>得分分布</h3>
        <div id="scoreDistributionChart" class="chart-container"></div>
      </div>
      
      <!-- 详细名单 -->
      <div class="detail-list card">
        <h3>详细名单</h3>
        <el-table :data="reportData.detailList" stripe height="400">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="id" label="工号" width="100" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="department" label="部门" min-width="150" />
          <el-table-column prop="monthlyScore" label="得分" width="100" sortable>
            <template #default="{ row }">
              <span :class="getScoreClass(row.monthlyScore)">
                {{ row.monthlyScore }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="rewardAmount" label="奖励金额" width="120" sortable>
            <template #default="{ row }">
              ¥{{ row.rewardAmount }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ getStatusText(row) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-empty description="请选择报表类型并生成报表" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Printer } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import { ExcelProcessor } from '@/utils/excel'
import { usePrint } from '@/composables/usePrint'
import { DataMigrationUtils } from '@/utils/dataMigration'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const mainStore = useMainStore()
const { printElement } = usePrint()

// 报表类型
const activeTab = ref('monthly')
const selectedMonth = ref('')
const selectedYear = ref(new Date().getFullYear())
const selectedQuarter = ref(Math.ceil((new Date().getMonth() + 1) / 3))

// 报表数据
const reportData = ref<any>(null)
const reportTitle = ref('')

// 可用年份
const availableYears = computed(() => {
  const years = new Set<number>()
  mainStore.monthlyData.forEach(month => {
    years.add(month.year)
  })
  return Array.from(years).sort((a, b) => b - a)
})

// 图表实例
let scoreDistributionChart: echarts.ECharts | null = null

// 生成月度报表
const generateMonthlyReport = () => {
  if (!selectedMonth.value) {
    ElMessage.warning('请选择月份')
    return
  }
  
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const monthData = mainStore.monthlyData.find(m => m.year === year && m.month === month)
  
  if (!monthData) {
    ElMessage.error('所选月份没有数据')
    return
  }
  
  reportTitle.value = `${year}年${month}月列车长考核统计报表`
  reportData.value = processMonthlyData([monthData])
  
  nextTick(() => {
    initChart()
  })
}

// 生成季度报表
const generateQuarterlyReport = () => {
  const startMonth = (selectedQuarter.value - 1) * 3 + 1
  const endMonth = selectedQuarter.value * 3
  
  const quarterData = mainStore.monthlyData.filter(m => 
    m.year === selectedYear.value && 
    m.month >= startMonth && 
    m.month <= endMonth
  )
  
  if (quarterData.length === 0) {
    ElMessage.error('所选季度没有数据')
    return
  }
  
  reportTitle.value = `${selectedYear.value}年第${selectedQuarter.value}季度列车长考核统计报表`
  reportData.value = processMonthlyData(quarterData)
  
  nextTick(() => {
    initChart()
  })
}

// 生成年度报表
const generateYearlyReport = () => {
  const yearData = mainStore.monthlyData.filter(m => m.year === selectedYear.value)
  
  if (yearData.length === 0) {
    ElMessage.error('所选年度没有数据')
    return
  }
  
  reportTitle.value = `${selectedYear.value}年度列车长考核统计报表`
  reportData.value = processMonthlyData(yearData)
  
  nextTick(() => {
    initChart()
  })
}

// 处理月度数据
const processMonthlyData = (monthlyDataList: any[]) => {
  // 合并所有月份的数据
  const allConductors = new Map<string, any>()
  
  monthlyDataList.forEach(month => {
    month.data.forEach((conductor: any) => {
      const key = conductor.id
      if (!allConductors.has(key)) {
        allConductors.set(key, {
          ...conductor,
          scores: [],
          totalReward: 0,
          monthCount: 0
        })
      }
      
      const data = allConductors.get(key)
      if (conductor.isActive) {
        data.scores.push(conductor.monthlyScore)
        data.totalReward += conductor.rewardAmount
        data.monthCount++
      }
    })
  })
  
  // 计算统计数据
  const conductorList = Array.from(allConductors.values())
  const activeConductors = conductorList.filter(c => c.monthCount > 0)
  
  // 计算平均分
  activeConductors.forEach(c => {
    c.averageScore = c.scores.length > 0 
      ? c.scores.reduce((a: number, b: number) => a + b, 0) / c.scores.length 
      : 0
  })
  
  // 部门统计
  const deptStats = new Map<string, any>()
  conductorList.forEach(conductor => {
    const dept = conductor.department
    if (!deptStats.has(dept)) {
      deptStats.set(dept, {
        department: dept,
        totalCount: 0,
        activeCount: 0,
        scores: []
      })
    }
    
    const stat = deptStats.get(dept)
    stat.totalCount++
    if (conductor.monthCount > 0) {
      stat.activeCount++
      stat.scores.push(conductor.averageScore || conductor.monthlyScore)
    }
  })
  
  // 计算部门统计值
  const departmentStats = Array.from(deptStats.values()).map(stat => {
    const avgScore = stat.scores.length > 0 
      ? stat.scores.reduce((a: number, b: number) => a + b, 0) / stat.scores.length 
      : 0
    
    return {
      department: stat.department,
      totalCount: stat.totalCount,
      activeCount: stat.activeCount,
      attendanceRate: Math.round((stat.activeCount / stat.totalCount) * 100),
      averageScore: avgScore,
      maxScore: stat.scores.length > 0 ? Math.max(...stat.scores) : 0,
      minScore: stat.scores.length > 0 ? Math.min(...stat.scores) : 0
    }
  })
  
  // 得分分布
  const scoreDistribution = [
    { range: '90-100分', count: 0 },
    { range: '80-89分', count: 0 },
    { range: '70-79分', count: 0 },
    { range: '60-69分', count: 0 },
    { range: '60分以下', count: 0 }
  ]
  
  activeConductors.forEach(conductor => {
    const score = conductor.averageScore || conductor.monthlyScore
    if (score >= 90) scoreDistribution[0].count++
    else if (score >= 80) scoreDistribution[1].count++
    else if (score >= 70) scoreDistribution[2].count++
    else if (score >= 60) scoreDistribution[3].count++
    else scoreDistribution[4].count++
  })
  
  // 汇总数据
  const totalScore = activeConductors.reduce((sum, c) => 
    sum + (c.averageScore || c.monthlyScore), 0
  )
  
  return {
    totalCount: conductorList.length,
    activeCount: activeConductors.length,
    averageScore: activeConductors.length > 0 ? totalScore / activeConductors.length : 0,
    attendanceRate: Math.round((activeConductors.length / conductorList.length) * 100),
    departmentStats,
    scoreDistribution,
    detailList: conductorList.sort((a, b) => 
      (b.averageScore || b.monthlyScore || 0) - (a.averageScore || a.monthlyScore || 0)
    )
  }
}

// 初始化图表
const initChart = () => {
  const chartEl = document.getElementById('scoreDistributionChart')
  if (chartEl) {
    scoreDistributionChart = echarts.init(chartEl)
    updateChart()
  }
}

// 更新图表
const updateChart = () => {
  if (!scoreDistributionChart || !reportData.value) return
  
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: '60%',
      data: reportData.value.scoreDistribution.map((item: any, index: number) => ({
        value: item.count,
        name: item.range,
        itemStyle: {
          color: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9E9E9E'][index]
        }
      }))
    }]
  }
  
  scoreDistributionChart.setOption(option)
}

// 导出报表
const exportReport = () => {
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }
  
  const exportData = reportData.value.detailList.map((item: any) => ({
    工号: item.id,
    姓名: item.name,
    部门: item.department,
    平均得分: item.averageScore?.toFixed(1) || item.monthlyScore,
    总奖励金额: item.totalReward || item.rewardAmount,
    在岗月数: item.monthCount || (item.status === '在岗' || item.status === '助勤' ? 1 : 0),
    状态: DataMigrationUtils.getUnifiedStatus(item)
  }))
  
  ExcelProcessor.exportToExcel(exportData, `${reportTitle.value}.xlsx`)
  ElMessage.success('导出成功')
}

// 打印报表
const printReport = () => {
  if (!reportData.value) {
    ElMessage.warning('请先生成报表')
    return
  }
  
  // 给报表内容添加 ID
  const reportContent = document.querySelector('.report-content')
  if (reportContent) {
    reportContent.id = 'statistics-report'
    printElement('statistics-report', reportTitle.value)
  }
}

// 获取得分样式
const getScoreClass = (score: number) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 80) return 'score-good'
  if (score >= 60) return 'score-normal'
  return 'score-poor'
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  return DataMigrationUtils.getStatusTagType(status as any)
}

// 获取状态文本
const getStatusText = (row: any) => {
  return DataMigrationUtils.getUnifiedStatus(row)
}

// 初始化
const init = () => {
  mainStore.loadDatabase().then(() => {
    // 设置默认月份
    const latestMonth = mainStore.latestMonthData
    if (latestMonth) {
      selectedMonth.value = `${latestMonth.year}-${String(latestMonth.month).padStart(2, '0')}`
    }
  })
}

init()
</script>

<style lang="scss" scoped>
.statistics-container {
  .report-selector {
    margin-bottom: 20px;
    padding: 20px;
    
    .tab-content {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 16px;
    }
  }
  
  .report-content {
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      margin-bottom: 20px;
      
      h2 {
        margin: 0;
        font-size: 20px;
      }
    }
    
    .summary-stats {
      margin-bottom: 20px;
      padding: 20px;
      
      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
      }
      
      .stat-item {
        text-align: center;
        padding: 16px;
        
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: var(--color-primary);
          margin-bottom: 8px;
        }
        
        .stat-label {
          font-size: 14px;
          color: var(--text-secondary);
        }
      }
    }
    
    .department-stats,
    .score-distribution,
    .detail-list {
      margin-bottom: 20px;
      padding: 20px;
      
      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
      }
    }
    
    .chart-container {
      height: 300px;
    }
  }
  
  .empty-state {
    padding: 100px 0;
  }
  
  // 得分样式
  .score-excellent { color: #4CAF50; font-weight: bold; }
  .score-good { color: #2196F3; font-weight: bold; }
  .score-normal { color: #FF9800; }
  .score-poor { color: #f44336; }
}

// 打印样式
@media print {
  .report-actions,
  .report-selector {
    display: none !important;
  }
  
  .card {
    break-inside: avoid;
    box-shadow: none !important;
    border: 1px solid #ddd;
  }
}
</style> 