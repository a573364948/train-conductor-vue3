<template>
  <div class="attendance-status-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>在岗统计</h1>
      <p class="description">职工全年在岗状态可视化管理</p>
    </div>

    <!-- 筛选控件 -->
    <div class="filter-section card">
      <el-row :gutter="20">
        <el-col :span="4">
          <el-select v-model="selectedYear" placeholder="选择年份" @change="loadAttendanceData">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year + '年'"
              :value="year"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedDepartment" placeholder="选择部门" @change="filterData">
            <el-option label="全部部门" value="all" />
            <el-option
              v-for="dept in departments"
              :key="dept"
              :label="dept"
              :value="dept"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="在岗状态" @change="filterData">
            <el-option label="全部" value="all" />
            <el-option label="在岗" value="在岗" />
            <el-option label="不在岗" value="不在岗" />
            <el-option label="助勤" value="助勤" />
            <el-option label="待确认" value="待确认" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索工号或姓名"
            clearable
            :loading="searchLoading"
            @input="handleSearchInput"
            @clear="handleSearchClear"
          >
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="exportAttendanceData" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出在岗状态
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <el-row :gutter="20">
        <el-col :span="4">
          <div class="stat-card">
            <div class="stat-card-icon primary">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-title">总人数</div>
              <div class="stat-card-value">
                {{ statistics.totalCount }}
                <span class="unit">人</span>
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="4">
          <div class="stat-card">
            <div class="stat-card-icon success">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-title">在岗人数</div>
              <div class="stat-card-value">
                {{ statistics.activeCount }}
                <span class="unit">人</span>
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="4">
          <div class="stat-card">
            <div class="stat-card-icon warning">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-title">助勤人数</div>
              <div class="stat-card-value">
                {{ statistics.helpingCount }}
                <span class="unit">人</span>
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="4">
          <div class="stat-card">
            <div class="stat-card-icon info">
              <el-icon><QuestionFilled /></el-icon>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-title">待确认</div>
              <div class="stat-card-value">
                {{ statistics.pendingCount }}
                <span class="unit">人</span>
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="4">
          <div class="stat-card">
            <div class="stat-card-icon error">
              <el-icon><Close /></el-icon>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-title">不在岗</div>
              <div class="stat-card-value">
                {{ statistics.inactiveCount }}
                <span class="unit">人</span>
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="4">
          <div class="stat-card">
            <div class="stat-card-icon info">
              <el-icon><QuestionFilled /></el-icon>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-title">数据完整性</div>
              <div class="stat-card-value">
                {{ dataIntegrityReport.completenessRate }}
                <span class="unit">%</span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
      
      <!-- 第二行：质量评分 -->
      <el-row :gutter="20" style="margin-top: 16px;">
        <el-col :span="4" :offset="20">
          <div class="stat-card">
            <div class="stat-card-icon" :class="getQualityScoreType(dataIntegrityReport.qualityScore)">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-title">数据质量</div>
              <div class="stat-card-value">
                {{ dataIntegrityReport.qualityScore }}
                <span class="unit">分</span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 在岗状态表格 -->
    <div class="attendance-table card">
      <div class="card-header">
        <div class="header-left">
          <h3>在岗状态详情</h3>
          <div class="data-summary">
            <span class="summary-text">
              共 {{ filteredAttendanceData.length }} 人
              <span v-if="isFiltered" class="filter-hint">
                (从 {{ attendanceData.length }} 人中筛选)
              </span>
            </span>
            <span class="summary-divider">|</span>
            <span class="summary-text">{{ availableMonths.length }} 个月数据</span>
            <span v-if="searchKeyword" class="search-indicator">
              <el-icon><Search /></el-icon>
              "{{ searchKeyword }}"
            </span>
          </div>
        </div>
        
        <div class="header-right">
          <el-button 
            type="info" 
            size="small" 
            @click="showQualityReport = true"
            v-if="dataIntegrityReport.anomalousData.length > 0"
          >
            <el-icon><QuestionFilled /></el-icon>
            数据质量报告 ({{ dataIntegrityReport.anomalousData.length }})
          </el-button>
        </div>
      </div>
      
      <!-- 筛选结果统计区域 -->
      <div v-if="isFiltered" class="filter-stats-section">
        <div class="filter-stats-header">
          <div class="filter-conditions">
            <span class="conditions-label">筛选条件：</span>
            <span class="conditions-text">{{ filterDescription }}</span>
          </div>
          <div class="filter-summary">
            <span class="summary-item">
              <span class="summary-label">筛选结果：</span>
              <span class="summary-value highlight">{{ filteredStatistics.totalCount }}</span>
              <span class="summary-unit">人</span>
              <span class="summary-rate">({{ filteredStatistics.filteredRate }}%)</span>
            </span>
            <span class="summary-divider">|</span>
            <span class="summary-item">
              <span class="summary-label">涉及部门：</span>
              <span class="summary-value">{{ filteredStatistics.departmentCount }}</span>
              <span class="summary-unit">个</span>
            </span>
            <el-button 
              type="warning" 
              size="small" 
              text 
              @click="clearAllFilters"
              style="margin-left: 12px;"
            >
              <el-icon><Close /></el-icon>
              清空筛选
            </el-button>
          </div>
        </div>
        
        <div class="filter-stats-distribution">
          <div class="distribution-title">状态分布：</div>
          <div class="distribution-items">
            <div class="distribution-item active">
              <span class="dist-dot"></span>
              <span class="dist-label">在岗</span>
              <span class="dist-value">{{ filteredStatistics.activeCount }}</span>
            </div>
            <div class="distribution-item helping">
              <span class="dist-dot"></span>
              <span class="dist-label">助勤</span>
              <span class="dist-value">{{ filteredStatistics.helpingCount }}</span>
            </div>
            <div class="distribution-item pending">
              <span class="dist-dot"></span>
              <span class="dist-label">待确认</span>
              <span class="dist-value">{{ filteredStatistics.pendingCount }}</span>
            </div>
                         <div class="distribution-item inactive">
               <span class="dist-dot"></span>
               <span class="dist-label">不在岗</span>
               <span class="dist-value">{{ filteredStatistics.inactiveCount }}</span>
             </div>
           </div>
         </div>
         

       </div>
      
      <!-- 状态说明区域 -->
      <div class="status-legend-section">
        <div class="legend">
          <div class="legend-title">状态说明：</div>
          <div class="legend-items">
            <div class="legend-item" @mouseenter="highlightStatus('在岗')" @mouseleave="clearHighlight">
              <span class="status-indicator active">
                <span class="indicator-dot"></span>
                <span class="indicator-icon">✓</span>
              </span>
              <span class="legend-label">
                <span class="status-name">在岗</span>
                <span class="status-desc">正常工作状态</span>
              </span>
            </div>
            
            <div class="legend-item" @mouseenter="highlightStatus('助勤')" @mouseleave="clearHighlight">
              <span class="status-indicator helping">
                <span class="indicator-dot"></span>
                <span class="indicator-icon">⚡</span>
              </span>
              <span class="legend-label">
                <span class="status-name">助勤</span>
                <span class="status-desc">协助工作，固定1500元</span>
              </span>
            </div>
            
            <div class="legend-item" @mouseenter="highlightStatus('待确认')" @mouseleave="clearHighlight">
              <span class="status-indicator pending">
                <span class="indicator-dot"></span>
                <span class="indicator-icon">?</span>
              </span>
              <span class="legend-label">
                <span class="status-name">待确认</span>
                <span class="status-desc">得分高但奖励为0</span>
              </span>
            </div>
            
            <div class="legend-item" @mouseenter="highlightStatus('不在岗')" @mouseleave="clearHighlight">
              <span class="status-indicator inactive">
                <span class="indicator-dot"></span>
                <span class="indicator-icon">✕</span>
              </span>
              <span class="legend-label">
                <span class="status-name">不在岗</span>
                <span class="status-desc">当月未工作</span>
              </span>
            </div>
            
            <div class="legend-item" @mouseenter="highlightStatus('NO_DATA')" @mouseleave="clearHighlight">
              <span class="status-indicator no-data">
                <span class="indicator-dot"></span>
                <span class="indicator-icon">-</span>
              </span>
              <span class="legend-label">
                <span class="status-name">未上传</span>
                <span class="status-desc">系统中无此月数据</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="table-container">
          <el-table
            :data="pagedAttendanceData"
            stripe
            v-loading="loading"
            :height="tableHeight"
            style="width: 100%"
            :row-style="{ height: '48px' }"
            :cell-style="{ padding: '8px 12px' }"
            :header-row-style="{ height: '44px', background: '#fafbfc' }"
            :header-cell-style="{ 
              padding: '8px 12px', 
              fontWeight: '600', 
              color: '#374151',
              borderBottom: '2px solid #e5e7eb'
            }"
          >
            <el-table-column 
              prop="id" 
              label="工号" 
              width="140" 
              fixed="left"
              :show-overflow-tooltip="true"
            />
            <el-table-column 
              prop="name" 
              label="姓名" 
              width="160" 
              fixed="left"
              :show-overflow-tooltip="true"
            />
            <el-table-column 
              prop="department" 
              label="部门" 
              width="180" 
              fixed="left"
              :show-overflow-tooltip="true"
            />
            
            <!-- 动态月份状态列 -->
            <el-table-column
              v-for="monthInfo in monthsDisplay"
              :key="monthInfo.month"
              :label="monthInfo.label"
              width="80"
              align="center"
              header-align="center"
              class-name="month-column"
            >
              <template #header>
                <div class="month-header">
                  {{ monthInfo.label }}
                </div>
              </template>
              <template #default="{ row }">
                <div 
                  class="status-cell"
                  :class="getStatusClass(row.monthlyStatus[monthInfo.month] || '不在岗')"
                  :title="`${monthInfo.label}: ${row.monthlyStatus[monthInfo.month] || '不在岗'}`"
                  tabindex="0"
                  role="button"
                  :aria-label="`${monthInfo.label}: ${row.monthlyStatus[monthInfo.month] || '不在岗'}`"
                  @click="handleStatusClick($event, row, monthInfo.month)"
                >
                  <span class="status-dot"></span>
                  <span class="status-icon" :data-status="row.monthlyStatus[monthInfo.month] || '不在岗'">
                    <i v-if="(row.monthlyStatus[monthInfo.month] || '不在岗') === '在岗'" class="icon-checkmark">✓</i>
                    <i v-else-if="(row.monthlyStatus[monthInfo.month] || '不在岗') === '助勤'" class="icon-helping">⚡</i>
                    <i v-else-if="(row.monthlyStatus[monthInfo.month] || '不在岗') === '待确认'" class="icon-pending">?</i>
                    <i v-else-if="(row.monthlyStatus[monthInfo.month] || '不在岗') === 'NO_DATA'" class="icon-no-data">-</i>
                    <i v-else class="icon-inactive">✕</i>
                  </span>
                  

                </div>
              </template>
            </el-table-column>
            
            <el-table-column 
              label="在岗月数" 
              width="120" 
              align="center"
              header-align="center"
              class-name="stat-column"
            >
              <template #header>
                <div class="stat-header">
                  <span>在岗月数</span>
                </div>
              </template>
              <template #default="{ row }">
                <div class="stat-value months">
                  <span class="number">{{ row.activeMonths }}</span>
                  <span class="unit">月</span>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column 
              label="在岗率" 
              width="120" 
              align="center"
              header-align="center"
              class-name="stat-column"
            >
              <template #header>
                <div class="stat-header">
                  <span>在岗率</span>
                </div>
              </template>
              <template #default="{ row }">
                <div class="stat-value rate">
                  <el-tag 
                    :type="getAttendanceRateType(row.attendanceRate)"
                    class="rate-tag"
                    size="small"
                  >
                    {{ row.attendanceRate }}%
                  </el-tag>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="filteredAttendanceData.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
  </div>
  
  <!-- 数据质量报告弹窗 -->
  <el-dialog
    v-model="showQualityReport"
    title="数据质量报告"
    width="800px"
    destroy-on-close
  >
    <div class="quality-report">
      <div class="report-summary">
        <h4>总体评估</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="report-metric">
              <div class="metric-label">数据完整性</div>
              <div class="metric-value" :class="getMetricClass(dataIntegrityReport.completenessRate)">
                {{ dataIntegrityReport.completenessRate }}%
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="report-metric">
              <div class="metric-label">质量评分</div>
              <div class="metric-value" :class="getMetricClass(dataIntegrityReport.qualityScore)">
                {{ dataIntegrityReport.qualityScore }}分
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="report-metric">
              <div class="metric-label">异常数据</div>
              <div class="metric-value danger">
                {{ dataIntegrityReport.anomalousData.length }}人
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
      
      <div class="anomalous-data" v-if="dataIntegrityReport.anomalousData.length > 0">
        <h4>异常数据详情</h4>
        <el-table :data="dataIntegrityReport.anomalousData" style="width: 100%">
          <el-table-column prop="conductorId" label="工号" width="100" />
          <el-table-column prop="conductorName" label="姓名" width="120" />
          <el-table-column label="问题描述">
            <template #default="{ row }">
              <el-tag 
                v-for="issue in row.issues" 
                :key="issue" 
                type="warning" 
                size="small"
                style="margin-right: 5px; margin-bottom: 3px;"
              >
                {{ issue }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="recommendations">
        <h4>改进建议</h4>
        <ul>
          <li v-if="dataIntegrityReport.completenessRate < 90">
            建议补充缺失的月度数据，提高数据完整性
          </li>
          <li v-if="dataIntegrityReport.anomalousData.length > 0">
            建议核查异常数据，确认状态记录的准确性
          </li>
          <li v-if="dataIntegrityReport.qualityScore < 70">
            建议建立数据质量监控机制，定期检查数据异常
          </li>
        </ul>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="showQualityReport = false">关闭</el-button>
      <el-button type="primary" @click="exportQualityReport">导出报告</el-button>
    </template>
  </el-dialog>
  
    <!-- 状态选择面板 -->
  <div 
    v-if="statusSelectPanel" 
    class="status-select-overlay"
    @click="closeStatusPanel"
  >
    <div 
      class="status-select-panel"
      :style="{ 
        left: panelPosition.x + 'px', 
        top: panelPosition.y + 'px' 
      }"
      @click.stop
    >
      <!-- 在岗状态 -->
      <div 
        class="status-option active"
        @click="selectStatus('在岗')"
      >
        <div class="status-icon-wrapper">
          <span class="status-dot"></span>
        </div>
        <span class="status-label">在岗</span>
      </div>
      
      <!-- 助勤状态 -->
      <div 
        class="status-option helping"
        @click="selectStatus('助勤')"
      >
        <div class="status-icon-wrapper">
          <span class="status-dot"></span>
        </div>
        <span class="status-label">助勤</span>
      </div>
      
      <!-- 不在岗状态 -->
      <div 
        class="status-option inactive"
        @click="selectStatus('不在岗')"
      >
        <div class="status-icon-wrapper">
          <span class="status-dot"></span>
        </div>
        <span class="status-label">不在岗</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useMainStore } from '@/stores'
