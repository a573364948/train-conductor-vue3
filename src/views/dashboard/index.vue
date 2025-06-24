<template>
  <div class="dashboard-container" :class="{ 'mobile-layout': isMobile }">
    <!-- 统计卡片 -->
    <el-row :gutter="isMobile ? 12 : 20" class="stat-cards" :class="{ 'mobile-cards': isMobile }">
      <el-col :xs="12" :sm="12" :md="8" :lg="6">
        <div class="stat-card">
          <div class="stat-card-icon primary">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-card-title">当月在岗人数</div>
          <div class="stat-card-value">
            {{ statistics.totalActive }}
            <span class="unit">人</span>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6">
        <div class="stat-card">
          <div class="stat-card-icon success">
            <el-icon><OfficeBuilding /></el-icon>
          </div>
          <div class="stat-card-title">部门数量</div>
          <div class="stat-card-value">
            {{ statistics.departmentCount }}
            <span class="unit">个</span>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6">
        <div class="stat-card">
          <div class="stat-card-icon warning">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-card-title">平均得分</div>
          <div class="stat-card-value">
            {{ statistics.averageScore }}
            <span class="unit">分</span>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="8" :lg="6">
        <div class="stat-card">
          <div class="stat-card-icon error">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-card-title">异常人员</div>
          <div class="stat-card-value">
            {{ statistics.anomalyCount }}
            <span class="unit">人</span>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 图表区域 -->
    <el-row :gutter="isMobile ? 12 : 20" class="charts-section" :class="{ 'mobile-charts': isMobile }">
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-header">
            <h3 :class="{ 'mobile-title': isMobile }">各部门人员分布</h3>
          </div>
          <div class="card-body">
            <div class="chart-container" :class="{ 'mobile-chart': isMobile }" ref="departmentChartRef"></div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <div class="card">
          <div class="card-header">
            <h3 :class="{ 'mobile-title': isMobile }">月度得分趋势</h3>
          </div>
          <div class="card-body">
            <div class="chart-container" :class="{ 'mobile-chart': isMobile }" ref="trendChartRef"></div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 异常数据列表 -->
    <div class="card anomaly-section" :class="{ 'mobile-anomaly': isMobile }">
      <div class="card-header" :class="{ 'mobile-header': isMobile }">
        <h3 :class="{ 'mobile-title': isMobile }">异常数据统计</h3>
        <el-button 
          type="primary" 
          :size="isMobile ? 'small' : 'small'" 
          @click="exportAnomalyData"
          :class="{ 'mobile-btn': isMobile }"
        >
          <span v-if="!isMobile">导出异常名单</span>
          <span v-else>导出</span>
        </el-button>
      </div>
      <div class="card-body">
        <el-table
          :data="anomalyList"
          style="width: 100%"
          v-loading="loading"
          empty-text="暂无异常数据"
          :size="isMobile ? 'small' : 'default'"
        >
          <el-table-column prop="id" label="工号" :width="isMobile ? 80 : 100" />
          <el-table-column prop="name" label="姓名" :width="isMobile ? 80 : 120" />
          <el-table-column prop="department" label="部门" />
          <el-table-column prop="absentMonths" label="不在岗月数" :width="isMobile ? 100 : 120">
            <template #default="{ row }">
              <el-tag type="danger" :size="isMobile ? 'small' : 'default'">{{ row.absentMonths }} 个月</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useMainStore } from '@/stores'
import * as echarts from 'echarts'
import type { EChartsType } from 'echarts'

const mainStore = useMainStore()
const loading = computed(() => mainStore.loading)

// 移动端检测
const isMobile = ref(false)
const checkMobileDevice = () => {
  isMobile.value = window.innerWidth <= 768
}

// 图表引用
const departmentChartRef = ref<HTMLDivElement>()
const trendChartRef = ref<HTMLDivElement>()
let departmentChart: EChartsType | null = null
let trendChart: EChartsType | null = null

// 统计数据
const statistics = computed(() => {
  const latestMonth = mainStore.latestMonthData
  
  // 调试信息
  console.log('🔍 Dashboard数据状态检查:', {
    数据库状态: !!mainStore.database,
    conductorDB: mainStore.database?.conductorDB ? Object.keys(mainStore.database.conductorDB).length : 0,
    enhancedConductors: mainStore.database?.enhancedConductors ? Object.keys(mainStore.database.enhancedConductors).length : 0,
    departments: mainStore.departments,
    latestMonth: !!latestMonth,
    monthlyData: mainStore.monthlyData.length
  })
  
  if (!latestMonth) {
    return {
      totalActive: 0,
      departmentCount: 0,
      averageScore: 0,
      anomalyCount: 0
    }
  }
  
  // 在岗人数
  const totalActive = latestMonth.data.filter(d => d.isActive).length
  
  // 部门数量 - 优先从多个数据源获取
  let departmentCount = mainStore.departments.length
  
  // 如果主数据源为空，尝试从其他数据源获取部门信息
  if (departmentCount === 0) {
    const deptSet = new Set<string>()
    
    // 1. 从月度数据中提取部门
    mainStore.monthlyData.forEach(monthData => {
      monthData.data.forEach(conductor => {
        if (conductor.department) {
          deptSet.add(conductor.department)
        }
      })
    })
    
    // 2. 从增强人员数据中提取部门
    if (mainStore.database?.enhancedConductors) {
      Object.values(mainStore.database.enhancedConductors).forEach(conductor => {
        if (conductor.department) {
          deptSet.add(conductor.department)
        }
      })
    }
    
    departmentCount = deptSet.size
    console.log('📊 从备用数据源获取部门数量:', departmentCount, '个部门:', Array.from(deptSet))
  }
  
  // 平均得分
  const scores = latestMonth.data
    .filter(d => d.isActive && d.monthlyScore > 0)
    .map(d => d.monthlyScore)
  const averageScore = scores.length > 0
    ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
    : 0
  
  // 异常人员数量
  const anomalyCount = anomalyList.value.length
  
  return {
    totalActive,
    departmentCount,
    averageScore,
    anomalyCount
  }
})

