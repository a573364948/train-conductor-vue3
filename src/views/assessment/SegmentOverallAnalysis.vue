<template>
  <div class="segment-analysis-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">全段整体分析</h1>
      <p class="page-description">基于人均扣分的车队管理力度分析 + 评分离散度分析 + 全段整体分析报告</p>
    </div>

    <!-- 月份选择器和控制面板 -->
    <el-card class="control-panel" shadow="never">
      <div class="control-row">
        <el-select
          v-model="selectedMonth"
          placeholder="选择分析月份"
          @change="handleMonthChange"
          class="month-picker"
          filterable
        >
          <el-option
            v-for="month in availableMonths"
            :key="month"
            :label="`${month}（数据可用）`"
            :value="month"
          />
          <template #empty>
            <div style="padding: 10px; text-align: center; color: #999;">
              暂无可用数据
            </div>
          </template>
        </el-select>
        <el-button 
          type="primary" 
          @click="refreshAnalysis"
          :loading="loading"
          icon="Refresh"
        >
          刷新分析
        </el-button>
        <el-button 
          type="success" 
          @click="exportReport"
          :disabled="!hasData"
          icon="Download"
        >
          导出报告
        </el-button>
      </div>
      
      <!-- 数据概览 -->
      <div v-if="hasData" class="data-overview">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-statistic title="在岗人数" :value="managementResult?.onDutyCount || 0" suffix="人" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="考核记录" :value="managementResult?.assessmentCount || 0" suffix="条" />
          </el-col>
          <el-col :span="6">
            <el-statistic 
              title="管理力度指数" 
              :value="managementResult?.intensityIndex || 0" 
              suffix="分"
              :precision="1"
            />
          </el-col>
          <el-col :span="6">
            <div class="management-level">
              <div class="level-label">管理等级</div>
              <el-tag 
                :color="managementResult?.managementLevel?.bgColor"
                :style="{ color: managementResult?.managementLevel?.color }"
                size="large"
              >
                {{ managementResult?.managementLevel?.level || '未知' }}
              </el-tag>
            </div>
          </el-col>
        </el-row>
      </div>
      

    </el-card>

    <!-- 图表展示区域 -->
    <div v-if="selectedMonth" class="charts-container">
      <!-- 分析状态提示 -->
      <el-alert 
        v-if="managementResult && !managementResult.success" 
        :title="managementResult.message" 
        type="warning" 
        style="margin-bottom: 20px"
        :closable="false"
      />
      
      <!-- 第一行：扣分类别分布 + 时间趋势 -->
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="chart-header">
                <h3>扣分类别分布</h3>
                <el-tooltip content="显示各类别扣分占比情况">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div id="categoryChart" class="chart-container" ref="categoryChartRef"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="chart-header">
                <h3>扣分趋势分析</h3>
                <el-tooltip content="显示科室与车队扣分时间趋势">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div id="trendChart" class="chart-container" ref="trendChartRef"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 第二行：扣分次数对比 + Top10问题 -->
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="chart-header">
                <h3>各部门扣分次数对比</h3>
                <el-tooltip content="比较各部门科室与车队扣分次数">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div id="countChart" class="chart-container" ref="countChartRef"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="chart-header">
                <h3>Top10 扣分问题排行</h3>
                <el-tooltip content="显示扣分最多的前10个问题项目">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div id="top10Chart" class="chart-container" ref="top10ChartRef"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 第三行：管理力度雷达图 + 评分离散度分析 -->
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="chart-header">
                <h3>管理力度综合评估</h3>
                <div class="chart-controls">
                  <el-radio-group v-model="useOptimizedVersion" @change="renderAllCharts" size="small">
                    <el-radio-button :value="true">优化版</el-radio-button>
                    <el-radio-button :value="false">传统版</el-radio-button>
                  </el-radio-group>
                  <el-tooltip content="雷达图展示管理力度各项指标">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </div>
            </template>
            <div id="radarChart" class="chart-container" ref="radarChartRef"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="chart-header">
                <h3>评分离散度分析</h3>
                <el-tooltip content="识别吃大锅饭风险和评分区分度">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div id="dispersionChart" class="chart-container" ref="dispersionChartRef"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 无数据提示 -->
    <el-empty v-if="!selectedMonth">
      <template #description>
        <div v-if="availableMonths.length === 0">
          <p>暂无可用数据</p>
                      <p class="empty-tip">请先在"数据管理"中上传相关数据：考核扣分记录和月度奖励数据</p>
        </div>
        <div v-else-if="!selectedMonth">
          <p>请选择分析月份</p>
        </div>
        <div v-else-if="managementResult && !managementResult.success">
          <p>{{ managementResult.message }}</p>
        </div>
        <div v-else>
          <p>请选择月份并确保已上传相关数据</p>
        </div>
      </template>
    </el-empty>

    <!-- 分析结论面板 -->
    <el-card v-if="hasData && managementResult?.success" class="conclusion-panel" shadow="never">
      <template #header>
        <h3>分析结论与建议</h3>
      </template>
      <div class="conclusion-content">
        <el-alert
          :title="conclusion"
          type="info"
          :closable="false"
          show-icon
        />
        <div class="suggestions">
          <h4>改进建议：</h4>
          <ul>
            <li v-for="(suggestion, index) in suggestions" :key="index">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useMainStore } from '@/stores'