import { ExcelProcessor } from '@/utils/excel'
import { ElMessage } from 'element-plus'
import { User, Check, Clock, Close, Download, QuestionFilled, Search } from '@element-plus/icons-vue'

const mainStore = useMainStore()

// 响应式数据
const selectedYear = ref(new Date().getFullYear())
const selectedDepartment = ref('all')
const statusFilter = ref('all')
const searchKeyword = ref('')
const loading = ref(false)
const exporting = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const tableHeight = ref(600)
const showQualityReport = ref(false)
const highlightedStatus = ref<string | null>(null)
const searchLoading = ref(false)

// 计算属性
const availableYears = computed(() => {
  const years = new Set<number>()
  mainStore.monthlyData.forEach(data => years.add(data.year))
  return Array.from(years).sort((a, b) => b - a)
})

const departments = computed(() => {
  const depts = new Set<string>()
  mainStore.monthlyData.forEach(monthData => {
    monthData.data.forEach(conductor => {
      if (conductor.department) depts.add(conductor.department)
    })
  })
  return Array.from(depts).sort()
})

// 获取选中年份的可用月份
const availableMonths = computed(() => {
  const yearData = mainStore.monthlyData.filter(data => data.year === selectedYear.value)
  const months = yearData.map(data => data.month).sort((a, b) => a - b)
  return months
})

