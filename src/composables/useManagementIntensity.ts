/**
 * 车队管理力度计算 Composable
 * 基于人均扣分的管理力度分析核心算法
 * 
 * @author 列车长考核系统
 * @version 1.0.0
 */

import { ref, computed } from 'vue'
import { useMainStore } from '@/stores'
import { getMaxScoreLimit } from '@/utils/scoreStandards'
import { determineCategory } from '@/utils/department'

export interface ManagementIntensityResult {
  success: boolean
  error?: string
  message?: string
  month?: string
  onDutyCount: number
  assessmentCount?: number
  officeDeductions?: number
  teamDeductions?: number
  officeAvgDeduction?: number
  teamAvgDeduction?: number
  intensityIndex?: number
  intensityRatio?: number
  managementLevel?: ManagementLevel
}

export interface ManagementLevel {
  level: string
  color: string
  bgColor: string
  description: string
  suggestion: string
}

export function useManagementIntensity() {
  const mainStore = useMainStore()
  const loading = ref(false)

  /**
   * 获取当月在岗列车长人数
   */
  const getOnDutyConductorCount = (month: string): number => {
    try {
      console.log(`获取${month}在岗人数...`)
      
      // 检查数据是否存在
      if (!mainStore.monthlyData || mainStore.monthlyData.length === 0) {
        console.warn('月度数据为空')
        console.log('可用的月度数据:', mainStore.monthlyData)
        return 0
      }
      
      // 打印可用的月度数据用于调试
      console.log('可用的月度数据月份:', mainStore.monthlyData.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`))
      
      // 将YYYY-MM格式转换为数据库中使用的格式
      const [year, monthNum] = month.split('-')
      
      // 从月度数据中获取在岗人数
      const monthlyData = mainStore.monthlyData.find(m => 
        m.year === parseInt(year) && m.month === parseInt(monthNum)
      )
      
      if (!monthlyData) {
        console.warn(`未找到${month}的月度数据`)
        // 如果没有找到，尝试使用最新的可用数据作为备用
        if (mainStore.monthlyData.length > 0) {
          const latestData = mainStore.monthlyData[mainStore.monthlyData.length - 1]
          console.log(`使用最新可用数据：${latestData.year}-${latestData.month}`)
          const backupOnDutyCount = latestData.data.filter(conductor => 
            conductor.isActive === true && conductor.status === '在岗'
          ).length
          console.log(`备用在岗人数：${backupOnDutyCount}`)
          return backupOnDutyCount
        }
        return 0
      }
      
      // 统计在岗列车长人数
      const onDutyCount = monthlyData.data.filter(conductor => 
        conductor.isActive === true && conductor.status === '在岗'
      ).length
      
      console.log(`${month}在岗列车长人数：${onDutyCount}`)
      return onDutyCount
      
    } catch (error) {
      console.error('获取在岗人数时发生错误:', error)
      return 0
    }
  }

  /**
   * 判断考核部门类型
   */
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

  /**
   * 计算指定部门类型的总扣分
   */
  const calculateTotalDeductions = (assessmentData: any[], deptType: string): number => {
    if (!Array.isArray(assessmentData)) {
      console.warn('考核数据不是数组格式')
      return 0
    }

    const totalDeductions = assessmentData
      .filter(record => {
        const assessorType = getDeptType(record.assessorDepartmentName || record.assessorDepartment)
        return assessorType === deptType
      })
      .reduce((sum, record) => {
        // 处理扣分数据，取绝对值确保为正数
        const deduction = Math.abs(record.totalScore || record.totalDeduction || 0)
        return sum + deduction
      }, 0)

    console.log(`${deptType}总扣分：${totalDeductions}分`)
    return totalDeductions
  }

  /**
   * 获取指定月份的考核数据
   */
  const getAssessmentData = (month: string): any[] => {
    try {
      // 检查数据库
      if (!mainStore.database?.assessmentDB) {
        console.warn('考核数据库不存在')
        return []
      }

      // 打印可用的考核数据月份用于调试
      const availableMonths = Object.keys(mainStore.database.assessmentDB)
      console.log('可用的考核数据月份:', availableMonths)

      // 获取考核数据（使用YYYY-MM格式作为键）
      const assessmentData = mainStore.database.assessmentDB[month]
      if (!assessmentData || !Array.isArray(assessmentData)) {
        console.warn(`未找到${month}的考核数据`)
        
        // 如果没有找到，尝试使用最新的可用数据作为备用
        if (availableMonths.length > 0) {
          const latestMonth = availableMonths.sort().reverse()[0] // 获取最新月份
          console.log(`使用最新可用考核数据：${latestMonth}`)
          const backupData = mainStore.database.assessmentDB[latestMonth]
          if (backupData && Array.isArray(backupData)) {
            console.log(`备用考核记录数：${backupData.length}条`)
            return backupData
          }
        }
        return []
      }

      console.log(`${month}考核记录数：${assessmentData.length}条`)
      return assessmentData

    } catch (error) {
      console.error('获取考核数据时发生错误:', error)
      return []
    }
  }

  /**
   * 获取管理力度等级评估（基于动态分数标准）
   */
  const getManagementLevel = (index: number): ManagementLevel => {
    const maxScore = getMaxScoreLimit()
    
    // 计算相对百分比阈值
    const threshold1 = maxScore * 0.8  // 80%
    const threshold2 = maxScore * 0.6  // 60%
    const threshold3 = maxScore * 0.4  // 40%
    
    if (index >= threshold1) {
      return {
        level: '充足',
        color: '#22c55e',
        bgColor: '#dcfce7',
        description: '车队管理力度充足，与科室要求基本一致',
        suggestion: '继续保持当前管理标准'
      }
    } else if (index >= threshold2) {
      return {
        level: '适中',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        description: '车队管理力度适中，需要持续关注和改进',
        suggestion: '适当提高车队考核标准，向科室标准看齐'
      }
    } else if (index >= threshold3) {
      return {
        level: '不足',
        color: '#ef4444',
        bgColor: '#fee2e2',
        description: '车队管理力度明显不足，需要加强管理',
        suggestion: '加强车队日常考核，提高考核频次和严格程度'
      }
    } else {
      return {
        level: '严重不足',
        color: '#dc2626',
        bgColor: '#fecaca',
        description: '车队管理力度严重不足，急需重点整改',
        suggestion: '立即建立严格的车队考核制度，与科室标准统一'
      }
    }
  }

  /**
   * 计算管理力度指数（核心算法）
   */
  const calculateManagementIntensityIndex = (month: string): ManagementIntensityResult => {
    try {
      console.log(`开始计算${month}的管理力度指数...`)

      // 获取数据库中可用的月份信息用于错误提示
      const availableMonths = {
        monthly: mainStore.monthlyData?.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`) || [],
        assessment: Object.keys(mainStore.database?.assessmentDB || {})
      }

      // 1. 获取当月在岗列车长总人数
      const onDutyCount = getOnDutyConductorCount(month)
      if (onDutyCount === 0) {
        return {
          success: false,
          error: 'data_missing',
          message: `未找到${month}的月度数据。可用月份：${availableMonths.monthly.join(', ') || '无'}`,
          onDutyCount: 0
        }
      }

      // 2. 获取当月考核数据
      const assessmentData = getAssessmentData(month)
      if (assessmentData.length === 0) {
        return {
          success: false,
          error: 'assessment_missing',
          message: `未找到${month}的考核记录。可用月份：${availableMonths.assessment.join(', ') || '无'}`,
          onDutyCount
        }
      }

      // 3. 计算科室和车队的总扣分
      const officeDeductions = calculateTotalDeductions(assessmentData, '科室')
      const teamDeductions = calculateTotalDeductions(assessmentData, '车队')

      // 4. 计算人均扣分
      const officeAvgDeduction = officeDeductions / onDutyCount
      const teamAvgDeduction = teamDeductions / onDutyCount

      // 5. 计算管理力度指数
      let intensityIndex = 0
      let intensityRatio = 0
      
      const maxScore = getMaxScoreLimit()
      
      if (officeAvgDeduction > 0) {
        intensityRatio = teamAvgDeduction / officeAvgDeduction
        // 使用动态最高分数，而不是固定的100分
        intensityIndex = Math.min(intensityRatio * maxScore, maxScore)
      } else if (teamAvgDeduction === 0) {
        // 如果两者都为0，说明管理优秀
        intensityIndex = maxScore
        intensityRatio = 1
      } else {
        // 科室无扣分但车队有扣分，说明管理过度严格
        intensityIndex = maxScore
        intensityRatio = 1
      }

      // 6. 评估管理等级
      const managementLevel = getManagementLevel(intensityIndex)

      // 7. 组装结果
      const result: ManagementIntensityResult = {
        success: true,
        month,
        onDutyCount,
        assessmentCount: assessmentData.length,
        officeDeductions: Math.round(officeDeductions * 100) / 100,
        teamDeductions: Math.round(teamDeductions * 100) / 100,
        officeAvgDeduction: Math.round(officeAvgDeduction * 100) / 100,
        teamAvgDeduction: Math.round(teamAvgDeduction * 100) / 100,
        intensityIndex: Math.round(intensityIndex * 100) / 100,
        intensityRatio: Math.round(intensityRatio * 100) / 100,
        managementLevel
      }

      console.log('管理力度计算完成:', result)
      return result

    } catch (error) {
      console.error('计算管理力度指数时发生错误:', error)
      return {
        success: false,
        error: 'calculation_error',
        message: `计算过程中发生错误：${error instanceof Error ? error.message : String(error)}`,
        onDutyCount: 0
      }
    }
  }

  /**
   * 批量计算多个月份的管理力度指数
   */
  const batchCalculateManagementIntensity = (months: string[]): ManagementIntensityResult[] => {
    if (!Array.isArray(months)) {
      console.error('月份参数必须是数组')
      return []
    }

    const results: ManagementIntensityResult[] = []
    for (const month of months) {
      const result = calculateManagementIntensityIndex(month)
      results.push(result)
    }

    console.log(`批量计算完成，共${results.length}个月份`)
    return results
  }

  /**
   * 生成管理力度摘要报告
   */
  const generateSummaryReport = (month: string) => {
    const analysis = calculateManagementIntensityIndex(month)
    
    if (!analysis.success) {
      return analysis
    }

    const report = {
      title: `${month} 车队管理力度分析摘要`,
      basicData: {
        month,
        onDutyCount: analysis.onDutyCount,
        assessmentCount: analysis.assessmentCount
      },
      deductionAnalysis: {
        officeTotal: analysis.officeDeductions,
        teamTotal: analysis.teamDeductions,
        officeAverage: analysis.officeAvgDeduction,
        teamAverage: analysis.teamAvgDeduction
      },
      intensityAnalysis: {
        index: analysis.intensityIndex,
        level: analysis.managementLevel?.level,
        description: analysis.managementLevel?.description,
        suggestion: analysis.managementLevel?.suggestion
      },
      conclusion: generateConclusion(analysis),
      timestamp: new Date().toISOString()
    }

    return report
  }

  /**
   * 生成分析结论
   */
  const generateConclusion = (analysis: ManagementIntensityResult): string => {
    const { intensityIndex, officeAvgDeduction, teamAvgDeduction, managementLevel } = analysis
    
    let conclusion = `本月车队管理力度指数为${intensityIndex}分，评估为"${managementLevel?.level}"。`
    
    const maxScore = getMaxScoreLimit()
    const threshold = maxScore * 0.8
    
    if (intensityIndex! >= threshold) {
      conclusion += '车队管理标准与科室基本一致，请继续保持。'
    } else {
      const gap = officeAvgDeduction! - teamAvgDeduction!
      const gapPercent = Math.round((gap / officeAvgDeduction!) * 100)
      conclusion += `车队人均扣分(${teamAvgDeduction}分)比科室人均扣分(${officeAvgDeduction}分)低${gapPercent}%，存在管理力度不足问题。`
    }
    
    return conclusion
  }

  /**
   * 优化的管理力度综合评估
   * 重新设计指标体系，提供更科学合理的评估维度
   */
  const calculateOptimizedManagementIntensity = (month: string) => {
    try {
      // 1. 获取基础数据
      const onDutyCount = getOnDutyConductorCount(month)
      const assessmentData = getAssessmentData(month)
      
      if (!assessmentData || assessmentData.length === 0) {
        return {
          success: false,
          message: '暂无考核数据'
        }
      }

      // 2. 计算各项指标
      const indicators = calculateManagementIndicators(assessmentData, onDutyCount, month)
      
      // 3. 生成雷达图数据
      const radarData = generateOptimizedRadarData(indicators)
      
      // 4. 综合评估
      const overallAssessment = calculateOverallAssessment(indicators)

      return {
        success: true,
        indicators,
        radarData,
        overallAssessment,
        month,
        onDutyCount,
        assessmentCount: assessmentData.length
      }
    } catch (error) {
      console.error('管理力度分析失败:', error)
      return {
        success: false,
        message: '分析失败'
      }
    }
  }

  /**
   * 计算管理力度各项指标
   */
  const calculateManagementIndicators = (assessmentData: any[], onDutyCount: number, month: string) => {
    // 1. 管理标准一致性指数 (0-100)
    const consistencyIndex = calculateConsistencyIndex(assessmentData)
    
    // 2. 考核覆盖率 (0-100)
    const coverageRate = calculateCoverageRate(assessmentData, onDutyCount)
    
    // 3. 管理严格度指数 (0-100) 
    const strictnessIndex = calculateStrictnessIndex(assessmentData, month)
    
    // 4. 问题识别能力 (0-100)
    const identificationCapability = calculateIdentificationCapability(assessmentData)
    
    // 5. 管理均衡性指数 (0-100)
    const balanceIndex = calculateBalanceIndex(assessmentData)

    return {
      consistencyIndex,
      coverageRate, 
      strictnessIndex,
      identificationCapability,
      balanceIndex
    }
  }

  /**
   * 1. 管理标准一致性指数（重新设计）
   * 衡量科室和车队在问题识别和处理上的协调程度
   * 重点关注方向一致性，而非数值一致性
   */
  const calculateConsistencyIndex = (assessmentData: any[]) => {
    const officeData = assessmentData.filter(d => d.assessorDepartmentName?.includes('科') || d.assessorDepartmentName?.includes('部'))
    const teamData = assessmentData.filter(d => d.assessorDepartmentName?.includes('队') || d.assessorDepartmentName?.includes('车队'))
    
    if (officeData.length === 0 || teamData.length === 0) {
      return 50 // 数据不足时给中等分数
    }

    // 按问题类别分组分析
    const officeByCategory = groupByCategory(officeData)
    const teamByCategory = groupByCategory(teamData)
    
    // 计算各个维度的一致性
    const directionConsistency = calculateDirectionConsistency(officeByCategory, teamByCategory)
    const correlationScore = calculateCorrelationScore(officeData, teamData)
    const balanceScore = calculateBalanceScore(officeData, teamData)
    
    // 综合评分：方向一致性40% + 相关性30% + 平衡性30%
    const consistencyIndex = Math.round(
      directionConsistency * 0.4 + 
      correlationScore * 0.3 + 
      balanceScore * 0.3
    )
    
    return Math.min(100, Math.max(0, consistencyIndex))
  }

  /**
   * 按问题类别分组
   */
  const groupByCategory = (data: any[]) => {
    const categoryMap: Record<string, number[]> = {}
    
    data.forEach(record => {
      record.details?.forEach((detail: any) => {
        const category = detail.itemCategory || '其他'
        if (!categoryMap[category]) {
          categoryMap[category] = []
        }
        categoryMap[category].push(Math.abs(detail.deduction || 0))
      })
    })
    
    // 计算每个类别的平均扣分
    const result: Record<string, number> = {}
    Object.entries(categoryMap).forEach(([category, scores]) => {
      result[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length
    })
    
    return result
  }

  /**
   * 计算方向一致性
   * 科室扣分严重的类别，车队也应该严重
   */
  const calculateDirectionConsistency = (officeByCategory: Record<string, number>, teamByCategory: Record<string, number>) => {
    const commonCategories = Object.keys(officeByCategory).filter(cat => 
      teamByCategory.hasOwnProperty(cat)
    )
    
    if (commonCategories.length === 0) return 50
    
    let consistentCount = 0
    let totalCount = 0
    
    // 计算科室和车队在各类别的严重程度排序
    const officeSorted = Object.entries(officeByCategory).sort((a, b) => b[1] - a[1])
    const teamSorted = Object.entries(teamByCategory).sort((a, b) => b[1] - a[1])
    
    // 检查排序的一致性
    commonCategories.forEach(category => {
      const officeRank = officeSorted.findIndex(([cat]) => cat === category)
      const teamRank = teamSorted.findIndex(([cat]) => cat === category)
      
      if (officeRank !== -1 && teamRank !== -1) {
        // 排序差异越小，一致性越高
        const rankDiff = Math.abs(officeRank - teamRank)
        const maxRankDiff = Math.max(officeSorted.length, teamSorted.length) - 1
        const consistency = Math.max(0, 1 - (rankDiff / maxRankDiff))
        
        consistentCount += consistency
        totalCount += 1
      }
    })
    
    return totalCount > 0 ? Math.round((consistentCount / totalCount) * 100) : 50
  }

  /**
   * 计算相关性得分
   * 整体上科室和车队的扣分应该有正相关
   */
  const calculateCorrelationScore = (officeData: any[], teamData: any[]) => {
    // 按人员匹配，计算同一人员在科室和车队的扣分相关性
    const personMap: Record<string, { office: number, team: number }> = {}
    
    officeData.forEach(record => {
      const personKey = record.conductorId || record.conductorName
      if (personKey) {
        if (!personMap[personKey]) personMap[personKey] = { office: 0, team: 0 }
        personMap[personKey].office += Math.abs(record.totalScore || 0)
      }
    })
    
    teamData.forEach(record => {
      const personKey = record.conductorId || record.conductorName
      if (personKey) {
        if (!personMap[personKey]) personMap[personKey] = { office: 0, team: 0 }
        personMap[personKey].team += Math.abs(record.totalScore || 0)
      }
    })
    
    const pairs = Object.values(personMap).filter(p => p.office > 0 || p.team > 0)
    
    if (pairs.length < 3) return 50 // 样本太少
    
    // 计算皮尔逊相关系数
    const correlation = calculatePearsonCorrelation(
      pairs.map(p => p.office),
      pairs.map(p => p.team)
    )
    
    // 相关系数转换为0-100分
    return Math.round((correlation + 1) * 50) // -1到1映射到0到100
  }

  /**
   * 计算平衡性得分
   * 车队扣分适度高于科室是好现象（自查能力强）
   */
  const calculateBalanceScore = (officeData: any[], teamData: any[]) => {
    const officeAvg = officeData.reduce((sum, d) => sum + Math.abs(d.totalScore || 0), 0) / officeData.length
    const teamAvg = teamData.reduce((sum, d) => sum + Math.abs(d.totalScore || 0), 0) / teamData.length
    
    if (officeAvg === 0 && teamAvg === 0) return 100
    if (officeAvg === 0) return teamAvg > 0 ? 90 : 50 // 只有车队扣分是好事
    if (teamAvg === 0) return 20 // 只有科室扣分说明车队管理不力
    
    const ratio = teamAvg / officeAvg
    
    // 理想比值在0.8-1.5之间
    if (ratio >= 0.8 && ratio <= 1.5) {
      return 100 // 车队和科室扣分相当，很好
    } else if (ratio > 1.5 && ratio <= 2.0) {
      return 95 // 车队扣分更多，说明自查能力强，很好
    } else if (ratio > 2.0) {
      return 85 // 车队扣分过多，可能过度严格
    } else if (ratio >= 0.5) {
      return 70 // 车队扣分偏少，但还可以接受
    } else {
      return 30 // 车队扣分太少，管理力度严重不足
    }
  }

  /**
   * 计算皮尔逊相关系数
   */
  const calculatePearsonCorrelation = (x: number[], y: number[]) => {
    const n = x.length
    if (n === 0) return 0
    
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * 2. 考核覆盖率
   * 衡量考核覆盖在岗人员的比例
   */
  const calculateCoverageRate = (assessmentData: any[], onDutyCount: number) => {
    if (onDutyCount === 0) return 0
    
    const uniqueConductors = new Set(assessmentData.map(d => d.conductorId || d.conductorName))
    const coveredCount = uniqueConductors.size
    
    return Math.round((coveredCount / onDutyCount) * 100)
  }

  /**
   * 3. 管理严格度指数  
   * 基于扣分频次和扣分幅度计算
   */
  const calculateStrictnessIndex = (assessmentData: any[], month: string) => {
    if (assessmentData.length === 0) return 0
    
    // 计算平均扣分
    const avgDeduction = assessmentData.reduce((sum, d) => sum + Math.abs(d.totalScore || 0), 0) / assessmentData.length
    
    // 获取历史平均水平作为基准
    const historicalAvg = getHistoricalAverageDeduction(month)
    
    // 严格度 = 当期平均扣分 / 历史平均扣分 * 100
    if (historicalAvg === 0) return Math.min(100, avgDeduction * 10)
    
    return Math.round(Math.min(100, (avgDeduction / historicalAvg) * 100))
  }

  /**
   * 4. 问题识别能力
   * 基于发现问题的多样性和深度
   */
  const calculateIdentificationCapability = (assessmentData: any[]) => {
    if (assessmentData.length === 0) return 0
    
    // 统计问题类别数量
    const problemCategories = new Set()
    const problemItems = new Set()
    
    assessmentData.forEach(record => {
      record.details?.forEach((detail: any) => {
        if (detail.itemCategory) problemCategories.add(detail.itemCategory)
        if (detail.item) problemItems.add(detail.item)
      })
    })
    
    // 基于问题多样性计算识别能力
    const categoryScore = Math.min(100, problemCategories.size * 20) // 类别多样性
    const itemScore = Math.min(100, problemItems.size * 5) // 问题细化度
    
    return Math.round((categoryScore * 0.6 + itemScore * 0.4))
  }

  /**
   * 5. 管理均衡性指数
   * 衡量各部门管理力度的均衡程度
   */
  const calculateBalanceIndex = (assessmentData: any[]) => {
    // 按部门分组统计
    const deptStats: Record<string, number[]> = {}
    
    assessmentData.forEach(record => {
      const dept = record.department || '未知部门'
      if (!deptStats[dept]) deptStats[dept] = []
      deptStats[dept].push(Math.abs(record.totalScore || 0))
    })
    
    // 计算各部门平均扣分
    const deptAvgs = Object.values(deptStats).map(scores => 
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    )
    
    if (deptAvgs.length <= 1) return 100 // 只有一个部门时认为是均衡的
    
    // 计算变异系数（标准差/平均值）
    const mean = deptAvgs.reduce((sum, avg) => sum + avg, 0) / deptAvgs.length
    const variance = deptAvgs.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / deptAvgs.length
    const stdDev = Math.sqrt(variance)
    
    if (mean === 0) return 100
    
    const cv = stdDev / mean // 变异系数
    
    // 变异系数越小，均衡性越好
    const balanceIndex = Math.max(0, 100 - (cv * 100))
    
    return Math.round(balanceIndex)
  }

  /**
   * 生成优化的雷达图数据
   */
  const generateOptimizedRadarData = (indicators: any) => {
    return {
      indicators: [
        { name: '标准一致性', max: 100, description: '科室与车队考核标准的一致程度' },
        { name: '考核覆盖率', max: 100, description: '考核覆盖在岗人员的比例' },
        { name: '管理严格度', max: 100, description: '相对于历史水平的严格程度' },
        { name: '问题识别力', max: 100, description: '发现和识别问题的能力' },
        { name: '管理均衡性', max: 100, description: '各部门管理力度的均衡程度' }
      ],
      values: [
        indicators.consistencyIndex,
        indicators.coverageRate,
        indicators.strictnessIndex,
        indicators.identificationCapability,
        indicators.balanceIndex
      ]
    }
  }

  /**
   * 计算综合评估
   */
  const calculateOverallAssessment = (indicators: any) => {
    // 设置权重：一致性30%，覆盖率25%，严格度20%，识别力15%，均衡性10%
    const weights = {
      consistencyIndex: 0.30,
      coverageRate: 0.25,
      strictnessIndex: 0.20,
      identificationCapability: 0.15,
      balanceIndex: 0.10
    }
    
    const overallScore = 
      indicators.consistencyIndex * weights.consistencyIndex +
      indicators.coverageRate * weights.coverageRate +
      indicators.strictnessIndex * weights.strictnessIndex +
      indicators.identificationCapability * weights.identificationCapability +
      indicators.balanceIndex * weights.balanceIndex
    
    let level, description, suggestions
    
    if (overallScore >= 85) {
      level = '优秀'
      description = '管理力度综合水平优秀，各项指标均表现良好'
      suggestions = ['继续保持优秀的管理水平', '可作为标杆推广管理经验']
    } else if (overallScore >= 70) {
      level = '良好'  
      description = '管理力度综合水平良好，有进一步提升空间'
      suggestions = ['关注薄弱环节，持续改进', '加强部门间经验交流']
    } else if (overallScore >= 55) {
      level = '一般'
      description = '管理力度综合水平一般，需要重点改进'
      suggestions = ['识别关键问题，制定改进计划', '提高考核标准的执行力度']
    } else {
      level = '待改进'
      description = '管理力度综合水平有待改进，需要系统性提升'
      suggestions = ['全面分析管理短板', '建立更加严格的考核制度', '加强培训和指导']
    }
    
    return {
      overallScore: Math.round(overallScore),
      level,
      description,
      suggestions
    }
  }

  // 辅助函数
  const getHistoricalAverageDeduction = (currentMonth: string) => {
    // 获取过去6个月的平均扣分作为基准
    if (!mainStore.database?.assessmentDB) return 5 // 默认值
    
    const allData = Object.values(mainStore.database.assessmentDB).flat()
    if (allData.length === 0) return 5
    
    const totalDeduction = allData.reduce((sum: number, record: any) => sum + Math.abs(record.totalScore || 0), 0)
    return totalDeduction / allData.length
  }

  return {
    loading,
    getOnDutyConductorCount,
    calculateTotalDeductions,
    getAssessmentData,
    calculateManagementIntensityIndex,
    batchCalculateManagementIntensity,
    generateSummaryReport,
    getManagementLevel,
    calculateOptimizedManagementIntensity
  }
} 