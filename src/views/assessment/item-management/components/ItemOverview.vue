<template>
  <div class="item-overview">
    <!-- 整体统计卡片 -->
    <el-row :gutter="16" class="overview-cards">
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="标准项点总数" :value="overviewStats.totalItems" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="已使用项点" :value="overviewStats.usedItems" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="使用率" :value="overviewStats.usageRate" suffix="%" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="总使用次数" :value="overviewStats.totalUsage" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 分类统计 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <h4>项点分类分布</h4>
          </template>
          <div class="category-chart">
            <div class="category-list">
              <div 
                v-for="category in categoryStats" 
                :key="category.name" 
                class="category-item"
              >
                <div class="category-info">
                  <span class="category-name">{{ category.name }}</span>
                  <span class="category-count">{{ category.count }}个</span>
                </div>
                <div class="category-bar">
                  <div 
                    class="bar-fill" 
                    :style="{ width: `${category.percentage}%` }"
                  ></div>
                </div>
                <span class="category-percentage">{{ category.percentage }}%</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 使用频率排行 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <h4>使用频率 TOP 10</h4>
          </template>
          <div class="usage-ranking">
            <div 
              v-for="(item, index) in topUsedItems" 
              :key="item.id" 
              class="ranking-item"
            >
              <div class="rank-number">{{ index + 1 }}</div>
              <div class="item-info">
                <div class="item-name">{{ item.description }}</div>
                <div class="item-category">{{ item.category }}</div>
              </div>
              <div class="usage-count">{{ item.usageCount }}次</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细分析表格 -->
    <el-card class="analysis-table-card">
      <template #header>
        <div class="table-header">
          <h4>项点使用详细分析</h4>
          <div class="table-actions">
            <el-button @click="exportAnalysis">
              <el-icon><Download /></el-icon>
              导出分析报告
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选条件 -->
      <el-row :gutter="20" class="filter-row">
        <el-col :span="6">
          <el-select v-model="filterCategory" placeholder="筛选分类" clearable>
            <el-option label="全部分类" value="" />
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterUsageStatus" placeholder="使用状态" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="已使用" value="used" />
            <el-option label="未使用" value="unused" />
            <el-option label="高频使用" value="high" />
            <el-option label="低频使用" value="low" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-input 
            v-model="searchKeyword" 
            placeholder="搜索项点描述" 
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </el-col>
      </el-row>

      <!-- 分析表格 -->
      <el-table :data="pagedAnalysisItems" stripe>
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userCode" label="编号" width="120" />
        <el-table-column prop="description" label="项点描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="maxScore" label="标准分值" width="100" align="center" />
        <el-table-column label="使用情况" width="120" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="getUsageTagType(row.usageCount)" 
              size="small"
            >
              {{ row.usageCount > 0 ? `${row.usageCount}次` : '未使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用频率" width="100" align="center">
          <template #default="{ row }">
            <span :class="getFrequencyClass(row.frequency)">
              {{ row.frequency }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="responsibleDepartment" label="负责部门" width="120" />
        <el-table-column label="最近使用" width="120">
          <template #default="{ row }">
            <span class="last-used">
              {{ row.lastUsed ? formatDate(row.lastUsed) : '--' }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="filteredAnalysisItems.length"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
      />
    </el-card>

    <!-- 数据洞察 -->
    <el-card class="insights-card">
      <template #header>
        <h4>数据洞察</h4>
      </template>
      <div class="insights-content">
        <el-alert
          v-for="insight in dataInsights"
          :key="insight.type"
          :title="insight.title"
          :description="insight.description"
          :type="insight.level"
          show-icon
          :closable="false"
          class="insight-item"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Search, Refresh } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import * as XLSX from 'xlsx'
import type { StandardAssessmentItem } from '@/types'

interface ItemAnalysis extends StandardAssessmentItem {
  usageCount: number
  frequency: 'high' | 'medium' | 'low' | 'none'
  lastUsed?: number
}

interface DataInsight {
  type: string
  title: string
  description: string
  level: 'success' | 'warning' | 'error' | 'info'
}

const mainStore = useMainStore()

// 状态
const filterCategory = ref('')
const filterUsageStatus = ref('')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 计算属性
const allItems = computed(() => {
  if (!mainStore.database) return []
  return Object.values(mainStore.database.standardAssessmentItems || {})
})

const categories = computed(() => {
  const cats = new Set(allItems.value.map(item => item.category).filter(Boolean))
  return ['服务', '安全', '纪律', '其他', ...Array.from(cats)]
})

// 获取项点使用统计
const itemUsageMap = computed(() => {
  const usageMap = new Map<string, { count: number, lastUsed?: number }>()
  const assessmentDB = mainStore.database?.assessmentDB || []
  const records = Array.isArray(assessmentDB) ? assessmentDB : []
  
  records.forEach((record: any) => {
    const recordDate = new Date(record.assessDate).getTime()
    record.details?.forEach((detail: any) => {
      if (detail.itemCode) {
        const current = usageMap.get(detail.itemCode) || { count: 0 }
        current.count++
        if (!current.lastUsed || recordDate > current.lastUsed) {
          current.lastUsed = recordDate
        }
        usageMap.set(detail.itemCode, current)
      }
    })
  })
  
  return usageMap
})

// 整体统计
const overviewStats = computed(() => {
  const totalItems = allItems.value.length
  const usedItems = allItems.value.filter(item => (itemUsageMap.value.get(item.id)?.count || 0) > 0).length
  const totalUsage = Array.from(itemUsageMap.value.values()).reduce((sum, item) => sum + item.count, 0)
  
  return {
    totalItems,
    usedItems,
    usageRate: totalItems > 0 ? Math.round((usedItems / totalItems) * 100) : 0,
    totalUsage
  }
})

// 分类统计
const categoryStats = computed(() => {
  const categoryMap = new Map<string, number>()
  
  allItems.value.forEach(item => {
    const category = item.category || '其他'
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
  })
  
  const total = allItems.value.length
  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)
})

// 使用频率TOP10
const topUsedItems = computed(() => {
  return allItems.value
    .map(item => ({
      ...item,
      usageCount: itemUsageMap.value.get(item.id)?.count || 0
    }))
    .filter(item => item.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)
})

// 详细分析数据
const analysisItems = computed((): ItemAnalysis[] => {
  return allItems.value.map(item => {
    const usage = itemUsageMap.value.get(item.id) || { count: 0 }
    const usageCount = usage.count
    
    let frequency: 'high' | 'medium' | 'low' | 'none' = 'none'
    if (usageCount === 0) {
      frequency = 'none'
    } else if (usageCount >= 20) {
      frequency = 'high'
    } else if (usageCount >= 5) {
      frequency = 'medium'
    } else {
      frequency = 'low'
    }
    
    return {
      ...item,
      usageCount,
      frequency,
      lastUsed: usage.lastUsed
    }
  })
})

// 筛选后的分析数据
const filteredAnalysisItems = computed(() => {
  let items = [...analysisItems.value]
  
  if (filterCategory.value) {
    items = items.filter(item => item.category === filterCategory.value)
  }
  
  if (filterUsageStatus.value) {
    items = items.filter(item => {
      switch (filterUsageStatus.value) {
        case 'used': return item.usageCount > 0
        case 'unused': return item.usageCount === 0
        case 'high': return item.frequency === 'high'
        case 'low': return item.frequency === 'low'
        default: return true
      }
    })
  }
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    items = items.filter(item =>
      item.description.toLowerCase().includes(keyword) ||
      (item.userCode && item.userCode.toLowerCase().includes(keyword))
    )
  }
  
  return items.sort((a, b) => b.usageCount - a.usageCount)
})

// 分页数据
const pagedAnalysisItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredAnalysisItems.value.slice(start, end)
})