// 异常数据列表
const anomalyList = computed(() => {
  // 查找连续3个月不在岗的人员
  const anomalies: any[] = []
  
  // TODO: 实现异常检测逻辑
  
  return anomalies
})

// 预定义的颜色数组
const departmentColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', 
  '#13c2c2', '#eb2f96', '#fa541c', '#a0d911', '#2f54eb',
  '#ff7a45', '#36cfc9', '#ffc53d', '#ff85c0', '#9254de',
  '#40a9ff', '#95de64', '#ffd666', '#ff9c6e', '#85a5ff',
  '#73d13d', '#ffec3d', '#ff4d4f', '#b37feb', '#5cdbd3'
]

// 初始化图表
const initCharts = () => {
  // 部门分布图
  if (departmentChartRef.value) {
    departmentChart = echarts.init(departmentChartRef.value)
    
    const latestMonth = mainStore.latestMonthData
    if (!latestMonth) return
    
    // 统计各部门人数
    const deptData = new Map<string, number>()
    latestMonth.data.forEach(conductor => {
      if (conductor.isActive) {
        const count = deptData.get(conductor.department) || 0
        deptData.set(conductor.department, count + 1)
      }
    })
    
    // 转换为数组并按人数从高到低排序
    const sortedDeptData = Array.from(deptData.entries())
      .sort((a, b) => b[1] - a[1]) // 按人数降序排列
    
    // 分离部门名称和人数
    const departments = sortedDeptData.map(item => item[0])
    const counts = sortedDeptData.map(item => item[1])
    
    // 为每个部门分配不同颜色
    const barColors = departments.map((_, index) => 
      departmentColors[index % departmentColors.length]
    )
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params: any) {
          const data = params[0]
          return `${data.name}<br/>人数: ${data.value}人`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: departments,
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: 11,
          color: '#666'
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        name: '人数',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
        },
        axisLabel: {
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            color: '#e8e8e8',
            type: 'dashed'
          }
        }
      },
      series: [{
        name: '人数',
        data: counts.map((value, index) => ({
          value,
          itemStyle: {
            color: barColors[index],
            borderRadius: [4, 4, 0, 0] // 圆角
          }
        })),
        type: 'bar',
        barWidth: '60%',
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          color: '#333',
          formatter: '{c}人'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }
    
    departmentChart.setOption(option)
  }
  
  // 月度趋势图
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    
    // 获取最近6个月的数据
    const months: string[] = []
    const scores: number[] = []
    
    mainStore.monthlyData
      .slice(-6)
      .forEach(monthData => {
        months.push(`${monthData.year}-${String(monthData.month).padStart(2, '0')}`)
        
        const activeScores = monthData.data
          .filter(d => d.isActive && d.monthlyScore > 0)
          .map(d => d.monthlyScore)
        
        const avgScore = activeScores.length > 0
          ? activeScores.reduce((sum, score) => sum + score, 0) / activeScores.length
          : 0
        
        scores.push(Number(avgScore.toFixed(1)))
      })
    
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: months
      },
      yAxis: {
        type: 'value',
        name: '平均分',
        min: 80,
        max: 100
      },
      series: [{
        data: scores,
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#52c41a'
        }
      }]
    }
    
    trendChart.setOption(option)
  }
}

// 导出异常数据
const exportAnomalyData = () => {
  // TODO: 实现导出功能
  console.log('导出异常数据')
}

// 监听窗口大小变化
const handleResize = () => {
  checkMobileDevice()
  departmentChart?.resize()
  trendChart?.resize()
}