import { useManagementIntensity } from '@/composables/useManagementIntensity'
import { useScoreDispersion } from '@/composables/useScoreDispersion'
import { useSegmentCharts } from '@/composables/useSegmentCharts'
import { useDateSelection } from '@/composables/useDate'

const mainStore = useMainStore()
const { calculateManagementIntensityIndex, calculateOptimizedManagementIntensity } = useManagementIntensity()
const { analyzeDepartmentDispersion } = useScoreDispersion()
const {
  getDeductionCategoryPieChartOption,
  getTimeTrendLineChartOption,
  getDeductionCountBarChartOption,
  getTop10IssuesBarChartOption,
  getManagementIntensityRadarChartOption,
  getScoreDispersionChartOption
} = useSegmentCharts()

const {
  selectedMonth,
  availableMonths: dateAvailableMonths,
  initializeMonthSelection
} = useDateSelection()

// 响应式数据
const loading = ref(false)
const managementResult = ref<any>(null)
const optimizedResult = ref<any>(null) // 优化的评估结果
const dispersionResult = ref<any>(null)
const useOptimizedVersion = ref(true) // 控制使用哪个版本

// 图表实例引用
const categoryChartRef = ref<HTMLElement>()
const trendChartRef = ref<HTMLElement>()
const countChartRef = ref<HTMLElement>()
const top10ChartRef = ref<HTMLElement>()
const radarChartRef = ref<HTMLElement>()
const dispersionChartRef = ref<HTMLElement>()

// 图表实例
let categoryChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let countChart: echarts.ECharts | null = null
let top10Chart: echarts.ECharts | null = null
let radarChart: echarts.ECharts | null = null
let dispersionChart: echarts.ECharts | null = null

// 计算属性
const hasData = computed(() => {
  return selectedMonth.value && managementResult.value?.success
})

const availableMonths = computed(() => {
  return dateAvailableMonths.value
})

const conclusion = computed(() => {
  if (useOptimizedVersion.value && optimizedResult.value?.success) {
    // 优化版结论
    const assessment = optimizedResult.value.overallAssessment
    return `${selectedMonth.value}月管理力度综合评估：总分${assessment.overallScore}分，评级为"${assessment.level}"。${assessment.description}`
  } else if (managementResult.value?.success) {
    // 传统版结论
    const { intensityIndex, officeAvgDeduction, teamAvgDeduction, managementLevel } = managementResult.value
    
    let conclusion = `本月车队管理力度指数为${intensityIndex}分，评估为"${managementLevel?.level}"。`
    
    if (intensityIndex >= 80) {
      conclusion += '车队管理标准与科室基本一致，请继续保持。'
    } else {
      const gap = officeAvgDeduction - teamAvgDeduction
      const gapPercent = Math.round((gap / officeAvgDeduction) * 100)
      conclusion += `车队人均扣分(${teamAvgDeduction}分)比科室人均扣分(${officeAvgDeduction}分)低${gapPercent}%，存在管理力度不足问题。`
    }
    
    return conclusion
  }
  
  return ''
})

const suggestions = computed(() => {
  if (useOptimizedVersion.value && optimizedResult.value?.success) {
    // 优化版建议
    const baseSuggestions = optimizedResult.value.overallAssessment.suggestions || []
    
    // 根据各项指标添加具体建议
    const indicators = optimizedResult.value.indicators
    if (indicators.consistencyIndex < 60) {
      baseSuggestions.push('加强科室与车队考核标准的统一性，建立一致的考核体系')
    }
    if (indicators.coverageRate < 70) {
      baseSuggestions.push('提高考核覆盖率，确保对所有在岗人员进行全面考核')
    }
    if (indicators.balanceIndex < 60) {
      baseSuggestions.push('平衡各部门管理力度，避免部门间差异过大')
    }
    
    return baseSuggestions.slice(0, 5) // 最多显示5条建议
  } else if (managementResult.value?.managementLevel?.suggestion) {
    // 传统版建议
    const baseSuggestions = [managementResult.value.managementLevel.suggestion]
    
    // 根据离散度分析添加建议
    if (dispersionResult.value?.recommendations) {
      baseSuggestions.push(...dispersionResult.value.recommendations.slice(0, 3))
    }
    
    return baseSuggestions
  }
  
  return []
})

