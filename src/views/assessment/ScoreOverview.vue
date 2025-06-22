<template>
  <div class="score-overview-container">
    <!-- 月份选择器 -->
    <div class="month-selector card">
      <el-select 
        v-model="selectedMonth"
        placeholder="选择月份"
        @change="handleMonthChange"
        style="width: 200px; margin-right: 16px;"
      >
        <el-option
          v-for="month in availableMonths"
          :key="month.value"
          :label="month.label"
          :value="month.value"
      />
      </el-select>
      <span class="month-tips">当前查看：{{ currentMonthText }}</span>
      <el-button 
        type="text" 
        size="small" 
        @click="refreshData"
        style="margin-left: 10px;"
      >
        刷新数据
      </el-button>
    </div>
    
    <!-- 概览统计 -->
    <el-row :gutter="20" class="overview-stats">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-label">总人数</div>
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-value">{{ activeCount }}</div>
          <div class="stat-label">在岗人数</div>
          <div class="stat-icon active">
            <el-icon><Check /></el-icon>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-value">{{ averageScore.toFixed(1) }}</div>
          <div class="stat-label">平均得分</div>
          <div class="stat-icon score">
            <el-icon><TrendCharts /></el-icon>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-value">{{ attendanceRate }}%</div>
          <div class="stat-label">在岗率</div>
          <div class="stat-icon rate">
            <el-icon><DataAnalysis /></el-icon>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 部门统计图表 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <div class="chart-card card">
          <div class="card-header">
            <h3>部门在岗率</h3>
          </div>
          <div class="card-body">
            <div id="deptAttendanceChart" class="chart-container"></div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="chart-card card">
          <div class="card-header">
            <h3>部门平均得分</h3>
          </div>
          <div class="card-body">
            <div id="deptScoreChart" class="chart-container"></div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 新增：车队vs科室结构对比和考核频次统计 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <div class="chart-card card">
          <div class="card-header">
            <h3>考核发起部门对比</h3>
            <small style="color: #999;">管理科室 vs 车队考核活跃度</small>
          </div>
          <div class="card-body">
            <div id="structureCompareChart" class="chart-container"></div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="chart-card card">
          <div class="card-header">
            <h3>科室考核发起频次</h3>
            <small style="color: #999;">管理科室下发考核次数排行</small>
          </div>
          <div class="card-body">
            <div id="assessmentFrequencyChart" class="chart-container"></div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 排行榜和得分分布 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="8">
        <div class="ranking-card card">
          <div class="card-header">
            <h3>进步最大 TOP10</h3>
            <el-tag type="success" size="small">环比进步</el-tag>
          </div>
          <div class="card-body">
            <div class="ranking-list">
              <div
                v-for="(item, index) in mostImprovedList"
                :key="item.id"
                class="ranking-item"
              >
                <div class="rank-badge" :class="`rank-${index + 1 <= 3 ? index + 1 : 'other'}`">
                  {{ index + 1 }}
                </div>
                <div class="rank-info">
                  <div class="rank-name">{{ item.name }}</div>
                  <div class="rank-detail">{{ item.id }} - {{ item.department }}</div>
                </div>
                <div class="rank-score improvement">
                  +{{ item.improvement.toFixed(1) }}分
                </div>
              </div>
              <div v-if="mostImprovedList.length === 0" class="no-data">
                暂无环比数据
              </div>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :md="16">
        <div class="chart-card card">
          <div class="card-header">
            <h3>得分分布</h3>
          </div>
          <div class="card-body">
            <div id="scoreDistributionChart" class="chart-container"></div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { User, Check, TrendCharts, DataAnalysis } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useMainStore } from '@/stores'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const mainStore = useMainStore()

// 选中的月份
const selectedMonth = ref('')
const currentMonthText = computed(() => {
  if (!selectedMonth.value) return '暂无数据'
  const [year, month] = selectedMonth.value.split('-')
  return `${year}年${month}月`
})

