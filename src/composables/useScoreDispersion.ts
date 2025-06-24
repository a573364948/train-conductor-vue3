/**
 * 评分离散度分析 Composable
 * 识别"吃大锅饭"现象和评分区分度分析
 * 
 * @author 列车长考核系统
 * @version 1.0.0
 */

import { ref } from 'vue'
import { getScoreStandards, calculateScoreDistribution } from '@/utils/scoreStandards'

export interface ScoreStatistics {
  mean: number
  variance: number
  standardDeviation: number
  coefficient: number
  min: number
  max: number
  range: number
  count: number
}

export interface ScoreDistribution {
  ranges: Record<string, number>
  percentages: Record<string, number>
  highScoreConcentration: number
  total: number
}

export interface BigPotRisk {
  level: 'high' | 'medium' | 'low' | 'unknown'
  score: number
  reasons: string[]
  suggestions: string[]
}

export interface ScoreDiscrimination {
  level: string
  description: string
  score: number
  standardDeviation: number
  range: number
  compositeScore: number
}

export interface DepartmentDispersionAnalysis {
  statistics: ScoreStatistics
  distribution: ScoreDistribution
  bigPotRisk: BigPotRisk
  discrimination: ScoreDiscrimination
  recordCount: number
}

export function useScoreDispersion() {
  const loading = ref(false)

  /**
   * 计算评分统计指标
   */
  const calculateScoreStatistics = (scores: number[]): ScoreStatistics => {
    if (!Array.isArray(scores) || scores.length === 0) {
      return {
        mean: 0,
        variance: 0,
        standardDeviation: 0,
        coefficient: 0,
        min: 0,
        max: 0,
        range: 0,
        count: 0
      }
    }

    // 基础统计
    const count = scores.length
    const mean = scores.reduce((sum, score) => sum + score, 0) / count
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / count
    const standardDeviation = Math.sqrt(variance)
    const coefficient = mean > 0 ? (standardDeviation / mean) * 100 : 0 // 变异系数百分比
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const range = max - min

    return {
      mean: Math.round(mean * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      coefficient: Math.round(coefficient * 100) / 100,
      min,
      max,
      range,
      count
    }
  }

  /**
   * 分析评分分布
   */
  const analyzeScoreDistribution = (scores: number[]): ScoreDistribution => {
    if (!Array.isArray(scores) || scores.length === 0) {
      return {
        ranges: {},
        percentages: {},
        highScoreConcentration: 0,
        total: 0
      }
    }

    // 使用动态分数标准进行分数段统计
    const scoreDistribution = calculateScoreDistribution(scores)
    
    // 转换为旧格式以保持兼容性
    const ranges: Record<string, number> = {}
    const percentages: Record<string, number> = {}
    
    Object.entries(scoreDistribution).forEach(([level, data]) => {
      ranges[level] = data.count
      percentages[level] = Math.round(data.percentage * 100) / 100 // 保留2位小数
    })

    // 高分集中度（优秀等级占比）
    const excellentLevel = getScoreStandards().find(s => s.level === '优秀')?.level || '优秀'
    const highScoreConcentration = (percentages[excellentLevel] || 0) / 100

    return {
      ranges,
      percentages,
      highScoreConcentration,
      total
    }
  }

  /**
   * 评估"吃大锅饭"风险
   */
  const assessBigPotRisk = (scores: number[], statistics: ScoreStatistics, distribution: ScoreDistribution): BigPotRisk => {
    if (!scores || scores.length === 0) {
      return {
        level: 'unknown',
        score: 0,
        reasons: ['数据不足'],
        suggestions: ['请提供足够的评分数据']
      }
    }

    const { standardDeviation, range } = statistics
    const { highScoreConcentration } = distribution

    let riskScore = 0
    let riskLevel: 'high' | 'medium' | 'low' = 'low'
    let reasons: string[] = []

    // 风险判断条件
    const lowVariation = standardDeviation < 3
    const veryLowVariation = standardDeviation < 2
    const narrowRange = range < 10
    const veryNarrowRange = range < 5
    const highConcentration = highScoreConcentration > 0.7
    const veryHighConcentration = highScoreConcentration > 0.8

    // 计算风险分数 (0-100)
    if (veryLowVariation) riskScore += 40
    else if (lowVariation) riskScore += 25

    if (veryNarrowRange) riskScore += 30
    else if (narrowRange) riskScore += 20

    if (veryHighConcentration) riskScore += 30
    else if (highConcentration) riskScore += 20

    // 确定风险等级
    if (riskScore >= 70) {
      riskLevel = 'high'
    } else if (riskScore >= 40) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'low'
    }

    // 生成风险原因
    if (veryHighConcentration) {
      reasons.push(`${Math.round(highScoreConcentration * 100)}%的评分集中在90-100分区间`)
    } else if (highConcentration) {
      reasons.push(`${Math.round(highScoreConcentration * 100)}%的评分集中在高分段`)
    }

    if (veryLowVariation) {
      reasons.push(`评分标准差仅${standardDeviation}分，严重缺乏区分度`)
    } else if (lowVariation) {
      reasons.push(`评分标准差${standardDeviation}分，区分度不足`)
    }

    if (veryNarrowRange) {
      reasons.push(`评分范围仅${range}分，存在明显的"一刀切"现象`)
    } else if (narrowRange) {
      reasons.push(`评分范围${range}分，分布过于集中`)
    }

    if (reasons.length === 0) {
      reasons.push('评分分布相对合理')
    }

    return {
      level: riskLevel,
      score: riskScore,
      reasons,
      suggestions: generateBigPotSuggestions(riskLevel, reasons)
    }
  }

  /**
   * 评估评分区分度
   */
  const assessScoreDiscrimination = (standardDeviation: number, range: number): ScoreDiscrimination => {
    let level: string, description: string, score: number

    // 综合标准差和范围进行评估
    const compositeScore = (standardDeviation * 0.7) + (range * 0.3)

    if (compositeScore >= 8) {
      level = '优秀'
      description = '评分区分度优秀，能有效反映个体差异'
      score = Math.min(100, compositeScore * 10)
    } else if (compositeScore >= 5) {
      level = '良好'
      description = '评分区分度良好，基本能反映个体差异'
      score = Math.min(85, compositeScore * 12)
    } else if (compositeScore >= 3) {
      level = '一般'
      description = '评分区分度一般，建议提高评分精细化程度'
      score = Math.min(70, compositeScore * 15)
    } else {
      level = '不足'
      description = '评分区分度不足，存在"一刀切"或"吃大锅饭"现象'
      score = Math.max(0, compositeScore * 20)
    }

    return {
      level,
      description,
      score: Math.round(score),
      standardDeviation,
      range,
      compositeScore: Math.round(compositeScore * 100) / 100
    }
  }

  /**
   * 生成"吃大锅饭"改进建议
   */
  const generateBigPotSuggestions = (riskLevel: string, reasons: string[]): string[] => {
    const suggestions: Record<string, string[]> = {
      high: [
        '立即重新审视评分标准，增加评分细化程度',
        '建立强制评分分布制度，避免评分过度集中',
        '加强对评分人员的专业培训，提高评分客观性',
        '引入多级评分体系，增加评分区间',
        '定期抽查评分质量，确保评分真实反映工作表现'
      ],
      medium: [
        '适当调整评分标准，提高评分区分度',
        '加强评分人员培训，统一评分标准',
        '建立评分质量监控机制',
        '鼓励评分人员合理利用评分区间'
      ],
      low: [
        '继续保持当前评分标准的合理性',
        '定期评估评分分布的合理性',
        '适时调整评分细则以保持区分度'
      ]
    }

    return suggestions[riskLevel] || suggestions.low
  }

  /**
   * 部门评分离散度综合分析
   */
  const analyzeDepartmentDispersion = (departmentData: Record<string, any[]>) => {
    const analysis: Record<string, DepartmentDispersionAnalysis> = {}
    const overallStats = {
      totalDepartments: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      avgStandardDeviation: 0,
      avgDiscriminationScore: 0
    }

    Object.keys(departmentData).forEach(department => {
      const records = departmentData[department]
      if (!Array.isArray(records) || records.length === 0) {
        return
      }

      // 提取评分数据
      const maxScore = getScoreStandards().find(s => s.level === '优秀')?.max || 999
      const scores = records.map(record => record.finalScore || record.totalScore || maxScore)

      // 计算统计指标
      const statistics = calculateScoreStatistics(scores)
      const distribution = analyzeScoreDistribution(scores)
      const bigPotRisk = assessBigPotRisk(scores, statistics, distribution)
      const discrimination = assessScoreDiscrimination(statistics.standardDeviation, statistics.range)

      analysis[department] = {
        statistics,
        distribution,
        bigPotRisk,
        discrimination,
        recordCount: records.length
      }

      // 更新整体统计
      overallStats.totalDepartments++
      overallStats.avgStandardDeviation += statistics.standardDeviation
      overallStats.avgDiscriminationScore += discrimination.score

      switch (bigPotRisk.level) {
        case 'high':
          overallStats.highRiskCount++
          break
        case 'medium':
          overallStats.mediumRiskCount++
          break
        case 'low':
          overallStats.lowRiskCount++
          break
      }
    })

    // 计算平均值
    if (overallStats.totalDepartments > 0) {
      overallStats.avgStandardDeviation = Math.round((overallStats.avgStandardDeviation / overallStats.totalDepartments) * 100) / 100
      overallStats.avgDiscriminationScore = Math.round((overallStats.avgDiscriminationScore / overallStats.totalDepartments) * 100) / 100
    }

    return {
      departmentAnalysis: analysis,
      overallStats,
      recommendations: generateOverallRecommendations(overallStats)
    }
  }

  /**
   * 生成整体改进建议
   */
  const generateOverallRecommendations = (overallStats: any): string[] => {
    const recommendations: string[] = []
    const { highRiskCount, mediumRiskCount, totalDepartments, avgStandardDeviation } = overallStats

    const highRiskRatio = highRiskCount / totalDepartments
    const problemRatio = (highRiskCount + mediumRiskCount) / totalDepartments

    if (highRiskRatio > 0.3) {
      recommendations.push('超过30%的车队存在"吃大锅饭"高风险，建议全面重新审视评分体系')
    } else if (highRiskRatio > 0.1) {
      recommendations.push('部分车队存在"吃大锅饭"风险，建议重点关注和改进')
    }

    if (problemRatio > 0.5) {
      recommendations.push('半数以上车队评分区分度不足，建议统一提高评分标准')
    }

    if (avgStandardDeviation < 3) {
      recommendations.push('全段平均标准差偏低，建议加强评分培训，提高区分度')
    } else if (avgStandardDeviation > 8) {
      recommendations.push('全段平均标准差较高，建议统一评分标准，避免差异过大')
    }

    if (recommendations.length === 0) {
      recommendations.push('整体评分分布较为合理，继续保持当前评分标准')
    }

    return recommendations
  }

  /**
   * 生成评分离散度报告
   */
  const generateDispersionReport = (month: string, departmentData: Record<string, any[]>) => {
    const analysis = analyzeDepartmentDispersion(departmentData)

    return {
      title: `${month} 评分离散度分析报告`,
      month,
      timestamp: new Date().toISOString(),
      summary: {
        totalDepartments: analysis.overallStats.totalDepartments,
        highRiskCount: analysis.overallStats.highRiskCount,
        avgStandardDeviation: analysis.overallStats.avgStandardDeviation,
        avgDiscriminationScore: analysis.overallStats.avgDiscriminationScore
      },
      departmentAnalysis: analysis.departmentAnalysis,
      overallStats: analysis.overallStats,
      recommendations: analysis.recommendations
    }
  }

  return {
    loading,
    calculateScoreStatistics,
    analyzeScoreDistribution,
    assessBigPotRisk,
    assessScoreDiscrimination,
    analyzeDepartmentDispersion,
    generateDispersionReport,
    generateOverallRecommendations
  }
} 