// 获取月份显示信息
const monthsDisplay = computed(() => {
  return availableMonths.value.map(month => ({
    month,
    label: `${month}月`,
    hasData: true
  }))
})

// 处理后的在岗数据
const attendanceData = computed(() => {
  const conductorMap = new Map<string, {
    id: string
    name: string
    department: string
    monthlyStatus: Record<number, string>
    activeMonths: number
    attendanceRate: number
  }>()
  
  // 获取选中年份的所有月度数据
  const yearData = mainStore.monthlyData.filter(data => data.year === selectedYear.value)
  
  // 处理每个月的数据
  yearData.forEach(monthData => {
    monthData.data.forEach(conductor => {
      if (!conductorMap.has(conductor.id)) {
        conductorMap.set(conductor.id, {
          id: conductor.id,
          name: conductor.name,
          department: conductor.department,
          monthlyStatus: {},
          activeMonths: 0,
          attendanceRate: 0
        })
      }
      
      const conductorInfo = conductorMap.get(conductor.id)!
      conductorInfo.monthlyStatus[monthData.month] = getEnhancedMonthStatus(conductor.id, monthData.month, selectedYear.value)
    })
  })
  
  // 为所有存在的列车长填充缺失的月份状态（标记为NO_DATA）
  conductorMap.forEach(conductor => {
    availableMonths.value.forEach(month => {
      if (!conductor.monthlyStatus[month]) {
        conductor.monthlyStatus[month] = getEnhancedMonthStatus(conductor.id, month, selectedYear.value)
      }
    })
  })
  
  // 计算在岗月数和在岗率
  conductorMap.forEach(conductor => {
    let activeCount = 0
    let totalMonthsWithData = 0
    
    // 获取当前年份的所有有效月份
    const currentYearMonths = mainStore.monthlyData
      .filter(data => data.year === selectedYear.value)
      .map(data => data.month)
    
    currentYearMonths.forEach(month => {
      const status = conductor.monthlyStatus[month]
      if (status && status !== 'NO_DATA') { // 有数据且不是NO_DATA的月份
        totalMonthsWithData++
        if (status === '在岗' || status === '助勤') {
          activeCount++
        }
      }
    })
    
    conductor.activeMonths = activeCount
    conductor.attendanceRate = totalMonthsWithData > 0 
      ? Math.round((activeCount / totalMonthsWithData) * 100) 
      : 0
  })
  
  return Array.from(conductorMap.values()).sort((a, b) => a.id.localeCompare(b.id))
})