// 可用月份列表
const availableMonths = computed(() => {
  const months: Array<{ value: string; label: string; hasMonthlyData: boolean; hasAssessmentData: boolean }> = []
  
  // 从月度数据收集月份
  if (mainStore.monthlyData) {
    mainStore.monthlyData.forEach(m => {
      const monthKey = `${m.year}-${String(m.month).padStart(2, '0')}`
      const label = `${m.year}年${String(m.month).padStart(2, '0')}月`
      
      if (!months.find(item => item.value === monthKey)) {
        months.push({
          value: monthKey,
          label: label + ' (月度)',
          hasMonthlyData: true,
          hasAssessmentData: false
        })
      }
    })
  }
  
  // 从考核数据收集月份
  if (mainStore.database?.assessmentDB) {
    Object.keys(mainStore.database.assessmentDB).forEach(key => {
      const records = mainStore.database!.assessmentDB[key]
      if (Array.isArray(records) && records.length > 0) {
        const existing = months.find(item => item.value === key)
        if (existing) {
          existing.hasAssessmentData = true
          existing.label = existing.label.replace(' (月度)', ' (月度+考核)')
        } else {
          // 尝试解析键格式
          let label = key
          if (key.match(/^\d{4}-\d{1,2}$/)) {
            const [year, month] = key.split('-')
            label = `${year}年${String(month).padStart(2, '0')}月 (考核)`
          }
          
          months.push({
            value: key,
            label,
            hasMonthlyData: false,
            hasAssessmentData: true
          })
        }
      }
    })
  }
  
  // 按时间排序（最新的在前）
  return months.sort((a, b) => {
    const aValue = a.value.replace(/[^0-9-]/g, '')
    const bValue = b.value.replace(/[^0-9-]/g, '')
    return bValue.localeCompare(aValue)
  })
})

// 当前月份数据
const currentData = computed(() => {
  console.log('=== currentData computed 调试 ===')
  if (!selectedMonth.value) {
    console.log('返回null: 未选择月份')
    return null
  }
  const [year, month] = selectedMonth.value.split('-').map(Number)
  console.log('查找月度数据:', year, '年', month, '月')
  console.log('可用月度数据:', mainStore.monthlyData?.map(m => `${m.year}-${m.month}`) || [])
  
  const result = mainStore.monthlyData.find(m => m.year === year && m.month === month)
  console.log('找到月度数据:', result ? `${result.data.length}人` : '无')
  return result
})

// 上个月份数据（用于计算进步）
const previousData = computed(() => {
  if (!selectedMonth.value) return null
  const [year, month] = selectedMonth.value.split('-').map(Number)
  
  // 计算上个月
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear = year - 1
  }
  
  return mainStore.monthlyData.find(m => m.year === prevYear && m.month === prevMonth)
})

// 统计数据
const totalCount = computed(() => currentData.value?.data.length || 0)
const activeCount = computed(() => 
  currentData.value?.data.filter(d => d.isActive).length || 0
)
const averageScore = computed(() => {
  if (!currentData.value || activeCount.value === 0) return 0
  const totalScore = currentData.value.data
    .filter(d => d.isActive)
    .reduce((sum, d) => sum + d.monthlyScore, 0)
  return totalScore / activeCount.value
})
const attendanceRate = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((activeCount.value / totalCount.value) * 100)
})

// 部门统计数据
const departmentStats = computed(() => {
  if (!currentData.value) return []
  
  const deptMap = new Map<string, { total: number; active: number; totalScore: number }>()
  
  currentData.value.data.forEach(conductor => {
    const dept = conductor.department
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { total: 0, active: 0, totalScore: 0 })
    }
    
    const stats = deptMap.get(dept)!
    stats.total++
    if (conductor.isActive) {
      stats.active++
      stats.totalScore += conductor.monthlyScore
    }
  })
  
  return Array.from(deptMap.entries()).map(([dept, stats]) => ({
    department: dept,
    total: stats.total,
    active: stats.active,
    attendanceRate: Math.round((stats.active / stats.total) * 100),
    averageScore: stats.active > 0 ? stats.totalScore / stats.active : 0
  }))
})