// 数据洞察
const dataInsights = computed((): DataInsight[] => {
  const insights: DataInsight[] = []
  
  const unusedCount = analysisItems.value.filter(item => item.usageCount === 0).length
  const unusedRate = Math.round((unusedCount / allItems.value.length) * 100)
  
  if (unusedRate > 50) {
    insights.push({
      type: 'unused_high',
      title: '未使用项点过多',
      description: `有${unusedCount}个项点(${unusedRate}%)从未被使用，建议检查这些项点的必要性`,
      level: 'warning'
    })
  }
  
  const highFreqCount = analysisItems.value.filter(item => item.frequency === 'high').length
  if (highFreqCount < 5) {
    insights.push({
      type: 'high_freq_low',
      title: '高频项点较少',
      description: `只有${highFreqCount}个高频使用项点，可能需要丰富常用项点库`,
      level: 'info'
    })
  }
  
  const categoryCount = categoryStats.value.length
  if (categoryCount < 4) {
    insights.push({
      type: 'category_limited',
      title: '分类较少',
      description: `当前只有${categoryCount}个分类，建议细化项点分类以便管理`,
      level: 'info'
    })
  }
  
  if (insights.length === 0) {
    insights.push({
      type: 'good',
      title: '项点管理良好',
      description: '项点使用情况健康，分类合理，继续保持',
      level: 'success'
    })
  }
  
  return insights
})