// 方法
const handleMonthChange = () => {
  if (selectedMonth.value) {
    performAnalysis()
  }
}

const refreshAnalysis = () => {
  if (!selectedMonth.value) {
    ElMessage.warning('请先选择分析月份')
    return
  }
  performAnalysis()
}

const performAnalysis = async () => {
  if (!selectedMonth.value) return
  
  loading.value = true
  try {
    // 计算传统管理力度指数
    managementResult.value = calculateManagementIntensityIndex(selectedMonth.value)
    
    // 计算优化的管理力度综合评估
    optimizedResult.value = calculateOptimizedManagementIntensity(selectedMonth.value)
    
    if (managementResult.value.success || optimizedResult.value.success) {
      // 获取考核数据并进行离散度分析
      const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
      if (assessmentData.length > 0) {
        // 按部门分组数据
        const departmentData: Record<string, any[]> = {}
        assessmentData.forEach((record: any) => {
          const dept = record.department || '未知部门'
          if (!departmentData[dept]) {
            departmentData[dept] = []
          }
          departmentData[dept].push(record)
        })
        
        dispersionResult.value = analyzeDepartmentDispersion(departmentData)
      }
      
      // 延迟渲染图表，确保图表实例已经初始化
      setTimeout(() => {
        renderAllCharts()
      }, 800)
    } else {
      ElMessage.error(managementResult.value?.message || optimizedResult.value?.message || '分析失败')
    }
  } catch (error) {
    console.error('分析过程中发生错误:', error)
    ElMessage.error('分析过程中发生错误')
  } finally {
    loading.value = false
  }
}

const initCharts = () => {
  nextTick(() => {
    setTimeout(() => {
      
      // 先销毁已存在的图表实例
      if (categoryChart) {
        categoryChart.dispose()
        categoryChart = null
      }
      if (trendChart) {
        trendChart.dispose()
        trendChart = null
      }
      if (countChart) {
        countChart.dispose()
        countChart = null
      }
      if (top10Chart) {
        top10Chart.dispose()
        top10Chart = null
      }
      if (radarChart) {
        radarChart.dispose()
        radarChart = null
      }
      if (dispersionChart) {
        dispersionChart.dispose()
        dispersionChart = null
      }
      
      // 重新初始化图表
      if (categoryChartRef.value) {
        categoryChart = echarts.init(categoryChartRef.value)
      }
      
      if (trendChartRef.value) {
        trendChart = echarts.init(trendChartRef.value)
      }
      
      if (countChartRef.value) {
        countChart = echarts.init(countChartRef.value)
      }
      
      if (top10ChartRef.value) {
        top10Chart = echarts.init(top10ChartRef.value)
      }
      
      if (radarChartRef.value) {
        radarChart = echarts.init(radarChartRef.value)
      }
      
      if (dispersionChartRef.value) {
        dispersionChart = echarts.init(dispersionChartRef.value)
      }
      
      // 监听窗口大小变化
      window.addEventListener('resize', handleResize)
    }, 800)
  })
}

const renderAllCharts = () => {
  const assessmentData = mainStore.database?.assessmentDB?.[selectedMonth.value] || []
  
  // 强制等待图表实例创建完成
  setTimeout(() => {
    
    // 图表1：扣分类别分布
    if (categoryChart) {
      try {
        const option = getDeductionCategoryPieChartOption(assessmentData)
        categoryChart.setOption(option, true) // 第二个参数强制刷新
        categoryChart.resize()
      } catch (error) {
        console.error('类别图表渲染失败:', error)
      }
    }
    
    // 图表2：时间趋势
    if (trendChart) {
      try {
        const monthlyData: Record<string, any[]> = {}
        if (mainStore.database?.assessmentDB) {
          Object.keys(mainStore.database.assessmentDB).forEach(month => {
            monthlyData[month] = mainStore.database!.assessmentDB[month]
          })
        }
        const option = getTimeTrendLineChartOption(monthlyData)
        trendChart.setOption(option, true)
        trendChart.resize()
      } catch (error) {
        console.error('趋势图表渲染失败:', error)
      }
    }
    
    // 图表3：扣分次数对比
    if (countChart) {
      try {
        const option = getDeductionCountBarChartOption(assessmentData)
        countChart.setOption(option, true)
        countChart.resize()
      } catch (error) {
        console.error('次数图表渲染失败:', error)
      }
    }
    
    // 图表4：Top10问题
    if (top10Chart) {
      try {
        const option = getTop10IssuesBarChartOption(assessmentData)
        top10Chart.setOption(option, true)
        top10Chart.resize()
      } catch (error) {
        console.error('Top10图表渲染失败:', error)
      }
    }
    
    // 图表5：管理力度雷达图
    if (radarChart) {
      try {
        // 优先使用优化版本的评估结果，如果没有则使用传统版本
        const radarData = useOptimizedVersion.value && optimizedResult.value?.success ? 
          optimizedResult.value : managementResult.value
        const option = getManagementIntensityRadarChartOption(radarData)
        radarChart.setOption(option, true)
        radarChart.resize()
      } catch (error) {
        console.error('雷达图表渲染失败:', error)
      }
    }
    
    // 图表6：评分离散度分析
    if (dispersionChart) {
      try {
        const option = getScoreDispersionChartOption(dispersionResult.value)
        dispersionChart.setOption(option, true)
        dispersionChart.resize()
      } catch (error) {
        console.error('离散度图表渲染失败:', error)
      }
    }
  }, 300)
}

