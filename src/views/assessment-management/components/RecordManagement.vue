<template>
  <div class="record-management">
    <!-- 总体统计 -->
    <div class="stats-overview card">
      <h3>总体概况</h3>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-statistic 
            title="累计月份" 
            :value="monthlyDataList.length" 
            suffix="个月"
          />
        </el-col>
        <el-col :span="6">
          <el-statistic 
            title="总考核记录" 
            :value="totalRecords" 
            suffix="条"
          />
        </el-col>
        <el-col :span="6">
          <el-statistic 
            title="涉及人员" 
            :value="uniqueConductors" 
            suffix="人"
          />
        </el-col>
        <el-col :span="6">
          <el-statistic 
            title="数据大小" 
            :value="estimatedDataSizeKB" 
            :precision="1"
            suffix="KB"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 月份数据列表 -->
    <div class="monthly-data-list card">
      <div class="section-header">
        <h3>月度考核记录</h3>
        <div class="filter-controls">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索年月..."
            clearable
            style="width: 200px;"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button @click="refreshData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </div>

      <el-table 
        :data="filteredMonthlyData" 
        stripe 
        v-loading="loading"
        empty-text="暂无考核记录数据"
      >
        <el-table-column label="年月" width="120" sortable>
          <template #default="{ row }">
            <el-tag type="primary">{{ row.year }}年{{ row.month }}月</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="考核记录数" width="120" sortable prop="recordCount">
          <template #default="{ row }">
            <el-text type="primary">{{ row.recordCount }} 条</el-text>
          </template>
        </el-table-column>
        
        <el-table-column label="涉及人员" width="120" sortable prop="conductorCount">
          <template #default="{ row }">
            {{ row.conductorCount }} 人
          </template>
        </el-table-column>
        
        <el-table-column label="考核部门" min-width="200">
          <template #default="{ row }">
            <div class="dept-tags">
              <el-tag 
                v-for="dept in row.assessorDepartments" 
                :key="dept" 
                size="small" 
                class="mr-1"
              >
                {{ dept }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="平均得分" width="100" sortable prop="avgScore">
          <template #default="{ row }">
            <span :class="getScoreClass(row.avgScore)">
              {{ row.avgScore.toFixed(1) }}分
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="上传时间" width="160" sortable prop="uploadTime">
          <template #default="{ row }">
            {{ formatDate(row.uploadTime) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="viewDetails(row)"
            >
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="confirmDelete(row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 详情对话框 -->
    <el-dialog 
      v-model="detailDialogVisible" 
      :title="`${currentMonth?.year}年${currentMonth?.month}月考核记录详情`"
      width="80%"
      top="5vh"
    >
      <div v-if="currentMonth" class="detail-content">
        <!-- 月份统计 -->
        <div class="month-stats mb-4">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">考核记录数</div>
                <div class="stat-value">{{ currentMonth.recordCount }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">涉及人员</div>
                <div class="stat-value">{{ currentMonth.conductorCount }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">平均得分</div>
                <div class="stat-value">{{ currentMonth.avgScore.toFixed(1) }}分</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">扣分项总数</div>
                <div class="stat-value">{{ currentMonth.totalDeductions }}</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 部门分布 -->
        <div class="dept-distribution mb-4">
          <h4>考核部门分布</h4>
          <div class="dept-stats">
            <div 
              v-for="(count, dept) in currentMonth.deptDistribution" 
              :key="dept" 
              class="dept-stat"
            >
              <el-tag>{{ dept }}</el-tag>
              <span class="count">{{ count }} 次</span>
            </div>
          </div>
        </div>

        <!-- 分数分布 -->
        <div class="score-distribution">
          <h4>分数分布</h4>
          <div class="score-ranges">
            <div v-for="range in currentMonth.scoreRanges" :key="range.range" class="score-range">
              <span class="range-label">{{ range.range }}</span>
              <span class="range-count">{{ range.count }} 人</span>
              <div class="range-bar">
                <div 
                  class="range-fill" 
                  :style="{ width: (range.count / currentMonth.recordCount * 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportMonthData">导出该月数据</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, 
  Search, 
  View, 
  Delete 
} from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import type { AssessmentRecord } from '@/types'

const mainStore = useMainStore()

// 状态
const loading = ref(false)
const searchKeyword = ref('')
const detailDialogVisible = ref(false)
const currentMonth = ref<any>(null)

// 计算月度数据列表
const monthlyDataList = computed(() => {
  if (!mainStore.database?.assessmentDB) return []
  
  return Object.entries(mainStore.database.assessmentDB)
    .map(([key, records]) => {
      const [year, month] = key.split('_').map(Number)
      const recordsList = records as AssessmentRecord[]
      
      // 计算统计信息
      const conductorIds = new Set(recordsList.map(r => r.conductorId))
      const assessorDepts = new Set(recordsList.map(r => r.assessorDepartmentName))
      const totalScore = recordsList.reduce((sum, r) => sum + (r.finalScore || 0), 0)
      const avgScore = recordsList.length > 0 ? totalScore / recordsList.length : 0
      const totalDeductions = recordsList.reduce((sum, r) => sum + r.details.length, 0)
      
      // 最新记录的创建时间作为上传时间
      const uploadTime = Math.max(...recordsList.map(r => r.createdAt || 0))
      
      // 部门分布
      const deptDistribution = recordsList.reduce((acc, record) => {
        const dept = record.assessorDepartmentName
        acc[dept] = (acc[dept] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // 分数分布
      const scoreRanges = [
        { range: '90-100分', count: 0 },
        { range: '80-89分', count: 0 },
        { range: '70-79分', count: 0 },
        { range: '60-69分', count: 0 },
        { range: '60分以下', count: 0 }
      ]
      
      recordsList.forEach(record => {
        const score = record.finalScore || 0
        if (score >= 90) scoreRanges[0].count++
        else if (score >= 80) scoreRanges[1].count++
        else if (score >= 70) scoreRanges[2].count++
        else if (score >= 60) scoreRanges[3].count++
        else scoreRanges[4].count++
      })
      
      return {
        key,
        year,
        month,
        recordCount: recordsList.length,
        conductorCount: conductorIds.size,
        assessorDepartments: Array.from(assessorDepts),
        avgScore,
        uploadTime,
        totalDeductions,
        deptDistribution,
        scoreRanges
      }
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
})

// 筛选后的数据
const filteredMonthlyData = computed(() => {
  if (!searchKeyword.value) return monthlyDataList.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return monthlyDataList.value.filter(item => 
    `${item.year}年${item.month}月`.includes(keyword) ||
    item.year.toString().includes(keyword) ||
    item.month.toString().includes(keyword)
  )
})

// 总体统计
const totalRecords = computed(() => 
  monthlyDataList.value.reduce((sum, item) => sum + item.recordCount, 0)
)

const uniqueConductors = computed(() => {
  const allIds = new Set<string>()
  if (mainStore.database?.assessmentDB) {
    Object.values(mainStore.database.assessmentDB).forEach(records => {
      (records as AssessmentRecord[]).forEach(record => {
        allIds.add(record.conductorId)
      })
    })
  }
  return allIds.size
})

const estimatedDataSize = computed(() => {
  // 估算数据大小 (每条记录约1KB)
  return totalRecords.value * 1024
})

const estimatedDataSizeKB = computed(() => {
  // 转换为KB显示
  return estimatedDataSize.value / 1024
})

// 格式化日期
const formatDate = (timestamp: number) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 分数样式
const getScoreClass = (score: number) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 80) return 'score-good'
  if (score >= 70) return 'score-fair'
  if (score >= 60) return 'score-poor'
  return 'score-fail'
}

// 查看详情
const viewDetails = (monthData: any) => {
  currentMonth.value = monthData
  detailDialogVisible.value = true
}

// 确认删除
const confirmDelete = async (monthData: any) => {
  const result = await ElMessageBox.confirm(
    `确定要删除 ${monthData.year}年${monthData.month}月 的考核记录吗？此操作将删除该月的所有 ${monthData.recordCount} 条记录，且无法恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: true
    }
  ).catch(() => false)

  if (result) {
    await deleteMonthData(monthData)
  }
}

// 删除月度数据
const deleteMonthData = async (monthData: any) => {
  loading.value = true
  
  try {
    if (mainStore.database?.assessmentDB) {
      delete mainStore.database.assessmentDB[monthData.key]
      await mainStore.saveDatabase()
      ElMessage.success(`已删除 ${monthData.year}年${monthData.month}月 的考核记录`)
    }
  } catch (error) {
    console.error('删除失败:', error)
    ElMessage.error('删除失败，请重试')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    await mainStore.loadDatabase()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  } finally {
    loading.value = false
  }
}

// 导出月度数据
const exportMonthData = () => {
  if (!currentMonth.value) return
  
  // 这里可以实现导出功能
  ElMessage.info('导出功能开发中...')
}

// 初始化
onMounted(() => {
  if (!mainStore.database) {
    mainStore.loadDatabase()
  }
})

// 对外暴露刷新方法，供父组件调用
defineExpose({
  refreshData
})
</script>

<style lang="scss" scoped>
.record-management {
  .card {
    background: var(--bg-white);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    h3 {
      margin: 0 0 20px 0;
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
    }
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    .filter-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  }
  
  .dept-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .mr-1 {
    margin-right: 4px;
  }
  
  // 分数颜色
  .score-excellent { color: #52c41a; font-weight: 600; }
  .score-good { color: #1890ff; font-weight: 600; }
  .score-fair { color: #faad14; font-weight: 600; }
  .score-poor { color: #ff7875; font-weight: 600; }
  .score-fail { color: #f5222d; font-weight: 600; }
  
  // 详情对话框样式
  .detail-content {
    .stat-item {
      text-align: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 6px;
      
      .stat-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: 20px;
        font-weight: 600;
        color: var(--primary-color);
      }
    }
    
    .dept-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      
      .dept-stat {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--bg-secondary);
        border-radius: 6px;
        
        .count {
          font-weight: 600;
          color: var(--primary-color);
        }
      }
    }
    
    .score-ranges {
      .score-range {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        
        .range-label {
          min-width: 80px;
          font-size: 14px;
        }
        
        .range-count {
          min-width: 60px;
          font-weight: 600;
          color: var(--primary-color);
        }
        
        .range-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-secondary);
          border-radius: 3px;
          overflow: hidden;
          
          .range-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
            transition: width 0.3s ease;
          }
        }
      }
    }
  }
}

.mb-4 {
  margin-bottom: 16px;
}

h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
</style> 