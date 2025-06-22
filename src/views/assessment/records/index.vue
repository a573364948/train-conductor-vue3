<template>
  <div class="assessment-records-container" :class="{ 'mobile-layout': isMobile }">
    <!-- 筛选条件 -->
    <div class="filter-section card" :class="{ 'mobile-filter': isMobile }">
      <!-- 手机端筛选按钮 -->
      <div v-if="isMobile" class="mobile-filter-header">
        <el-button 
          @click="showMobileFilter = !showMobileFilter"
          :type="hasActiveFilters ? 'primary' : 'default'"
          class="mobile-filter-toggle"
        >
          <el-icon><Filter /></el-icon>
          筛选条件
          <el-icon v-if="hasActiveFilters"><InfoFilled /></el-icon>
          <el-icon :class="{ 'rotate-180': showMobileFilter }"><ArrowDown /></el-icon>
        </el-button>
        <div v-if="hasActiveFilters" class="active-filters-count">
          {{ activeFiltersCount }}个条件
        </div>
      </div>

      <!-- 筛选表单 -->
      <div v-show="!isMobile || showMobileFilter" class="filter-form-container">
        <el-form 
          :inline="!isMobile" 
          :model="filterForm"
          :class="{ 'mobile-form': isMobile }"
        >
          <el-form-item label="年月">
            <el-date-picker
              v-model="filterForm.yearMonth"
              type="month"
              :placeholder="isMobile ? '选择月份' : '选择月份'"
              format="YYYY年MM月"
              value-format="YYYY-MM"
              @change="handleFilter"
              :size="isMobile ? 'default' : 'default'"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="部门">
            <el-select 
              v-model="filterForm.department" 
              :placeholder="isMobile ? '全部部门' : '全部部门'" 
              clearable 
              @change="handleFilter"
              :size="isMobile ? 'default' : 'default'"
              style="width: 100%"
            >
              <el-option
                v-for="dept in departments"
                :key="dept"
                :label="dept"
                :value="dept"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="列车长">
            <el-input
              v-model="filterForm.conductor"
              :placeholder="isMobile ? '姓名或工号' : '姓名或工号'"
              clearable
              @change="handleFilter"
              :size="isMobile ? 'default' : 'default'"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="考核部门">
            <el-select 
              v-model="filterForm.assessorDept" 
              :placeholder="isMobile ? '全部' : '全部'" 
              clearable 
              @change="handleFilter"
              :size="isMobile ? 'default' : 'default'"
              style="width: 100%"
            >
              <el-option label="科室" value="科室" />
              <el-option label="车队" value="车队" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          
          <el-form-item class="filter-actions">
            <el-button 
              type="primary" 
              @click="handleFilter"
              :size="isMobile ? 'default' : 'default'"
              :class="{ 'mobile-btn': isMobile }"
            >
              <el-icon><Search /></el-icon>
              <span v-if="!isMobile">查询</span>
            </el-button>
            <el-button 
              @click="resetFilter"
              :size="isMobile ? 'default' : 'default'"
              :class="{ 'mobile-btn': isMobile }"
            >
              <el-icon><RefreshLeft /></el-icon>
              <span v-if="!isMobile">重置</span>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section card" :class="{ 'mobile-stats': isMobile }">
      <el-row :gutter="isMobile ? 12 : 20">
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <div class="stat-item">
            <el-statistic 
              title="考核记录数" 
              :value="filteredRecords.length"
              :value-style="{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600' }"
            />
          </div>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <div class="stat-item">
            <el-statistic 
              title="涉及人员" 
              :value="stats.conductorCount"
              :value-style="{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600' }"
            />
          </div>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <div class="stat-item">
            <el-statistic 
              title="累计分值" 
              :value="stats.totalScore" 
              suffix="分"
              :value-style="{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600' }"
            />
          </div>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="6">
          <div class="stat-item">
            <el-statistic 
              title="平均分值" 
              :value="stats.avgScore" 
              :precision="1" 
              suffix="分"
              :value-style="{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600' }"
            />
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 记录列表 -->
    <div class="records-section card">
      <div class="section-header" :class="{ 'mobile-header': isMobile }">
        <h3>考核记录列表</h3>
        <div class="actions">
          <el-button 
            type="primary" 
            @click="exportRecords"
            :size="isMobile ? 'default' : 'default'"
            :class="{ 'mobile-export-btn': isMobile }"
          >
            <el-icon><Download /></el-icon>
            <span v-if="!isMobile">导出Excel</span>
            <span v-else>导出</span>
          </el-button>
        </div>
      </div>
      
      <!-- PC端表格显示 -->
      <div v-if="!isMobile" class="desktop-table">
        <el-table
          :data="pagedRecords"
          stripe
          v-loading="loading"
          @row-click="showRecordDetail"
          style="cursor: pointer"
        >
          <el-table-column prop="conductorId" label="工号" width="100" />
          <el-table-column prop="conductorName" label="姓名" width="100" />
          <el-table-column prop="department" label="所属部门" min-width="150" />
          <el-table-column prop="assessDate" label="考核日期" width="120" sortable />
          <el-table-column label="考核部门" min-width="150">
            <template #default="{ row }">
              <span v-if="row.assessorDepartmentName">{{ row.assessorDepartmentName }}</span>
              <el-button 
                v-else
                type="primary" 
                text 
                size="small"
                @click.stop="openDeptDialog(row)"
              >
                <el-icon><Setting /></el-icon>
                设置部门
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="assessDeptType" label="考核类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getDeptTypeTagType(row.assessDeptType)" size="small">
                {{ row.assessDeptType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="本次分值" width="100" sortable>
            <template #default="{ row }">
              <span :class="getScoreClass(calculateNetScore(row.details))">
                {{ formatScoreDisplay(calculateNetScore(row.details)) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="考核类别" min-width="200">
            <template #default="{ row }">
              <div class="category-display">
                <span class="category-text">{{ getCategoryDisplay(row.details) }}</span>
                <el-tooltip
                  v-if="row.details.length > 0"
                  :content="getDeductionSummary(row.details)"
                  placement="top"
                  :show-after="500"
                >
                  <el-tag size="small" class="ml-2">{{ row.details.length }}项</el-tag>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" text @click.stop="showRecordDetail(row)">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 手机端卡片显示 -->
      <div v-else class="mobile-cards">
        <div 
          v-for="record in pagedRecords" 
          :key="record.id" 
          class="record-card"
          @click="showRecordDetail(record)"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <div class="conductor-info">
              <div class="conductor-name">{{ record.conductorName }}</div>
              <div class="conductor-id">{{ record.conductorId }}</div>
            </div>
            <div class="record-score">
              <span :class="getScoreClass(calculateNetScore(record.details))">
                {{ formatScoreDisplay(calculateNetScore(record.details)) }}分
              </span>
            </div>
          </div>
          
          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="info-row">
              <div class="info-item">
                <span class="info-label">部门</span>
                <span class="info-value">{{ record.department }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">考核日期</span>
                <span class="info-value">{{ record.assessDate }}</span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-item">
                <span class="info-label">考核部门</span>
                <span class="info-value">
                  {{ record.assessorDepartmentName || '未设置' }}
                  <el-tag 
                    v-if="record.assessDeptType" 
                    :type="getDeptTypeTagType(record.assessDeptType)" 
                    size="small"
                    class="ml-1"
                  >
                    {{ record.assessDeptType }}
                  </el-tag>
                </span>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-item">
                <span class="info-label">考核类别</span>
                <div class="category-info">
                  <span class="category-text">{{ getCategoryDisplay(record.details) }}</span>
                  <el-tag v-if="record.details.length > 0" size="small" class="ml-1">
                    {{ record.details.length }}项
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 卡片操作 -->
          <div class="card-actions" @click.stop>
            <el-button 
              type="primary" 
              size="small" 
              @click="showRecordDetail(record)"
              class="mobile-action-btn"
            >
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button 
              v-if="!record.assessorDepartmentName"
              type="warning" 
              size="small" 
              @click="openDeptDialog(record)"
              class="mobile-action-btn"
            >
              <el-icon><Setting /></el-icon>
              设置部门
            </el-button>
          </div>
        </div>
        
        <!-- 无数据状态 -->
        <div v-if="pagedRecords.length === 0" class="empty-state">
          <el-empty :description="filteredRecords.length === 0 ? '暂无考核记录' : '当前页无数据'">
            <el-button type="primary" @click="resetFilter">重置筛选条件</el-button>
          </el-empty>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-wrapper" :class="{ 'mobile-pagination': isMobile }">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredRecords.length"
          :page-sizes="isMobile ? [10, 20, 50] : [10, 20, 50, 100]"
          :layout="isMobile ? 'total, prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
          :small="isMobile"
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="考核记录详情"
      :width="isMobile ? '95%' : '800px'"
      :class="{ 'mobile-dialog': isMobile }"
    >
      <div v-if="currentRecord" class="record-detail" :class="{ 'mobile-detail': isMobile }">
        <el-descriptions 
          :column="isMobile ? 1 : 2" 
          border 
          class="mb-4"
          :size="isMobile ? 'default' : 'default'"
        >
          <el-descriptions-item label="工号">{{ currentRecord.conductorId }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ currentRecord.conductorName }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ currentRecord.department }}</el-descriptions-item>
          <el-descriptions-item label="考核日期">{{ currentRecord.assessDate }}</el-descriptions-item>
          <el-descriptions-item label="考核部门">{{ currentRecord.assessorDepartmentName }}</el-descriptions-item>
          <el-descriptions-item label="考核类型">{{ currentRecord.assessDeptType }}</el-descriptions-item>
          <el-descriptions-item label="基础分">{{ currentRecord.baseScore }}</el-descriptions-item>
          <el-descriptions-item label="本次分值">
            <span :class="getScoreClass(calculateNetScore(currentRecord.details))">
              {{ formatScoreDisplay(calculateNetScore(currentRecord.details)) }}分
            </span>
          </el-descriptions-item>
        </el-descriptions>
        
        <h4 style="margin: 16px 0 12px 0;">考核明细</h4>
        
        <!-- PC端表格显示 -->
        <div v-if="!isMobile">
          <el-table :data="currentRecord.details" border>
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="item" label="考核项目" min-width="200" show-overflow-tooltip />
            <el-table-column label="标准项点" width="150">
              <template #default="{ row }">
                <el-popover
                  v-if="row.itemCode && getStandardItem(row.itemCode)"
                  placement="top"
                  :width="300"
                  trigger="hover"
                >
                  <div class="item-info">
                    <p><strong>项点ID:</strong> {{ row.itemCode }}</p>
                    <p><strong>项点名称:</strong> {{ getStandardItem(row.itemCode)?.name }}</p>
                    <p><strong>标准分值:</strong> {{ getStandardItem(row.itemCode)?.maxScore }}</p>
                    <p><strong>负责部门:</strong> {{ getStandardItem(row.itemCode)?.responsibleDepartment }}</p>
                  </div>
                  <template #reference>
                    <el-tag type="success" size="small" style="cursor: pointer">
                      <el-icon><Link /></el-icon>
                      已关联
                    </el-tag>
                  </template>
                </el-popover>
                <el-tag v-else type="info" size="small">未关联</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="itemCategory" label="考核类别" width="120" />
            <el-table-column prop="deduction" label="分值" width="80">
              <template #default="{ row }">
                <span :class="getScoreClass(row.deduction)">
                  {{ formatScoreDisplay(row.deduction) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="itemDetail" label="详情" min-width="150" show-overflow-tooltip />
          </el-table>
        </div>
        
        <!-- 手机端列表显示 -->
        <div v-else class="mobile-detail-list">
          <div 
            v-for="(detail, index) in currentRecord.details" 
            :key="index" 
            class="detail-item"
          >
            <div class="detail-header">
              <div class="detail-index">{{ index + 1 }}</div>
              <div class="detail-score">
                <span :class="getScoreClass(detail.deduction)">
                  {{ formatScoreDisplay(detail.deduction) }}分
                </span>
              </div>
            </div>
            
            <div class="detail-content">
              <div class="detail-title">{{ detail.item }}</div>
              <div class="detail-meta">
                <div class="meta-item">
                  <span class="meta-label">类别:</span>
                  <span class="meta-value">{{ detail.itemCategory || '未分类' }}</span>
                </div>
                <div class="meta-item" v-if="detail.itemDetail">
                  <span class="meta-label">详情:</span>
                  <span class="meta-value">{{ detail.itemDetail }}</span>
                </div>
                <div class="meta-item" v-if="detail.itemCode && getStandardItem(detail.itemCode)">
                  <span class="meta-label">标准项点:</span>
                  <el-tag type="success" size="small">
                    <el-icon><Link /></el-icon>
                    已关联
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer v-if="isMobile">
        <div class="mobile-dialog-footer">
          <el-button @click="detailDialogVisible = false" size="default">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 类别对话框 -->
    <CategoryDialog ref="categoryDialogRef" :categories="categoriesList" @confirm="handleCategoryConfirm" />
    
    <!-- 部门对话框 -->
    <DeptDialog ref="deptDialogRef" @confirm="handleDeptConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Download, 
  Link, 
  Setting, 
  Search, 
  RefreshLeft, 
  Filter, 
  ArrowDown, 
  InfoFilled,
  View
} from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import { ExcelProcessor } from '@/utils/excel'
import type { AssessmentRecord, StandardAssessmentItem } from '@/types'
import CategoryDialog from './CategoryDialog.vue'
import DeptDialog from './DeptDialog.vue'
import { CategoryService } from '@/utils/categoryService'

const mainStore = useMainStore()

// 移动端检测
const isMobile = ref(false)
const showMobileFilter = ref(false)

const checkMobileDevice = () => {
  const width = window.innerWidth
  isMobile.value = width <= 768
}

const handleResize = () => {
  checkMobileDevice()
}

// 状态
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const detailDialogVisible = ref(false)
const currentRecord = ref<AssessmentRecord | null>(null)
const categoryDialogRef = ref<any>()
const deptDialogRef = ref<any>()
const categoryService = new CategoryService(mainStore.database)

const categoriesList = computed(() => {
  const set = new Set<string>(['服务质量','安全问题','形象问题','操作问题','设备问题','其他问题'])
  if (mainStore.database) {
    // 标准项点库类别
    Object.values(mainStore.database.standardAssessmentItems || {}).forEach((item: any) => {
      if (item.category) set.add(item.category)
    })
    // 已有考核记录中的类别
    allRecords.value.forEach(rec => {
      rec.details.forEach(d => {
        if (d.itemCategory) set.add(d.itemCategory)
      })
    })
  }
  return Array.from(set).sort()
})

function openCategoryDialog(detail: any) {
  categoryDialogRef.value?.open(detail.item, detail.itemCategory || '')
}

function handleCategoryConfirm({ description, category }: { description: string, category: string }) {
  categoryService.saveMapping(description, category)
  // 更新当前数据
  allRecords.value.forEach(rec => {
    rec.details.forEach(d => {
      if (d.item === description) d.itemCategory = category
    })
  })
}

function openDeptDialog(record: any) {
  deptDialogRef.value?.open(record)
}

async function handleDeptConfirm({ recordId, department, type }: { recordId: string, department: string, type: string }) {
  // 更新当前数据
  allRecords.value.forEach(rec => {
    if (rec.id === recordId) {
      rec.assessorDepartmentName = department
      rec.assessDeptType = type as any
    }
  })
  
  // 保存到数据库
  await mainStore.saveDatabase()
}

// 筛选表单
const filterForm = reactive({
  yearMonth: '',
  department: '',
  conductor: '',
  assessorDept: ''
})

// 所有记录
const allRecords = ref<AssessmentRecord[]>([])

// 计算属性
const departments = computed(() => {
  const deptSet = new Set(allRecords.value.map(r => r.department))
  return Array.from(deptSet).sort()
})

const filteredRecords = computed(() => {
  let records = [...allRecords.value]
  
  if (filterForm.department) {
    records = records.filter(r => r.department === filterForm.department)
  }
  
  if (filterForm.conductor) {
    const keyword = filterForm.conductor.toLowerCase()
    records = records.filter(r => 
      r.conductorName.toLowerCase().includes(keyword) ||
      r.conductorId.toLowerCase().includes(keyword)
    )
  }
  
  if (filterForm.assessorDept) {
    records = records.filter(r => r.assessDeptType === filterForm.assessorDept)
  }
  
  return records
})

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRecords.value.slice(start, end)
})

const stats = computed(() => {
  const records = filteredRecords.value
  const conductorSet = new Set(records.map(r => r.conductorId))
  // 计算净分值（包括扣分和加分）
  const totalScore = records.reduce((sum, r) => sum + calculateNetScore(r.details), 0)
  const totalDeduction = records.reduce((sum, r) => sum + calculateTotalDeduction(r.details), 0)
  
  return {
    conductorCount: conductorSet.size,
    totalScore,
    totalDeduction,
    avgScore: records.length > 0 ? totalScore / records.length : 0,
    avgDeduction: records.length > 0 ? totalDeduction / records.length : 0
  }
})

// 方法
const loadRecords = () => {
  if (!mainStore.database) return
  
  loading.value = true
  allRecords.value = []
  
  try {
    const db = mainStore.database.assessmentDB
    
    if (filterForm.yearMonth) {
      // 加载指定月份
      const key = filterForm.yearMonth.replace('-', '_')
      if (db[key]) {
        allRecords.value = db[key]
      }
    } else {
      // 加载所有记录
      Object.values(db).forEach(monthRecords => {
        allRecords.value.push(...monthRecords)
      })
    }
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  currentPage.value = 1
  if (filterForm.yearMonth) {
    loadRecords()
  }
}

const resetFilter = () => {
  filterForm.yearMonth = ''
  filterForm.department = ''
  filterForm.conductor = ''
  filterForm.assessorDept = ''
  currentPage.value = 1
  loadRecords()
}

const showRecordDetail = (row: AssessmentRecord) => {
  currentRecord.value = row
  detailDialogVisible.value = true
}

const getDeptTypeTagType = (type: string) => {
  switch (type) {
    case '科室': return 'success'
    case '车队': return 'warning'
    default: return 'info'
  }
}

const getScoreTagType = (score: number) => {
  if (score >= 90) return 'success'
  if (score >= 80) return 'primary'
  if (score >= 60) return 'warning'
  return 'danger'
}

// 获取标准项点
const getStandardItem = (itemId: string): StandardAssessmentItem | undefined => {
  if (!mainStore.database || !itemId) return undefined
  return mainStore.database.standardAssessmentItems[itemId]
}

// 计算总扣分 (确保返回正数，因为这里计算的是扣分的绝对值)
const calculateTotalDeduction = (details: any[]) => {
  if (!details || details.length === 0) return 0
  return details.reduce((sum, detail) => {
    // 确保取绝对值，因为有些数据可能已经是负数
    const deduction = Math.abs(detail.deduction || 0)
    return sum + deduction
  }, 0)
}

// 计算净分值 (扣分为负，加分为正)
const calculateNetScore = (details: any[]) => {
  if (!details || details.length === 0) return 0
  return details.reduce((sum, detail) => {
    // 保持原始正负值：扣分为负数，加分为正数
    const score = detail.deduction || 0
    return sum + score
  }, 0)
}

// 格式化分值显示
const formatScoreDisplay = (score: number) => {
  if (score === 0) return '0'
  if (score > 0) return `+${score}`
  return `${score}` // 负数本身就带负号
}

// 获取分值样式类
const getScoreClass = (score: number) => {
  if (score > 0) return 'addition-score' // 加分
  if (score < 0) return 'deduction-score' // 扣分
  return 'neutral-score' // 无分值变化
}

// 获取类别显示文本
const getCategoryDisplay = (details: any[]) => {
  if (!details || details.length === 0) return '无'
  
  // 提取所有类别
  const categories = [...new Set(details.map(d => d.itemCategory || '其他').filter(cat => cat))]
  
  // 如果类别过多，只显示前3个
  if (categories.length > 3) {
    return categories.slice(0, 3).join('、') + '...'
  }
  
  return categories.join('、') || '其他'
}

const getDeductionSummary = (details: any[]) => {
  const categories = details.reduce((acc, d) => {
    const cat = d.itemCategory || '其他'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(categories)
    .map(([cat, count]) => `${cat}(${count})`)
    .join('、')
}

const exportRecords = () => {
  const data = filteredRecords.value.map(record => ({
    工号: record.conductorId,
    姓名: record.conductorName,
    部门: record.department,
    考核日期: record.assessDate,
    考核部门: record.assessorDepartmentName,
    考核类型: record.assessDeptType,
    考核项目数: record.details.length,
    本次分值: calculateNetScore(record.details),
    考核类别: getCategoryDisplay(record.details),
    考核明细: record.details.map(d => `${d.item}(${formatScoreDisplay(d.deduction)})`).join('；')
  }))
  
  const fileName = filterForm.yearMonth 
    ? `考核记录_${filterForm.yearMonth}.xlsx`
    : '考核记录_全部.xlsx'
    
  ExcelProcessor.exportToExcel(data, fileName)
  ElMessage.success('导出成功')
}

// 筛选相关计算属性
const hasActiveFilters = computed(() => {
  return !!(filterForm.yearMonth || filterForm.department || filterForm.conductor || filterForm.assessorDept)
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (filterForm.yearMonth) count++
  if (filterForm.department) count++
  if (filterForm.conductor) count++
  if (filterForm.assessorDept) count++
  return count
})

// 生命周期
onMounted(() => {
  checkMobileDevice()
  window.addEventListener('resize', handleResize)
  
  if (!mainStore.database) {
    mainStore.loadDatabase().then(() => {
      loadRecords()
    })
  } else {
    loadRecords()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.assessment-records-container {
  &.mobile-layout {
    padding: 8px;
  }
  
  .card {
    background: var(--bg-white);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  .filter-section {
    &.mobile-filter {
      padding: 12px;
      
      .mobile-filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        .mobile-filter-toggle {
          min-height: 44px;
          font-size: 14px;
          
          .el-icon {
            margin-right: 4px;
            
            &.rotate-180 {
              transform: rotate(180deg);
              transition: transform 0.3s ease;
            }
          }
        }
        
        .active-filters-count {
          font-size: 12px;
          color: #409eff;
          background: rgba(64, 158, 255, 0.1);
          padding: 4px 8px;
          border-radius: 12px;
        }
      }
      
      .filter-form-container {
        .mobile-form {
          .el-form-item {
            margin-bottom: 16px;
            
            .el-form-item__label {
              font-size: 14px;
              font-weight: 500;
              padding-bottom: 6px;
            }
          }
          
          .filter-actions {
            display: flex;
            gap: 12px;
            margin-top: 8px;
            
            .mobile-btn {
              flex: 1;
              min-height: 44px;
              font-size: 14px;
              
              .el-icon {
                margin-right: 4px;
              }
            }
          }
        }
      }
    }
    
    :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }
  
  .stats-section {
    &.mobile-stats {
      padding: 12px;
      
      .stat-item {
        text-align: center;
        padding: 8px;
        
        :deep(.el-statistic) {
          .el-statistic__content {
            .el-statistic__number {
              font-size: 20px !important;
              font-weight: 600 !important;
            }
            
            .el-statistic__suffix {
              font-size: 14px !important;
            }
          }
          
          .el-statistic__head {
            color: #666;
            font-size: 13px;
            margin-bottom: 4px;
          }
        }
      }
    }
    
    :deep(.el-statistic) {
      text-align: center;
    }
  }
  
  .records-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      
      &.mobile-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
        
        h3 {
          text-align: center;
        }
        
        .actions {
          display: flex;
          justify-content: center;
          
          .mobile-export-btn {
            min-height: 44px;
            font-size: 14px;
            padding: 10px 20px;
            
            .el-icon {
              margin-right: 6px;
            }
          }
        }
      }
      
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    }
    
    // 手机端卡片样式
    .mobile-cards {
      .record-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #f0f0f0;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          transform: translateY(-1px);
        }
        
        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          
          .conductor-info {
            .conductor-name {
              font-size: 18px;
              font-weight: 600;
              color: #303133;
              margin-bottom: 4px;
              line-height: 1.3;
            }
            
            .conductor-id {
              font-size: 13px;
              color: #909399;
              font-family: 'Courier New', monospace;
              background: rgba(144, 147, 153, 0.1);
              padding: 2px 6px;
              border-radius: 4px;
              display: inline-block;
            }
          }
          
          .record-score {
            flex-shrink: 0;
            font-size: 16px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 6px;
            background: rgba(0, 0, 0, 0.05);
          }
        }
        
        .card-content {
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            
            .info-item {
              flex: 1;
              display: flex;
              flex-direction: column;
              
              &:not(:last-child) {
                margin-right: 16px;
              }
              
              .info-label {
                font-size: 12px;
                color: #909399;
                margin-bottom: 2px;
                font-weight: 500;
              }
              
              .info-value {
                font-size: 14px;
                color: #606266;
                font-weight: 500;
                line-height: 1.4;
                
                .ml-1 {
                  margin-left: 4px;
                }
              }
              
              .category-info {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 4px;
                
                .category-text {
                  font-size: 14px;
                  color: #606266;
                  font-weight: 500;
                }
                
                .ml-1 {
                  margin-left: 4px;
                }
              }
            }
          }
        }
        
        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f0f0f0;
          
          .mobile-action-btn {
            flex: 1;
            min-height: 36px;
            font-size: 13px;
            
            .el-icon {
              margin-right: 4px;
            }
          }
        }
      }
      
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        background: white;
        border-radius: 12px;
        
        :deep(.el-empty) {
          .el-empty__description {
            margin: 12px 0;
            
            p {
              color: #909399;
              font-size: 14px;
            }
          }
        }
      }
    }
    
    // 分值样式
    .deduction-score {
      color: #f56c6c;
      font-weight: 500;
    }
    
    .addition-score {
      color: #67c23a;
      font-weight: 500;
    }
    
    .neutral-score {
      color: #909399;
      font-weight: 500;
    }
    
    .category-display {
      display: flex;
      align-items: center;
      
      .category-text {
        flex: 1;
        word-break: break-all;
      }
      
      .ml-2 {
        margin-left: 8px;
      }
    }
    
    .deduction-summary {
      color: var(--text-secondary);
      cursor: pointer;
      
      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
  
  // 分页样式
  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    
    &.mobile-pagination {
      :deep(.el-pagination) {
        .el-pagination__total,
        .el-pagination__jump {
          font-size: 12px;
        }
        
        .el-pager {
          li {
            min-width: 32px;
            height: 32px;
            line-height: 30px;
            font-size: 13px;
            margin: 0 2px;
          }
        }
        
        .btn-prev,
        .btn-next {
          min-width: 32px;
          height: 32px;
          line-height: 30px;
        }
      }
    }
  }
  
  // 详情对话框样式
  .record-detail {
    &.mobile-detail {
      .mobile-detail-list {
        .detail-item {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          
          .detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            
            .detail-index {
              width: 24px;
              height: 24px;
              background: #409eff;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 600;
            }
            
            .detail-score {
              font-size: 14px;
              font-weight: 600;
            }
          }
          
          .detail-content {
            .detail-title {
              font-size: 14px;
              font-weight: 500;
              color: #303133;
              margin-bottom: 8px;
              line-height: 1.4;
            }
            
            .detail-meta {
              .meta-item {
                display: flex;
                align-items: center;
                margin-bottom: 4px;
                
                .meta-label {
                  font-size: 12px;
                  color: #909399;
                  margin-right: 6px;
                  min-width: 40px;
                }
                
                .meta-value {
                  font-size: 12px;
                  color: #606266;
                  flex: 1;
                  line-height: 1.4;
                }
              }
            }
          }
        }
      }
    }
    
    h4 {
      margin: 20px 0 12px 0;
      font-size: 14px;
      font-weight: 500;
    }
    
    .mb-4 {
      margin-bottom: 16px;
    }
    
    .item-info {
      p {
        margin: 4px 0;
        font-size: 12px;
        
        strong {
          color: var(--el-color-primary);
        }
      }
    }
  }
  
  .mt-4 {
    margin-top: 16px;
  }
  
  .ml-1 {
    margin-left: 4px;
  }
}

// 手机端对话框样式
:deep(.mobile-dialog) {
  margin: 5vw auto;
  max-width: 95vw;
  
  .el-dialog__body {
    padding: 15px 20px;
  }
  
  .mobile-dialog-footer {
    display: flex;
    gap: 12px;
    padding: 15px 0 0;
    border-top: 1px solid #f0f0f0;
    
    .el-button {
      flex: 1;
      min-height: 44px;
      font-size: 15px;
    }
  }
  
  .mobile-detail {
    :deep(.el-descriptions) {
      .el-descriptions__label {
        width: 80px !important;
        text-align: right;
        padding-right: 8px;
        font-size: 13px;
      }
      
      .el-descriptions__content {
        font-size: 14px;
        padding-left: 8px;
      }
      
      .el-descriptions__cell {
        padding: 8px 12px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .assessment-records-container {
    .card {
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }
}
</style> 