// 进步最大TOP10计算
const mostImprovedList = computed(() => {
  if (!currentData.value || !previousData.value) return []
  
  const improvements: Array<{
    id: string
    name: string
    department: string
    currentScore: number
    previousScore: number
    improvement: number
  }> = []
  
  // 创建上个月数据映射
  const prevDataMap = new Map()
  previousData.value.data.forEach(conductor => {
    if (conductor.isActive) {
      prevDataMap.set(conductor.id, conductor.monthlyScore)
    }
  })
  
  // 计算进步情况
  currentData.value.data.forEach(conductor => {
    if (conductor.isActive && prevDataMap.has(conductor.id)) {
      const currentScore = conductor.monthlyScore
      const previousScore = prevDataMap.get(conductor.id)
      const improvement = currentScore - previousScore
      
      if (improvement > 0) {
        improvements.push({
          id: conductor.id,
          name: conductor.name,
          department: conductor.department,
          currentScore,
          previousScore,
          improvement
        })
      }
    }
  })
  
  // 按进步幅度排序，取前10
  return improvements
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 10)
})

// 考核发起部门分类：管理科室vs车队（优化版）
const getStructureType = (department: string): string => {
  console.log('正在分类部门:', department)
  
  // 明确的车队关键词（通常不下发考核，主要被考核）
  // 优先匹配"车队"关键词，因为它是最明确的标识
  if (department.includes('车队')) {
    console.log(`${department} -> 车队 (包含"车队"关键词)`)
    return '车队'
  }
  
  // 其他车队相关关键词
  const otherTeamKeywords = ['客运段', '货运段', '机务段', '车辆段', '工务段', '电务段', '供电段']
  for (const keyword of otherTeamKeywords) {
    if (department.includes(keyword)) {
      console.log(`${department} -> 车队 (包含"${keyword}"关键词)`)
      return '车队'
    }
  }
  
  // 明确的管理科室关键词（通常下发考核）
  const managementKeywords = [
    '安全科', '安全监察科', '安全室',
    '指挥中心', '调度中心', '运输指挥中心',
    '客运科', '货运科', '运输科',
    '技术科', '信息科', '设备科',
    '人事科', '劳人科', '培训科',
    '质量科', '质检科', '监察科',
    '办公室', '综合科', '管理科'
  ]
  
  // 精确匹配管理科室
  for (const keyword of managementKeywords) {
    if (department.includes(keyword)) {
      console.log(`${department} -> 科室 (包含"${keyword}"关键词)`)
  return '科室'
}
  }
  
  // 通用科室关键词（最低优先级）
  const generalOfficeKeywords = ['科', '室', '处', '部', '中心', '站', '调度', '管理', '办公']
  for (const keyword of generalOfficeKeywords) {
    if (department.includes(keyword)) {
      console.log(`${department} -> 科室 (包含通用"${keyword}"关键词)`)
      return '科室'
    }
  }
  
  // 默认归类为科室（因为分析的是考核发起方，通常是管理部门）
  console.log(`${department} -> 科室 (默认分类)`)
  return '科室'
}