const handleResize = () => {
  categoryChart?.resize()
  trendChart?.resize()
  countChart?.resize()
  top10Chart?.resize()
  radarChart?.resize()
  dispersionChart?.resize()
}

const exportReport = async () => {
  if (!hasData.value) {
    ElMessage.warning('请先生成分析数据')
    return
  }

  loading.value = true
  
  try {
    // 动态导入PDF导出相关库
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])

    ElMessage.info('正在生成PDF报表...')

    // 临时隐藏不需要导出的元素
    const elementsToHide = document.querySelectorAll('.el-button, .control-row')
    elementsToHide.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.display = 'none'
      }
    })

    // 获取报表内容
    const reportElement = document.querySelector('.charts-container')
    if (!reportElement) {
      throw new Error('找不到报表内容')
    }

    // 使用html2canvas截图
    const canvas = await html2canvas(reportElement as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: reportElement.scrollWidth,
      height: reportElement.scrollHeight
    })

    // 创建PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const imgWidth = 210 // A4宽度
    const pageHeight = 295 // A4高度
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    // 添加标题页
    pdf.setFontSize(20)
    pdf.text('全段整体分析报告', 105, 30, { align: 'center' })
    pdf.setFontSize(14)
    pdf.text(`分析月份：${selectedMonth.value}`, 105, 50, { align: 'center' })
    pdf.text(`生成时间：${new Date().toLocaleString('zh-CN')}`, 105, 65, { align: 'center' })
    
    // 添加分析摘要
    if (conclusion.value) {
      pdf.setFontSize(12)
      const lines = pdf.splitTextToSize(conclusion.value, 180)
      pdf.text(lines, 15, 90)
    }

    // 添加新页面放置图表
    pdf.addPage()
    let position = 0

    // 添加图表
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
    const fileName = `${selectedMonth.value}_全段整体分析报告.pdf`
    pdf.save(fileName)

    // 恢复隐藏的元素
    elementsToHide.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.display = ''
      }
    })

    ElMessage.success('PDF报告导出成功！')
  } catch (error) {
    console.error('PDF导出失败:', error)
    ElMessage.error('PDF导出失败，请重试')
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(() => {
  // 延迟执行，等待数据加载完成
  setTimeout(async () => {
    await mainStore.loadDatabase();

    const allMonths: string[] = []
    if (mainStore.database?.assessmentDB) {
      allMonths.push(...Object.keys(mainStore.database.assessmentDB))
    }
    if (mainStore.monthlyData?.length > 0) {
      mainStore.monthlyData.forEach(data => {
        const monthStr = `${data.year}-${String(data.month).padStart(2, '0')}`
        if (!allMonths.includes(monthStr)) {
          allMonths.push(monthStr)
        }
      })
    }
    initializeMonthSelection(allMonths.sort().reverse());
    
    // 先初始化图表
    initCharts()
    
    // 再延迟执行分析和渲染
    setTimeout(() => {
      performAnalysis()
    }, 1500)
  }, 500)
})

// 监听月份变化
watch(selectedMonth, (newMonth) => {
  if (newMonth) {
    performAnalysis()
  }
})
</script>

<style scoped>
.segment-analysis-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
  text-align: center;
}

.page-title {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 10px 0;
}

.page-description {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.control-panel {
  margin-bottom: 20px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.month-picker {
  width: 200px;
}

.data-overview {
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.management-level {
  text-align: center;
}

.level-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.charts-container {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 420px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.conclusion-panel {
  margin-bottom: 20px;
}

.conclusion-content {
  space-y: 16px;
}

.suggestions {
  margin-top: 16px;
}

.suggestions h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.suggestions li {
  margin-bottom: 4px;
  font-size: 14px;
  color: #606266;
}

.empty-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .segment-analysis-container {
    padding: 10px;
  }
  
  .control-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .month-picker {
    width: 100%;
  }
  
  .chart-card {
    height: 350px;
    margin-bottom: 16px;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style> 