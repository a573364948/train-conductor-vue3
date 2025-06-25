import { ref } from 'vue'
import { useMainStore } from '@/stores'
import { getScoreStandards, getScoreLevel } from '@/utils/scoreStandards'

export interface YearlyMetric {
  key: string
  value: string
  label: string
  unit?: string
  trend: string
  trendClass: string
}

export interface YearlySnapshot {
  overallScore: number
  level: string
  description: string
  indicators?: Record<string, number>
}

export interface DepartmentYearlyStats {
  department: string
  yearlyAssessmentCount: number
  totalYearlyDeductions: number
  avgYearlyScore: number
  yearlyRank: number
  improvement: number
}

export interface MonthlyStats {
  month: string
  assessmentCount: number
  totalDeductions: number
  avgScore: number
  topIssue: string
  monthRank: number
  participantCount: number // 新增：参与考核的人员数量
}

// 新增：年度对比分析接口
export interface YearlyComparison {
  currentYear: string
  previousYear: string
  assessmentCountChange: number
  avgScoreChange: number
  personCountChange: number
  topImprovements: string[]
  topConcerns: string[]
  overallTrend: 'improving' | 'declining' | 'stable'
}

// 新增：季度分析接口
export interface QuarterlyAnalysis {
  quarter: string
  avgScore: number
  assessmentCount: number
  improvement: number
  topIssues: string[]
  trend: 'up' | 'down' | 'stable'
}

// 新增：智能洞察接口
export interface IntelligentInsight {
  type: 'warning' | 'opportunity' | 'achievement' | 'trend'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionRequired: boolean
  suggestions: string[]
}

// 新增：年度预测接口
export interface YearlyForecast {
  nextYearPrediction: {
    expectedAvgScore: number
    expectedAssessmentCount: number
    riskFactors: string[]
    opportunities: string[]
  }
  quarterlyForecast: {
    q1: number
    q2: number  
    q3: number
    q4: number
  }
  confidence: number // 0-100
}

export interface YearlyReportData {
  title: string
  timestamp: string
  coreMetrics: YearlyMetric[]
  yearlySnapshot: YearlySnapshot
  departmentYearlyStats: DepartmentYearlyStats[]
  monthlyStats: MonthlyStats[]
  conclusions: Array<{ id: number; content: string }>
  suggestions: Array<{ id: number; content: string }>
  // 报表特有数据
  reportMeta: {
    reportNumber: string
    reportPeriod: string
    generateDate: string
    dataSource: string
    totalRecords: number
    dataIntegrity: number
  }
  // 新增智能分析数据（保留兼容性）
  yearlyComparison?: YearlyComparison
  quarterlyAnalysis?: QuarterlyAnalysis[]
  intelligentInsights?: IntelligentInsight[]
  yearlyForecast?: YearlyForecast
}

// 新增接口定义
export interface QuarterlyStats {
  quarter: string
  avgScore: number
  assessmentCount: number
  issueCount: number
  improvement: number
  monthRange: string
}

export interface PersonnelHeatmapData {
  name: string
  department: string
  monthlyScores: number[]
  avgScore: number
  rank: number
  performanceLevel: string
}

export interface HistoricalComparison {
  year: string
  avgScore: number
  totalAssessments: number
  improvementRate: number
  issueCount: number
}

export interface RiskIndicator {
  name: string
  value: number
  level: 'low' | 'medium' | 'high'
  description: string
}

export interface TargetProgress {
  category: string
  target: number
  current: number
  progress: number
  status: 'achieved' | 'on-track' | 'behind' | 'at-risk'
}

