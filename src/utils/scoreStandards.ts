/**
 * 分数等级标准工具函数
 * 提供统一的分数等级判断和颜色管理
 */

export interface ScoreStandard {
  level: string
  min: number
  max: number
  color: string
}

/**
 * 默认分数标准
 */
export const DEFAULT_SCORE_STANDARDS: ScoreStandard[] = [
  { level: '优秀', min: 90, max: 100, color: '#4CAF50' },
  { level: '良好', min: 80, max: 89, color: '#2196F3' },
  { level: '中等', min: 70, max: 79, color: '#FF9800' },
  { level: '及格', min: 60, max: 69, color: '#F44336' },
  { level: '不及格', min: 0, max: 59, color: '#9E9E9E' }
]

/**
 * 从localStorage获取分数标准配置
 */
export function getScoreStandards(): ScoreStandard[] {
  try {
    const stored = localStorage.getItem('scoreStandards')
    if (stored) {
      const parsed = JSON.parse(stored)
      // 验证数据格式
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => ({
          level: item.level || '',
          min: Number(item.min) || 0,
          max: Number(item.max) || 100,
          color: item.color || '#9E9E9E'
        }))
      }
    }
  } catch (error) {
    console.warn('读取分数标准配置失败，使用默认配置:', error)
  }
  
  return DEFAULT_SCORE_STANDARDS
}

/**
 * 根据分数获取等级信息
 */
export function getScoreLevel(score: number): {
  level: string
  color: string
  standard: ScoreStandard
} {
  const standards = getScoreStandards()
  
  // 找到对应的等级
  const standard = standards.find(std => score >= std.min && score <= std.max)
  
  if (standard) {
    return {
      level: standard.level,
      color: standard.color,
      standard
    }
  }
  
  // 默认返回最后一个等级（通常是不及格）
  const fallback = standards[standards.length - 1] || DEFAULT_SCORE_STANDARDS[4]
  return {
    level: fallback.level,
    color: fallback.color,
    standard: fallback
  }
}

/**
 * 获取及格分数线
 */
export function getPassingScore(): number {
  const standards = getScoreStandards()
  
  // 查找"及格"等级的最低分数，如果没有则查找"不及格"的最高分数+1
  let passingScore = 60 // 默认及格线
  
  const passLevel = standards.find(std => 
    std.level.includes('及格') && !std.level.includes('不及格')
  )
  
  if (passLevel) {
    passingScore = passLevel.min
  } else {
    // 如果没有明确的及格等级，找不及格等级的上限+1
    const failLevel = standards.find(std => std.level.includes('不及格'))
    if (failLevel) {
      passingScore = failLevel.max + 1
    }
  }
  
  return passingScore
}

/**
 * 计算分数分布统计
 */
export function calculateScoreDistribution(scores: number[]): {
  [level: string]: {
    count: number
    percentage: number
    color: string
  }
} {
  const standards = getScoreStandards()
  const total = scores.length
  const distribution: { [level: string]: { count: number; percentage: number; color: string } } = {}
  
  // 初始化统计
  standards.forEach(std => {
    distribution[std.level] = {
      count: 0,
      percentage: 0,
      color: std.color
    }
  })
  
  // 统计各等级数量
  scores.forEach(score => {
    const { level, color } = getScoreLevel(score)
    if (distribution[level]) {
      distribution[level].count++
    } else {
      // 如果等级不存在，创建一个
      distribution[level] = {
        count: 1,
        percentage: 0,
        color
      }
    }
  })
  
  // 计算百分比
  Object.keys(distribution).forEach(level => {
    distribution[level].percentage = total > 0 ? (distribution[level].count / total) * 100 : 0
  })
  
  return distribution
}

/**
 * 计算及格率
 */
export function calculatePassRate(scores: number[]): number {
  if (scores.length === 0) return 0
  
  const passingScore = getPassingScore()
  const passCount = scores.filter(score => score >= passingScore).length
  
  return (passCount / scores.length) * 100
}

/**
 * 获取等级对应的标签类型（用于Element Plus Tag组件）
 */
export function getScoreLevelTagType(level: string): string {
  switch (level) {
    case '优秀':
      return 'success'
    case '良好':
      return 'primary'
    case '中等':
      return 'warning'
    case '及格':
      return 'info'
    case '不及格':
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * 保存分数标准到localStorage
 */
export function saveScoreStandards(standards: ScoreStandard[]): void {
  try {
    localStorage.setItem('scoreStandards', JSON.stringify(standards))
  } catch (error) {
    console.error('保存分数标准失败:', error)
    throw error
  }
}

/**
 * 验证分数标准配置的有效性
 */
export function validateScoreStandards(standards: ScoreStandard[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!Array.isArray(standards) || standards.length === 0) {
    errors.push('分数标准不能为空')
    return { isValid: false, errors }
  }
  
  // 检查分数范围连续性
  const sortedStandards = [...standards].sort((a, b) => b.min - a.min)
  
  for (let i = 0; i < sortedStandards.length - 1; i++) {
    const current = sortedStandards[i]
    const next = sortedStandards[i + 1]
    
    if (current.min <= next.max) {
      errors.push(`${current.level}(${current.min}-${current.max})与${next.level}(${next.min}-${next.max})分数范围重叠`)
    }
    
    if (current.min - 1 !== next.max) {
      errors.push(`${current.level}与${next.level}之间分数范围不连续`)
    }
  }
  
  // 检查分数范围合理性
  standards.forEach(std => {
    if (std.min < 0 || std.max > 100) {
      errors.push(`${std.level}分数范围超出0-100的有效范围`)
    }
    
    if (std.min > std.max) {
      errors.push(`${std.level}最小分数不能大于最大分数`)
    }
    
    if (!std.level.trim()) {
      errors.push('等级名称不能为空')
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}