// 考核对比统计数据（基于考核记录）
const structureStats = computed(() => {
  console.log('=== structureStats computed 调试 ===')
  console.log('selectedMonth:', selectedMonth.value)
  console.log('assessmentDB存在:', !!mainStore.database?.assessmentDB)
  
  if (!selectedMonth.value || !mainStore.database?.assessmentDB) {
    console.log('返回空数据: 月份或数据库不存在')
    return { 车队: { count: 0, totalDeduction: 0 }, 科室: { count: 0, totalDeduction: 0 } }
  }
  
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const periodKey = `${year}-${month}`
  console.log('查找periodKey:', periodKey)
  console.log('可用的assessmentDB键:', Object.keys(mainStore.database.assessmentDB))
  
  // 安全地获取考核记录
  let assessmentRecords: any[] = []
  const monthData = mainStore.database.assessmentDB[periodKey]
  console.log('monthData类型:', typeof monthData, '是否为数组:', Array.isArray(monthData))
  
  if (Array.isArray(monthData)) {
    assessmentRecords = monthData
    console.log('直接使用数组数据:', assessmentRecords.length, '条')
  } else if (monthData && typeof monthData === 'object') {
    // 如果是对象，尝试提取数组数据
    assessmentRecords = Object.values(monthData).flat()
    console.log('从对象提取数据:', assessmentRecords.length, '条')
  } else {
    console.log('没有找到对应月份数据，尝试其他格式')
    // 尝试其他可能的键格式
    const alternativeKeys = [
      selectedMonth.value, // 2025-05
      `${year}_${month}`, // 2025_5
      `${year}_${String(month).padStart(2, '0')}`, // 2025_05
      `${year}-${month}`, // 2025-5
    ]
    
    for (const key of alternativeKeys) {
      const altData = mainStore.database.assessmentDB[key]
      if (altData && Array.isArray(altData)) {
        assessmentRecords = altData
        console.log('找到替代键值:', key, assessmentRecords.length, '条')
        break
      }
    }
    
    if (assessmentRecords.length === 0) {
      console.log('返回空数据: 未找到任何匹配的考核记录')
      return { 车队: { count: 0, totalDeduction: 0 }, 科室: { count: 0, totalDeduction: 0 } }
    }
  }
  
  const stats: Record<string, { count: number; totalDeduction: number }> = {
    车队: { count: 0, totalDeduction: 0 },
    科室: { count: 0, totalDeduction: 0 }
  }
  
  // 统计考核记录中的扣分（按考核发起部门统计）
  assessmentRecords.forEach((record: any) => {
    if (record) {
      // 获取考核发起部门（考核方）
      const assessorDept = record.assessorDepartmentName || record.assessorDepartment || record.fromDepartment || record.department
      if (assessorDept !== record.department) {
        console.log('考核记录:', record.conductorName, '被考核:', record.department, '考核发起:', assessorDept)
      }
      
      if (assessorDept) {
        const type = getStructureType(assessorDept)
      if (stats[type]) {
        stats[type].count++
          // 累计扣分总分
          const deduction = record.totalScore || record.finalScore || record.deduction || 0
          stats[type].totalDeduction += Math.abs(deduction) // 确保是正数表示扣分
        }
      }
    }
  })
  
  console.log('考核发起部门统计结果:')
  console.log('- 管理科室: 发起', stats.科室.count, '次考核, 下发', stats.科室.totalDeduction.toFixed(1), '分扣分')
  console.log('- 车队: 发起', stats.车队.count, '次考核, 下发', stats.车队.totalDeduction.toFixed(1), '分扣分')
  return stats
})

