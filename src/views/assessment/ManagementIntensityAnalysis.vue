<template>
  <div class="management-intensity-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>管理力度分析</h1>
      <p class="description">基于人均扣分的车队管理力度深度分析</p>
    </div>

    <!-- 控制面板 -->
    <el-card class="control-panel">
      <div class="control-row">
        <div class="control-item">
          <label>选择月份：</label>
          <el-select 
            v-model="selectedMonth" 
            placeholder="请选择月份"
            @change="loadData"
            style="width: 200px"
          >
            <el-option
              v-for="month in availableMonths"
              :key="month"
              :label="month"
              :value="month"
            />
          </el-select>
        </div>
        
        <div class="control-actions">
          <el-button 
            type="primary" 
            @click="analyzeIntensity"
            :loading="loading"
            :disabled="!selectedMonth"
          >
            <el-icon><TrendCharts /></el-icon>
            分析管理力度
          </el-button>
          
          <el-button 
            @click="exportReport"
            :disabled="!hasData"
          >
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 数据概览 -->
    <div v-if="hasData" class="overview-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="metric-card intensity-card">
            <div class="metric-content">
              <div class="metric-value">{{ overviewData.totalOnDuty }}</div>
              <div class="metric-label">在岗人数</div>
            </div>
            <el-icon class="metric-icon"><User /></el-icon>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="metric-card score-card">
            <div class="metric-content">
              <div class="metric-value">{{ overviewData.totalDeductions }}</div>
              <div class="metric-label">总扣分</div>
            </div>
            <el-icon class="metric-icon"><TrendCharts /></el-icon>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="metric-card average-card">
            <div class="metric-content">
              <div class="metric-value">{{ overviewData.avgPerPerson }}</div>
              <div class="metric-label">人均扣分</div>
            </div>
            <el-icon class="metric-icon"><DataAnalysis /></el-icon>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="metric-card level-card" :class="overviewData.levelClass">
            <div class="metric-content">
              <div class="metric-value">{{ overviewData.intensityLevel }}</div>
              <div class="metric-label">管理等级</div>
            </div>
            <el-icon class="metric-icon"><Medal /></el-icon>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 分析结果 -->
    <div v-if="hasData" class="analysis-section">
      <el-row :gutter="20">
        <!-- 管理力度对比图 -->
        <el-col :span="24">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <h3>科室vs车队管理力度对比</h3>
                <div class="chart-controls">
                  <el-radio-group v-model="comparisonMode" @change="updateComparisonChart">
                    <el-radio-button value="overall">整体对比</el-radio-button>
                    <el-radio-button value="department">分部门对比</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </template>
            <div class="chart-container">
              <div ref="comparisonChart" style="width: 100%; height: 400px;"></div>
            </div>
            <div class="chart-description">
              <p v-if="comparisonMode === 'overall'">
                <strong>整体对比说明：</strong>按车型分类统计，蓝色表示该车型相关部门被车队考核的扣分，绿色表示被科室考核的扣分。对比可看出不同考核部门的标准差异。
              </p>
              <p v-else>
                <strong>分部门对比说明：</strong>蓝色柱子表示该部门被车队考核的扣分，绿色柱子表示被科室考核的扣分。每个部门都可能同时有两种考核，对比可看出考核标准的一致性。
              </p>
            </div>
          </el-card>
        </el-col>

      </el-row>
      
      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 管理力度趋势 -->
        <el-col :span="24">
          <el-card class="chart-card">
            <template #header>
              <h3>管理力度趋势变化</h3>
            </template>
            <div class="chart-container">
              <div ref="trendChart" style="width: 100%; height: 300px;"></div>
            </div>
            <div class="chart-description">
              <p><strong>趋势说明：</strong>显示最近6个月的人均扣分变化趋势，帮助识别管理力度的时间变化规律。</p>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 详细分析 -->
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="14">
          <el-card class="analysis-card">
            <template #header>
              <h3>各部门管理力度详细分析</h3>
            </template>
            <el-table 
              :data="analysisData.departments" 
              stripe
              style="width: 100%"
            >
              <el-table-column prop="department" label="部门" width="150" />
              <el-table-column prop="onDutyCount" label="在岗人数" width="100" align="center" />
              <el-table-column prop="totalDeductions" label="总扣分" width="100" align="center" />
              <el-table-column prop="avgPerPerson" label="人均扣分" width="120" align="center">
                <template #default="scope">
                  <span :class="getScoreClass(scope.row.avgPerPerson)">
                    {{ scope.row.avgPerPerson }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="intensityIndex" label="管理力度指数" width="140" align="center">
                <template #default="scope">
                  <el-progress 
                    :percentage="scope.row.intensityIndex" 
                    :color="getProgressColor(scope.row.intensityIndex)"
                    :stroke-width="6"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="level" label="管理等级" width="120" align="center">
                <template #default="scope">
                  <el-tag :type="getLevelType(scope.row.level)">
                    {{ scope.row.level }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- AI智能建议 -->
        <el-col :span="10">
          <el-card class="suggestions-card">
            <template #header>
              <h3>
                <el-icon><ChatDotRound /></el-icon>
                AI智能建议
              </h3>
            </template>
            <div class="suggestions-content">
              <div v-for="(suggestion, index) in analysisData.suggestions" :key="index" class="suggestion-item">
                <div class="suggestion-type">{{ suggestion.type }}</div>
                <div class="suggestion-content">{{ suggestion.content }}</div>
                <div class="suggestion-action">
                  <strong>建议措施：</strong>{{ suggestion.action }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasData && !loading" class="empty-state">
      <el-empty description="请选择月份并开始分析" />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-loading text="正在分析管理力度..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  TrendCharts, 
  Download, 
  User, 
  DataAnalysis, 
  Medal, 
  ChatDotRound 
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { useMainStore } from '@/stores'
import { useManagementIntensity } from '@/composables/useManagementIntensity'
import { determineCategory, getDepartmentsByCategory } from '@/utils/department'
import { useDateSelection } from '@/composables/useDate'

// Store
const mainStore = useMainStore()

// Composables
const {
  getOnDutyConductorCount,
  calculateTotalDeductions,
  getAssessmentData,
  calculateManagementIntensityIndex,
  getManagementLevel
} = useManagementIntensity()

const {
  selectedMonth,
  availableMonths,
  initializeMonthSelection
} = useDateSelection()

// 响应式数据
const loading = ref(false)
const hasData = ref(false)
const comparisonMode = ref('overall') // 对比模式：overall 整体对比, department 分部门对比

// DOM引用
const comparisonChart = ref<HTMLElement>()
const trendChart = ref<HTMLElement>()

// 图表实例
let comparisonChartInstance: echarts.ECharts | null = null
let trendChartInstance: echarts.ECharts | null = null

// 数据
const overviewData = ref({
  totalOnDuty: 0,
  totalDeductions: 0,
  avgPerPerson: '0.0',
  intensityLevel: '未评估',
  levelClass: ''
})

const analysisData = ref({
  departments: [] as any[],
  suggestions: [] as any[]
})

// 数据加载
const loadData = async () => {
  if (!selectedMonth.value) return
  
  loading.value = true
  hasData.value = false
  
  try {
    // 确保数据库已加载
    await mainStore.loadDatabase()
    
    // 立即进行分析
    setTimeout(() => {
      analyzeIntensity()
    }, 100)
    
  } catch (error) {
    console.error('数据加载失败:', error)
    ElMessage.error('数据加载失败')
  }
}

// 分析管理力度
const analyzeIntensity = async () => {
  if (!selectedMonth.value) {
    ElMessage.warning('请先选择月份')
    return
  }

  loading.value = true
  
  try {
    ElMessage.info(`正在分析${selectedMonth.value}的管理力度...`)

    // 获取基础数据
    const onDutyCount = getOnDutyConductorCount(selectedMonth.value)
    const assessmentData = getAssessmentData(selectedMonth.value)
    const intensityResult = calculateManagementIntensityIndex(selectedMonth.value)

    // 计算总扣分
    const officeDeductions = calculateTotalDeductions(assessmentData, '科室')
    const teamDeductions = calculateTotalDeductions(assessmentData, '车队')
    const totalDeductions = officeDeductions + teamDeductions

    // 更新概览数据
    overviewData.value = {
      totalOnDuty: onDutyCount,
      totalDeductions: Math.abs(totalDeductions),
      avgPerPerson: Math.abs(totalDeductions / onDutyCount).toFixed(1),
      intensityLevel: intensityResult.managementLevel?.level || '未评估',
      levelClass: getLevelClass(intensityResult.managementLevel?.level || '未评估')
    }

    // 分析各部门数据
    const departmentAnalysis = analyzeDepartments()
    analysisData.value = {
      departments: departmentAnalysis,
      suggestions: generateManagementSuggestions(intensityResult, departmentAnalysis)
    }

    hasData.value = true

    // 等待DOM更新后渲染图表
    await nextTick()
    renderCharts()

    ElMessage.success(`${selectedMonth.value}管理力度分析完成`)

  } catch (error) {
    console.error('分析失败:', error)
    ElMessage.error('分析失败，请重试')
  } finally {
    loading.value = false
  }
}

// 分析各部门
const analyzeDepartments = () => {
  const departments: any[] = []
  
  // 获取月度数据和考核数据
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const monthlyData = mainStore.monthlyData.find(m => m.year === year && m.month === month)
  const assessmentData = getAssessmentData(selectedMonth.value)
  
  if (!monthlyData) {
    console.warn(`未找到${selectedMonth.value}的月度数据`)
    return []
  }
  
  // 获取所有实际存在的部门
  const departmentCounts = new Map<string, number>()
  
  // 统计各部门在岗人数
  monthlyData.data.forEach(staff => {
    if (staff.isActive && staff.status === '在岗') {
      departmentCounts.set(staff.department, (departmentCounts.get(staff.department) || 0) + 1)
    }
  })
  
  // 分析每个有数据的部门
  departmentCounts.forEach((onDutyCount, dept) => {
    // 获取该部门的考核记录
    const deptAssessments = assessmentData.filter(a => {
      // 匹配部门名称（考虑到可能的名称差异）
      return a.department === dept || 
             a.department?.includes(dept.replace('车队', '').replace('科', '')) ||
             dept.includes(a.department?.replace('车队', '').replace('科', '') || '')
    })
    
    const totalDeductions = deptAssessments.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
    const avgPerPerson = onDutyCount > 0 ? totalDeductions / onDutyCount : 0
    const intensityIndex = Math.min(100, (avgPerPerson / 5) * 100) // 调整计算公式，5分扣分对应100%强度
    const level = getManagementLevel(intensityIndex)

    departments.push({
      department: dept,
      onDutyCount,
      totalDeductions,
      avgPerPerson: avgPerPerson.toFixed(1),
      intensityIndex: Math.round(intensityIndex),
      level: level.level
    })
  })

  return departments.sort((a, b) => b.intensityIndex - a.intensityIndex)
}

// 生成管理建议
const generateManagementSuggestions = (intensityResult: any, departmentAnalysis: any[]) => {
  const suggestions: any[] = []
  
  // 基于整体管理力度的建议
  if (intensityResult.success && intensityResult.managementLevel) {
    const level = intensityResult.managementLevel.level
    
    if (level === '严重不足') {
      suggestions.push({
        type: '紧急措施',
        content: '管理力度严重不足，需要立即采取强化措施',
        action: '建立严格的考核制度，大幅提高考核频次和标准'
      })
    } else if (level === '不足') {
      suggestions.push({
        type: '改进建议',
        content: '管理力度不足，需要适度加强管理',
        action: '提高考核标准，增加日常检查频次'
      })
    } else if (level === '适中') {
      suggestions.push({
        type: '保持建议',
        content: '管理力度适中，需要持续关注',
        action: '维持当前标准，定期评估管理效果'
      })
    } else {
      suggestions.push({
        type: '优化建议',
        content: '管理力度充足，继续保持良好状态',
        action: '分享管理经验，推广到其他部门'
      })
    }
  }
  
  // 基于部门差异的建议
  if (departmentAnalysis.length > 0) {
    const highestDept = departmentAnalysis[0]
    const lowestDept = departmentAnalysis[departmentAnalysis.length - 1]
    
    if (highestDept.intensityIndex - lowestDept.intensityIndex > 30) {
      suggestions.push({
        type: '平衡建议',
        content: `${highestDept.department}与${lowestDept.department}管理力度差异较大`,
        action: '统一管理标准，加强部门间交流学习'
      })
    }
  }
  
  return suggestions
}

// 渲染图表
const renderCharts = () => {
  renderComparisonChart()
  renderTrendChart()
}

// 更新对比图表
const updateComparisonChart = () => {
  renderComparisonChart()
}

// 渲染对比图表
const renderComparisonChart = () => {
  if (!comparisonChart.value) return

  comparisonChartInstance = echarts.init(comparisonChart.value)
  
  if (comparisonMode.value === 'overall') {
    renderOverallComparisonChart()
  } else {
    renderDepartmentComparisonChart()
  }
}

// 渲染整体对比图表（按车型分类）
const renderOverallComparisonChart = () => {
  const trainTypes = ['高铁', '动车', '普速']
  const teamAssessDeductions: number[] = []  // 车队考核的扣分
  const officeAssessDeductions: number[] = [] // 科室考核的扣分
  
  const assessmentData = getAssessmentData(selectedMonth.value)
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const monthlyData = mainStore.monthlyData.find(m => m.year === year && m.month === month)
  
  if (!monthlyData) return
  
  trainTypes.forEach(trainType => {
    // 统计该车型的在岗人数（使用部门分类配置）
    let totalOnDutyCount = 0
    
    // 获取所有部门列表
    const allDepts = [...new Set(monthlyData.data.map(staff => staff.department))]
    
    // 使用部门分类工具函数获取该车型的部门
    const matchingDepts = getDepartmentsByCategory(
      trainType as '高铁' | '动车' | '普速',
      allDepts,
      mainStore.departmentCategories
    )
    
    // 统计该车型的在岗人数
    matchingDepts.forEach(dept => {
      const deptStaff = monthlyData.data.filter(staff => 
        staff.isActive && staff.status === '在岗' && staff.department === dept
      )
      totalOnDutyCount += deptStaff.length
    })
    
    console.log(`${trainType}车型匹配部门:`, matchingDepts, `总人数: ${totalOnDutyCount}`)
    
    // 判断考核部门类型的函数
    const getDeptType = (assessorDeptName: string): '车队' | '科室' => {
      if (!assessorDeptName) return '科室'
      
      // 包含车队关键词的为车队
      if (assessorDeptName.includes('车队')) return '车队'
      
      // 科室关键词
      const officeKeywords = ['科', '处', '室', '部', '中心']
      if (officeKeywords.some(keyword => assessorDeptName.includes(keyword))) return '科室'
      
      // 默认为科室
      return '科室'
    }
    
    // 计算该车型被车队考核的扣分
    const teamAssessments = assessmentData.filter(a => {
      const isRelatedDept = matchingDepts.some((dept: string) => 
        a.department === dept || 
        a.department?.includes(dept.replace('车队', '')) ||
        dept.includes(a.department?.replace('车队', '') || '')
      )
      const assessorType = getDeptType(a.assessorDepartmentName || a.assessorDepartment)
      return isRelatedDept && assessorType === '车队'
    })
    const teamTotalDeductions = teamAssessments.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
    const teamAvgDeduction = totalOnDutyCount > 0 ? teamTotalDeductions / totalOnDutyCount : 0
    
    // 计算该车型被科室考核的扣分
    const officeAssessments = assessmentData.filter(a => {
      const isRelatedDept = matchingDepts.some((dept: string) => 
        a.department === dept || 
        a.department?.includes(dept.replace('车队', '')) ||
        dept.includes(a.department?.replace('车队', '') || '')
      )
      const assessorType = getDeptType(a.assessorDepartmentName || a.assessorDepartment)
      return isRelatedDept && assessorType === '科室'
    })
    const officeTotalDeductions = officeAssessments.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
    const officeAvgDeduction = totalOnDutyCount > 0 ? officeTotalDeductions / totalOnDutyCount : 0
    
    teamAssessDeductions.push(Number(teamAvgDeduction.toFixed(2)))
    officeAssessDeductions.push(Number(officeAvgDeduction.toFixed(2)))
    
    console.log(`${trainType}车型: 车队考核${teamAssessments.length}条(${teamAvgDeduction.toFixed(2)}分), 科室考核${officeAssessments.length}条(${officeAvgDeduction.toFixed(2)}分), 总人数${totalOnDutyCount}`)
  })

  const option = {
    title: {
      text: '各车型管理力度对比',
      left: 'center',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.value}分<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['车队考核扣分', '科室考核扣分'],
      bottom: 10
    },
    xAxis: {
      type: 'category',
      data: trainTypes,
      axisLabel: { fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      name: '人均扣分',
      axisLabel: { formatter: '{value}分' }
    },
    series: [
      {
        name: '车队考核扣分',
        type: 'bar',
        data: teamAssessDeductions,
        itemStyle: { color: '#409eff' },
        barWidth: '30%'
      },
      {
        name: '科室考核扣分',
        type: 'bar',
        data: officeAssessDeductions,
        itemStyle: { color: '#67c23a' },
        barWidth: '30%'
      }
    ]
  }

  comparisonChartInstance?.setOption(option)
}

// 渲染分部门对比图表
const renderDepartmentComparisonChart = () => {
  const assessmentData = getAssessmentData(selectedMonth.value)
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const monthlyData = mainStore.monthlyData.find(m => m.year === year && m.month === month)
  
  if (!monthlyData || assessmentData.length === 0) return
  
  // 获取所有有数据的部门
  const departmentCounts = new Map<string, number>()
  monthlyData.data.forEach(staff => {
    if (staff.isActive && staff.status === '在岗') {
      departmentCounts.set(staff.department, (departmentCounts.get(staff.department) || 0) + 1)
    }
  })
  
  const allDepts = Array.from(departmentCounts.keys()).sort()
  
  // 准备数据：每个部门的车队考核扣分和科室考核扣分
  const teamAssessScores: number[] = [] // 被车队考核的扣分
  const officeAssessScores: number[] = [] // 被科室考核的扣分
  
  // 判断考核部门类型的函数
  const getDeptType = (assessorDeptName: string): '车队' | '科室' => {
    if (!assessorDeptName) return '科室'
    
    // 包含车队关键词的为车队
    if (assessorDeptName.includes('车队')) return '车队'
    
    // 科室关键词
    const officeKeywords = ['科', '处', '室', '部', '中心']
    if (officeKeywords.some(keyword => assessorDeptName.includes(keyword))) return '科室'
    
    // 默认为科室
    return '科室'
  }

  allDepts.forEach(dept => {
    const onDutyCount = departmentCounts.get(dept) || 0
    
    // 计算该部门被车队考核的扣分
    const teamAssessments = assessmentData.filter(a => {
      const isRelatedDept = a.department === dept || 
                           a.department?.includes(dept.replace('车队', '').replace('科', '')) ||
                           dept.includes(a.department?.replace('车队', '').replace('科', '') || '')
      const assessorType = getDeptType(a.assessorDepartmentName || a.assessorDepartment)
      return isRelatedDept && assessorType === '车队'
    })
    const teamTotalDeductions = teamAssessments.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
    const teamAvgDeduction = onDutyCount > 0 ? teamTotalDeductions / onDutyCount : 0
    
    // 计算该部门被科室考核的扣分
    const officeAssessments = assessmentData.filter(a => {
      const isRelatedDept = a.department === dept || 
                           a.department?.includes(dept.replace('车队', '').replace('科', '')) ||
                           dept.includes(a.department?.replace('车队', '').replace('科', '') || '')
      const assessorType = getDeptType(a.assessorDepartmentName || a.assessorDepartment)
      return isRelatedDept && assessorType === '科室'
    })
    const officeTotalDeductions = officeAssessments.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
    const officeAvgDeduction = onDutyCount > 0 ? officeTotalDeductions / onDutyCount : 0
    
    teamAssessScores.push(Number(teamAvgDeduction.toFixed(2)))
    officeAssessScores.push(Number(officeAvgDeduction.toFixed(2)))
    
    console.log(`部门${dept}: 车队考核${teamAssessments.length}条(${teamAvgDeduction.toFixed(2)}分), 科室考核${officeAssessments.length}条(${officeAvgDeduction.toFixed(2)}分)`)
  })

  const option = {
    title: {
      text: '各部门管理力度详细对比',
      left: 'center',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`
        params.forEach((param: any) => {
          if (param.value !== null) {
            result += `${param.seriesName}: ${param.value}分<br/>`
          }
        })
        return result
      }
    },
    legend: {
      data: ['车队考核扣分', '科室考核扣分'],
      bottom: 10
    },
    xAxis: {
      type: 'category',
      data: allDepts,
      axisLabel: { 
        rotate: 45,
        fontSize: 10,
        formatter: (value: string) => {
          return value.length > 6 ? value.substring(0, 6) + '...' : value
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '人均扣分',
      axisLabel: { formatter: '{value}分' }
    },
    grid: {
      bottom: 100,
      left: 60,
      right: 40
    },
    series: [
      {
        name: '车队考核扣分',
        type: 'bar',
        data: teamAssessScores,
        itemStyle: { color: '#409eff' },
        barWidth: '35%'
      },
      {
        name: '科室考核扣分',
        type: 'bar',
        data: officeAssessScores,
        itemStyle: { color: '#67c23a' },
        barWidth: '35%'
      }
    ]
  }

  comparisonChartInstance?.setOption(option)
}

// 渲染趋势图表
const renderTrendChart = () => {
  if (!trendChart.value) return

  trendChartInstance = echarts.init(trendChart.value)
  
  // 获取实际的历史趋势数据
  const months: string[] = []
  const values: number[] = []
  
  // 获取最近6个月的真实数据
  const currentDate = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate)
    date.setMonth(date.getMonth() - i)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    
    months.push(`${month}月`)
    
    // 获取该月的真实数据
    const monthlyData = mainStore.monthlyData.find(m => m.year === year && m.month === month)
    const assessmentData = mainStore.database?.assessmentDB?.[monthKey] || []
    
    if (monthlyData && assessmentData.length > 0) {
      // 计算该月的真实人均扣分
      const activeStaff = monthlyData.data.filter(s => s.isActive && s.status === '在岗')
      const totalDeductions = assessmentData.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
      const avgDeduction = activeStaff.length > 0 ? totalDeductions / activeStaff.length : 0
      values.push(Number(avgDeduction.toFixed(2)))
    } else {
      // 如果没有数据，显示0
      values.push(0)
    }
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}<br/>人均扣分: ${data.value}分`
      }
    },
    xAxis: {
      type: 'category',
      data: months
    },
    yAxis: {
      type: 'value',
      name: '人均扣分',
      axisLabel: {
        formatter: '{value}分'
      }
    },
    series: [{
      name: '人均扣分',
      type: 'line',
      data: values,
      smooth: true,
      itemStyle: { color: '#409eff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ]
        }
      }
    }]
  }

  trendChartInstance.setOption(option)
}

// 导出报告
const exportReport = async () => {
  if (!hasData.value) {
    ElMessage.warning('请先生成分析数据')
    return
  }

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])

    ElMessage.info('正在生成管理力度分析报告...')

    const reportElement = document.querySelector('.management-intensity-container')
    if (!reportElement) throw new Error('找不到报表内容')

    const canvas = await html2canvas(reportElement as HTMLElement, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgData = canvas.toDataURL('image/png')
    
    pdf.setFontSize(18)
    pdf.text('管理力度分析报告', 105, 20, { align: 'center' })
    
    const imgWidth = 190
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight)

    pdf.save(`${selectedMonth.value}_管理力度分析报告.pdf`)
    ElMessage.success('报告导出成功！')

  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 样式辅助函数