// 过滤后的数据
const filteredAttendanceData = computed(() => {
  let filtered = attendanceData.value
  
  // 部门筛选
  if (selectedDepartment.value !== 'all') {
    filtered = filtered.filter(item => item.department === selectedDepartment.value)
  }
  
  // 状态筛选
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(item => {
      return Object.values(item.monthlyStatus).includes(statusFilter.value)
    })
  }
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(item => 
      item.id.toLowerCase().includes(keyword) || 
      item.name.toLowerCase().includes(keyword)
    )
  }
  
  return filtered
})

// 分页数据
const pagedAttendanceData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredAttendanceData.value.slice(start, end)
})

// 检查是否应用了筛选条件
const isFiltered = computed(() => {
  return selectedDepartment.value !== 'all' || 
         statusFilter.value !== 'all' || 
         searchKeyword.value.trim() !== ''
})

// 筛选后的数据分布统计
const filteredStatistics = computed(() => {
  const data = filteredAttendanceData.value
  let activeCount = 0
  let helpingCount = 0
  let inactiveCount = 0
  let pendingCount = 0
  let departments = new Set<string>()
  
  // 统计当前月份的状态（或最新月份）
  const currentMonth = new Date().getMonth() + 1
  data.forEach(conductor => {
    const status = conductor.monthlyStatus[currentMonth] || '不在岗'
    departments.add(conductor.department)
    
    if (status === '在岗') {
      activeCount++
    } else if (status === '助勤') {
      helpingCount++
    } else if (status === '待确认') {
      pendingCount++
    } else {
      inactiveCount++
    }
  })
  
  return {
    totalCount: data.length,
    activeCount,
    helpingCount,
    inactiveCount,
    pendingCount,
    departmentCount: departments.size,
    filteredRate: attendanceData.value.length > 0 
      ? Math.round((data.length / attendanceData.value.length) * 100) 
      : 100
  }
})

// 当前筛选条件描述
const filterDescription = computed(() => {
  const conditions: string[] = []
  
  if (selectedDepartment.value !== 'all') {
    conditions.push(`部门: ${selectedDepartment.value}`)
  }
  
  if (statusFilter.value !== 'all') {
    conditions.push(`状态: ${statusFilter.value}`)
  }
  
  if (searchKeyword.value.trim()) {
    conditions.push(`搜索: "${searchKeyword.value}"`)
  }
  
  return conditions.length > 0 ? conditions.join(' | ') : '无筛选条件'
})



// 统计数据
const statistics = computed(() => {
  const data = filteredAttendanceData.value
  let activeCount = 0
  let helpingCount = 0
  let inactiveCount = 0
  let pendingCount = 0
  
  // 统计当前月份的状态（或最新月份）
  const currentMonth = new Date().getMonth() + 1
  data.forEach(conductor => {
    const status = conductor.monthlyStatus[currentMonth] || '不在岗'
    if (status === '在岗') {
      activeCount++
    } else if (status === '助勤') {
      helpingCount++
    } else if (status === '待确认') {
      pendingCount++
    } else {
      inactiveCount++
    }
  })
  
  return {
    totalCount: data.length,
    activeCount,
    helpingCount,
    inactiveCount,
    pendingCount
  }
})