// 考核频次统计数据（修复版）
const assessmentFrequencyStats = computed(() => {
  console.log('=== assessmentFrequencyStats computed 调试 ===')
  if (!selectedMonth.value || !mainStore.database?.assessmentDB) {
    console.log('返回空数组: 月份或数据库不存在')
    return []
  }
  
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const periodKey = `${year}-${month}`
  console.log('查找频次数据的periodKey:', periodKey)
  
  // 安全地获取考核记录 (复用structureStats的逻辑)
  let assessmentRecords: any[] = []
  const monthData = mainStore.database.assessmentDB[periodKey]
  
  if (Array.isArray(monthData)) {
    assessmentRecords = monthData
  } else if (monthData && typeof monthData === 'object') {
    // 如果是对象，尝试提取数组数据
    assessmentRecords = Object.values(monthData).flat()
  } else {
    // 尝试其他可能的键格式
    const alternativeKeys = [
      selectedMonth.value, // 2025-05
      `${year}_${month}`, // 2025_5
      `${year}_${String(month).padStart(2, '0')}`, // 2025_05
      `${year}-${month}`, // 2025-5
    ]
    
    for (const key of alternativeKeys) {
      const altData = mainStore.database.assessmentDB[key]
      if (altData && Array.isArray(altData)) {
        assessmentRecords = altData
        console.log('频次统计找到替代键值:', key, assessmentRecords.length, '条')
        break
      }
    }
    
    if (assessmentRecords.length === 0) {
      console.log('频次统计返回空数组: 未找到任何匹配的考核记录')
      return []
    }
  }
  
  // 统计各科室的考核频次（只统计管理科室，过滤车队）
  const frequencyMap = new Map<string, number>()
  
  assessmentRecords.forEach((record: any) => {
    if (record) {
      // 获取考核发起部门（考核方）
      const assessorDept = record.assessorDepartmentName || record.assessorDepartment || record.fromDepartment || record.department
      if (assessorDept) {
        // 只统计科室，过滤掉车队
        const deptType = getStructureType(assessorDept)
        if (deptType === '科室') {
          const count = frequencyMap.get(assessorDept) || 0
          frequencyMap.set(assessorDept, count + 1)
          console.log('科室考核发起:', assessorDept, '次数:', count + 1)
        } else {
          console.log('过滤车队考核发起:', assessorDept, '(分类为:', deptType, ')')
        }
      }
    }
  })
  
  const result = Array.from(frequencyMap.entries())
    .map(([dept, count]) => ({ department: dept, frequency: count }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15) // 取前15个部门
  
  console.log('频次统计结果:', result.length, '个部门')
  return result
})

// 图表实例
let deptAttendanceChart: echarts.ECharts | null = null
let deptScoreChart: echarts.ECharts | null = null
let scoreDistributionChart: echarts.ECharts | null = null
let structureCompareChart: echarts.ECharts | null = null
let assessmentFrequencyChart: echarts.ECharts | null = null

// 窗口resize处理器（避免重复添加）
let chartResizeHandler: (() => void) | null = null

// 初始化图表（优化版）
const initCharts = () => {
  nextTick(() => {
    try {
    // 部门在岗率图表
    const deptAttendanceEl = document.getElementById('deptAttendanceChart')
      if (deptAttendanceEl && !deptAttendanceChart) {
      deptAttendanceChart = echarts.init(deptAttendanceEl)
    }
    
    // 部门平均得分图表
    const deptScoreEl = document.getElementById('deptScoreChart')
      if (deptScoreEl && !deptScoreChart) {
      deptScoreChart = echarts.init(deptScoreEl)
    }
    
    // 得分分布图表
    const scoreDistributionEl = document.getElementById('scoreDistributionChart')
      if (scoreDistributionEl && !scoreDistributionChart) {
      scoreDistributionChart = echarts.init(scoreDistributionEl)
    }

    // 车队vs科室对比图表
    const structureCompareEl = document.getElementById('structureCompareChart')
      if (structureCompareEl && !structureCompareChart) {
      structureCompareChart = echarts.init(structureCompareEl)
    }

    // 考核频次图表
    const assessmentFrequencyEl = document.getElementById('assessmentFrequencyChart')
      if (assessmentFrequencyEl && !assessmentFrequencyChart) {
      assessmentFrequencyChart = echarts.init(assessmentFrequencyEl)
    }
    
      // 窗口大小改变时重新调整图表（避免重复添加监听器）
      if (!chartResizeHandler) {
        chartResizeHandler = () => {
      deptAttendanceChart?.resize()
      deptScoreChart?.resize()
      scoreDistributionChart?.resize()
      structureCompareChart?.resize()
      assessmentFrequencyChart?.resize()
        }
        window.addEventListener('resize', chartResizeHandler)
      }
    
      // 延迟更新图表，确保DOM完全准备好
      setTimeout(() => {
    updateCharts()
      }, 100)
      
    } catch (error) {
      console.error('图表初始化失败:', error)
    }
  })
}

// 更新图表
const updateCharts = () => {
  if (!currentData.value) return
  
  // 部门在岗率
  if (deptAttendanceChart) {
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const data = params[0]
          return `${data.name}<br/>在岗率: ${data.value}%`
        }
      },
      xAxis: {
        type: 'category',
        data: departmentStats.value.map(d => d.department),
        axisLabel: { 
          interval: 0, 
          rotate: 30,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        name: '在岗率 (%)',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [{
        data: departmentStats.value.map(d => d.attendanceRate),
        type: 'bar',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4CAF50' },
            { offset: 1, color: '#45a049' }
          ])
        }
      }]
    }
    deptAttendanceChart.setOption(option)
  }
  
  // 部门平均得分（修复数据格式）
  if (deptScoreChart) {
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const data = params[0]
          return `${data.name}<br/>平均得分: ${data.value.toFixed(1)}分`
        }
      },
      xAxis: {
        type: 'category',
        data: departmentStats.value.map(d => d.department),
        axisLabel: { 
          interval: 0, 
          rotate: 30,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        name: '平均得分',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}分'
        }
      },
      series: [{
        data: departmentStats.value.map(d => Number(d.averageScore)), // 确保是数字类型
        type: 'bar',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#2196F3' },
            { offset: 1, color: '#1976D2' }
          ])
        }
      }]
    }
    deptScoreChart.setOption(option)
  }

  // 考核发起部门对比图表
  if (structureCompareChart) {
    const stats = structureStats.value
    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const name = params.name
          const statsData = stats[name]
          if (statsData) {
            return `${name}<br/>发起考核: ${statsData.count}次<br/>下发扣分: ${statsData.totalDeduction.toFixed(1)}分`
          }
          return `${name}: ${params.value}次`
        }
      },
      series: [{
        type: 'pie',
        radius: ['30%', '70%'],
        center: ['50%', '50%'],
        data: [
          {
            name: '管理科室',
            value: stats.科室.totalDeduction,
            itemStyle: { color: '#4ecdc4' }
          },
          {
            name: '车队',
            value: stats.车队.totalDeduction,
            itemStyle: { color: '#ff6b6b' }
          }
        ],
        label: {
          formatter: (params: any) => {
            const name = params.name
            const statsData = stats[name === '管理科室' ? '科室' : name]
            if (statsData && statsData.count > 0) {
              return `${name}\n${statsData.count}次\n${statsData.totalDeduction.toFixed(1)}分`
            }
            return `${name}\n${params.value.toFixed(1)}分`
          }
        }
      }]
    }
    structureCompareChart.setOption(option)
  }

  // 考核频次统计（修复版）
  if (assessmentFrequencyChart) {
    const freqStats = assessmentFrequencyStats.value
    
    if (freqStats.length === 0) {
      // 显示无数据提示
      const option: EChartsOption = {
        title: {
          text: '暂无考核数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      }
      assessmentFrequencyChart.setOption(option)
    } else {
    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
              const data = params[0]
              return `${data.name}<br/>发起考核: ${data.value}次`
            }
      },
      xAxis: {
        type: 'value',
            name: '发起考核次数',
            axisLabel: {
              formatter: '{value}次'
            }
      },
      yAxis: {
        type: 'category',
        data: freqStats.map(d => d.department),
        axisLabel: {
          interval: 0,
            fontSize: 12,
          formatter: (value: string) => {
            return value.length > 8 ? value.substring(0, 8) + '...' : value
          }
        }
      },
      series: [{
        data: freqStats.map(d => d.frequency),
        type: 'bar',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#e74c3c' },
            { offset: 1, color: '#c0392b' }
          ])
        }
      }]
    }
    assessmentFrequencyChart.setOption(option)
    }
  }
  
  // 得分分布（优化版）
  if (scoreDistributionChart) {
    // 统计得分分布
    const scoreRanges = [
      { label: '0-59分', min: 0, max: 59, count: 0, color: '#f44336' },
      { label: '60-69分', min: 60, max: 69, count: 0, color: '#ff9800' },
      { label: '70-79分', min: 70, max: 79, count: 0, color: '#ffeb3b' },
      { label: '80-89分', min: 80, max: 89, count: 0, color: '#4caf50' },
      { label: '90-100分', min: 90, max: 100, count: 0, color: '#2196f3' }
    ]
    
    const activeData = currentData.value.data.filter(d => d.isActive)
    
    // 如果没有在岗人员，显示无数据
    if (activeData.length === 0) {
      const option: EChartsOption = {
        title: {
          text: '暂无在岗人员数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      }
      scoreDistributionChart.setOption(option)
      return
    }
    
    // 统计各分数段人数
    activeData.forEach(conductor => {
        const score = conductor.monthlyScore
        const range = scoreRanges.find(r => score >= r.min && score <= r.max)
        if (range) range.count++
      })
    
    // 过滤掉人数为0的分数段
    const validRanges = scoreRanges.filter(r => r.count > 0)
    
    const option: EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const percent = ((params.value / activeData.length) * 100).toFixed(1)
          return `${params.name}<br/>人数: ${params.value}人<br/>占比: ${percent}%`
        }
      },
      legend: {
        bottom: 0,
        data: validRanges.map(r => r.label)
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: validRanges.map(r => ({
          value: r.count,
          name: r.label,
          itemStyle: {
            color: r.color
          }
        }))
      }]
    }
    scoreDistributionChart.setOption(option)
  }
}