const getScoreClass = (score: string | number) => {
  const num = typeof score === 'string' ? parseFloat(score) : score
  if (num >= 5) return 'score-high'
  if (num >= 3) return 'score-medium'
  return 'score-low'
}

const getProgressColor = (value: number) => {
  if (value >= 70) return '#f56c6c'
  if (value >= 40) return '#e6a23c'
  return '#67c23a'
}

const getLevelType = (level: string) => {
  if (level === '充足') return 'danger'
  if (level === '适中') return 'warning'
  if (level === '不足') return 'info'
  return 'success'
}

const getLevelClass = (level: string) => {
  if (level === '充足') return 'level-high'
  if (level === '适中') return 'level-medium'
  if (level === '不足') return 'level-low'
  return 'level-none'
}

// 生命周期
onMounted(async () => {
  console.log('管理力度分析页面挂载')
  
  await mainStore.loadDatabase()
  
  // 重新实现月份收集逻辑
  const allMonths: string[] = [];
  if (mainStore.monthlyData) {
    mainStore.monthlyData.forEach(m => {
      const monthKey = `${m.year}-${String(m.month).padStart(2, '0')}`
      if (!allMonths.includes(monthKey)) {
        allMonths.push(monthKey)
      }
    })
  }
  if (mainStore.database?.assessmentDB) {
    Object.keys(mainStore.database.assessmentDB).forEach(month => {
      if (!allMonths.includes(month)) {
        allMonths.push(month)
      }
    })
  }
  
  initializeMonthSelection(allMonths.sort().reverse())
  
  if (selectedMonth.value) {
    // 立即分析
    setTimeout(() => {
      analyzeIntensity()
    }, 500)
  } else {
    console.warn('没有找到可用的月份数据')
  }
})