// 数据完整性检查
const dataIntegrityReport = computed(() => {
  const report = {
    totalConductors: 0,
    totalMonths: availableMonths.value.length,
    missingDataCount: 0,
    anomalousData: [] as Array<{
      conductorId: string,
      conductorName: string,
      issues: string[]
    }>,
    completenessRate: 0,
    qualityScore: 0
  }
  
  attendanceData.value.forEach(conductor => {
    report.totalConductors++
    const issues: string[] = []
    let missingCount = 0
    let consecutiveInactiveMonths = 0
    let hasAnyActiveData = false
    
    // 检查数据完整性
    availableMonths.value.forEach(month => {
      const status = conductor.monthlyStatus[month]
      
      if (status === 'NO_DATA') {
        missingCount++
        report.missingDataCount++
      } else if (status === '在岗' || status === '助勤') {
        hasAnyActiveData = true
        consecutiveInactiveMonths = 0
      } else if (status === '不在岗') {
        consecutiveInactiveMonths++
      }
    })
    
    // 检查异常模式
    if (missingCount > availableMonths.value.length * 0.5) {
      issues.push(`数据缺失过多 (${missingCount}/${availableMonths.value.length}月)`)
    }
    
    if (consecutiveInactiveMonths >= 6) {
      issues.push(`连续${consecutiveInactiveMonths}个月不在岗`)
    }
    
    if (!hasAnyActiveData && availableMonths.value.length > 0) {
      issues.push('全年无在岗记录')
    }
    
    if (conductor.attendanceRate > 0 && conductor.attendanceRate < 20) {
      issues.push(`在岗率异常低 (${conductor.attendanceRate}%)`)
    }
    
    if (issues.length > 0) {
      report.anomalousData.push({
        conductorId: conductor.id,
        conductorName: conductor.name,
        issues
      })
    }
  })
  
  // 计算完整性和质量评分
  const totalPossibleData = report.totalConductors * report.totalMonths
  report.completenessRate = totalPossibleData > 0 
    ? Math.round(((totalPossibleData - report.missingDataCount) / totalPossibleData) * 100)
    : 100
    
  // 质量评分：基于完整性和异常数据比例
  const anomalousRate = report.totalConductors > 0 
    ? (report.anomalousData.length / report.totalConductors) * 100 
    : 0
  report.qualityScore = Math.max(0, Math.round(report.completenessRate - anomalousRate))
  
  return report
})

// 工具函数
const getStatusClass = (status: string): string => {
  switch (status) {
    case '在岗': return 'status-active'
    case '助勤': return 'status-helping'
    case '待确认': return 'status-pending'
    case 'NO_DATA': return 'status-no-data'
    case '不在岗': 
    default: return 'status-inactive'
  }
}

const getAttendanceRateType = (rate: number): 'success' | 'warning' | 'danger' => {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'warning'
  return 'danger'
}

const getQualityScoreType = (score: number): string => {
  if (score >= 90) return 'success'
  if (score >= 70) return 'warning'
  return 'danger'
}

const getMetricClass = (value: number): string => {
  if (value >= 90) return 'success'
  if (value >= 70) return 'warning'
  return 'danger'
}