// 月份改变
const handleMonthChange = () => {
  console.log('=== 月份变更调试 ===')
  console.log('选中月份:', selectedMonth.value)
  console.log('当前月度数据:', currentData.value ? `${currentData.value.data.length}人` : '无数据')
  console.log('考核记录数据:', structureStats.value)
  console.log('考核频次数据:', assessmentFrequencyStats.value.length, '个部门')
  updateCharts()
}

// 刷新数据
const refreshData = async () => {
  try {
    ElMessage.info('正在刷新数据...')
    console.log('刷新数据...')
    await mainStore.loadDatabase()
    
    // 重新设置默认月份
    if (availableMonths.value.length > 0 && !selectedMonth.value) {
      selectedMonth.value = availableMonths.value[0].value
    }
    
    // 重新初始化图表
    setTimeout(() => {
      initCharts()
      ElMessage.success('数据刷新完成')
    }, 500)
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('数据刷新失败')
  }
}

onMounted(() => {
  mainStore.loadDatabase().then(() => {
    // 调试信息
    console.log('=== 评分总览数据库检查 ===')
    console.log('monthlyData数量:', mainStore.monthlyData?.length || 0)
    console.log('monthlyData月份:', mainStore.monthlyData?.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`) || [])
    console.log('assessmentDB键值:', Object.keys(mainStore.database?.assessmentDB || {}))
    console.log('assessmentDB数据量:', Object.entries(mainStore.database?.assessmentDB || {}).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.length : 0}条`))
    console.log('可用月份列表:', availableMonths.value)
    
    // 智能设置默认月份
    if (availableMonths.value.length > 0) {
      // 优先选择有完整数据的月份（月度+考核）
      const completeDataMonth = availableMonths.value.find(m => m.hasMonthlyData && m.hasAssessmentData)
      if (completeDataMonth) {
        selectedMonth.value = completeDataMonth.value
        console.log('设置默认月份（完整数据）:', selectedMonth.value)
      } else {
        // 否则选择最新的月份
        selectedMonth.value = availableMonths.value[0].value
        console.log('设置默认月份（最新）:', selectedMonth.value)
      }
    } else {
      console.log('没有找到任何可用月份数据')
    }
    
    initCharts()
  })
})