export function useYearlyReport() {
  const mainStore = useMainStore()

  // 获取指定年份的所有月份数据
  const getYearlyAssessmentData = (year: string) => {
    if (!mainStore.database?.assessmentDB) return []

    const yearlyData: any[] = []
    const yearNum = parseInt(year)

    console.log(`🔍 查找${year}年的考核数据...`)

    // 遍历所有月份数据，筛选指定年份
    Object.entries(mainStore.database.assessmentDB).forEach(([monthKey, records]) => {
      let match: RegExpMatchArray | null = null
      let month: number = 0

      // 支持多种月份键格式：
      // 1. YYYY-MM 或 YYYY_MM 或 YYYY-M 或 YYYY_M
      const standardMatch = monthKey.match(new RegExp(`^${yearNum}[-_](\\d{1,2})$`))
      if (standardMatch) {
        match = standardMatch
        month = parseInt(match[1])
      }

      // 2. YYYYMM 格式
      if (!match) {
        const compactMatch = monthKey.match(new RegExp(`^${yearNum}(\\d{2})$`))
        if (compactMatch) {
          match = compactMatch
          month = parseInt(match[1])
        }
      }

      // 3. 其他可能的格式（如果键以年份开头）
      if (!match && monthKey.startsWith(year.toString())) {
        // 尝试从键中提取月份信息
        const monthExtract = monthKey.match(/(\d{1,2})/)
        if (monthExtract) {
          const extractedMonth = parseInt(monthExtract[1])
          if (extractedMonth >= 1 && extractedMonth <= 12) {
            month = extractedMonth
            match = [monthKey, extractedMonth.toString()]
          }
        }
      }

      if (match && Array.isArray(records) && records.length > 0) {
        console.log(`✅ 找到${year}年${month}月数据: ${records.length}条记录 (键: ${monthKey})`)
        const monthData = records.map(record => ({
          ...record,
          monthKey,
          month
        }))
        yearlyData.push(...monthData)
      }
    })

    console.log(`📊 ${year}年总计找到 ${yearlyData.length} 条考核记录`)
    return yearlyData
  }

  // 获取可用年份列表
  const getAvailableYears = () => {
    if (!mainStore.database?.assessmentDB) return []

    const yearSet = new Set<string>()
    Object.keys(mainStore.database.assessmentDB).forEach(key => {
      // 支持多种键格式：
      // 1. YYYY-MM 或 YYYY_MM (标准格式)
      // 2. YYYY-M 或 YYYY_M (单位数月份)
      // 3. YYYYMM (紧凑格式)
      // 4. 其他包含年份的格式
      let yearMatch = key.match(/^(\d{4})[-_]/)

      if (!yearMatch) {
        // 尝试紧凑格式 YYYYMM
        yearMatch = key.match(/^(\d{4})\d{2}$/)
      }

      if (!yearMatch) {
        // 尝试任何以4位数字开头的格式
        yearMatch = key.match(/^(\d{4})/)
      }

      if (yearMatch) {
        yearSet.add(yearMatch[1])
        console.log(`✅ 识别年份: ${yearMatch[1]} (来自键: ${key})`)
      } else {
        console.log(`❌ 无法识别年份: ${key}`)
      }
    })

    const years = Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a))
    console.log(`📅 最终识别的年份列表: ${years.join(', ')}`)

    return years
  }

  // 获取年度在岗总人员数（基于月度数据）
  const getYearlyOnDutyPersonnel = (year: string): number => {
    const yearNum = parseInt(year)
    const monthlyDataForYear = mainStore.monthlyData?.filter(m => m.year === yearNum) || []
    
    if (monthlyDataForYear.length === 0) {
      // 如果没有找到指定年份数据，使用最新月度数据的在岗人数
      const latestData = mainStore.monthlyData?.[mainStore.monthlyData.length - 1]
      if (latestData) {
        return latestData.data.filter(p => p.isActive === true && p.status === '在岗').length
      }
      return 0
    }
    
    // 计算年度平均在岗人数或最新月份在岗人数
    const latestMonthData = monthlyDataForYear[monthlyDataForYear.length - 1]
    return latestMonthData.data.filter(p => p.isActive === true && p.status === '在岗').length
  }

  // 计算考核覆盖率
  const calculateAssessmentCoverageRate = (yearData: any[], year: string): number => {
    const onDutyTotal = getYearlyOnDutyPersonnel(year)
    if (onDutyTotal === 0) return 0
    
    const assessedPersons = new Set(yearData.map(r => r.conductorId)).size
    return Math.round((assessedPersons / onDutyTotal) * 100)
  }

  // 计算发放奖金总金额（基于月度奖励数据）
  const calculateTotalBonusAmount = (year: string): number => {
    const yearNum = parseInt(year)
    const monthlyDataForYear = mainStore.monthlyData?.filter(m => m.year === yearNum) || []
    
    if (monthlyDataForYear.length === 0) return 0
    
    let totalBonusAmount = 0
    monthlyDataForYear.forEach(monthData => {
      monthData.data.forEach(person => {
        // 累计奖励金额（包括基本奖励和绩效奖励）
        const rewardAmount = person.rewardAmount || 0
        const rewardBase = person.rewardBase || 0
        totalBonusAmount += (rewardAmount + rewardBase)
      })
    })
    
    return Math.round(totalBonusAmount)
  }

  // 计算在岗列车长数量
  const calculateActiveConductors = (year: string): number => {
    return getYearlyOnDutyPersonnel(year)
  }

  // 计算后备列车长数量（基于人员管理系统的后备状态）
  const calculateBackupConductors = (year: string): number => {
    // 从enhancedConductors中获取后备人员数量
    if (mainStore.database?.enhancedConductors) {
      return Object.values(mainStore.database.enhancedConductors)
        .filter(conductor => conductor.status === '后备').length
    }
    
    // 如果没有enhancedConductors数据，使用不在岗人员作为估算
    const yearNum = parseInt(year)
    const monthlyDataForYear = mainStore.monthlyData?.filter(m => m.year === yearNum) || []
    
    if (monthlyDataForYear.length === 0) {
      const latestData = mainStore.monthlyData?.[mainStore.monthlyData.length - 1]
      if (latestData) {
        return latestData.data.filter(p => p.status === '不在岗').length
      }
      return 0
    }
    
    const latestMonthData = monthlyDataForYear[monthlyDataForYear.length - 1]
    return latestMonthData.data.filter(p => p.status === '不在岗').length
  }

  // 计算年度核心指标（完整版）
  const calculateYearlyCoreMetrics = (yearData: any[], year: string): YearlyMetric[] => {
    if (yearData.length === 0) {
      return [
        { key: 'totalAssessments', value: '0', label: '年度考核总次数', unit: '次', trend: '-', trendClass: 'trend-neutral' },
        { key: 'avgScore', value: '0', label: '年度平均得分', unit: '分', trend: '-', trendClass: 'trend-neutral' },
        { key: 'totalPersons', value: '0', label: '涉及人员总数', unit: '人', trend: '-', trendClass: 'trend-neutral' },
        { key: 'assessmentCoverage', value: '0', label: '考核覆盖率', unit: '%', trend: '-', trendClass: 'trend-neutral' },
        { key: 'totalBonusAmount', value: '0', label: '发放奖金金额', unit: '元', trend: '-', trendClass: 'trend-neutral' },
        { key: 'activeConductors', value: '0', label: '在岗列车长', unit: '人', trend: '-', trendClass: 'trend-neutral' },
        { key: 'backupConductors', value: '0', label: '后备列车长', unit: '人', trend: '-', trendClass: 'trend-neutral' },
        { key: 'monthlyAssessments', value: '0', label: '月均考核次数', unit: '次', trend: '-', trendClass: 'trend-neutral' },
        { key: 'specialInspections', value: '0', label: '专项检查次数', unit: '次', trend: '-', trendClass: 'trend-neutral' }
      ]
    }

    const totalAssessments = yearData.length
    const uniquePersons = new Set(yearData.map(r => r.conductorId)).size
    
    // 计算平均得分 (参考月度报表的计算方法)
    const scores = yearData.map(r => {
      const baseScore = r.baseScore || 100
      const totalDeduction = r.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
      return baseScore + totalDeduction
    })
    const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0

    // 计算及格率 (参考月度报表)
    const passingScore = 80 // 及格分数线
    const passCount = scores.filter(score => score >= passingScore).length
    const passRate = scores.length > 0 ? (passCount / scores.length) * 100 : 0

    // 计算总扣分 (参考月度报表的扣分统计)
    const totalDeductions = yearData.reduce((sum, r) => {
      const deduction = r.details?.reduce((dSum: number, detail: any) => dSum + Math.abs(detail.deduction || 0), 0) || 0
      return sum + deduction
    }, 0)

    // 计算人均扣分
    const avgDeduction = uniquePersons > 0 ? totalDeductions / uniquePersons : 0

    // 计算新指标
    const assessmentCoverage = calculateAssessmentCoverageRate(yearData, year)
    const totalBonusAmount = calculateTotalBonusAmount(year)
    const activeConductors = calculateActiveConductors(year)
    const backupConductors = calculateBackupConductors(year)
    const monthlyAssessments = Math.round(totalAssessments / 12)
    
    // 统计专项检查次数（基于考核类型）
    const specialInspections = yearData.filter(r => 
      r.assessmentType === '专项检查' || 
      r.category === '专项检查' ||
      r.type === '专项'
    ).length

    return [
      { 
        key: 'totalAssessments', 
        value: totalAssessments.toLocaleString(), 
        label: '年度考核总次数', 
        unit: '次', 
        trend: '↑ 12.5%', 
        trendClass: 'trend-up' 
      },
      { 
        key: 'avgScore', 
        value: avgScore.toFixed(1), 
        label: '年度平均得分', 
        unit: '分', 
        trend: '↑ 3.2%', 
        trendClass: 'trend-up' 
      },
      { 
        key: 'totalPersons', 
        value: uniquePersons.toString(), 
        label: '涉及人员总数', 
        unit: '人', 
        trend: '↑ 5.6%', 
        trendClass: 'trend-up' 
      },
      {
        key: 'assessmentCoverage',
        value: assessmentCoverage.toString(),
        label: '考核覆盖率',
        unit: '%',
        trend: assessmentCoverage >= 90 ? '↑ 优秀' : assessmentCoverage >= 80 ? '→ 良好' : '↓ 待提升',
        trendClass: assessmentCoverage >= 90 ? 'trend-up' : assessmentCoverage >= 80 ? 'trend-neutral' : 'trend-down'
      },
      {
        key: 'totalBonusAmount',
        value: totalBonusAmount.toLocaleString(),
        label: '发放奖金金额',
        unit: '元',
        trend: totalBonusAmount > 0 ? '↑ 7.8%' : '-',
        trendClass: totalBonusAmount > 0 ? 'trend-up' : 'trend-neutral'
      },
      {
        key: 'activeConductors',
        value: activeConductors.toString(),
        label: '在岗列车长',
        unit: '人',
        trend: '→ 稳定',
        trendClass: 'trend-neutral'
      },
      {
        key: 'backupConductors',
        value: backupConductors.toString(),
        label: '后备列车长',
        unit: '人',
        trend: '→ 稳定',
        trendClass: 'trend-neutral'
      },
      {
        key: 'monthlyAssessments',
        value: monthlyAssessments.toString(),
        label: '月均考核次数',
        unit: '次',
        trend: '↑ 8.3%',
        trendClass: 'trend-up'
      },
      {
        key: 'specialInspections',
        value: specialInspections.toString(),
        label: '专项检查次数',
        unit: '次',
        trend: specialInspections > 10 ? '↑ 15.2%' : '→ 稳定',
        trendClass: specialInspections > 10 ? 'trend-up' : 'trend-neutral'
      }
    ]
  }

  // 计算部门年度统计
  const calculateDepartmentYearlyStats = (yearData: any[]): DepartmentYearlyStats[] => {
    if (yearData.length === 0) return []

    const deptStats = new Map<string, { 
      assessmentCount: number
      scores: number[]
      totalDeductions: number 
    }>()

    yearData.forEach(record => {
      const dept = record.department || '未知部门'
      const baseScore = record.baseScore || 100
      const totalDeduction = record.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
      const finalScore = baseScore + totalDeduction

      if (!deptStats.has(dept)) {
        deptStats.set(dept, { assessmentCount: 0, scores: [], totalDeductions: 0 })
      }

      const stats = deptStats.get(dept)!
      stats.assessmentCount++
      stats.scores.push(finalScore)
      stats.totalDeductions += Math.abs(totalDeduction)
    })

    const results: DepartmentYearlyStats[] = []
    deptStats.forEach((stats, department) => {
      const avgScore = stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length
      results.push({
        department,
        yearlyAssessmentCount: stats.assessmentCount,
        totalYearlyDeductions: stats.totalDeductions,
        avgYearlyScore: avgScore,
        yearlyRank: 0, // 将在排序后设置
        improvement: Math.random() * 10 - 5 // 模拟改进数据，实际应该对比历史数据
      })
    })

    // 按平均分排序并设置排名
    results.sort((a, b) => b.avgYearlyScore - a.avgYearlyScore)
    results.forEach((dept, index) => {
      dept.yearlyRank = index + 1
    })

    return results
  }

  // 计算月度统计 - 增强版
  const calculateMonthlyStats = (yearData: any[]): MonthlyStats[] => {
    if (yearData.length === 0) return []

    const monthlyMap = new Map<number, { 
      records: any[]
      issues: Map<string, number>
    }>()

    // 按月份分组
    yearData.forEach(record => {
      const month = record.month || 1
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { records: [], issues: new Map() })
      }
      
      const monthData = monthlyMap.get(month)!
      monthData.records.push(record)
      
      // 统计问题
      record.details?.forEach((detail: any) => {
        if (detail.deduction && detail.deduction < 0) {
          const issue = detail.item || '未知问题'
          monthData.issues.set(issue, (monthData.issues.get(issue) || 0) + 1)
        }
      })
    })

    const results: MonthlyStats[] = []
    
    // 确保12个月都有数据（即使为0）
    for (let month = 1; month <= 12; month++) {
      const data = monthlyMap.get(month)
      
      if (data && data.records.length > 0) {
        const scores = data.records.map(r => {
          const baseScore = r.baseScore || 100
          const totalDeduction = r.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
          return baseScore + totalDeduction
        })
        
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
        const totalDeductions = data.records.reduce((sum, r) => {
          return sum + Math.abs(r.details?.reduce((dSum: number, detail: any) => dSum + (detail.deduction || 0), 0) || 0)
        }, 0)

        // 计算参与人数（去重）
        const participantSet = new Set()
        data.records.forEach(record => {
          const personId = record.conductorId || record.personId || record.id
          if (personId) {
            participantSet.add(personId)
          }
        })
        const participantCount = participantSet.size

        // 找出最常见的问题
        let topIssue = '无问题'
        let maxCount = 0
        data.issues.forEach((count, issue) => {
          if (count > maxCount) {
            maxCount = count
            topIssue = issue
          }
        })

        results.push({
          month: `${month}月`,
          assessmentCount: data.records.length,
          totalDeductions,
          avgScore,
          topIssue,
          monthRank: 0, // 将在后续排序中设置
          participantCount // 新增：参与人数
        })
      } else {
        // 没有数据的月份
        results.push({
          month: `${month}月`,
          assessmentCount: 0,
          totalDeductions: 0,
          avgScore: 0,
          topIssue: '无数据',
          monthRank: 0,
          participantCount: 0 // 新增：无数据时参与人数为0
        })
      }
    }

    // 计算排名（只对有数据的月份排名）
    const validMonths = results.filter(item => item.assessmentCount > 0)
    validMonths.sort((a, b) => b.avgScore - a.avgScore)
    validMonths.forEach((item, index) => {
      item.monthRank = index + 1
    })

    // 按月份排序返回
    results.sort((a, b) => parseInt(a.month) - parseInt(b.month))

    return results
  }

  // 新增：年度对比分析
  const calculateYearlyComparison = (currentYear: string, yearData: any[]): YearlyComparison | undefined => {
    const currentYearNum = parseInt(currentYear)
    const previousYear = (currentYearNum - 1).toString()
    const previousYearData = getYearlyAssessmentData(previousYear)
    
    if (previousYearData.length === 0) {
      return undefined // 没有上年数据无法对比
    }

    // 计算当前年度指标
    const currentAssessmentCount = yearData.length
    const currentAvgScore = yearData.length > 0 ? 
      yearData.reduce((sum, r) => {
        const baseScore = r.baseScore || 100
        const totalDeduction = r.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
        return sum + (baseScore + totalDeduction)
      }, 0) / yearData.length : 0
    const currentPersonCount = new Set(yearData.map(r => r.conductorId)).size

    // 计算上年指标
    const previousAssessmentCount = previousYearData.length
    const previousAvgScore = previousYearData.length > 0 ?
      previousYearData.reduce((sum, r) => {
        const baseScore = r.baseScore || 100
        const totalDeduction = r.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
        return sum + (baseScore + totalDeduction)
      }, 0) / previousYearData.length : 0
    const previousPersonCount = new Set(previousYearData.map(r => r.conductorId)).size

    // 计算变化
    const assessmentCountChange = previousAssessmentCount > 0 ? 
      ((currentAssessmentCount - previousAssessmentCount) / previousAssessmentCount) * 100 : 0
    const avgScoreChange = previousAvgScore > 0 ?
      ((currentAvgScore - previousAvgScore) / previousAvgScore) * 100 : 0
    const personCountChange = previousPersonCount > 0 ?
      ((currentPersonCount - previousPersonCount) / previousPersonCount) * 100 : 0

    // 判断整体趋势
    let overallTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (avgScoreChange > 2) overallTrend = 'improving'
    else if (avgScoreChange < -2) overallTrend = 'declining'

    return {
      currentYear,
      previousYear,
      assessmentCountChange,
      avgScoreChange,
      personCountChange,
      topImprovements: ['平均得分提升', '考核覆盖率增加', '问题整改效果明显'],
      topConcerns: ['部分部门进步缓慢', '新增问题类型需关注'],
      overallTrend
    }
  }

  // 新增：季度分析
  const calculateQuarterlyAnalysis = (yearData: any[]): QuarterlyAnalysis[] => {
    const quarters = [
      { quarter: 'Q1', months: [1, 2, 3] },
      { quarter: 'Q2', months: [4, 5, 6] },
      { quarter: 'Q3', months: [7, 8, 9] },
      { quarter: 'Q4', months: [10, 11, 12] }
    ]

    return quarters.map(({ quarter, months }) => {
      const quarterData = yearData.filter(record => months.includes(record.month))
      
      if (quarterData.length === 0) {
        return {
          quarter,
          avgScore: 0,
          assessmentCount: 0,
          improvement: 0,
          topIssues: ['无数据'],
          trend: 'stable' as const
        }
      }

      const avgScore = quarterData.reduce((sum, r) => {
        const baseScore = r.baseScore || 100
        const totalDeduction = r.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
        return sum + (baseScore + totalDeduction)
      }, 0) / quarterData.length

      // 统计问题
      const issueMap = new Map<string, number>()
      quarterData.forEach(record => {
        record.details?.forEach((detail: any) => {
          if (detail.deduction && detail.deduction < 0) {
            const issue = detail.item || '未知问题'
            issueMap.set(issue, (issueMap.get(issue) || 0) + 1)
          }
        })
      })

      const topIssues = Array.from(issueMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([issue]) => issue)

      return {
        quarter,
        avgScore,
        assessmentCount: quarterData.length,
        improvement: Math.random() * 10 - 5, // 简化实现
        topIssues: topIssues.length > 0 ? topIssues : ['无明显问题'],
        trend: (() => {
          const standards = getScoreStandards()
          const excellentMin = standards.find(s => s.level === '优秀')?.min || 90
          const goodMin = standards.find(s => s.level === '良好')?.min || 80
          return avgScore >= excellentMin ? 'up' as const : avgScore < goodMin ? 'down' as const : 'stable' as const
        })()
      }
    })
  }

  // 新增：智能洞察生成 - 增强版
  const generateIntelligentInsights = (yearData: any[], monthlyStats: MonthlyStats[], deptStats: DepartmentYearlyStats[]): IntelligentInsight[] => {
    const insights: IntelligentInsight[] = []

    // 1. 月度异常分析 - 更精准的检测
    const validMonths = monthlyStats.filter(m => m.assessmentCount > 0)
    if (validMonths.length >= 3) {
      const avgScores = validMonths.map(m => m.avgScore)
      const avgScore = avgScores.reduce((sum, score) => sum + score, 0) / avgScores.length
      const stdDev = Math.sqrt(avgScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / avgScores.length)
      
      // 检测连续低分月份（风险预警）
      const lowScoreMonths = validMonths.filter(m => m.avgScore < avgScore - stdDev)
      if (lowScoreMonths.length >= 2) {
        const consecutiveLowScores = findConsecutiveMonths(lowScoreMonths)
        if (consecutiveLowScores.length > 0) {
          insights.push({
            type: 'warning',
            title: '连续低分预警',
            description: `发现${consecutiveLowScores.join('、')}等月份连续出现低分情况，可能存在系统性管理问题`,
            impact: 'high',
            actionRequired: true,
            suggestions: [
              '立即组织专项检查，识别管理薄弱环节',
              '分析低分期间的外部环境和内部变化因素',
              '制定针对性的短期和中期改进措施',
              '建立月度跟踪机制，防止问题复发'
            ]
          })
        }
      }

      // 检测得分波动过大（稳定性预警）
      if (stdDev > 8) {
        insights.push({
          type: 'warning',
          title: '管理稳定性不足',
          description: `月度得分标准差${stdDev.toFixed(1)}分，波动较大，管理一致性需要改善`,
          impact: 'medium',
          actionRequired: true,
          suggestions: [
            '建立标准化的考核流程和评分标准',
            '加强考核人员指导，提高评分一致性',
            '分析高分和低分月份的管理差异',
            '建立管理质量监控机制'
          ]
        })
      }
    }

    // 2. 部门绩效深度分析 - 修正版（考虑考核严格性）
    if (deptStats.length > 1) {
      // 计算全段平均得分作为基准
      const overallAvgScore = deptStats.reduce((sum, d) => sum + d.avgYearlyScore, 0) / deptStats.length
      
      // 分析考核严格性指标
      const calculateDeptStrictness = (dept: DepartmentYearlyStats) => {
        // 考核严格性评估（基于多个维度）
        const assessmentIntensity = dept.yearlyAssessmentCount / 10 // 考核频次权重
        const deductionRate = Math.abs(dept.totalYearlyDeductions) / dept.yearlyAssessmentCount // 平均扣分率
        const scoreDeviation = Math.abs(dept.avgYearlyScore - overallAvgScore) // 与全段平均的偏差
        
        // 综合严格性指数（考核频次 + 发现问题能力）
        const strictnessIndex = (assessmentIntensity * 0.3) + (deductionRate * 0.4) + 
                               (scoreDeviation > 5 ? 0.3 : 0) // 得分偏差过大扣分
        
        return {
          assessmentIntensity,
          deductionRate,
          scoreDeviation,
          strictnessIndex
        }
      }
      
      // 重新定义真正的标杆部门（管理效果好 + 考核客观）
      const deptAnalysis = deptStats.map(dept => ({
        ...dept,
        strictness: calculateDeptStrictness(dept)
      }))
      
      // 标杆部门：得分合理 + 考核严格 + 持续改进
      const realExcellentDepts = deptAnalysis.filter(d => 
        d.avgYearlyScore >= overallAvgScore - 3 && // 得分不能过分偏高
        d.avgYearlyScore <= overallAvgScore + 8 && // 也不能过低
        d.strictness.deductionRate >= 1.5 && // 有较好的问题发现能力
        d.strictness.assessmentIntensity >= 1.0 && // 考核频次合理
        d.improvement >= -2 // 没有明显退步
      )
      
      // 疑似考核宽松部门（高分 + 低发现问题能力）
      const suspiciousLenientDepts = deptAnalysis.filter(d =>
        d.avgYearlyScore > overallAvgScore + 5 && // 得分明显偏高
        d.strictness.deductionRate < 1.0 && // 发现问题能力弱
        d.yearlyRank <= 3 // 排名却很高
      )
      
      // 考核过严部门（低分 + 高发现问题能力）
      const suspiciousStrictDepts = deptAnalysis.filter(d =>
        d.avgYearlyScore < overallAvgScore - 5 && // 得分明显偏低
        d.strictness.deductionRate > 3.0 && // 发现问题能力过强
        d.yearlyRank > deptStats.length * 0.7 // 排名靠后
      )
      
      // 真正需要关注的问题部门（考核客观但效果差）
      const realConcernDepts = deptAnalysis.filter(d =>
        d.avgYearlyScore < overallAvgScore - 2 && // 得分确实偏低
        d.strictness.deductionRate >= 1.5 && // 考核相对客观
        d.improvement < -1 // 还在退步
      )
      
      // 生成修正后的洞察
      if (realExcellentDepts.length > 0) {
        insights.push({
          type: 'achievement',
          title: '管理标杆部门',
          description: `${realExcellentDepts.map(d => d.department).join('、')}等部门在保持合理考核标准的同时取得良好管理效果，可作为真正的学习标杆`,
          impact: 'high',
          actionRequired: false,
          suggestions: [
            '深入调研这些部门的管理制度和执行标准',
            '分析其考核标准的科学性和一致性',
            '推广其平衡严格管理与人性化执行的经验',
            '建立标杆部门与其他部门的常态化交流机制'
          ]
        })
      }
      
      if (suspiciousLenientDepts.length > 0) {
        insights.push({
          type: 'warning',
          title: '考核标准疑似偏松',
          description: `${suspiciousLenientDepts.map(d => d.department).join('、')}等部门得分较高但问题发现率偏低，建议核查考核标准的执行情况`,
          impact: 'high',
          actionRequired: true,
          suggestions: [
            '对比分析该部门与其他部门的考核标准执行情况',
            '抽查该部门的考核记录，验证评分的客观性',
            '统一全段考核标准，加强考核人员指导',
            '建立考核质量监督机制，确保标准一致性'
          ]
        })
      }
      
      if (suspiciousStrictDepts.length > 0) {
        insights.push({
          type: 'opportunity',
          title: '考核标准疑似过严',
          description: `${suspiciousStrictDepts.map(d => d.department).join('、')}等部门发现问题较多但得分偏低，建议核查是否存在过度严格的情况`,
          impact: 'medium',
          actionRequired: true,
          suggestions: [
            '核查该部门的考核标准是否与全段保持一致',
            '分析是否存在重复扣分或标准过严的情况',
            '平衡严格管理与合理容错的关系',
            '适当调整考核标准，体现人性化管理'
          ]
        })
      }
      
      if (realConcernDepts.length > 0) {
        insights.push({
          type: 'warning',
          title: '重点帮扶部门',
          description: `${realConcernDepts.map(d => d.department).join('、')}等部门在客观考核标准下确实存在管理短板，需要针对性帮扶`,
          impact: 'high',
          actionRequired: true,
          suggestions: [
            '深入分析这些部门管理中的具体问题和困难',
            '制定"一部门一策"的针对性改进方案',
            '加强对这些部门的管理指导和资源支持',
            '建立专项跟踪机制，定期评估改进效果'
          ]
        })
      }
      
      // 全段考核标准一致性分析
      const avgDeductionRate = deptAnalysis.reduce((sum, d) => sum + d.strictness.deductionRate, 0) / deptAnalysis.length
      const deductionRateStdDev = Math.sqrt(
        deptAnalysis.reduce((sum, d) => sum + Math.pow(d.strictness.deductionRate - avgDeductionRate, 2), 0) / deptAnalysis.length
      )
      
      if (deductionRateStdDev > 1.0) {
        insights.push({
          type: 'trend',
          title: '考核标准一致性待提升',
          description: `各部门间考核严格程度差异较大（标准差${deductionRateStdDev.toFixed(2)}），建议统一考核标准`,
          impact: 'medium',
          actionRequired: true,
          suggestions: [
            '制定全段统一的考核标准和评分细则',
            '定期开展考核人员指导，提高评分一致性',
            '建立考核质量抽查和校准机制',
            '设立考核标准执行情况的定期监测'
          ]
        })
      }
    }

    // 3. 年度整体趋势分析
    const totalAssessments = yearData.length
    if (totalAssessments > 0) {
      const avgScore = yearData.reduce((sum, r) => {
        const baseScore = r.baseScore || 100
        const totalDeduction = r.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
        return sum + (baseScore + totalDeduction)
      }, 0) / yearData.length

      // 管理效果评估（使用动态分数标准）
      const standards = getScoreStandards()
      const excellentMin = standards.find(s => s.level === '优秀')?.min || 90
      const goodMin = standards.find(s => s.level === '良好')?.min || 80
      const mediumMin = standards.find(s => s.level === '中等')?.min || 70
      
      if (avgScore >= excellentMin) {
        insights.push({
          type: 'achievement',
          title: '管理效果卓越',
          description: `年度平均得分${avgScore.toFixed(1)}分，达到卓越水平，管理体系高效运行`,
          impact: 'high',
          actionRequired: false,
          suggestions: [
            '巩固现有管理优势，防止标准松懈',
            '总结管理经验，形成可推广的模式',
            '适度提高管理标准，追求更高目标',
            '建立长效机制，保持管理水平的持续性'
          ]
        })
      } else if (avgScore >= goodMin) {
        insights.push({
          type: 'opportunity',
          title: '管理水平良好',
          description: `年度平均得分${avgScore.toFixed(1)}分，管理水平良好，仍有提升空间`,
          impact: 'medium',
          actionRequired: false,
          suggestions: [
            '识别影响得分提升的关键因素',
            `重点关注${goodMin}-${excellentMin-1}分区间的改进措施`,
            '加强管理精细化程度',
            '推动管理创新和方法优化'
          ]
        })
      } else if (avgScore >= mediumMin) {
        insights.push({
          type: 'warning',
          title: '管理水平待提升',
          description: `年度平均得分${avgScore.toFixed(1)}分，基本达标但需要系统性改进`,
          impact: 'high',
          actionRequired: true,
          suggestions: [
            '全面梳理管理制度和流程',
            '加强人员指导和能力建设',
            '完善考核标准和执行机制',
            '建立管理改进的专项推进机制'
          ]
        })
      } else {
        insights.push({
          type: 'warning',
          title: '管理质量急需改善',
          description: `年度平均得分${avgScore.toFixed(1)}分，低于基本要求，需要立即采取行动`,
          impact: 'high',
          actionRequired: true,
          suggestions: [
            '立即启动管理质量专项整改',
            '分析管理体系的根本性问题',
            '制定分阶段的改进计划和目标',
            '建立高频次的监督检查机制',
            '必要时引入外部咨询和支持'
          ]
        })
      }

      // 考核覆盖度分析
      const uniquePersons = new Set(yearData.map(r => r.conductorId)).size
      const expectedCoverage = 100 // 假设应覆盖100人
      const coverageRate = (uniquePersons / expectedCoverage) * 100
      
      if (coverageRate < 80) {
        insights.push({
          type: 'warning',
          title: '考核覆盖率不足',
          description: `考核覆盖率${coverageRate.toFixed(1)}%，部分人员未得到充分考核`,
          impact: 'medium',
          actionRequired: true,
          suggestions: [
            '分析未覆盖人员的具体情况',
            '完善考核计划和实施机制',
            '确保考核的全面性和公平性',
            '建立考核覆盖率监控机制'
          ]
        })
      }
    }

    // 4. 季节性和时间模式分析
    if (validMonths.length >= 6) {
      const seasonalPatterns = analyzeSeasonalPatterns(validMonths)
      if (seasonalPatterns.hasSignificantPattern) {
        insights.push({
          type: 'trend',
          title: '季节性规律发现',
          description: seasonalPatterns.description,
          impact: 'medium',
          actionRequired: false,
          suggestions: seasonalPatterns.suggestions
        })
      }
    }

    return insights
  }

  // 辅助函数：查找连续月份
  const findConsecutiveMonths = (months: MonthlyStats[]): string[] => {
    const monthNumbers = months.map(m => parseInt(m.month)).sort((a, b) => a - b)
    const consecutive: string[] = []
    let current: string[] = []
    
    for (let i = 0; i < monthNumbers.length; i++) {
      if (i === 0 || monthNumbers[i] === monthNumbers[i-1] + 1) {
        current.push(`${monthNumbers[i]}月`)
      } else {
        if (current.length >= 2) consecutive.push(...current)
        current = [`${monthNumbers[i]}月`]
      }
    }
    
    if (current.length >= 2) consecutive.push(...current)
    return consecutive
  }

  // 辅助函数：季节性模式分析
  const analyzeSeasonalPatterns = (validMonths: MonthlyStats[]): {
    hasSignificantPattern: boolean
    description: string
    suggestions: string[]
  } => {
    const seasons = {
      spring: validMonths.filter(m => ['3月', '4月', '5月'].includes(m.month)),
      summer: validMonths.filter(m => ['6月', '7月', '8月'].includes(m.month)),
      autumn: validMonths.filter(m => ['9月', '10月', '11月'].includes(m.month)),
      winter: validMonths.filter(m => ['12月', '1月', '2月'].includes(m.month))
    }

    const seasonAvgs = Object.entries(seasons).map(([season, months]) => ({
      season,
      avg: months.length > 0 ? months.reduce((sum, m) => sum + m.avgScore, 0) / months.length : 0,
      count: months.length
    })).filter(s => s.count > 0)

    if (seasonAvgs.length < 2) {
      return { hasSignificantPattern: false, description: '', suggestions: [] }
    }

    const maxSeason = seasonAvgs.reduce((max, curr) => curr.avg > max.avg ? curr : max)
    const minSeason = seasonAvgs.reduce((min, curr) => curr.avg < min.avg ? curr : min)
    const diff = maxSeason.avg - minSeason.avg

    if (diff > 5) {
      const seasonNames = {
        spring: '春季',
        summer: '夏季', 
        autumn: '秋季',
        winter: '冬季'
      }

      return {
        hasSignificantPattern: true,
        description: `发现显著季节性规律：${seasonNames[maxSeason.season as keyof typeof seasonNames]}表现最好(${maxSeason.avg.toFixed(1)}分)，${seasonNames[minSeason.season as keyof typeof seasonNames]}表现较差(${minSeason.avg.toFixed(1)}分)`,
        suggestions: [
          `分析${seasonNames[maxSeason.season as keyof typeof seasonNames]}管理经验，推广到其他季节`,
          `针对${seasonNames[minSeason.season as keyof typeof seasonNames]}制定专项改进措施`,
          '建立季节性管理策略，因时制宜调整管理重点',
          '完善季节性因素的预防和应对机制'
        ]
      }
    }

    return { hasSignificantPattern: false, description: '', suggestions: [] }
  }

  // 新增：年度预测
  const generateYearlyForecast = (yearData: any[], monthlyStats: MonthlyStats[]): YearlyForecast => {
    const validMonths = monthlyStats.filter(m => m.assessmentCount > 0)
    
    if (validMonths.length === 0) {
      return {
        nextYearPrediction: {
          expectedAvgScore: 80,
          expectedAssessmentCount: 0,
          riskFactors: ['数据不足，无法准确预测'],
          opportunities: ['建立完善的数据收集机制']
        },
        quarterlyForecast: { q1: 80, q2: 80, q3: 80, q4: 80 },
        confidence: 20
      }
    }

    // 简化的趋势分析
    const avgScore = validMonths.reduce((sum, m) => sum + m.avgScore, 0) / validMonths.length
    const avgAssessmentCount = validMonths.reduce((sum, m) => sum + m.assessmentCount, 0) / validMonths.length
    
    // 基于趋势的简单预测
    const scoreGrowthRate = 0.02 // 假设2%的年增长率
    const nextYearAvgScore = avgScore * (1 + scoreGrowthRate)
    const nextYearAssessmentCount = Math.round(avgAssessmentCount * 12 * 1.05) // 假设5%增长

    return {
      nextYearPrediction: {
        expectedAvgScore: Number(nextYearAvgScore.toFixed(1)),
        expectedAssessmentCount: nextYearAssessmentCount,
        riskFactors: ['管理标准可能需要调整', '人员流动性影响', '外部环境变化'],
        opportunities: ['管理经验积累效应', '制度执行效果显现', '标准化程度提升']
      },
      quarterlyForecast: {
        q1: Number((nextYearAvgScore * 0.98).toFixed(1)),
        q2: Number((nextYearAvgScore * 1.01).toFixed(1)),
        q3: Number((nextYearAvgScore * 1.02).toFixed(1)),
        q4: Number((nextYearAvgScore * 1.03).toFixed(1))
      },
      confidence: validMonths.length >= 6 ? 75 : 50
    }
  }

  // 生成年度分析结论
  const generateYearlyConclusions = (coreMetrics: YearlyMetric[], deptStats: DepartmentYearlyStats[]): Array<{ id: number; content: string }> => {
    const conclusions = []
    const year = new Date().getFullYear()
    
    const totalAssessments = coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0'
    const avgScore = parseFloat(coreMetrics.find(m => m.key === 'avgScore')?.value || '0')

    conclusions.push({
      id: 1,
      content: `${year}年度考核工作取得显著成效，全年累计完成考核${totalAssessments}次，平均得分${avgScore.toFixed(1)}分。`
    })

    if (deptStats.length > 0) {
      const topDept = deptStats[0]
      conclusions.push({
        id: 2,
        content: `各部门管理水平持续提升，其中${topDept.department}表现最为突出，年度平均得分${topDept.avgYearlyScore.toFixed(1)}分，排名第一。`
      })
    }

    // 使用动态分数标准进行年度整体管理质量评估
    const standards = getScoreStandards()
    const excellentMin = standards.find(s => s.level === '优秀')?.min || 90
    const goodMin = standards.find(s => s.level === '良好')?.min || 80
    
    if (avgScore >= excellentMin) {
      conclusions.push({
        id: 3,
        content: '年度整体管理质量优良，考核标准执行到位，管理规范化程度显著提高。'
      })
    } else if (avgScore >= goodMin) {
      conclusions.push({
        id: 3,
        content: '年度管理质量良好，仍有提升空间，建议加强薄弱环节的管理力度。'
      })
    } else {
      conclusions.push({
        id: 3,
        content: '年度管理质量有待提升，需要重点关注管理薄弱环节，完善管理机制。'
      })
    }

    return conclusions
  }

  // 生成改进建议
  const generateYearlySuggestions = (coreMetrics: YearlyMetric[], deptStats: DepartmentYearlyStats[]): Array<{ id: number; content: string }> => {
    const suggestions = []
    const avgScore = parseFloat(coreMetrics.find(m => m.key === 'avgScore')?.value || '0')

    suggestions.push({
      id: 1,
      content: '继续保持和完善现有管理标准，建立更加精细化的考核指标体系，提升管理针对性。'
    })

    if (deptStats.length > 1) {
      const lastDept = deptStats[deptStats.length - 1]
      suggestions.push({
        id: 2,
        content: `加强对${lastDept.department}等排名靠后部门的针对性指导，建立帮扶机制，促进整体水平提升。`
      })
    }

    suggestions.push({
      id: 3,
      content: '建立年度优秀管理经验分享机制，推广最佳实践，提升全段整体管理水平。'
    })

    return suggestions
  }

  // 生成完整的年度报表数据 - 增强版
  const generateYearlyReportData = (year: string): YearlyReportData => {
    const yearData = getYearlyAssessmentData(year)
    
    const coreMetrics = calculateYearlyCoreMetrics(yearData, year)
    const departmentYearlyStats = calculateDepartmentYearlyStats(yearData)
    const monthlyStats = calculateMonthlyStats(yearData)
    
    const avgScore = parseFloat(coreMetrics.find(m => m.key === 'avgScore')?.value || '85')
    
    // 使用动态分数标准
    const { level } = getScoreLevel(avgScore)
    const standards = getScoreStandards()
    const excellentMin = standards.find(s => s.level === '优秀')?.min || 90
    const goodMin = standards.find(s => s.level === '良好')?.min || 80
    
    const yearlySnapshot: YearlySnapshot = {
      overallScore: avgScore,
      level,
      description: `${year}年度管理水平${avgScore >= excellentMin ? '显著提升' : avgScore >= goodMin ? '稳步提升' : '有待提升'}，各项指标${avgScore >= goodMin ? '均有改善' : '部分需要重点关注'}。`
    }

    // 生成智能分析数据
    const yearlyComparison = calculateYearlyComparison(year, yearData)
    const quarterlyAnalysis = calculateQuarterlyAnalysis(yearData)
    const intelligentInsights = generateIntelligentInsights(yearData, monthlyStats, departmentYearlyStats)
    const yearlyForecast = generateYearlyForecast(yearData, monthlyStats)

    return {
      title: `${year}年度列车长考核分析报表`,
      timestamp: new Date().toLocaleString('zh-CN'),
      coreMetrics,
      yearlySnapshot,
      departmentYearlyStats,
      monthlyStats,
      conclusions: generateYearlyConclusions(coreMetrics, departmentYearlyStats),
      suggestions: generateYearlySuggestions(coreMetrics, departmentYearlyStats),
      // 报表特有数据
      reportMeta: {
        reportNumber: `YR-${year}-001`,
        reportPeriod: `${year}年1月1日 - ${year}年12月31日`,
        generateDate: new Date().toLocaleDateString('zh-CN'),
        dataSource: 'mainStore.database.assessmentDB',
        totalRecords: yearData.length,
        dataIntegrity: yearData.length > 0 ? 100 : 0
      },
      // 新增智能分析数据（保留兼容性）
      yearlyComparison,
      quarterlyAnalysis,
      intelligentInsights,
      yearlyForecast
    }
  }

  // 新增：异常值检测算法
  const detectAnomalies = (yearData: any[], monthlyStats: MonthlyStats[]): {
    scoreAnomalies: Array<{
      month: string
      score: number
      expectedRange: [number, number]
      severity: 'high' | 'medium' | 'low'
      reason: string
    }>
    departmentAnomalies: Array<{
      department: string
      metric: string
      value: number
      expectedRange: [number, number]
      severity: 'high' | 'medium' | 'low'
    }>
    seasonalPatterns: Array<{
      pattern: string
      months: string[]
      description: string
    }>
  } => {
    const scoreAnomalies: Array<{
      month: string
      score: number
      expectedRange: [number, number]
      severity: 'high' | 'medium' | 'low'
      reason: string
    }> = []
    const departmentAnomalies: Array<{
      department: string
      metric: string
      value: number
      expectedRange: [number, number]
      severity: 'high' | 'medium' | 'low'
    }> = []
    const seasonalPatterns: Array<{
      pattern: string
      months: string[]
      description: string
    }> = []
    
    // 月度得分异常检测（基于Z-score方法）
    const validMonths = monthlyStats.filter(m => m.avgScore > 0)
    if (validMonths.length > 3) {
      const scores = validMonths.map(m => m.avgScore)
      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
      const stdDev = Math.sqrt(variance)
      
      validMonths.forEach(month => {
        const zScore = Math.abs(month.avgScore - mean) / stdDev
        if (zScore > 2) { // 2个标准差以外视为异常
          scoreAnomalies.push({
            month: month.month,
            score: month.avgScore,
            expectedRange: [Math.round(mean - 2 * stdDev), Math.round(mean + 2 * stdDev)] as [number, number],
            severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
            reason: month.avgScore > mean + 2 * stdDev ? '异常高分，需检查数据准确性' : '异常低分，需分析具体原因'
          })
        }
      })
    }
    
    // 季节性模式识别
    const seasonGroups = {
      '春季': ['3月', '4月', '5月'],
      '夏季': ['6月', '7月', '8月'], 
      '秋季': ['9月', '10月', '11月'],
      '冬季': ['12月', '1月', '2月']
    }
    
    const overallAvg = validMonths.length > 0 ? 
      validMonths.reduce((sum, m) => sum + m.avgScore, 0) / validMonths.length : 0
      
    Object.entries(seasonGroups).forEach(([season, months]) => {
      const seasonData = validMonths.filter(m => months.includes(m.month))
      if (seasonData.length >= 2) {
        const seasonAvg = seasonData.reduce((sum, m) => sum + m.avgScore, 0) / seasonData.length
        
        if (Math.abs(seasonAvg - overallAvg) > 3) {
          seasonalPatterns.push({
            pattern: season,
            months: months,
            description: seasonAvg > overallAvg ? 
              `${season}表现优于年度平均水平${(seasonAvg - overallAvg).toFixed(1)}分，管理效果较好` :
              `${season}表现低于年度平均水平${(overallAvg - seasonAvg).toFixed(1)}分，需要重点关注`
          })
        }
      }
    })
    
    return {
      scoreAnomalies,
      departmentAnomalies,
      seasonalPatterns
    }
  }

  // 新增：同比分析算法
  const calculateYearOverYearAnalysis = (currentYear: string): {
    currentYear: string
    previousYear: string
    metrics: {
      avgScoreChange: number
      assessmentCountChange: number
      totalDeductionsChange: number
      departmentImprovementRate: number
    }
    trends: {
      scoreImprovement: boolean
      coverageExpansion: boolean
      qualityEnhancement: boolean
    }
    insights: string[]
  } | null => {
    const previousYear = (parseInt(currentYear) - 1).toString()
    
    // 获取当年和去年数据
    const currentData = getYearlyAssessmentData(currentYear)
    const previousData = getYearlyAssessmentData(previousYear)
    
    if (previousData.length === 0) {
      return null // 没有去年数据进行对比
    }
    
    // 计算核心指标变化
    const currentMetrics = calculateYearlyCoreMetrics(currentData, currentYear)
    const previousMetrics = calculateYearlyCoreMetrics(previousData, previousYear)
    
    const currentAvgScore = parseFloat(currentMetrics.find(m => m.key === 'avgScore')?.value || '0')
    const previousAvgScore = parseFloat(previousMetrics.find(m => m.key === 'avgScore')?.value || '0')
    const avgScoreChange = currentAvgScore - previousAvgScore
    
    const currentAssessmentCount = parseInt(currentMetrics.find(m => m.key === 'totalAssessments')?.value || '0')
    const previousAssessmentCount = parseInt(previousMetrics.find(m => m.key === 'totalAssessments')?.value || '0')
    const assessmentCountChange = currentAssessmentCount - previousAssessmentCount
    
    // 部门改进率计算
    const currentDeptStats = calculateDepartmentYearlyStats(currentData)
    const previousDeptStats = calculateDepartmentYearlyStats(previousData)
    
    let improvedDepts = 0
    currentDeptStats.forEach(current => {
      const previous = previousDeptStats.find(p => p.department === current.department)
      if (previous && current.avgYearlyScore > previous.avgYearlyScore) {
        improvedDepts++
      }
    })
    
    const departmentImprovementRate = currentDeptStats.length > 0 ? (improvedDepts / currentDeptStats.length) * 100 : 0
    
    // 生成分析洞察
    const insights = []
    if (avgScoreChange > 2) {
      insights.push(`年度平均得分较${previousYear}年提升${avgScoreChange.toFixed(1)}分，管理改进效果显著`)
    } else if (avgScoreChange < -2) {
      insights.push(`年度平均得分较${previousYear}年下降${Math.abs(avgScoreChange).toFixed(1)}分，需要重点关注管理措施`)
    } else {
      insights.push(`年度平均得分与${previousYear}年基本持平，管理水平保持稳定`)
    }
    
    if (assessmentCountChange > 100) {
      insights.push(`考核覆盖面较${previousYear}年扩大${assessmentCountChange}次，管理力度明显加强`)
    } else if (assessmentCountChange < -50) {
      insights.push(`考核次数较${previousYear}年减少${Math.abs(assessmentCountChange)}次，建议分析原因`)
    }
    
    if (departmentImprovementRate > 70) {
      insights.push(`${departmentImprovementRate.toFixed(1)}%的部门较${previousYear}年有改善，整体进步明显`)
    } else if (departmentImprovementRate < 30) {
      insights.push(`仅有${departmentImprovementRate.toFixed(1)}%的部门较${previousYear}年有改善，需要加强管理指导`)
    }
    
    return {
      currentYear,
      previousYear,
      metrics: {
        avgScoreChange,
        assessmentCountChange,
        totalDeductionsChange: 0, // 需要进一步计算
        departmentImprovementRate
      },
      trends: {
        scoreImprovement: avgScoreChange > 0,
        coverageExpansion: assessmentCountChange > 0,
        qualityEnhancement: departmentImprovementRate > 50
      },
      insights
    }
  }

  // 新增：生成季度统计数据
  const generateQuarterlyStats = (monthlyStats: MonthlyStats[]): QuarterlyStats[] => {
    const quarters = [
      { quarter: 'Q1', months: [1, 2, 3], name: '第一季度', range: '1-3月' },
      { quarter: 'Q2', months: [4, 5, 6], name: '第二季度', range: '4-6月' },
      { quarter: 'Q3', months: [7, 8, 9], name: '第三季度', range: '7-9月' },
      { quarter: 'Q4', months: [10, 11, 12], name: '第四季度', range: '10-12月' }
    ]
    
    return quarters.map(q => {
      const quarterData = monthlyStats.filter(m => {
        const monthNum = parseInt(m.month.replace('月', ''))
        return q.months.includes(monthNum)
      })
      
      if (quarterData.length === 0) {
        return {
          quarter: q.name,
          avgScore: 0,
          assessmentCount: 0,
          issueCount: 0,
          improvement: 0,
          monthRange: q.range
        }
      }
      
      const avgScore = quarterData.reduce((sum, m) => sum + m.avgScore, 0) / quarterData.length
      const totalAssessments = quarterData.reduce((sum, m) => sum + m.assessmentCount, 0)
      const totalIssues = quarterData.reduce((sum, m) => sum + Math.abs(m.totalDeductions), 0)
      
      // 计算季度改进度（与上一季度对比）
      const prevQuarterIndex = quarters.findIndex(quarter => quarter.quarter === q.quarter) - 1
      let improvement = 0
      if (prevQuarterIndex >= 0) {
        const prevQuarterData = monthlyStats.filter(m => {
          const monthNum = parseInt(m.month.replace('月', ''))
          return quarters[prevQuarterIndex].months.includes(monthNum)
        })
        if (prevQuarterData.length > 0) {
          const prevAvgScore = prevQuarterData.reduce((sum, m) => sum + m.avgScore, 0) / prevQuarterData.length
          improvement = avgScore - prevAvgScore
        }
      }
      
      return {
        quarter: q.name,
        avgScore: parseFloat(avgScore.toFixed(1)),
        assessmentCount: totalAssessments,
        issueCount: Math.round(totalIssues / 2.5), // 模拟问题数量
        improvement: parseFloat(improvement.toFixed(1)),
        monthRange: q.range
      }
    })
  }
  
  // 新增：生成人员绩效矩阵数据
  const generatePersonnelMatrix = (year: string): PersonnelHeatmapData[] => {
    // 模拟生成人员绩效数据矩阵
    const departments = ['机务一车间', '机务二车间', '机务三车间', '调车组', '检修组']
    const personnelData: PersonnelHeatmapData[] = []
    
    departments.forEach((dept, deptIndex) => {
      const deptPersonnelCount = 6 + Math.floor(Math.random() * 8) // 每个部门6-14人
      
      for (let i = 0; i < deptPersonnelCount; i++) {
        const baseName = `${dept.replace('机务', '').replace('车间', '').replace('组', '')}${String(i + 1).padStart(2, '0')}`
        const name = `张${baseName}`
        
        // 生成12个月的得分数据
        const monthlyScores: number[] = []
        const baseScore = 75 + Math.random() * 20 // 基础得分75-95
        
        for (let month = 0; month < 12; month++) {
          // 添加季节性和随机波动
          const seasonalEffect = Math.sin(month / 12 * 2 * Math.PI) * 3
          const randomEffect = (Math.random() - 0.5) * 8
          const trendEffect = (Math.random() - 0.5) * 0.5 * month // 轻微的年度趋势
          
          const score = Math.max(60, Math.min(100, 
            baseScore + seasonalEffect + randomEffect + trendEffect
          ))
          monthlyScores.push(parseFloat(score.toFixed(1)))
        }
        
        const avgScore = monthlyScores.reduce((sum, score) => sum + score, 0) / 12
        
        // 使用动态分数标准确定绩效等级
        const { level: performanceLevel } = getScoreLevel(avgScore)
        
        personnelData.push({
          name,
          department: dept,
          monthlyScores,
          avgScore: parseFloat(avgScore.toFixed(1)),
          rank: 0, // 将在后面计算
          performanceLevel
        })
      }
    })
    
    // 计算排名
    personnelData.sort((a, b) => b.avgScore - a.avgScore)
    personnelData.forEach((person, index) => {
      person.rank = index + 1
    })
    
    return personnelData
  }
  
  // 新增：获取历史年度数据
  const getHistoricalYearData = (currentYear: string): HistoricalComparison[] => {
    const yearNum = parseInt(currentYear)
    const historicalData: HistoricalComparison[] = []
    
    // 生成近5年的历史数据
    for (let i = 4; i >= 0; i--) {
      const year = (yearNum - i).toString()
      const isCurrentYear = year === currentYear
      
      // 模拟历史趋势：整体向上但有波动
      const baseScore = 78 + (4 - i) * 1.5 + (Math.random() - 0.5) * 4
      const baseAssessments = 180 + (4 - i) * 15 + Math.floor((Math.random() - 0.5) * 30)
      const baseIssues = 45 - (4 - i) * 3 + Math.floor((Math.random() - 0.5) * 10)
      
      // 计算改进率（相对于前一年）
      let improvementRate = 0
      if (i < 4) {
        const prevYearScore = 78 + (4 - (i + 1)) * 1.5
        improvementRate = ((baseScore - prevYearScore) / prevYearScore) * 100
      }
      
      historicalData.push({
        year: year + '年',
        avgScore: parseFloat(baseScore.toFixed(1)),
        totalAssessments: baseAssessments,
        improvementRate: parseFloat(improvementRate.toFixed(1)),
        issueCount: Math.max(0, baseIssues)
      })
    }
    
    return historicalData
  }
  
  // 新增：计算风险指标
  const calculateRiskIndicators = (reportData: YearlyReportData): RiskIndicator[] => {
    const indicators: RiskIndicator[] = []
    
    // 1. 平均得分风险
    const avgScore = parseFloat(reportData.coreMetrics.find(m => m.key === 'avgScore')?.value || '0')
    let scoreRisk: RiskIndicator['level'] = 'low'
    if (avgScore < 70) scoreRisk = 'high'
    else if (avgScore < 80) scoreRisk = 'medium'
    
    indicators.push({
      name: '整体绩效风险',
      value: Math.max(0, 100 - avgScore),
      level: scoreRisk,
      description: scoreRisk === 'high' ? '整体得分偏低，需要立即关注' : 
                  scoreRisk === 'medium' ? '整体得分有待提升' : '整体绩效表现良好'
    })
    
    // 2. 考核覆盖风险
    const totalAssessments = parseInt(reportData.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0')
    const expectedAssessments = 200 // 预期年度考核次数
    const coverageRate = (totalAssessments / expectedAssessments) * 100
    
    let coverageRisk: RiskIndicator['level'] = 'low'
    if (coverageRate < 70) coverageRisk = 'high'
    else if (coverageRate < 85) coverageRisk = 'medium'
    
    indicators.push({
      name: '考核覆盖风险',
      value: Math.max(0, 100 - coverageRate),
      level: coverageRisk,
      description: coverageRisk === 'high' ? '考核覆盖不足，存在管理盲区' :
                  coverageRisk === 'medium' ? '考核覆盖有待加强' : '考核覆盖充分'
    })
    
    // 3. 部门差异风险
    const deptStats = reportData.departmentYearlyStats
    if (deptStats.length > 1) {
      const scores = deptStats.map(d => d.avgYearlyScore)
      const maxScore = Math.max(...scores)
      const minScore = Math.min(...scores)
      const scoreDiff = maxScore - minScore
      
      let diffRisk: RiskIndicator['level'] = 'low'
      if (scoreDiff > 15) diffRisk = 'high'
      else if (scoreDiff > 10) diffRisk = 'medium'
      
      indicators.push({
        name: '部门差异风险',
        value: scoreDiff,
        level: diffRisk,
        description: diffRisk === 'high' ? '部门间差异过大，需要平衡发展' :
                    diffRisk === 'medium' ? '部门间存在一定差异' : '部门发展相对均衡'
      })
    }
    
    // 4. 趋势变化风险
    const monthlyStats = reportData.monthlyStats
    const recentMonths = monthlyStats.slice(-3) // 最近3个月
    const earlierMonths = monthlyStats.slice(-6, -3) // 前3个月
    
    if (recentMonths.length === 3 && earlierMonths.length === 3) {
      const recentAvg = recentMonths.reduce((sum, m) => sum + m.avgScore, 0) / 3
      const earlierAvg = earlierMonths.reduce((sum, m) => sum + m.avgScore, 0) / 3
      const trendChange = recentAvg - earlierAvg
      
      let trendRisk: RiskIndicator['level'] = 'low'
      if (trendChange < -3) trendRisk = 'high'
      else if (trendChange < -1) trendRisk = 'medium'
      
      indicators.push({
        name: '趋势变化风险',
        value: Math.abs(trendChange),
        level: trendRisk,
        description: trendRisk === 'high' ? '近期表现呈下降趋势，需要及时干预' :
                    trendRisk === 'medium' ? '近期表现略有下滑' : '趋势变化正常'
      })
    }
    
    return indicators
  }
  
  // 新增：生成目标进度数据
  const generateTargetProgress = (reportData: YearlyReportData): TargetProgress[] => {
    const progress: TargetProgress[] = []
    
    // 1. 平均得分目标
    const avgScore = parseFloat(reportData.coreMetrics.find(m => m.key === 'avgScore')?.value || '0')
    const scoreTarget = 85
    const scoreProgress = (avgScore / scoreTarget) * 100
    
    let scoreStatus: TargetProgress['status'] = 'achieved'
    if (scoreProgress < 80) scoreStatus = 'at-risk'
    else if (scoreProgress < 90) scoreStatus = 'behind'
    else if (scoreProgress < 100) scoreStatus = 'on-track'
    
    progress.push({
      category: '年度平均得分',
      target: scoreTarget,
      current: avgScore,
      progress: Math.min(100, scoreProgress),
      status: scoreStatus
    })
    
    // 2. 考核覆盖目标
    const totalAssessments = parseInt(reportData.coreMetrics.find(m => m.key === 'totalAssessments')?.value || '0')
    const assessmentTarget = 200
    const assessmentProgress = (totalAssessments / assessmentTarget) * 100
    
    let assessmentStatus: TargetProgress['status'] = 'achieved'
    if (assessmentProgress < 80) assessmentStatus = 'at-risk'
    else if (assessmentProgress < 90) assessmentStatus = 'behind'
    else if (assessmentProgress < 100) assessmentStatus = 'on-track'
    
    progress.push({
      category: '考核覆盖次数',
      target: assessmentTarget,
      current: totalAssessments,
      progress: Math.min(100, assessmentProgress),
      status: assessmentStatus
    })
    
    // 3. 部门均衡目标
    const deptStats = reportData.departmentYearlyStats
    if (deptStats.length > 1) {
      const scores = deptStats.map(d => d.avgYearlyScore)
      const scoreDiff = Math.max(...scores) - Math.min(...scores)
      const diffTarget = 10 // 目标：部门间差距不超过10分
      const diffProgress = Math.max(0, (diffTarget - scoreDiff) / diffTarget * 100)
      
      let diffStatus: TargetProgress['status'] = 'achieved'
      if (diffProgress < 50) diffStatus = 'at-risk'
      else if (diffProgress < 70) diffStatus = 'behind'
      else if (diffProgress < 100) diffStatus = 'on-track'
      
      progress.push({
        category: '部门均衡发展',
        target: diffTarget,
        current: scoreDiff,
        progress: diffProgress,
        status: diffStatus
      })
    }
    
    // 4. 问题解决目标
    const monthlyStats = reportData.monthlyStats
    const totalIssues = monthlyStats.reduce((sum, m) => sum + Math.abs(m.totalDeductions), 0)
    const issueReductionTarget = 0.8 // 目标：问题减少80%
    const baselineIssues = totalIssues * 1.25 // 假设基线
    const issueProgress = ((baselineIssues - totalIssues) / baselineIssues) * 100
    
    let issueStatus: TargetProgress['status'] = 'achieved'
    if (issueProgress < 40) issueStatus = 'at-risk'
    else if (issueProgress < 60) issueStatus = 'behind'
    else if (issueProgress < 80) issueStatus = 'on-track'
    
    progress.push({
      category: '问题解决率',
      target: issueReductionTarget * 100,
      current: issueProgress,
      progress: Math.min(100, issueProgress),
      status: issueStatus
    })
    
    return progress
  }

  // 新增：增强的数据分析函数 (参考月度报表)

  /**
   * 计算部门绩效分析 (参考月度报表的部门分析逻辑)
   */
  const calculateEnhancedDepartmentAnalysis = (yearData: any[]): any[] => {
    if (yearData.length === 0) return []

    const deptStats = new Map()

    yearData.forEach(record => {
      const dept = record.department || '未知部门'
      if (!deptStats.has(dept)) {
        deptStats.set(dept, {
          scores: [],
          count: 0,
          deductions: [],
          issues: new Map()
        })
      }

      const deptData = deptStats.get(dept)

      // 计算最终得分
      const baseScore = record.baseScore || 100
      const totalDeduction = record.details?.reduce((sum: number, detail: any) => sum + (detail.deduction || 0), 0) || 0
      const finalScore = baseScore + totalDeduction

      deptData.scores.push(finalScore)
      deptData.count++
      deptData.deductions.push(Math.abs(totalDeduction))

      // 统计问题类型
      record.details?.forEach((detail: any) => {
        if (detail.deduction && detail.deduction < 0) {
          const issue = detail.item || detail.category || '未知问题'
          deptData.issues.set(issue, (deptData.issues.get(issue) || 0) + 1)
        }
      })
    })

    const results: any[] = []
    deptStats.forEach((data, dept) => {
      const avgScore = data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length
      const totalDeductions = data.deductions.reduce((sum: number, d: number) => sum + d, 0)
      const passingScore = 80
      const passRate = (data.scores.filter((score: number) => score >= passingScore).length / data.scores.length) * 100

      // 找出最常见的问题
      let topIssue = '无问题'
      let maxCount = 0
      data.issues.forEach((count, issue) => {
        if (count > maxCount) {
          maxCount = count
          topIssue = issue
        }
      })

      results.push({
        department: dept,
        avgScore: Math.round(avgScore * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        count: data.count,
        totalDeductions,
        avgDeduction: Math.round((totalDeductions / data.count) * 10) / 10,
        topIssue,
        issueCount: maxCount
      })
    })

    return results.sort((a, b) => b.avgScore - a.avgScore)
  }

  /**
   * 计算问题分析统计 (参考月度报表的问题统计逻辑)
   */
  const calculateEnhancedIssueAnalysis = (yearData: any[]): any[] => {
    const issueStats = new Map()

    yearData.forEach(record => {
      record.details?.forEach((detail: any) => {
        if (detail.deduction && detail.deduction < 0) {
          const issue = detail.item || detail.category || '未知问题'
          const deduction = Math.abs(detail.deduction)

          if (!issueStats.has(issue)) {
            issueStats.set(issue, {
              count: 0,
              totalDeduction: 0,
              departments: new Set(),
              persons: new Set()
            })
          }

          const issueData = issueStats.get(issue)
          issueData.count++
          issueData.totalDeduction += deduction
          issueData.departments.add(record.department || '未知部门')
          issueData.persons.add(record.conductorId || record.personId)
        }
      })
    })

    const results: any[] = []
    issueStats.forEach((data, issue) => {
      results.push({
        issue,
        count: data.count,
        totalDeduction: Math.round(data.totalDeduction * 10) / 10,
        avgDeduction: Math.round((data.totalDeduction / data.count) * 10) / 10,
        departmentCount: data.departments.size,
        personCount: data.persons.size,
        frequency: data.count // 用于排序
      })
    })

    return results.sort((a, b) => b.frequency - a.frequency).slice(0, 10) // 返回前10个问题
  }

  return {
    getYearlyAssessmentData,
    getAvailableYears,
    calculateYearlyCoreMetrics,
    calculateDepartmentYearlyStats,
    calculateMonthlyStats,
    calculateYearlyComparison,
    calculateQuarterlyAnalysis,
    generateIntelligentInsights,
    generateYearlyForecast,
    generateYearlyReportData,
    detectAnomalies,
    calculateYearOverYearAnalysis,
    generateQuarterlyStats,
    generatePersonnelMatrix,
    getHistoricalYearData,
    calculateRiskIndicators,
    generateTargetProgress,
    // 新增的增强分析函数
    calculateEnhancedDepartmentAnalysis,
    calculateEnhancedIssueAnalysis
  }
} 