// 事件处理
const loadAttendanceData = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const filterData = () => {
  currentPage.value = 1
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

// 图例交互功能
const highlightStatus = (status: string) => {
  highlightedStatus.value = status
}

const clearHighlight = () => {
  highlightedStatus.value = null
}

const exportAttendanceData = async () => {
  exporting.value = true
  
  try {
    // 准备导出数据
    const exportData = filteredAttendanceData.value.map(conductor => {
      const row: any = {
        工号: conductor.id,
        姓名: conductor.name,
        部门: conductor.department,
        在岗月数: conductor.activeMonths,
        在岗率: conductor.attendanceRate + '%'
      }
      
      // 添加有数据的月份状态
      availableMonths.value.forEach(month => {
        row[`${month}月`] = conductor.monthlyStatus[month] || '不在岗'
      })
      
      return row
    })
    
    ExcelProcessor.exportToExcel(exportData, `${selectedYear.value}年在岗统计数据.xlsx`)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

const exportQualityReport = async () => {
  try {
    const reportData = [
      {
        项目: '数据完整性',
        值: `${dataIntegrityReport.value.completenessRate}%`,
        评级: getMetricClass(dataIntegrityReport.value.completenessRate)
      },
      {
        项目: '质量评分',
        值: `${dataIntegrityReport.value.qualityScore}分`,
        评级: getMetricClass(dataIntegrityReport.value.qualityScore)
      },
      {
        项目: '异常数据数量',
        值: `${dataIntegrityReport.value.anomalousData.length}人`,
        评级: 'info'
      }
    ]
    
    // 添加异常数据详情
    dataIntegrityReport.value.anomalousData.forEach(item => {
      reportData.push({
        项目: '异常数据',
        值: `${item.conductorId} ${item.conductorName}`,
        评级: item.issues.join('; ')
      })
    })
    
    ExcelProcessor.exportToExcel(reportData, `${selectedYear.value}年数据质量报告.xlsx`)
    ElMessage.success('质量报告导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 获取增强的月份状态
const getEnhancedMonthStatus = (conductorId: string, month: number, year: number) => {
  // 检查该月份是否有系统数据
  const hasSystemData = mainStore.monthlyData.some(
    data => data.year === year && data.month === month
  )
  
  if (!hasSystemData) {
    return 'NO_DATA' // 系统中无此月份数据
  }
  
  // 查找该列车长在该月份的具体数据
  const conductorData = mainStore.monthlyData
    .filter(data => data.year === year && data.month === month)
    .flatMap(data => data.data)
    .find(item => item.id === conductorId)
  
  if (!conductorData) {
    return '不在岗' // 该月份有系统数据，但此人无数据，说明不在岗
  }
  
  // 返回实际状态
  return mainStore.getUnifiedStatus(conductorData)
}

// 搜索防抖处理
let searchDebounceTimer: number | null = null

const handleSearchInput = () => {
  searchLoading.value = true
  
  // 清除之前的定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  // 设置新的防抖定时器
  searchDebounceTimer = setTimeout(() => {
    searchLoading.value = false
    filterData()
  }, 300) // 300ms 防抖延迟
}

const handleSearchClear = () => {
  searchLoading.value = false
  
  // 清除防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  
  // 立即触发筛选
  filterData()
}

// 清空所有筛选条件
const clearAllFilters = () => {
  selectedDepartment.value = 'all'
  statusFilter.value = 'all'
  searchKeyword.value = ''
  searchLoading.value = false
  
  // 清除搜索防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  
  // 重置分页并触发筛选
  currentPage.value = 1
  filterData()
}

// 状态修改相关
const statusSelectPanel = ref(false)
const editingConductor = ref<any>(null)
const editingMonth = ref<number>(0)
const panelPosition = ref({ x: 0, y: 0 })

// 处理状态单元格点击
const handleStatusClick = (event: MouseEvent, conductor: any, month: number) => {
  const currentStatus = conductor.monthlyStatus[month] || '不在岗'
  
  // 只有待确认状态可以修改
  if (currentStatus !== '待确认') {
    return
  }
  
  // 获取点击位置并智能定位
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  const panelWidth = 200 // 面板估计宽度
  const panelHeight = 80 // 面板估计高度
  const margin = 10 // 边距
  
  let x = rect.left + rect.width / 2
  let y = rect.top - panelHeight - margin
  
  // 防止超出左右边界
  if (x - panelWidth / 2 < margin) {
    x = panelWidth / 2 + margin
  } else if (x + panelWidth / 2 > window.innerWidth - margin) {
    x = window.innerWidth - panelWidth / 2 - margin
  }
  
  // 防止超出上边界，如果上方空间不够就显示在下方
  if (y < margin) {
    y = rect.bottom + margin
  }
  
  panelPosition.value = { x, y }
  
  editingConductor.value = conductor
  editingMonth.value = month
  statusSelectPanel.value = true
}

// 选择状态并保存
const selectStatus = async (newStatus: '在岗' | '不在岗' | '助勤') => {
  if (!editingConductor.value) {
    return
  }
  
  try {
    loading.value = true
    
    // 查找并更新对应的月度数据
    const targetData = mainStore.monthlyData.find(data => 
      data.year === selectedYear.value && 
      data.month === editingMonth.value
    )
    
    if (targetData) {
      const conductorData = targetData.data.find(c => c.id === editingConductor.value.id)
      if (conductorData) {
        // 根据新状态更新相关字段
        const isActiveStatus = newStatus === '在岗' || newStatus === '助勤'
        
        // 更新状态字段
        conductorData.status = newStatus
        conductorData.isActive = isActiveStatus
        
        // 如果选择助勤，设置固定奖励
        if (newStatus === '助勤') {
          conductorData.rewardAmount = 1500
        }
        
        // 保存到数据库
        await mainStore.saveDatabase()
        
        // 更新本地显示数据
        editingConductor.value.monthlyStatus[editingMonth.value] = newStatus
        
        // 关闭面板
        statusSelectPanel.value = false
        
        // 添加选择动画效果
        setTimeout(() => {
          // 找到对应的状态单元格并添加闪烁效果
          const targetCell = document.querySelector(`[aria-label*="${editingMonth.value}月"]`)
          if (targetCell) {
            targetCell.classList.add('status-updated')
            setTimeout(() => {
              targetCell.classList.remove('status-updated')
            }, 1000)
          }
        }, 100)
        
        ElMessage.success(`已将${editingConductor.value.name}在${editingMonth.value}月的状态修改为：${newStatus}`)
        
        editingConductor.value = null
        editingMonth.value = 0
      }
    }
    
  } catch (error) {
    console.error('状态修改失败:', error)
    ElMessage.error('状态修改失败，请重试')
  } finally {
    loading.value = false
  }
}

// 关闭状态选择面板
const closeStatusPanel = () => {
  statusSelectPanel.value = false
  editingConductor.value = null
  editingMonth.value = 0
}



onMounted(async () => {
  await mainStore.loadDatabase()
  loadAttendanceData()
  
  // 设置表格高度
  nextTick(() => {
    const windowHeight = window.innerHeight
    tableHeight.value = Math.max(400, windowHeight - 400)
  })
})
</script>

<style lang="scss" scoped>
.attendance-status-container {
  .page-header {
    margin-bottom: 20px;
    
    h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .description {
      margin: 0;
      color: var(--text-secondary);
      font-size: 14px;
    }
  }
  
  .filter-section {
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .stat-cards {
    margin-bottom: 24px;
    
    .stat-card {
      background: linear-gradient(145deg, #ffffff, #f8fafc);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      box-shadow: 
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(226, 232, 240, 0.8);
      transition: all 0.3s ease;
      height: 100px;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      
      .stat-card-icon {
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        margin-top: 2px;
        
        &.primary { 
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05)); 
          color: #6366f1; 
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        &.success { 
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05)); 
          color: #22c55e; 
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        &.warning { 
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05)); 
          color: #f97316; 
          border: 1px solid rgba(249, 115, 22, 0.2);
        }
        &.error { 
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)); 
          color: #ef4444; 
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        &.info { 
          background: linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(156, 163, 175, 0.05)); 
          color: #6b7280; 
          border: 1px solid rgba(156, 163, 175, 0.2);
        }
      }
      
      .stat-card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        
        .stat-card-title {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 6px;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .stat-card-value {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
          display: flex;
          align-items: baseline;
          
          .unit {
            font-size: 12px;
            font-weight: 500;
            color: #9ca3af;
            margin-left: 4px;
          }
        }
      }
    }
  }
  
  .attendance-table {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 20px 0 20px;
      border-bottom: none;
      
      .header-left {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .data-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          
          .summary-text {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
          }
          
          .summary-divider {
            color: #d1d5db;
            font-weight: 300;
          }
          
          .filter-hint {
            color: #9ca3af;
            font-size: 12px;
            margin-left: 4px;
          }
          
          .search-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #6366f1;
            background: rgba(99, 102, 241, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
            
            .el-icon {
              font-size: 12px;
            }
          }
        }
        
        /* 待确认状态可点击提示 */
        .status-cell.status-pending {
          cursor: pointer;
        }
      }
      
      .header-right {
        display: flex;
        gap: 20px;
        align-items: flex-start;
        margin-top: 4px;
      }
    }
    
    .filter-stats-section {
      padding: 16px 20px;
      background: linear-gradient(145deg, #fef3c7, #fef3c7);
      border: 1px solid #f59e0b;
      border-left: 4px solid #f59e0b;
      margin: 0 20px 0 20px;
      border-radius: 8px;
      
      .filter-stats-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        .filter-conditions {
          display: flex;
          align-items: center;
          gap: 8px;
          
          .conditions-label {
            font-size: 14px;
            font-weight: 600;
            color: #92400e;
          }
          
          .conditions-text {
            font-size: 13px;
            color: #b45309;
            background: rgba(255, 255, 255, 0.6);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid rgba(245, 158, 11, 0.3);
          }
        }
        
        .filter-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          
          .summary-item {
            display: flex;
            align-items: center;
            gap: 4px;
            
            .summary-label {
              font-size: 13px;
              color: #92400e;
              font-weight: 500;
            }
            
            .summary-value {
              font-size: 14px;
              font-weight: 700;
              color: #1f2937;
              
              &.highlight {
                color: #b45309;
                font-size: 16px;
              }
            }
            
            .summary-unit {
              font-size: 12px;
              color: #6b7280;
            }
            
            .summary-rate {
              font-size: 12px;
              color: #b45309;
              font-weight: 600;
            }
          }
          
          .summary-divider {
            color: #d97706;
            font-weight: 300;
                     }
         }
       }
       
       
       
       .filter-stats-distribution {
        display: flex;
        align-items: center;
        gap: 20px;
        
        .distribution-title {
          font-size: 14px;
          font-weight: 600;
          color: #92400e;
          white-space: nowrap;
        }
        
        .distribution-items {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .distribution-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 6px;
          border: 1px solid rgba(245, 158, 11, 0.2);
          
          .dist-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          
          .dist-label {
            font-size: 12px;
            font-weight: 500;
            color: #374151;
          }
          
          .dist-value {
            font-size: 13px;
            font-weight: 700;
            color: #1f2937;
            min-width: 20px;
            text-align: center;
          }
          
          &.active .dist-dot {
            background: #22c55e;
          }
          
          &.helping .dist-dot {
            background: #f97316;
          }
          
          &.pending .dist-dot {
            background: #6366f1;
          }
          
          &.inactive .dist-dot {
            background: #ef4444;
          }
        }
      }
    }
    
    .status-legend-section {
      padding: 16px 20px;
      background: linear-gradient(145deg, #f8fafc, #f1f5f9);
      border-bottom: 1px solid #e2e8f0;
      
      .legend {
        display: flex;
        align-items: center;
        gap: 24px;
        
        .legend-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
        }
        
        .legend-items {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          flex: 1;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid transparent;
          
          &:hover {
            background: rgba(255, 255, 255, 1);
            border-color: rgba(99, 102, 241, 0.2);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            transform: translateY(-1px);
          }
          
          .status-indicator {
            position: relative;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            
            .indicator-dot {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              transition: all 0.3s ease;
            }
            
            .indicator-icon {
              position: absolute;
              font-size: 9px;
              font-weight: bold;
              color: white;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
              opacity: 0;
              transition: opacity 0.3s ease;
            }
            
            &.active { 
              background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
              border: 1px solid rgba(34, 197, 94, 0.3);
              
              .indicator-dot {
                background: linear-gradient(135deg, #22c55e, #16a34a);
              }
            }
            
            &.helping { 
              background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.05));
              border: 1px solid rgba(249, 115, 22, 0.3);
              
              .indicator-dot {
                background: linear-gradient(135deg, #f97316, #ea580c);
              }
            }
            
            &.pending { 
              background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05));
              border: 1px solid rgba(99, 102, 241, 0.3);
              
              .indicator-dot {
                background: linear-gradient(135deg, #6366f1, #4f46e5);
              }
            }
            
            &.inactive { 
              background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
              border: 1px solid rgba(239, 68, 68, 0.3);
              
              .indicator-dot {
                background: linear-gradient(135deg, #ef4444, #dc2626);
              }
            }
            
            &.no-data { 
              background: linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(156, 163, 175, 0.03));
              border: 2px dashed rgba(156, 163, 175, 0.6);
              
              .indicator-dot {
                background: transparent;
                border: 1px dashed rgba(156, 163, 175, 0.6);
                width: 8px;
                height: 8px;
              }
              
              .indicator-icon {
                color: rgba(156, 163, 175, 0.8);
                text-shadow: none;
              }
            }
          }
          
          /* 悬停时显示图标 */
          &:hover .status-indicator {
            .indicator-dot {
              opacity: 0;
              transform: scale(0.8);
            }
            
            .indicator-icon {
              opacity: 1;
            }
          }
          
          .legend-label {
            display: flex;
            flex-direction: column;
            gap: 2px;
            
            .status-name {
              font-size: 13px;
              font-weight: 600;
              color: #374151;
              line-height: 1;
            }
            
            .status-desc {
              font-size: 11px;
              color: #6b7280;
              line-height: 1.2;
              white-space: nowrap;
            }
          }
        }
      }
    }
    
    .card-body {
      padding: 0;
      
      .table-container {
        /* 月份列样式 */
        :deep(.month-column) {
          .cell {
            padding: 0 !important;
          }
        }
        
        /* 统计列样式 */
        :deep(.stat-column) {
          .cell {
            padding: 6px 12px !important;
          }
        }
        
        .month-header {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          padding: 6px 0;
          letter-spacing: 0.5px;
        }
        
        .stat-header {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          
          span {
            white-space: nowrap;
          }
        }
        
        .stat-value {
          display: flex;
          align-items: center;
          justify-content: center;
          
          &.months {
            .number {
              font-size: 16px;
              font-weight: 600;
              color: #374151;
            }
            
            .unit {
              font-size: 12px;
              color: #6b7280;
              margin-left: 2px;
            }
          }
          
          &.rate {
            .rate-tag {
              font-weight: 600;
              border-radius: 6px;
              
              /* 优化不同类型的标签样式 */
              &.el-tag--success {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
                border: 1px solid rgba(34, 197, 94, 0.3);
                color: #166534;
              }
              
              &.el-tag--warning {
                background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05));
                border: 1px solid rgba(249, 115, 22, 0.3);
                color: #9a3412;
              }
              
              &.el-tag--danger {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #991b1b;
              }
            }
          }
        }
      }
      
      .pagination-wrapper {
        padding: 20px;
        display: flex;
        justify-content: center;
      }
    }
  }
}