// 监听数据变化
watch(() => mainStore.monthlyData, () => {
  updateCharts()
})

// 组件卸载时清理资源
onUnmounted(() => {
  try {
    // 销毁图表实例
    deptAttendanceChart?.dispose()
    deptScoreChart?.dispose()
    scoreDistributionChart?.dispose()
    structureCompareChart?.dispose()
    assessmentFrequencyChart?.dispose()
    
    // 清理变量
    deptAttendanceChart = null
    deptScoreChart = null
    scoreDistributionChart = null
    structureCompareChart = null
    assessmentFrequencyChart = null
    
    // 移除resize监听器
    if (chartResizeHandler) {
      window.removeEventListener('resize', chartResizeHandler)
      chartResizeHandler = null
    }
  } catch (error) {
    console.error('清理图表资源失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.score-overview-container {
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
  
  .overview-stats {
    margin-bottom: 20px;
    
    .stat-card {
      background: var(--bg-white);
      border-radius: 4px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02);
      margin-bottom: 20px;
      
      .stat-value {
        font-size: 32px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .stat-label {
        font-size: 14px;
        color: var(--text-secondary);
      }
      
      .stat-icon {
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 48px;
        opacity: 0.1;
        
        &.active { color: #4CAF50; }
        &.score { color: #2196F3; }
        &.rate { color: #FF9800; }
      }
    }
  }
  
  .chart-card {
    margin-bottom: 20px;
    
    .card-header {
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
    
    .chart-container {
      width: 100%;
      height: 300px;
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
          
          &.rank-other {
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
          font-size: 16px;
          font-weight: bold;
          
          &.improvement {
            color: #4CAF50;
          }
        }
      }

      .no-data {
        padding: 40px 20px;
        text-align: center;
        color: var(--text-secondary);
        font-size: 14px;
      }
    }
  }
}
</style> 