<template>
  <div class="assessment-records-container">
    <!-- 筛选条件 -->
    <div class="filter-section card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="年月">
          <el-date-picker
            v-model="filterForm.yearMonth"
            type="month"
            placeholder="选择月份"
            format="YYYY年MM月"
            value-format="YYYY-MM"
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="filterForm.department" placeholder="全部部门" clearable @change="handleFilter">
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
            placeholder="姓名或工号"
            clearable
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item label="考核部门">
          <el-select v-model="filterForm.assessorDept" placeholder="全部" clearable @change="handleFilter">
            <el-option label="科室" value="科室" />
            <el-option label="车队" value="车队" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-statistic title="考核记录数" :value="filteredRecords.length" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="涉及人员" :value="stats.conductorCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="累计分值" :value="stats.totalScore" suffix="分" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="平均分值" :value="stats.avgScore" :precision="1" suffix="分" />
        </el-col>
      </el-row>
    </div>

    <!-- 记录列表 -->
    <div class="records-section card">
      <div class="section-header">
        <h3>考核记录列表</h3>
        <div class="actions">
          <el-button type="primary" @click="exportRecords">
            <el-icon><Download /></el-icon>
            导出Excel
          </el-button>
        </div>
      </div>
      
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
      
      <!-- 分页 -->
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredRecords.length"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        class="mt-4"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="考核记录详情"
      width="800px"
    >
      <div v-if="currentRecord" class="record-detail">
        <el-descriptions :column="2" border class="mb-4">
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
        
        <h4>考核明细</h4>
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
    </el-dialog>

         <!-- 类别对话框 -->
     <CategoryDialog ref="categoryDialogRef" :categories="categoriesList" @confirm="handleCategoryConfirm" />
     
     <!-- 部门对话框 -->
     <DeptDialog ref="deptDialogRef" @confirm="handleDeptConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Link, Setting } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import { ExcelProcessor } from '@/utils/excel'
import type { AssessmentRecord, StandardAssessmentItem } from '@/types'
import CategoryDialog from './CategoryDialog.vue'
import DeptDialog from './DeptDialog.vue'
import { CategoryService } from '@/utils/categoryService'

const mainStore = useMainStore()

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

// 生命周期
onMounted(() => {
  if (!mainStore.database) {
    mainStore.loadDatabase().then(() => {
      loadRecords()
    })
  } else {
    loadRecords()
  }
})
</script>

<style lang="scss" scoped>
.assessment-records-container {
  .card {
    background: var(--bg-white);
    border-radius: 4px;
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .filter-section {
    :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }
  
  .stats-section {
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
      
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    }
    
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
  
  .record-detail {
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
}
</style> 