.quality-report {
  .report-summary {
    margin-bottom: 24px;
    
    h4 {
      margin-bottom: 16px;
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
    }
    
    .report-metric {
      text-align: center;
      padding: 16px;
      background: var(--bg-light);
      border-radius: 8px;
      
      .metric-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      
      .metric-value {
        font-size: 24px;
        font-weight: 600;
        
        &.success { color: #67c23a; }
        &.warning { color: #e6a23c; }
        &.danger { color: #f56c6c; }
      }
    }
  }
  
  .anomalous-data, .recommendations {
    margin-bottom: 24px;
    
    h4 {
      margin-bottom: 16px;
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
    }
  }
  
  .recommendations {
    ul {
      margin: 0;
      padding-left: 20px;
      
      li {
        margin-bottom: 8px;
        color: var(--text-regular);
        line-height: 1.5;
      }
    }
  }
}

.status-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  margin: 2px;
  
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transition: all 0.3s ease;
  }
  
  .status-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 10px;
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    
    i {
      font-style: normal;
      display: block;
      
      &.icon-checkmark { font-size: 12px; }
      &.icon-helping { font-size: 11px; }
      &.icon-pending { font-size: 12px; }
      &.icon-inactive { font-size: 10px; }
      &.icon-no-data { 
        font-size: 14px; 
        color: rgba(156, 163, 175, 0.8);
        text-shadow: none;
      }
    }
  }
  
  /* 悬停时显示图标，隐藏圆点 */
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    .status-dot {
      opacity: 0;
      transform: scale(0.8);
    }
    
    .status-icon {
      opacity: 1;
    }
  }
  
  /* 专注状态时也显示图标（键盘导航） */
  &:focus-visible {
    outline: 2px solid #409eff;
    outline-offset: 2px;
    
    .status-dot {
      opacity: 0;
    }
    
    .status-icon {
      opacity: 1;
    }
  }
  
  &.status-active {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
    border: 1px solid rgba(34, 197, 94, 0.3);
    box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
    
    .status-dot {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
    }
  }
  
  &.status-helping {
    background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.05));
    border: 1px solid rgba(249, 115, 22, 0.3);
    box-shadow: 0 2px 4px rgba(249, 115, 22, 0.1);
    
    .status-dot {
      background: linear-gradient(135deg, #f97316, #ea580c);
      box-shadow: 0 0 8px rgba(249, 115, 22, 0.4);
    }
  }
  
  &.status-pending {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05));
    border: 1px solid rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
    
    .status-dot {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
    }
  }
  
  &.status-inactive {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
    border: 1px solid rgba(239, 68, 68, 0.3);
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
    
    .status-dot {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }
  }
  
  &.status-no-data {
    background: linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(156, 163, 175, 0.03));
    border: 2px dashed rgba(156, 163, 175, 0.4);
    position: relative;
    
    .status-dot {
      background: transparent;
      border: 2px dashed rgba(156, 163, 175, 0.6);
      width: 8px;
      height: 8px;
    }
    
    /* 添加对角线纹理表示无数据 */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 2px,
        rgba(156, 163, 175, 0.1) 2px,
        rgba(156, 163, 175, 0.1) 4px
      );
      border-radius: 4px;
    }
  }
}

