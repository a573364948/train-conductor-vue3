<template>
  <div class="personnel-list">
    <!-- Tab分栏显示系统 -->
    <div class="personnel-tabs">
      <el-tabs 
        v-model="activeTab" 
        @tab-change="handleTabChange"
        type="card"
      >
        <el-tab-pane name="all">
          <template #label>
            <span class="tab-label">
              <el-icon><User /></el-icon>
              全部
              <el-badge :value="totalCount" :max="9999" class="tab-badge" />
            </span>
          </template>
          <!-- Tab内容将由下方统一的表格区域显示 -->
        </el-tab-pane>
        
        <el-tab-pane name="formal">
          <template #label>
            <span class="tab-label">
              <el-icon><UserFilled /></el-icon>
              正式启用
              <el-badge :value="activeCount" :max="9999" class="tab-badge" type="success" />
            </span>
          </template>
          <!-- Tab内容将由下方统一的表格区域显示 -->
        </el-tab-pane>
        
        <el-tab-pane name="temp">
          <template #label>
            <span class="tab-label">
              <el-icon><Clock /></el-icon>
              临时启用
              <el-badge :value="tempCount" :max="9999" class="tab-badge" type="warning" />
            </span>
          </template>
          <!-- Tab内容将由下方统一的表格区域显示 -->
        </el-tab-pane>
        
        <el-tab-pane name="backup">
          <template #label>
            <span class="tab-label">
              <el-icon><Star /></el-icon>
              后备
              <el-badge :value="backupCount" :max="9999" class="tab-badge" type="info" />
            </span>
          </template>
          <!-- Tab内容将由下方统一的表格区域显示 -->
        </el-tab-pane>
        
        <el-tab-pane name="applications" @click="handlePendingApplicationsClick">
          <template #label>
            <span class="tab-label applications-tab" @click="handlePendingApplicationsClick">
              <el-icon><Files /></el-icon>
              待处理申请
              <el-badge :value="pendingCount" :max="9999" class="tab-badge" type="success" />
            </span>
          </template>
          <!-- 此Tab用于跳转到申请管理，不显示内容 -->
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 筛选状态提示 -->
    <div v-if="currentFilter && currentFilter !== 'applications'" class="filter-status">
      <el-alert 
        :title="`当前显示：${getFilterLabel(currentFilter)} (${filteredPersonnel.length}人)`"
        type="info" 
        show-icon 
        :closable="true"
        @close="clearFilter"
      >
        <template #default>
          <span>点击Tab标签可切换筛选条件，点击"全部"标签查看所有人员</span>
        </template>
      </el-alert>
    </div>

    <!-- 智能搜索和筛选区域 -->
    <div class="search-section">
      <div class="main-search">
        <el-input 
          v-model="searchKeyword"
          placeholder="输入工号或姓名快速查询..."
          size="large"
          prefix-icon="Search"
          clearable
          :loading="searchLoading"
          @input="handleSearch"
          @clear="clearSearch"
        >
          <template #append>
            <el-button @click="toggleAdvancedFilter" :type="showAdvancedFilter ? 'primary' : 'default'">
              高级筛选 <el-icon><Filter /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
      
      <!-- 高级筛选面板 -->
      <div v-show="showAdvancedFilter" class="advanced-filter-panel">
        <el-row :gutter="16">
          <el-col :span="6" :xs="24" :sm="12" :md="6">
            <div class="filter-item">
              <label class="filter-label">部门</label>
              <el-select 
                v-model="advancedFilters.departments" 
                multiple 
                placeholder="选择部门"
                collapse-tags
                collapse-tags-tooltip
                style="width: 100%"
                @change="applyAdvancedFilters"
              >
                <el-option 
                  v-for="dept in availableDepartments" 
                  :key="dept" 
                  :value="dept" 
                  :label="dept"
                />
              </el-select>
            </div>
          </el-col>
          
          <el-col :span="4" :xs="24" :sm="12" :md="4">
            <div class="filter-item">
              <label class="filter-label">职工类型</label>
              <el-select 
                v-model="advancedFilters.employeeTypes" 
                multiple 
                placeholder="职工类型"
                style="width: 100%"
                @change="applyAdvancedFilters"
              >
                <el-option label="正式工" value="正式工" />
                <el-option label="劳务工" value="劳务工" />
              </el-select>
            </div>
          </el-col>
          
          <el-col :span="6" :xs="24" :sm="12" :md="6">
            <div class="filter-item">
              <label class="filter-label">启用日期范围</label>
              <el-date-picker 
                v-model="advancedFilters.enableDateRange"
                type="daterange"
                placeholder="选择启用日期范围"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                @change="applyAdvancedFilters"
              />
            </div>
          </el-col>
          
          <el-col :span="4" :xs="24" :sm="12" :md="4">
            <div class="filter-item">
              <label class="filter-label">状态筛选</label>
              <el-select 
                v-model="advancedFilters.statuses" 
                multiple 
                placeholder="选择状态"
                style="width: 100%"
                @change="applyAdvancedFilters"
              >
                <el-option label="正式启用" value="正式启用" />
                <el-option label="临时启用" value="临时启用" />
                <el-option label="后备" value="后备" />
                <el-option label="免职" value="免职" />
              </el-select>
            </div>
          </el-col>
          
          <el-col :span="4" :xs="24" :sm="24" :md="4">
            <div class="filter-actions">
              <el-button @click="clearAllFilters" :disabled="!hasActiveFilters">
                <el-icon><RefreshLeft /></el-icon>
                清空筛选
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 筛选结果统计 -->
    <div v-if="hasActiveFilters" class="filter-result-stats">
      <el-alert type="info" :closable="false">
        <template #title>
          <div class="stats-title">
            <span>筛选结果：从 {{ totalCount }} 人中筛选出 {{ filteredPersonnel.length }} 人</span>
            <el-button type="text" size="small" @click="exportFilteredResults">
              <el-icon><Download /></el-icon>
              导出筛选结果
            </el-button>
          </div>
        </template>
        <div class="filter-breakdown">
          <el-tag 
            v-for="condition in activeFilterConditions" 
            :key="condition" 
            closable 
            @close="removeFilterCondition(condition)"
            style="margin-right: 8px; margin-bottom: 4px;"
          >
            {{ condition }}
          </el-tag>
        </div>
      </el-alert>
    </div>

    <!-- 批量操作工具栏 -->
    <div v-if="hasSelection" class="batch-toolbar">
      <div class="selection-info">
        <span>已选择 {{ selectedCount }} 人</span>
        <el-button type="text" @click="clearSelection">取消选择</el-button>
      </div>
      <div class="batch-actions">
        <el-button type="primary" @click="batchExport">
          <el-icon><Download /></el-icon>
          导出选中
        </el-button>
        <el-dropdown @command="handleBatchCommand">
          <el-button>
            批量操作 <el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="status">状态修改</el-dropdown-item>
              <el-dropdown-item command="department">部门调动</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="left-actions">
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          新增人员
        </el-button>
        <el-button @click="exportPersonnel">
          <el-icon><Download /></el-icon>
          导出人员
        </el-button>
        <el-button type="warning" @click="openBackupDialog">
          <el-icon><FolderOpened /></el-icon>
          数据备份
        </el-button>
      </div>
      
      <div class="right-actions">
        <el-button @click="syncData">
          <el-icon><Refresh /></el-icon>
          同步数据
        </el-button>
      </div>
    </div>

    <!-- 人员列表 -->
    <div class="personnel-table" v-loading="loading">
      <el-table 
        :data="paginatedPersonnel" 
        stripe 
        @selection-change="handleSelectionChange"
      >
        <el-table-column 
          type="selection" 
          width="55"
          :selectable="() => true"
        />
        <el-table-column 
          prop="employeeId" 
          label="工号" 
          width="120" 
          sortable="custom"
          :class-name="getSortClass('employeeId')"
          @sort-change="() => handleSort('employeeId')"
        >
          <template #header>
            <span class="sortable-header" @click="handleSort('employeeId')">
              工号
              <span v-if="sortConfig.column === 'employeeId'" class="sort-indicator">
                {{ sortConfig.direction === 'asc' ? '↑' : '↓' }}
              </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="name" 
          label="姓名" 
          width="120" 
          sortable="custom"
          :class-name="getSortClass('name')"
        >
          <template #header>
            <span class="sortable-header" @click="handleSort('name')">
              姓名
              <span v-if="sortConfig.column === 'name'" class="sort-indicator">
                {{ sortConfig.direction === 'asc' ? '↑' : '↓' }}
              </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="department" 
          label="部门" 
          min-width="150" 
          sortable="custom"
          :class-name="getSortClass('department')"
        >
          <template #header>
            <span class="sortable-header" @click="handleSort('department')">
              部门
              <span v-if="sortConfig.column === 'department'" class="sort-indicator">
                {{ sortConfig.direction === 'asc' ? '↑' : '↓' }}
              </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="职工类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getEmployeeTypeTagType(row.employeeId)" size="small">
              {{ getEmployeeType(row.employeeId) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          label="启用日期" 
          width="120" 
          sortable="custom"
          :class-name="getSortClass('enableDate')"
        >
          <template #header>
            <span class="sortable-header" @click="handleSort('enableDate')">
              启用日期
              <span v-if="sortConfig.column === 'enableDate'" class="sort-indicator">
                {{ sortConfig.direction === 'asc' ? '↑' : '↓' }}
              </span>
            </span>
          </template>
          <template #default="{ row }">
            <span class="enable-date">{{ getLatestEnableDate(row.employeeId) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="editPerson(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="info" size="small" text @click="viewPersonDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredPersonnel.length"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新增/编辑人员对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEditing ? '编辑人员信息' : '新增人员'"
      width="600px"
    >
      <el-form 
        ref="formRef" 
        :model="form" 
        label-width="100px"
      >
        <el-form-item label="工号" required>
          <el-input v-model="form.employeeId" placeholder="请输入工号" :disabled="isEditing" />
        </el-form-item>
        
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        
        <el-form-item label="部门" required>
          <el-select v-model="form.department" placeholder="请选择部门" style="width: 100%">
            <el-option label="客运段" value="客运段" />
            <el-option label="机务段" value="机务段" />
            <el-option label="车辆段" value="车辆段" />
            <el-option label="工务段" value="工务段" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态" required>
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="正式启用" value="正式启用" />
            <el-option label="临时启用" value="临时启用" />
            <el-option label="后备" value="后备" />
            <el-option label="免职" value="免职" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input 
            v-model="form.note"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">
          {{ isEditing ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 人员详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="人员详情" width="500px">
      <div v-if="selectedPerson" class="person-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="工号">
            {{ selectedPerson.employeeId }}
          </el-descriptions-item>
          <el-descriptions-item label="姓名">
            {{ selectedPerson.name }}
          </el-descriptions-item>
          <el-descriptions-item label="部门">
            {{ selectedPerson.department }}
          </el-descriptions-item>
          <el-descriptions-item label="职工类型">
            <el-tag :type="getEmployeeTypeTagType(selectedPerson.employeeId)" size="small">
              {{ getEmployeeType(selectedPerson.employeeId) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="启用日期">
            <span class="enable-date">{{ getLatestEnableDate(selectedPerson.employeeId) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedPerson.status)">
              {{ selectedPerson.status }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 人员管理数据备份对话框 -->
    <PersonnelBackupDialog 
      v-model:visible="backupDialogVisible"
      @backup-created="handleBackupCreated"
      @backup-restored="handleBackupRestored"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Plus, 
  Download, 
  Refresh, 
  User, 
  UserFilled, 
  Clock, 
  Files,
  Star,
  Filter,
  RefreshLeft,
  ArrowDown,
  Edit,
  Delete,
  FolderOpened
} from '@element-plus/icons-vue'
import { usePersonnelStore } from '@/stores/personnel'
import { useApplicationStore } from '@/stores/applications'
import { useDataInit } from '@/composables/useDataInit'
import PersonnelBackupDialog from './PersonnelBackupDialog.vue'
import type { EnhancedConductor } from '@/types'

// Store实例
const personnelStore = usePersonnelStore()
const applicationStore = useApplicationStore()
const { initializeAllData } = useDataInit()

// 响应式数据
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 筛选状态管理
const currentFilter = ref<string | null>(null)

// 搜索状态管理
const searchKeyword = ref('')
const searchLoading = ref(false)
const searchTimer = ref<number>()

// 高级筛选状态管理
const showAdvancedFilter = ref(false)
const advancedFilters = ref({
  departments: [] as string[],
  employeeTypes: [] as string[],
  statuses: [] as string[],
  enableDateRange: undefined as [string, string] | undefined
})

// 表格选择状态管理
const selectedRows = ref<Set<string>>(new Set())
const selectAll = ref(false)
const indeterminate = ref(false)

// 排序状态管理
const sortConfig = ref({
  column: '',
  direction: 'asc' as 'asc' | 'desc'
})

// Tab状态映射
const tabToFilterMap: Record<string, string | null> = {
  'all': null,
  'formal': '正式启用', 
  'temp': '临时启用',
  'backup': '后备'
}

const filterToTabMap: Record<string, string> = {
  'null': 'all',
  '正式启用': 'formal',
  '临时启用': 'temp', 
  '后备': 'backup'
}

// 对话框相关
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const backupDialogVisible = ref(false)
const isEditing = ref(false)
const selectedPerson = ref<EnhancedConductor | null>(null)
const formRef = ref()

// 表单数据
const form = ref({
  employeeId: '',
  name: '',
  department: '',
  status: '后备',
  note: ''
})

// 基础计算属性
const totalCount = computed(() => personnelStore.allConductors.length)
const activeCount = computed(() => personnelStore.allConductors.filter(p => p.status === '正式启用').length)
const tempCount = computed(() => personnelStore.allConductors.filter(p => p.status === '临时启用').length)
const backupCount = computed(() => personnelStore.allConductors.filter(p => p.status === '后备').length)
const pendingCount = computed(() => applicationStore.allApplications.filter(a => a.status === '待处理').length)

// 可用部门列表
const availableDepartments = computed(() => {
  const departments = new Set<string>()
  personnelStore.allConductors.forEach(p => departments.add(p.department))
  return Array.from(departments).sort()
})

// 判断是否有活跃的筛选条件
const hasActiveFilters = computed(() => {
  return searchKeyword.value.trim() !== '' ||
         advancedFilters.value.departments.length > 0 ||
         advancedFilters.value.employeeTypes.length > 0 ||
         advancedFilters.value.statuses.length > 0 ||
         advancedFilters.value.enableDateRange !== undefined
})

// 活跃的筛选条件描述
const activeFilterConditions = computed(() => {
  const conditions: string[] = []
  
  if (searchKeyword.value.trim()) {
    conditions.push(`搜索：${searchKeyword.value}`)
  }
  
  if (advancedFilters.value.departments.length > 0) {
    conditions.push(`部门：${advancedFilters.value.departments.join('、')}`)
  }
  
  if (advancedFilters.value.employeeTypes.length > 0) {
    conditions.push(`类型：${advancedFilters.value.employeeTypes.join('、')}`)
  }
  
  if (advancedFilters.value.statuses.length > 0) {
    conditions.push(`状态：${advancedFilters.value.statuses.join('、')}`)
  }
  
  if (advancedFilters.value.enableDateRange) {
    const [start, end] = advancedFilters.value.enableDateRange
    conditions.push(`启用日期：${start} 至 ${end}`)
  }
  
  return conditions
})

// 筛选后的人员列表
const filteredPersonnel = computed(() => {
  let result = [...personnelStore.allConductors]
  
  // 应用Tab状态筛选
  if (currentFilter.value && currentFilter.value !== 'applications') {
    result = result.filter(p => p.status === currentFilter.value)
  }
  
  // 应用搜索筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(person => 
      person.employeeId.toLowerCase().includes(keyword) ||
      person.name.toLowerCase().includes(keyword)
    )
  }
  
  // 应用部门筛选
  if (advancedFilters.value.departments.length > 0) {
    result = result.filter(person => 
      advancedFilters.value.departments.includes(person.department)
    )
  }
  
  // 应用职工类型筛选
  if (advancedFilters.value.employeeTypes.length > 0) {
    result = result.filter(person => {
      const employeeType = getEmployeeType(person.employeeId)
      return advancedFilters.value.employeeTypes.includes(employeeType)
    })
  }
  
  // 应用状态筛选（与Tab筛选不同，这是多选）
  if (advancedFilters.value.statuses.length > 0) {
    result = result.filter(person => 
      advancedFilters.value.statuses.includes(person.status)
    )
  }
  
  // 应用启用日期范围筛选
  if (advancedFilters.value.enableDateRange) {
    const [startDate, endDate] = advancedFilters.value.enableDateRange
    result = result.filter(person => {
      const enableDate = getLatestEnableDate(person.employeeId)
      if (enableDate === '-') return false
      return enableDate >= startDate && enableDate <= endDate
    })
  }
  
  // 按更新时间排序
  return result.sort((a, b) => 
    (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
  )
})

// 选择相关计算属性
const selectedCount = computed(() => selectedRows.value.size)
const hasSelection = computed(() => selectedRows.value.size > 0)

// 更新全选状态
const updateSelectAllState = () => {
  if (!paginatedPersonnel.value || !Array.isArray(paginatedPersonnel.value)) {
    selectAll.value = false
    indeterminate.value = false
    return
  }
  
  const visibleCount = paginatedPersonnel.value.length
  const selectedVisible = paginatedPersonnel.value.filter(p => 
    selectedRows.value.has(p.id)
  ).length
  
  selectAll.value = visibleCount > 0 && selectedVisible === visibleCount
  indeterminate.value = selectedVisible > 0 && selectedVisible < visibleCount
}

// 排序后的人员列表
const sortedPersonnel = computed(() => {
  let result = [...filteredPersonnel.value]
  
  if (sortConfig.value.column) {
    result.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortConfig.value.column) {
        case 'employeeId':
          aValue = parseInt(a.employeeId) || 0
          bValue = parseInt(b.employeeId) || 0
          break
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'department':
          aValue = a.department
          bValue = b.department
          break
        case 'enableDate':
          aValue = getLatestEnableDate(a.employeeId)
          bValue = getLatestEnableDate(b.employeeId)
          // 处理'-'值
          if (aValue === '-') aValue = '0000-00-00'
          if (bValue === '-') bValue = '0000-00-00'
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortConfig.value.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.value.direction === 'asc' ? 1 : -1
      return 0
    })
  }
  
  return result
})

const paginatedPersonnel = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedPersonnel.value.slice(start, end)
})

// 监听分页数据变化，更新选择状态
watch(paginatedPersonnel, () => {
  updateSelectAllState()
}, { immediate: true })

// 当前激活的Tab
const activeTab = computed(() => {
  const key = currentFilter.value === null ? 'null' : currentFilter.value
  return filterToTabMap[key] || 'all'
})

// Tab切换处理方法
const handleTabChange = (tabName: string | number) => {
  // 如果点击的是待处理申请Tab，直接跳转
  if (String(tabName) === 'applications') {
    handlePendingApplicationsClick()
    return
  }
  
  const filterValue = tabToFilterMap[String(tabName)]
  currentFilter.value = filterValue
  currentPage.value = 1
}

// 待处理申请点击处理
const handlePendingApplicationsClick = () => {
  ElMessage.info('跳转到申请管理页面')
}

// 移除原来的卡片点击处理方法，只保留清除筛选方法
const clearFilter = () => {
  currentFilter.value = null
  currentPage.value = 1
}

// 获取筛选标签
const getFilterLabel = (filter: string | null) => {
  switch (filter) {
    case '正式启用': return '正式启用人员'
    case '临时启用': return '临时启用人员'
    case '后备': return '后备人员'
    case null: return '全部人员'
    default: return '全部人员'
  }
}

// 方法
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

// 对话框相关方法
const openAddDialog = () => {
  isEditing.value = false
  form.value = {
    employeeId: '',
    name: '',
    department: '',
    status: '后备',
    note: ''
  }
  dialogVisible.value = true
}

const editPerson = (person: EnhancedConductor) => {
  isEditing.value = true
  selectedPerson.value = person
  
  form.value = {
    employeeId: person.employeeId,
    name: person.name,
    department: person.department,
    status: person.status,
    note: person.note || ''
  }
  
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.employeeId || !form.value.name || !form.value.department) {
    ElMessage.error('请填写必填字段')
    return
  }

  try {
    loading.value = true
    
    const personData = {
      employeeId: form.value.employeeId,
      name: form.value.name,
      department: form.value.department,
      status: form.value.status as EnhancedConductor['status'],
      note: form.value.note || undefined
    }
    
    if (isEditing.value && selectedPerson.value) {
      await personnelStore.updateConductor(selectedPerson.value.id, personData)
      ElMessage.success('人员信息更新成功')
    } else {
      await personnelStore.addConductor(personData)
      ElMessage.success('人员添加成功')
    }
    
    dialogVisible.value = false
    
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    loading.value = false
  }
}

const viewPersonDetail = (person: EnhancedConductor) => {
  selectedPerson.value = person
  detailDialogVisible.value = true
}

const exportPersonnel = () => {
  ElMessage.success('导出功能开发中...')
}

const openBackupDialog = () => {
  backupDialogVisible.value = true
}

const handleBackupCreated = () => {
  ElMessage.success('备份创建成功')
}

const handleBackupRestored = () => {
  ElMessage.success('备份恢复成功，数据已刷新')
}

const syncData = async () => {
  try {
    loading.value = true
    await personnelStore.syncWithMainStore()
    ElMessage.success('数据同步成功')
  } catch (error: any) {
    ElMessage.error(`数据同步失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 工具方法
const getStatusTagType = (status: string) => {
  switch (status) {
    case '正式启用': return 'success'
    case '临时启用': return 'warning'
    case '后备': return 'info'
    case '免职': return 'danger'
    default: return 'info'
  }
}

// 职工类型判断方法
const getEmployeeType = (employeeId: string) => {
  const id = parseInt(employeeId)
  return id >= 7000 ? '劳务工' : '正式工'
}

// 职工类型标签颜色
const getEmployeeTypeTagType = (employeeId: string) => {
  const id = parseInt(employeeId)
  return id >= 7000 ? 'warning' : 'success'
}

// 获取最新启用日期
const getLatestEnableDate = (employeeId: string) => {
  const changes = personnelStore.getPersonnelChangesByEmployee(employeeId)
  
  // 筛选出启用状态的变更记录（正式启用或临时启用）
  const enableChanges = changes.filter(change => 
    change.toStatus === '正式启用' || change.toStatus === '临时启用'
  )
  
  if (enableChanges.length === 0) {
    return '-'
  }
  
  // 按变更日期排序，取最新的一条
  const latestChange = enableChanges.sort((a, b) => 
    new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime()
  )[0]
  
  return latestChange.changeDate
}

// 搜索相关方法
const handleSearch = () => {
  if (searchTimer.value) {
    clearTimeout(searchTimer.value)
  }
  
  searchLoading.value = true
  searchTimer.value = setTimeout(() => {
    searchLoading.value = false
  }, 300)
}

const clearSearch = () => {
  searchKeyword.value = ''
  searchLoading.value = false
  if (searchTimer.value) {
    clearTimeout(searchTimer.value)
  }
}

// 高级筛选相关方法
const toggleAdvancedFilter = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value
}

const applyAdvancedFilters = () => {
  // 筛选逻辑已在computed中实现，这里只需触发重新计算
  currentPage.value = 1
}

const clearAllFilters = () => {
  searchKeyword.value = ''
  advancedFilters.value = {
    departments: [],
    employeeTypes: [],
    statuses: [],
    enableDateRange: undefined
  }
  currentPage.value = 1
}

const removeFilterCondition = (condition: string) => {
  // 根据条件描述移除对应的筛选
  if (condition.startsWith('搜索：')) {
    searchKeyword.value = ''
  } else if (condition.startsWith('部门：')) {
    advancedFilters.value.departments = []
  } else if (condition.startsWith('类型：')) {
    advancedFilters.value.employeeTypes = []
  } else if (condition.startsWith('状态：')) {
    advancedFilters.value.statuses = []
  } else if (condition.startsWith('启用日期：')) {
    advancedFilters.value.enableDateRange = undefined
  }
}

const exportFilteredResults = () => {
  ElMessage.success('导出功能开发中...')
}

// 选择相关方法
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    paginatedPersonnel.value.forEach(person => 
      selectedRows.value.add(person.id)
    )
  } else {
    paginatedPersonnel.value.forEach(person => 
      selectedRows.value.delete(person.id)
    )
  }
  updateSelectAllState()
}

const handleRowSelect = (person: EnhancedConductor, checked: boolean) => {
  if (checked) {
    selectedRows.value.add(person.id)
  } else {
    selectedRows.value.delete(person.id)
  }
  updateSelectAllState()
}

const clearSelection = () => {
  selectedRows.value.clear()
  updateSelectAllState()
}

// 排序相关方法
const handleSort = (column: string) => {
  if (sortConfig.value.column === column) {
    sortConfig.value.direction = 
      sortConfig.value.direction === 'asc' ? 'desc' : 'asc'
  } else {
    sortConfig.value.column = column
    sortConfig.value.direction = 'asc'
  }
}

const getSortClass = (column: string) => {
  if (sortConfig.value.column !== column) return ''
  return sortConfig.value.direction === 'asc' ? 'sort-asc' : 'sort-desc'
}

// 批量操作方法
const batchExport = () => {
  const selectedData = sortedPersonnel.value.filter(p => 
    selectedRows.value.has(p.id)
  )
  
  if (selectedData.length === 0) {
    ElMessage.warning('请先选择要导出的人员')
    return
  }
  
  ElMessage.success(`导出 ${selectedData.length} 人数据功能开发中...`)
}

const handleBatchCommand = async (command: string) => {
  if (selectedRows.value.size === 0) {
    ElMessage.warning('请先选择要操作的人员')
    return
  }
  
  switch (command) {
    case 'status':
      ElMessage.info('批量状态修改功能开发中...')
      break
    case 'department':
      ElMessage.info('批量部门调动功能开发中...')
      break
    case 'delete':
      ElMessageBox.confirm(
        `确定要删除选中的 ${selectedRows.value.size} 名人员吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(() => {
        ElMessage.success('批量删除功能开发中...')
        clearSelection()
      }).catch(() => {
        ElMessage.info('已取消删除')
      })
      break
  }
}

// 表格选择变化处理
const handleSelectionChange = (selection: EnhancedConductor[]) => {
  selectedRows.value.clear()
  selection.forEach(person => selectedRows.value.add(person.id))
  updateSelectAllState()
}

// 生命周期
onMounted(async () => {
  await initializeAllData()
})
</script>

<style lang="scss" scoped>
.personnel-list {
  padding: 16px;
  
  .personnel-tabs {
    margin-bottom: 16px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    
    :deep(.el-tabs__header) {
      margin: 0;
      background: linear-gradient(145deg, #f8f9ff 0%, #ffffff 100%);
      border-bottom: 1px solid #e8f0ff;
    }
    
    :deep(.el-tabs__nav-wrap) {
      padding: 8px 20px;
    }
    
    :deep(.el-tabs__content) {
      padding: 0;
      min-height: 0;
    }
    
    :deep(.el-tabs__item) {
      border-radius: 8px;
      margin-right: 8px;
      padding: 12px 20px;
      transition: all 0.3s ease;
      border: 1px solid transparent;
      
      &:hover {
        background: rgba(64, 158, 255, 0.05);
        border-color: rgba(64, 158, 255, 0.2);
      }
      
      &.is-active {
        background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
        color: white;
        border-color: #409eff;
        font-weight: 600;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
        
        .tab-label {
          .el-icon {
            color: white;
          }
          
          .tab-badge {
            :deep(.el-badge__content) {
              background: rgba(255, 255, 255, 0.9);
              color: #409eff;
              font-weight: 600;
            }
          }
        }
      }
    }
    
    .tab-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      font-size: 14px;
      
      .el-icon {
        font-size: 16px;
        transition: color 0.3s ease;
      }
      
      .tab-badge {
        :deep(.el-badge__content) {
          background: #409eff;
          border: none;
          font-size: 11px;
          height: 16px;
          line-height: 16px;
          padding: 0 6px;
          border-radius: 8px;
          min-width: 16px;
          font-weight: 500;
          max-width: none !important;
          overflow: visible;
        }
        
        &.el-badge--success :deep(.el-badge__content) {
          background: #67c23a;
        }
        
        &.el-badge--warning :deep(.el-badge__content) {
          background: #e6a23c;
        }
        
        &.el-badge--info :deep(.el-badge__content) {
          background: #909399;
        }
      }
      
      // 待处理申请Tab特殊样式
      .applications-tab {
        cursor: pointer;
        
        &:hover {
          color: #67c23a !important;
          
          .el-icon {
            color: #67c23a !important;
          }
        }
      }
    }
    
    // 待处理申请Tab项特殊样式
    :deep(.el-tabs__item) {
      &[aria-controls="tab-applications"] {
        border: 1px solid #67c23a !important;
        background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%) !important;
        
        &:hover {
          background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%) !important;
          color: white !important;
          
          .applications-tab {
            color: white !important;
            
            .el-icon {
              color: white !important;
            }
            
            .tab-badge :deep(.el-badge__content) {
              background: rgba(255, 255, 255, 0.9) !important;
              color: #67c23a !important;
            }
          }
        }
        
        .applications-tab {
          color: #67c23a !important;
          
          .el-icon {
            color: #67c23a !important;
          }
        }
      }
    }
  }
  
  .filter-status {
    margin-bottom: 16px;
    
    .el-alert {
      border-radius: 8px;
    }
  }
  
  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .left-actions, .right-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .pending-applications-card {
      .compact-card {
        border: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 8px;
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        :deep(.el-card__body) {
          padding: 12px 16px;
        }
        
        .card-content {
          display: flex;
          align-items: center;
          gap: 12px;
          
          .card-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
            
            &.pending {
              background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            }
          }
          
          .card-info {
            .card-value {
              font-size: 18px;
              font-weight: 600;
              color: #303133;
              line-height: 1;
            }
            
            .card-label {
              font-size: 12px;
              color: #909399;
              margin-top: 2px;
            }
          }
        }
      }
    }
  }
  
  .personnel-table {
    background: white;
    border-radius: 8px;
    padding: 16px;
    
    .el-table {
      margin-bottom: 16px;
    }
  }
  
  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
  
  .person-detail {
    .el-descriptions {
      :deep(.el-descriptions__label) {
        width: 100px;
      }
    }
  }
  
  .enable-date {
    font-family: 'Courier New', monospace;
    font-weight: 500;
    color: #409eff;
    background: rgba(64, 158, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    
    &:empty::before {
      content: '-';
      color: #909399;
      background: rgba(144, 147, 153, 0.1);
    }
  }
  
  .search-section {
    margin-bottom: 16px;
    
    .main-search {
      .el-input {
        :deep(.el-input__wrapper) {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
        }
        
        :deep(.el-input-group__append) {
          background: transparent;
          border: none;
          
          .el-button {
            border-radius: 0 8px 8px 0;
            transition: all 0.3s ease;
            
            &.el-button--primary {
              background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
              border-color: #409eff;
            }
          }
        }
      }
    }
    
    .advanced-filter-panel {
      margin-top: 16px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border: 1px solid #e8f0ff;
      
      .filter-item {
        margin-bottom: 16px;
        
        .filter-label {
          display: block;
          font-size: 13px;
          color: #606266;
          margin-bottom: 6px;
          font-weight: 500;
        }
      }
      
      .filter-actions {
        display: flex;
        align-items: flex-end;
        height: 100%;
        padding-top: 24px;
      }
    }
  }
  
  .filter-result-stats {
    margin-bottom: 16px;
    
    .el-alert {
      border-radius: 8px;
      border-left: 4px solid #409eff;
    }
    
    .stats-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    
    .filter-breakdown {
      margin-top: 8px;
      
      .el-tag {
        margin-right: 8px;
        margin-bottom: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      }
    }
  }
  
  .batch-toolbar {
    margin-bottom: 16px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%);
    border-radius: 8px;
    border: 1px solid #d0e7ff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    animation: slideInDown 0.3s ease;
    
    .selection-info {
      display: flex;
      align-items: center;
      gap: 12px;
      
      span {
        color: #409eff;
        font-weight: 600;
      }
      
      .el-button {
        color: #909399;
        &:hover {
          color: #409eff;
        }
      }
    }
    
    .batch-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .personnel-table {
    .sortable-header {
      cursor: pointer;
      user-select: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 0.3s ease;
      
      &:hover {
        color: #409eff;
      }
      
      .sort-indicator {
        font-size: 12px;
        color: #409eff;
      }
    }
    
    :deep(.el-table__header) {
      .sortable-header {
        color: #606266;
        font-weight: 600;
      }
    }
    
    :deep(.el-table__row) {
      &.current-row {
        background: #f5f7fa;
      }
      
      &:hover {
        background: #f8f9ff !important;
      }
    }
    
    :deep(.el-checkbox) {
      .el-checkbox__input {
        &.is-checked {
          .el-checkbox__inner {
            background: #409eff;
            border-color: #409eff;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .personnel-list {
    .personnel-tabs {
      :deep(.el-tabs__nav-wrap) {
        padding: 4px 12px;
      }
      
      :deep(.el-tabs__item) {
        padding: 8px 12px;
        margin-right: 4px;
        font-size: 12px;
        
        .tab-label {
          gap: 4px;
          font-size: 12px;
          
          .el-icon {
            font-size: 14px;
          }
          
          .tab-badge {
            :deep(.el-badge__content) {
              font-size: 10px;
              height: 14px;
              line-height: 14px;
              padding: 0 4px;
            }
          }
        }
      }
    }
    
    .action-bar {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      
      .left-actions, .right-actions {
        justify-content: center;
      }
      
      .pending-applications-card {
        .compact-card {
          .card-content {
            justify-content: center;
          }
        }
      }
    }
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 