// 组件卸载时销毁图表
defineExpose({
  destroy: () => {
    comparisonChartInstance?.dispose()
    trendChartInstance?.dispose()
  }
})
</script>

<style lang="scss" scoped>
.management-intensity-container {
  padding: 20px;
  
  .page-header {
    margin-bottom: 20px;
    
    h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
    }
    
    .description {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .control-panel {
    margin-bottom: 20px;
    
    .control-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .control-item {
        display: flex;
        align-items: center;
        gap: 8px;
        
        label {
          font-weight: 500;
          color: #333;
        }
      }
      
      .control-actions {
        display: flex;
        gap: 12px;
      }
    }
  }

  .overview-section {
    margin-bottom: 20px;
    
    .metric-card {
      text-align: center;
      position: relative;
      
      .metric-content {
        .metric-value {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 4px;
          color: #2c3e50;
        }
        
        .metric-label {
          font-size: 14px;
          color: #666;
        }
      }
      
      .metric-icon {
        position: absolute;
        top: 15px;
        right: 15px;
        font-size: 24px;
        color: #409eff;
      }
      
      &.level-high {
        border-left: 4px solid #f56c6c;
        .metric-value { color: #f56c6c; }
        .metric-icon { color: #f56c6c; }
      }
      
      &.level-medium {
        border-left: 4px solid #e6a23c;
        .metric-value { color: #e6a23c; }
        .metric-icon { color: #e6a23c; }
      }
      
      &.level-low {
        border-left: 4px solid #67c23a;
        .metric-value { color: #67c23a; }
        .metric-icon { color: #67c23a; }
      }
    }
  }

  .analysis-section {
    .chart-card, .analysis-card, .suggestions-card {
      h3 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        color: #2c3e50;
      }
      
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        
        h3 {
          margin: 0;
          font-size: 16px;
          color: #2c3e50;
        }
        
        .chart-controls {
          .el-radio-group {
            .el-radio-button {
              --el-radio-button-checked-bg-color: #409eff;
              --el-radio-button-checked-text-color: #ffffff;
            }
          }
        }
      }
      
      .chart-container {
        padding: 10px 0;
      }
      
      .chart-description {
        margin-top: 15px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #409eff;
        
        p {
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }
      }
    }
    
    .suggestions-card {
      .suggestions-content {
        .suggestion-item {
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #409eff;
          
          .suggestion-type {
            font-weight: bold;
            color: #409eff;
            margin-bottom: 8px;
          }
          
          .suggestion-content {
            color: #666;
            margin-bottom: 8px;
            line-height: 1.5;
          }
          
          .suggestion-action {
            color: #333;
            font-size: 14px;
          }
        }
      }
    }
  }

  .score-high { color: #f56c6c; font-weight: bold; }
  .score-medium { color: #e6a23c; font-weight: bold; }
  .score-low { color: #67c23a; font-weight: bold; }

  .empty-state, .loading-state {
    text-align: center;
    padding: 60px 0;
  }
}
</style>