/* 状态选择面板样式 */
.status-select-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2000;
  background: transparent;
}

.status-select-panel {
  position: fixed;
  transform: translate(-50%, -100%);
  background: white;
  border-radius: 8px;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.15),
    0 4px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 8px;
  display: flex;
  gap: 4px;
  z-index: 2001;
  
  /* 弹出动画 */
  animation: statusPanelShow 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  .status-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 60px;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    &:active {
      transform: scale(1.1);
    }
    
    .status-icon-wrapper {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }
    }
    
    .status-label {
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      white-space: nowrap;
    }
    
    /* 在岗状态样式 */
    &.active {
      &:hover {
        background: rgba(34, 197, 94, 0.05);
      }
      
      .status-icon-wrapper {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
        border: 1px solid rgba(34, 197, 94, 0.3);
        
        .status-dot {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
        }
      }
    }
    
    /* 助勤状态样式 */
    &.helping {
      &:hover {
        background: rgba(249, 115, 22, 0.05);
      }
      
      .status-icon-wrapper {
        background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.05));
        border: 1px solid rgba(249, 115, 22, 0.3);
        
        .status-dot {
          background: linear-gradient(135deg, #f97316, #ea580c);
          box-shadow: 0 0 8px rgba(249, 115, 22, 0.4);
        }
      }
    }
    
    /* 不在岗状态样式 */
    &.inactive {
      &:hover {
        background: rgba(239, 68, 68, 0.05);
      }
      
      .status-icon-wrapper {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
        border: 1px solid rgba(239, 68, 68, 0.3);
        
        .status-dot {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }
      }
    }
  }
}

/* 面板弹出动画 */
@keyframes statusPanelShow {
  0% {
    opacity: 0;
    transform: translate(-50%, -100%) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -100%) scale(1);
  }
}

/* 状态更新闪烁动画 */
.status-updated {
  animation: statusFlash 1s ease-in-out;
}

@keyframes statusFlash {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  25% {
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
  }
  75% {
    transform: scale(1.02);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
  }
}
</style> 