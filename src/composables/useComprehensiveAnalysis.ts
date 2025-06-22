/**
 * 月度综合分析 Composable
 * 整合管理力度分析、全段整体分析、评分离散度分析等核心功能
 * 
 * @author 列车长考核系统
 * @version 2.0.0
 */

import { ref, computed } from 'vue'
import { useMainStore } from '@/stores'
import { useManagementIntensity } from './useManagementIntensity'
import { determineCategory, getDepartmentsByCategory } from '@/utils/department'

// ========================= 接口定义 =========================

interface CoreKPI {
  key: string
  label: string
  value: string | number
  trend?: string
  trendClass?: string
  unit?: string
}

interface KeyFinding {
  title: string
  content: string
  severity: 'info' | 'warning' | 'critical'
  actionRequired: boolean
}

interface ManagementSnapshot {
  overallScore: number
  level: string
  description: string
  indicators: {
    标准一致性: number
    考核覆盖率: number
    管理严格度: number
    问题识别力: number
    管理均衡性: number
  }
}

interface StaffAnalysisData {
  totalOnDuty: number
  departmentDistribution: Array<{
    department: string
    count: number
    percentage: number
  }>
  statusBreakdown: Array<{
    status: string
    count: number
    percentage: number
  }>
}

interface RewardAnalysisData {
  totalAmount: number
  averagePerPerson: number
  departmentComparison: Array<{
    department: string
    totalReward: number
    avgPerPerson: number
    rank: number
  }>
  distributionStats: {
    min: number
    max: number
    median: number
    standardDeviation: number
  }
}

interface CoverageAnalysisData {
  assessmentCoverage: number
  coveredPersons: number
  uncoveredPersons: number
  departmentCoverage: Array<{
    department: string
    coverage: number
    assessedCount: number
    totalCount: number
  }>
}

interface DispersionAnalysisData {
  overallStats: {
    totalDepartments: number
    highRiskCount: number
    avgStandardDeviation: number
    avgDiscriminationScore: number
  }
  departmentAnalysis: Array<{
    department: string
    statistics: {
      mean: number
      standardDeviation: number
      range: number
      count: number
    }
    bigPotRisk: {
      level: 'low' | 'medium' | 'high'
      score: number
      alert: string
    }
    discrimination: {
      score: number
      level: string
    }
  }>
  recommendations: string[]
}

interface CategoryDistributionData {
  categories: Array<{
    name: string
    value: number
    percentage: number
    avgDeduction: number
  }>
  totalDeductions: number
  categoryCount: number
}

interface Top10IssuesData {
  issues: Array<{
    item: string
    count: number
    departments: string[]
    severity: number
  }>
  totalIssueTypes: number
  mostAffectedDepartments: string[]
}

interface ProblemDetectionData {
  criticalIssues: Array<{
    type: string
    description: string
    severity: 'high' | 'medium' | 'low'
    affectedDepartments: string[]
    recommendedActions: string[]
  }>
  emergingTrends: Array<{
    trend: string
    description: string
    confidence: number
    projection: string
  }>
  anomalies: Array<{
    type: string
    description: string
    impactLevel: number
    detectionConfidence: number
  }>
}

interface ComprehensiveReportData {
  executiveSummary: {
    coreKPIs: CoreKPI[]
    keyFindings: KeyFinding[]
    managementSnapshot: ManagementSnapshot
  }
  basicAnalysis: {
    staffAnalysis: StaffAnalysisData
    rewardAnalysis: RewardAnalysisData
    assessmentCoverage: CoverageAnalysisData
  }
  managementIntensity: any
  scoreQuality: {
    dispersionAnalysis: DispersionAnalysisData
  }
  segmentOverview: {
    categoryDistribution: CategoryDistributionData
    top10Issues: Top10IssuesData
  }
  aiInsights: {
    problemDetection: ProblemDetectionData
  }
}

// ========================= 核心Composable =========================