onMounted(async () => {
  try {
    console.log('🚀 Dashboard 开始初始化...')
    
    // 初始化移动端检测
    checkMobileDevice()
    
    // 加载数据
    await mainStore.loadDatabase()
    
    console.log('📊 Dashboard 数据加载完成，统计信息:', {
      数据库: !!mainStore.database,
      conductorDB: mainStore.database?.conductorDB ? Object.keys(mainStore.database.conductorDB).length : 0,
      monthlyData: mainStore.monthlyData.length,
      departments: mainStore.departments.length
    })
    
    // 如果没有基础数据，尝试触发数据同步
    if (mainStore.departments.length === 0 && mainStore.database?.enhancedConductors) {
      console.log('🔄 检测到部门数据为空，但有增强人员数据，触发数据同步...')
      
      // 从增强人员数据中同步基础数据到conductorDB
      const enhancedConductors = mainStore.database.enhancedConductors
      const conductorDB: Record<string, any> = {}
      
      Object.entries(enhancedConductors).forEach(([id, conductor]) => {
        conductorDB[id] = {
          id: conductor.id,
          name: conductor.name,
          department: conductor.department
        }
      })
      
      // 更新数据库
      if (mainStore.database) {
        mainStore.database.conductorDB = conductorDB
        await mainStore.saveDatabase()
        console.log('✅ 数据同步完成，新增', Object.keys(conductorDB).length, '个基础人员记录')
      }
    }
    
    // 等待下一个tick确保响应式数据更新
    await nextTick()
    
    // 初始化图表
    initCharts()
    
    // 添加窗口大小监听
    window.addEventListener('resize', handleResize)
    
    console.log('✅ Dashboard 初始化完成')
    
  } catch (error) {
    console.error('❌ Dashboard 初始化失败:', error)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  departmentChart?.dispose()
  trendChart?.dispose()
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  .stat-cards {
    margin-bottom: 20px;
  }
  
  .charts-section {
    margin-bottom: 20px;
  }
  
  .chart-container {
    height: 300px;
  }
  
  .anomaly-section {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
  
  // 移动端布局优化
  &.mobile-layout {
    padding: 12px;
    
    .stat-cards.mobile-cards {
      margin-bottom: 16px;
      
      :deep(.el-col) {
        margin-bottom: 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      .stat-card {
        padding: 14px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        background: white;
        text-align: center;
        
        .stat-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px auto;
          
          &.primary {
            background: linear-gradient(135deg, #409eff, #67c23a);
            color: white;
          }
          
          &.success {
            background: linear-gradient(135deg, #67c23a, #85ce61);
            color: white;
          }
          
          &.warning {
            background: linear-gradient(135deg, #e6a23c, #f7ba2a);
            color: white;
          }
          
          &.error {
            background: linear-gradient(135deg, #f56c6c, #f78989);
            color: white;
          }
          
          .el-icon {
            font-size: 20px;
          }
        }
        
        .stat-card-title {
          font-size: 12px;
          color: #666;
          margin-bottom: 6px;
          font-weight: 500;
          line-height: 1.2;
        }
        
        .stat-card-value {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          line-height: 1;
          
          .unit {
            font-size: 14px;
            color: #999;
            margin-left: 2px;
            font-weight: 400;
          }
        }
      }
    }
    
    .charts-section.mobile-charts {
      margin-bottom: 16px;
      
      :deep(.el-col) {
        margin-bottom: 16px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      .card {
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        
        .card-header {
          padding: 16px 16px 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          
          .mobile-title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 0;
          }
        }
        
        .card-body {
          padding: 16px;
          
          .chart-container.mobile-chart {
            height: 220px;
          }
        }
      }
    }
    
    .anomaly-section.mobile-anomaly {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      
      .card-header.mobile-header {
        padding: 16px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .mobile-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        
        .mobile-btn {
          padding: 6px 12px;
          font-size: 12px;
          min-width: 60px;
        }
      }
      
      .card-body {
        padding: 16px;
        
        :deep(.el-table) {
          font-size: 12px;
          
          .el-table__header th {
            padding: 8px 0;
            font-size: 12px;
            background: #fafafa;
          }
          
          .el-table__body td {
            padding: 8px 0;
          }
          
          .cell {
            padding: 0 8px;
          }
        }
      }
    }
  }
}

// 全局移动端优化
@media (max-width: 768px) {
  .dashboard-container {
    .stat-cards {
      :deep(.el-row) {
        margin: 0 -6px;
      }
      
      :deep(.el-col) {
        padding: 0 6px;
      }
    }
    
    .charts-section {
      :deep(.el-row) {
        margin: 0 -6px;
      }
      
      :deep(.el-col) {
        padding: 0 6px;
      }
    }
  }
}

// iPhone SE 等小屏幕适配
@media (max-width: 375px) {
  .dashboard-container.mobile-layout {
    padding: 8px;
    
    .stat-cards.mobile-cards {
      .stat-card {
        padding: 10px;
        
        .stat-card-icon {
          width: 36px;
          height: 36px;
          
          .el-icon {
            font-size: 18px;
          }
        }
        
        .stat-card-title {
          font-size: 11px;
          margin-bottom: 4px;
        }
        
        .stat-card-value {
          font-size: 20px;
          
          .unit {
            font-size: 12px;
          }
        }
      }
    }
    
    .charts-section.mobile-charts {
      .card {
        .card-header {
          padding: 12px;
        }
        
        .card-body {
          padding: 12px;
          
          .chart-container.mobile-chart {
            height: 200px;
          }
        }
      }
    }
    
    .anomaly-section.mobile-anomaly {
      .card-header.mobile-header {
        padding: 12px;
      }
      
      .card-body {
        padding: 12px;
      }
    }
  }
}
</style> 