// 方法
const getUsageTagType = (usageCount: number) => {
  if (usageCount === 0) return 'info'
  if (usageCount >= 20) return 'success'
  if (usageCount >= 5) return 'warning'
  return 'primary'
}

const getFrequencyClass = (frequency: string) => {
  return `frequency-${frequency}`
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString()
}

const refreshData = () => {
  ElMessage.success('数据已刷新')
}

const exportAnalysis = () => {
  const data = filteredAnalysisItems.value.map(item => ({
    分类: item.category,
    编号: item.userCode || '',
    项点描述: item.description,
    标准分值: item.maxScore,
    使用次数: item.usageCount,
    使用频率: item.frequency,
    负责部门: item.responsibleDepartment,
    最近使用: item.lastUsed ? formatDate(item.lastUsed) : '未使用',
    创建时间: new Date(item.createdAt || 0).toLocaleString()
  }))
  
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '项点使用分析')
  XLSX.writeFile(wb, `项点使用分析报告_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

onMounted(() => {
  // 初始化加载
})
</script>

<style lang="scss" scoped>
.item-overview {
  .overview-cards {
    margin-bottom: 20px;
    
    .stat-card {
      text-align: center;
    }
  }
  
  .chart-card {
    margin-bottom: 20px;
    height: 400px;
    
    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    
    .category-chart {
      height: 320px;
      overflow-y: auto;
      
      .category-list {
        .category-item {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          gap: 12px;
          
          .category-info {
            min-width: 100px;
            
            .category-name {
              font-weight: 500;
            }
            
            .category-count {
              font-size: 12px;
              color: var(--el-text-color-regular);
              margin-left: 8px;
            }
          }
          
          .category-bar {
            flex: 1;
            height: 8px;
            background: var(--el-fill-color-light);
            border-radius: 4px;
            overflow: hidden;
            
            .bar-fill {
              height: 100%;
              background: var(--el-color-primary);
              transition: width 0.3s ease;
            }
          }
          
          .category-percentage {
            min-width: 40px;
            text-align: right;
            font-size: 12px;
            color: var(--el-text-color-regular);
          }
        }
      }
    }
    
    .usage-ranking {
      height: 320px;
      overflow-y: auto;
      
      .ranking-item {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);
        
        .rank-number {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--el-color-primary-light-8);
          color: var(--el-color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          margin-right: 12px;
        }
        
        .item-info {
          flex: 1;
          
          .item-name {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 2px;
          }
          
          .item-category {
            font-size: 12px;
            color: var(--el-text-color-regular);
          }
        }
        
        .usage-count {
          font-weight: 500;
          color: var(--el-color-primary);
        }
      }
    }
  }
  
  .analysis-table-card {
    margin-bottom: 20px;
    
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    }
    
    .filter-row {
      margin-bottom: 20px;
    }
    
    .pagination {
      margin-top: 16px;
      display: flex;
      justify-content: center;
    }
  }
  
  .insights-card {
    .insights-content {
      .insight-item {
        margin-bottom: 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
  
  // 频率样式
  .frequency-high {
    color: var(--el-color-success);
    font-weight: 500;
  }
  
  .frequency-medium {
    color: var(--el-color-warning);
    font-weight: 500;
  }
  
  .frequency-low {
    color: var(--el-color-info);
  }
  
  .frequency-none {
    color: var(--el-text-color-disabled);
  }
  
  .last-used {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}
</style> 