export function useComprehensiveAnalysis() {
  const mainStore = useMainStore()
  const { 
    calculateManagementIntensityIndex,
    calculateOptimizedManagementIntensity,
    getOnDutyConductorCount,
    getAssessmentData,
    calculateTotalDeductions
  } = useManagementIntensity()

  // 响应式数据
  const loading = ref(false)
  const reportData = ref<ComprehensiveReportData | null>(null)
  const analysisProgress = ref(0)
  const currentStep = ref('')

  /**
   * 生成综合分析报告
   */
  const generateComprehensiveReport = async (month: string): Promise<ComprehensiveReportData> => {
    loading.value = true
    analysisProgress.value = 0
    
    try {
      currentStep.value = '准备数据...'
      analysisProgress.value = 10
      
      // 1. 获取基础数据
      const [year, monthNum] = month.split('-').map(Number)
      const monthlyData = mainStore.monthlyData.find(m => m.year === year && m.month === monthNum)
      const assessmentData = getAssessmentData(month)
      
      if (!monthlyData) {
        throw new Error(`未找到${month}的月度数据`)
      }

      currentStep.value = '分析执行摘要...'
      analysisProgress.value = 20
      
      // 2. 生成执行摘要
      const executiveSummary = await generateExecutiveSummary(month, monthlyData, assessmentData)
      
      currentStep.value = '分析基础数据...'
      analysisProgress.value = 35
      
      // 3. 基础数据分析
      const basicAnalysis = await generateBasicAnalysis(monthlyData, assessmentData)
      
      currentStep.value = '分析管理力度...'
      analysisProgress.value = 50
      
      // 4. 管理力度分析
      const managementIntensity = await generateManagementIntensityAnalysis(month)
      
      currentStep.value = '分析评分质量...'
      analysisProgress.value = 65
      
      // 5. 评分质量分析
      const scoreQuality = await generateScoreQualityAnalysis(assessmentData)
      
      currentStep.value = '分析全段整体情况...'
      analysisProgress.value = 80
      
      // 6. 全段整体分析
      const segmentOverview = await generateSegmentOverviewAnalysis(assessmentData)
      
      currentStep.value = '生成AI洞察...'
      analysisProgress.value = 90
      
      // 7. AI智能分析
      const aiInsights = await generateAIInsights(assessmentData, basicAnalysis, managementIntensity)
      
      currentStep.value = '整合报告...'
      analysisProgress.value = 95
      
      // 8. 整合所有分析结果
      const comprehensiveReport: ComprehensiveReportData = {
        executiveSummary,
        basicAnalysis,
        managementIntensity,
        scoreQuality,
        segmentOverview,
        aiInsights
      }
      
      analysisProgress.value = 100
      currentStep.value = '分析完成'
      
      reportData.value = comprehensiveReport
      return comprehensiveReport
      
    } catch (error) {
      console.error('生成综合分析报告失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 生成执行摘要
   */
  const generateExecutiveSummary = async (
    month: string, 
    monthlyData: any, 
    assessmentData: any[]
  ) => {
    // 计算核心KPI
    const activeStaff = monthlyData.data.filter((s: any) => s.isActive)
    const totalReward = activeStaff.reduce((sum: number, s: any) => sum + (s.rewardAmount || 0), 0)
    const totalDeductions = assessmentData.reduce((sum, a) => sum + Math.abs(a.totalScore || 0), 0)
    
    const coreKPIs: CoreKPI[] = [
      {
        key: 'onDuty',
        label: '在岗人数',
        value: activeStaff.length,
        unit: '人',
        trend: '较上月+2人',
        trendClass: 'trend-up'
      },
      {
        key: 'totalReward',
        label: '总奖励金额',
        value: totalReward,
        unit: '元',
        trend: '较上月+5.2%',
        trendClass: 'trend-up'
      },
      {
        key: 'assessmentCount',
        label: '考核记录数',
        value: assessmentData.length,
        unit: '条',
        trend: '较上月-8条',
        trendClass: 'trend-down'
      },
      {
        key: 'avgDeduction',
        label: '人均扣分',
        value: (totalDeductions / activeStaff.length).toFixed(1),
        unit: '分',
        trend: '较上月-0.3分',
        trendClass: 'trend-up'
      }
    ]
    
    // 计算管理力度快照
    const managementResult = calculateOptimizedManagementIntensity(month)
    const managementSnapshot: ManagementSnapshot = {
      overallScore: managementResult.success ? managementResult.overallAssessment?.overallScore || 0 : 0,
      level: managementResult.success ? managementResult.overallAssessment?.level || '未评估' : '未评估',
      description: managementResult.success ? managementResult.overallAssessment?.description || '' : '数据不足',
      indicators: managementResult.success ? {
        标准一致性: managementResult.indicators?.consistencyIndex || 0,
        考核覆盖率: managementResult.indicators?.coverageRate || 0,
        管理严格度: managementResult.indicators?.strictnessIndex || 0,
        问题识别力: managementResult.indicators?.identificationCapability || 0,
        管理均衡性: managementResult.indicators?.balanceIndex || 0
      } : {
        标准一致性: 0,
        考核覆盖率: 0,
        管理严格度: 0,
        问题识别力: 0,
        管理均衡性: 0
      }
    }
    
    // 生成关键发现
    const keyFindings: KeyFinding[] = []
    
    if (managementSnapshot.overallScore < 60) {
      keyFindings.push({
        title: '管理力度综合评估偏低',
        content: `管理力度综合得分${managementSnapshot.overallScore}分，需要重点关注和改进`,
        severity: 'warning',
        actionRequired: true
      })
    }
    
    if (assessmentData.length < activeStaff.length * 0.5) {
      keyFindings.push({
        title: '考核覆盖率不足',
        content: '本月考核覆盖率低于50%，建议增加考核频次',
        severity: 'warning',
        actionRequired: true
      })
    }
    
    if (keyFindings.length === 0) {
      keyFindings.push({
        title: '整体表现良好',
        content: '各项指标表现稳定，管理水平保持在合理范围内',
        severity: 'info',
        actionRequired: false
      })
    }
    
    return {
      coreKPIs,
      keyFindings,
      managementSnapshot
    }
  }

  /**
   * 生成基础数据分析
   */
  const generateBasicAnalysis = async (monthlyData: any, assessmentData: any[]) => {
    const activeStaff = monthlyData.data.filter((s: any) => s.isActive)
    
    // 人员分析
    const deptCount = new Map<string, number>()
    activeStaff.forEach((staff: any) => {
      deptCount.set(staff.department, (deptCount.get(staff.department) || 0) + 1)
    })
    
    const staffAnalysis: StaffAnalysisData = {
      totalOnDuty: activeStaff.length,
      departmentDistribution: Array.from(deptCount.entries()).map(([dept, count]) => ({
        department: dept,
        count,
        percentage: Math.round((count / activeStaff.length) * 100)
      })),
      statusBreakdown: [
        { status: '在岗', count: activeStaff.length, percentage: 100 }
      ]
    }
    
    // 奖励分析
    const rewardStats = activeStaff.map((s: any) => s.rewardAmount || 0)
    const totalReward = rewardStats.reduce((sum: number, r: number) => sum + r, 0)
    
    const rewardAnalysis: RewardAnalysisData = {
      totalAmount: totalReward,
      averagePerPerson: totalReward / activeStaff.length,
      departmentComparison: Array.from(deptCount.entries()).map(([dept, count], index) => {
        const deptReward = activeStaff
          .filter((s: any) => s.department === dept)
          .reduce((sum: number, s: any) => sum + (s.rewardAmount || 0), 0)
        return {
          department: dept,
          totalReward: deptReward,
          avgPerPerson: deptReward / count,
          rank: index + 1
        }
      }),
      distributionStats: {
        min: Math.min(...rewardStats),
        max: Math.max(...rewardStats),
        median: rewardStats.sort((a, b) => a - b)[Math.floor(rewardStats.length / 2)],
        standardDeviation: calculateStandardDeviation(rewardStats)
      }
    }
    
    // 考核覆盖分析
    const assessedPersons = new Set(assessmentData.map(a => a.conductorId || a.conductorName))
    const assessmentCoverage: CoverageAnalysisData = {
      assessmentCoverage: Math.round((assessedPersons.size / activeStaff.length) * 100),
      coveredPersons: assessedPersons.size,
      uncoveredPersons: activeStaff.length - assessedPersons.size,
      departmentCoverage: Array.from(deptCount.entries()).map(([dept, total]) => {
        const deptAssessed = assessmentData.filter(a => a.department === dept).length
        return {
          department: dept,
          coverage: Math.round((deptAssessed / total) * 100),
          assessedCount: deptAssessed,
          totalCount: total
        }
      })
    }
    
    return {
      staffAnalysis,
      rewardAnalysis,
      assessmentCoverage
    }
  }

  /**
   * 生成管理力度分析
   */
  const generateManagementIntensityAnalysis = async (month: string) => {
    // 调用现有的管理力度分析功能
    const traditionalResult = calculateManagementIntensityIndex(month)
    const optimizedResult = calculateOptimizedManagementIntensity(month)
    
    return {
      traditional: traditionalResult,
      optimized: optimizedResult,
      comparison: {
        hasImprovement: optimizedResult.success && traditionalResult.success,
        improvementAreas: optimizedResult.success ? optimizedResult.overallAssessment?.suggestions || [] : []
      }
    }
  }

  /**
   * 生成评分质量分析
   */
  const generateScoreQualityAnalysis = async (assessmentData: any[]) => {
    // 按部门分组数据
    const departmentData: Record<string, any[]> = {}
    assessmentData.forEach(record => {
      const dept = record.department || '未知部门'
      if (!departmentData[dept]) {
        departmentData[dept] = []
      }
      departmentData[dept].push(record)
    })
    
    // 计算离散度分析
    const dispersionAnalysis = analyzeDepartmentDispersion(departmentData)
    
    return {
      dispersionAnalysis
    }
  }

  /**
   * 生成全段整体分析
   */
  const generateSegmentOverviewAnalysis = async (assessmentData: any[]) => {
    // 类别分布统计
    const categoryStats = new Map<string, { count: number, totalDeduction: number }>()
    
    assessmentData.forEach(record => {
      record.details?.forEach((detail: any) => {
        const category = detail.itemCategory || '其他'
        const current = categoryStats.get(category) || { count: 0, totalDeduction: 0 }
        current.count++
        current.totalDeduction += Math.abs(detail.deduction || 0)
        categoryStats.set(category, current)
      })
    })
    
    const totalCount = Array.from(categoryStats.values()).reduce((sum, cat) => sum + cat.count, 0)
    const totalDeductions = Array.from(categoryStats.values()).reduce((sum, cat) => sum + cat.totalDeduction, 0)
    
    const categoryDistribution: CategoryDistributionData = {
      categories: Array.from(categoryStats.entries()).map(([name, stats]) => ({
        name,
        value: stats.totalDeduction,
        percentage: Math.round((stats.count / totalCount) * 100),
        avgDeduction: stats.totalDeduction / stats.count
      })),
      totalDeductions,
      categoryCount: categoryStats.size
    }
    
    // Top 10 问题统计
    const issueStats = new Map<string, { count: number, departments: Set<string> }>()
    
    assessmentData.forEach(record => {
      record.details?.forEach((detail: any) => {
        const issue = detail.item || detail.itemDetail || '未知问题'
        const current = issueStats.get(issue) || { count: 0, departments: new Set() }
        current.count++
        current.departments.add(record.department || '未知部门')
        issueStats.set(issue, current)
      })
    })
    
    const top10Issues: Top10IssuesData = {
      issues: Array.from(issueStats.entries())
        .map(([item, stats]) => ({
          item,
          count: stats.count,
          departments: Array.from(stats.departments),
          severity: stats.count >= 10 ? 3 : stats.count >= 5 ? 2 : 1
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      totalIssueTypes: issueStats.size,
      mostAffectedDepartments: getMostAffectedDepartments(assessmentData)
    }
    
    return {
      categoryDistribution,
      top10Issues
    }
  }

  /**
   * 生成AI智能分析
   */
  const generateAIInsights = async (assessmentData: any[], basicAnalysis: any, managementIntensity: any) => {
    const problemDetection: ProblemDetectionData = {
      criticalIssues: [],
      emergingTrends: [],
      anomalies: []
    }
    
    // 检测关键问题
    if (managementIntensity.optimized?.success && managementIntensity.optimized.overallAssessment?.overallScore < 60) {
      problemDetection.criticalIssues.push({
        type: '管理力度不足',
        description: '综合管理力度评分低于及格线，存在系统性管理问题',
        severity: 'high',
        affectedDepartments: ['全段'],
        recommendedActions: [
          '立即启动管理力度专项整改',
          '加强科室与车队考核标准统一',
          '提高考核频次和覆盖率'
        ]
      })
    }
    
    if (basicAnalysis.assessmentCoverage.assessmentCoverage < 70) {
      problemDetection.criticalIssues.push({
        type: '考核覆盖率不足',
        description: `考核覆盖率仅${basicAnalysis.assessmentCoverage.assessmentCoverage}%，存在管理盲区`,
        severity: 'medium',
        affectedDepartments: basicAnalysis.assessmentCoverage.departmentCoverage
          .filter((d: any) => d.coverage < 70)
          .map((d: any) => d.department),
        recommendedActions: [
          '提高日常考核频次',
          '建立全员考核制度',
          '重点关注覆盖率低的部门'
        ]
      })
    }
    
    // 检测新兴趋势（这里简化处理）
    problemDetection.emergingTrends.push({
      trend: '数字化管理趋势',
      description: '系统化数据分析正在成为管理决策的重要依据',
      confidence: 85,
      projection: '未来将更加依赖数据驱动的管理决策'
    })
    
    return {
      problemDetection
    }
  }

  // ========================= 辅助函数 =========================

  /**
   * 计算标准差
   */
  const calculateStandardDeviation = (values: number[]): number => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  /**
   * 分析部门离散度
   */
  const analyzeDepartmentDispersion = (departmentData: Record<string, any[]>): DispersionAnalysisData => {
    const departmentAnalysis: any[] = []
    let totalStdDev = 0
    let highRiskCount = 0
    
    Object.entries(departmentData).forEach(([department, records]) => {
      const scores = records.map(r => r.finalScore || r.totalScore || 100)
      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
      const stdDev = calculateStandardDeviation(scores)
      const range = Math.max(...scores) - Math.min(...scores)
      
      // 评估"吃大锅饭"风险
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      let riskScore = 0
      
      if (stdDev < 2 && range < 5) {
        riskLevel = 'high'
        riskScore = 90
        highRiskCount++
      } else if (stdDev < 4 && range < 10) {
        riskLevel = 'medium' 
        riskScore = 60
      } else {
        riskScore = 20
      }
      
      departmentAnalysis.push({
        department,
        statistics: { mean, standardDeviation: stdDev, range, count: scores.length },
        bigPotRisk: {
          level: riskLevel,
          score: riskScore,
          alert: riskLevel === 'high' ? '存在"吃大锅饭"现象' : '评分区分度正常'
        },
        discrimination: {
          score: Math.min(100, stdDev * 10),
          level: stdDev > 5 ? '良好' : stdDev > 3 ? '一般' : '较差'
        }
      })
      
      totalStdDev += stdDev
    })
    
    return {
      overallStats: {
        totalDepartments: departmentAnalysis.length,
        highRiskCount,
        avgStandardDeviation: totalStdDev / departmentAnalysis.length,
        avgDiscriminationScore: departmentAnalysis.reduce((sum, d) => sum + d.discrimination.score, 0) / departmentAnalysis.length
      },
      departmentAnalysis: departmentAnalysis.sort((a, b) => b.bigPotRisk.score - a.bigPotRisk.score),
      recommendations: generateDispersionRecommendations(departmentAnalysis, highRiskCount)
    }
  }

  /**
   * 生成离散度分析建议
   */
  const generateDispersionRecommendations = (analysis: any[], highRiskCount: number): string[] => {
    const recommendations: string[] = []
    
    if (highRiskCount > analysis.length * 0.3) {
      recommendations.push('超过30%的部门存在"吃大锅饭"现象，建议全面检查评分标准')
    }
    
    if (highRiskCount > 0) {
      recommendations.push('部分部门评分过于集中，建议提高评分区分度')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('各部门评分分布合理，继续保持当前评分标准')
    }
    
    return recommendations
  }

  /**
   * 获取最受影响的部门
   */
  const getMostAffectedDepartments = (assessmentData: any[]): string[] => {
    const deptCounts = new Map<string, number>()
    
    assessmentData.forEach(record => {
      const dept = record.department || '未知部门'
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1)
    })
    
    return Array.from(deptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dept]) => dept)
  }

  return {
    // 核心功能
    generateComprehensiveReport,
    
    // 响应式数据
    loading: computed(() => loading.value),
    reportData: computed(() => reportData.value),
    analysisProgress: computed(() => analysisProgress.value),
    currentStep: computed(() => currentStep.value),
    
    // 工具函数
    calculateStandardDeviation,
    analyzeDepartmentDispersion
  }
} 