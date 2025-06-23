<template>
  <div class="application-management" :class="{ 'mobile-layout': isMobile }">
    <!-- 操作栏 -->
    <div class="action-bar" :class="{ 'mobile-actions': isMobile }">
      <div class="left-actions">
        <el-button 
          type="primary" 
          @click="openApplicationDialog('正式启用')"
          :size="isMobile ? 'small' : 'default'"
          :class="{ 'mobile-btn': isMobile }"
        >
          <el-icon v-if="!isMobile"><DocumentAdd /></el-icon>
          <span v-if="!isMobile">正式启用申请</span>
          <span v-else>正式启用</span>
        </el-button>
        <el-button 
          @click="openApplicationDialog('临时启用')"
          :size="isMobile ? 'small' : 'default'"
          :class="{ 'mobile-btn': isMobile }"
        >
          <el-icon v-if="!isMobile"><DocumentAdd /></el-icon>
          <span v-if="!isMobile">临时启用申请</span>
          <span v-else>临时启用</span>
        </el-button>
        <el-button 
          @click="openApplicationDialog('免职')"
          :size="isMobile ? 'small' : 'default'"
          :class="{ 'mobile-btn': isMobile }"
        >
          <el-icon v-if="!isMobile"><DocumentRemove /></el-icon>
          <span v-if="!isMobile">免职申请</span>
          <span v-else>免职</span>
        </el-button>
      </div>
      
      <div class="right-actions">
        <el-button 
          v-if="selectedApplications.length > 0" 
          type="success" 
          @click="batchApprove"
          :size="isMobile ? 'small' : 'default'"
          :class="{ 'mobile-btn': isMobile }"
        >
          <el-icon v-if="!isMobile"><Check /></el-icon>
          <span v-if="!isMobile">批量通过 ({{ selectedApplications.length }})</span>
          <span v-else>批量通过</span>
        </el-button>

        <el-button 
          @click="exportApplications"
          :size="isMobile ? 'small' : 'default'"
          :class="{ 'mobile-btn': isMobile }"
        >
          <el-icon v-if="!isMobile"><Download /></el-icon>
          <span v-if="!isMobile">导出记录</span>
          <span v-else>导出</span>
        </el-button>
      </div>
    </div>

    <!-- Tab页筛选 -->
    <el-tabs 
      v-model="activeTab" 
      @tab-change="handleTabChange" 
      class="application-tabs"
      :class="{ 'mobile-tabs': isMobile }"
    >
      <el-tab-pane name="all">
        <template #label>
          <span class="tab-label">
            <span v-if="!isMobile">所有申请</span>
            <span v-else>全部</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="正式启用">
        <template #label>
          <span class="tab-label">
            <span v-if="!isMobile">正式启用</span>
            <span v-else>正式</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="临时启用">
        <template #label>
          <span class="tab-label">
            <span v-if="!isMobile">临时启用</span>
            <span v-else>临时</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="免职">
        <template #label>
          <span class="tab-label">免职</span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 筛选栏 -->
    <div class="filter-section" :class="{ 'mobile-filter': isMobile }">
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
      <div v-show="!isMobile || showMobileFilter" class="filter-bar" :class="{ 'mobile-filter-bar': isMobile }">
        <el-input 
          v-model="searchQuery" 
          :placeholder="isMobile ? '搜索姓名或工号' : '搜索姓名或工号'"
          prefix-icon="Search"
          clearable
          :style="{ width: isMobile ? '100%' : '200px' }"
          @input="handleFilter"
        />
        <el-select 
          v-model="selectedDepartment" 
          placeholder="所有部门" 
          clearable
          :style="{ width: isMobile ? '100%' : '150px' }"
          @change="handleFilter"
        >
          <el-option v-for="dept in departments" :key="dept" :label="dept" :value="dept" />
        </el-select>
        <el-date-picker 
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :style="{ width: isMobile ? '100%' : '240px' }"
          @change="handleFilter"
        />
        <el-button 
          @click="resetFilters"
          :class="{ 'mobile-reset-btn': isMobile }"
        >
          <el-icon><RefreshLeft /></el-icon>
          <span v-if="!isMobile">重置</span>
        </el-button>
      </div>
    </div>

    <!-- 申请统计 -->
    <div class="statistics-bar" :class="{ 'mobile-stats': isMobile }">
      <div class="summary-info">
        <span class="total-text">
          <span v-if="!isMobile">共 <strong>{{ applicationStore.allApplications.length }}</strong> 个申请</span>
          <span v-else>共 <strong>{{ applicationStore.allApplications.length }}</strong> 个</span>
          <template v-if="isFiltered">
            <span v-if="!isMobile"> · 筛选出 <strong>{{ filteredApplications.length }}</strong> 个</span>
            <span v-else> · <strong>{{ filteredApplications.length }}</strong> 个</span>
          </template>
        </span>
        <div class="status-summary">
          <el-tag type="warning" size="small" effect="plain" class="status-tag">
            <span class="status-count">{{ filteredStatistics.待处理 }}</span>
            待处理
          </el-tag>
          <el-tag type="success" size="small" effect="plain" class="status-tag">
            <span class="status-count">{{ filteredStatistics.已通过 }}</span>
            已通过
          </el-tag>
          <el-tag type="info" size="small" effect="plain" class="status-tag">
            <span class="status-count">{{ filteredStatistics.已拒绝 }}</span>
            已拒绝
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 申请列表 -->
    <div class="application-list" v-loading="applicationStore.loading">
      <template v-if="filteredApplications.length === 0">
        <el-empty description="暂无申请记录" />
      </template>
      
      <template v-else>
        <!-- 批量选择工具栏 -->
        <div class="batch-toolbar" v-if="filteredApplications.length > 0 && !isMobile">
          <el-checkbox 
            v-model="selectAll" 
            :indeterminate="isIndeterminate"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
          <span class="ml-2 text-gray-500">已选择 {{ selectedApplications.length }} 项</span>
        </div>

        <!-- PC端表格显示 -->
        <div v-if="!isMobile" class="desktop-table">
          <div class="application-table">
            <el-table 
              :data="paginatedApplications" 
              border 
              stripe
              size="default"
              @selection-change="handleSelectionChange"
              class="compact-table"
            >
              <el-table-column type="selection" width="50" />
              
              <el-table-column label="申请人" width="140">
                <template #default="{ row }">
                  <div class="applicant-cell">
                    <el-avatar :size="28" class="applicant-avatar">
                      {{ row.applicantName.charAt(0) }}
                    </el-avatar>
                    <div class="applicant-info">
                      <div class="name">{{ row.applicantName }}</div>
                      <div class="employee-id">{{ row.employeeId }}</div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="currentDepartment" label="部门" width="140" />
              
              <el-table-column label="申请类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="getApplicationTypeColor(row.type) as any" size="small">
                    {{ row.type }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag 
                    :type="getApplicationStatusType(row.status) as any"
                    size="small"
                    effect="dark"
                  >
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column label="申请时间" width="120">
                <template #default="{ row }">
                  <div class="date-cell">{{ formatDate(row.applicationDate) }}</div>
                </template>
              </el-table-column>
              
              <el-table-column label="部门变更" width="140">
                <template #default="{ row }">
                  <div v-if="row.targetDepartment && row.targetDepartment !== row.currentDepartment" class="department-change">
                    <span class="change-arrow">{{ row.currentDepartment }} → {{ row.targetDepartment }}</span>
                  </div>
                  <span v-else class="no-change">-</span>
                </template>
              </el-table-column>
              
              <el-table-column label="申请原因" min-width="150">
                <template #default="{ row }">
                  <div class="note-cell">
                    <el-tooltip v-if="row.note" :content="row.note" placement="top">
                      <span class="note-text">{{ row.note.length > 20 ? row.note.substring(0, 20) + '...' : row.note }}</span>
                    </el-tooltip>
                    <span v-else class="no-note">-</span>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="260">
                <template #default="{ row }">
                  <div class="action-buttons">
                    <template v-if="row.status === '待处理'">
                      <el-button 
                        type="success" 
                        size="small" 
                        @click="approveApplication(row.id)"
                        plain
                        class="action-btn"
                      >
                        <el-icon><Check /></el-icon>
                        通过
                      </el-button>
                      <el-button 
                        type="warning" 
                        size="small" 
                        @click="rejectApplication(row.id)"
                        plain
                        class="action-btn"
                      >
                        <el-icon><Close /></el-icon>
                        拒绝
                      </el-button>
                    </template>
                    
                    <el-button 
                      type="info" 
                      size="small" 
                      @click="viewApplicationDetail(row)"
                      plain
                      class="action-btn"
                    >
                      <el-icon><View /></el-icon>
                      详情
                    </el-button>
                    
                    <el-button 
                      type="danger" 
                      size="small" 
                      @click="deleteApplication(row.id)"
                      plain
                      class="action-btn"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 手机端卡片显示 -->
        <div v-else class="mobile-cards">
          <!-- 手机端批量选择模式切换 -->
          <div class="mobile-selection-header" v-if="paginatedApplications.length > 0">
            <el-button 
              @click="toggleMobileSelectionMode"
              :type="mobileSelectionMode ? 'primary' : 'default'"
              size="small"
            >
              <el-icon><Operation /></el-icon>
              {{ mobileSelectionMode ? '退出选择' : '批量选择' }}
            </el-button>
            <div v-if="mobileSelectionMode && selectedApplications.length > 0" class="mobile-selection-info">
              已选择 {{ selectedApplications.length }} 个申请
            </div>
          </div>

          <div 
            v-for="application in paginatedApplications" 
            :key="application.id" 
            class="application-card"
            :class="{ 
              'selection-mode': mobileSelectionMode,
              'selected': isApplicationSelected(application.id)
            }"
            @click="handleCardClick(application)"
          >
            <!-- 选择框（手机端批量选择模式） -->
            <div v-if="mobileSelectionMode" class="card-checkbox" @click.stop>
              <el-checkbox 
                :model-value="isApplicationSelected(application.id)"
                @change="(checked) => handleCardSelection(application.id, checked)"
              />
            </div>
            
            <!-- 卡片头部 -->
            <div class="card-header">
              <div class="applicant-info">
                <div class="applicant-main">
                  <el-avatar :size="32" class="applicant-avatar">
                    {{ application.applicantName.charAt(0) }}
                  </el-avatar>
                  <div class="applicant-details">
                    <div class="applicant-name">{{ application.applicantName }}</div>
                    <div class="employee-id">{{ application.employeeId }}</div>
                  </div>
                </div>
                <div class="application-type">
                  <el-tag :type="getApplicationTypeColor(application.type) as any" size="small">
                    {{ application.type }}
                  </el-tag>
                </div>
              </div>
              <div class="application-status">
                <el-tag 
                  :type="getApplicationStatusType(application.status) as any"
                  size="small"
                  effect="dark"
                >
                  {{ application.status }}
                </el-tag>
              </div>
            </div>
            
            <!-- 卡片内容 -->
            <div class="card-content">
              <div class="info-row">
                <div class="info-item">
                  <span class="info-label">当前部门</span>
                  <span class="info-value">{{ application.currentDepartment }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">申请时间</span>
                  <span class="info-value">{{ formatDate(application.applicationDate) }}</span>
                </div>
              </div>
              
              <div v-if="application.targetDepartment && application.targetDepartment !== application.currentDepartment" class="info-row">
                <div class="info-item">
                  <span class="info-label">部门变更</span>
                  <span class="info-value change-text">
                    {{ application.currentDepartment }} → {{ application.targetDepartment }}
                  </span>
                </div>
              </div>
              
              <div v-if="application.note" class="info-row">
                <div class="info-item">
                  <span class="info-label">申请原因</span>
                  <span class="info-value note-text">{{ application.note }}</span>
                </div>
              </div>
            </div>
            
            <!-- 卡片操作 -->
            <div class="card-actions" @click.stop v-if="!mobileSelectionMode">
              <template v-if="application.status === '待处理'">
                <el-button 
                  type="success" 
                  size="small" 
                  @click="approveApplication(application.id)"
                  class="mobile-action-btn"
                >
                  <el-icon><Check /></el-icon>
                  通过
                </el-button>
                <el-button 
                  type="warning" 
                  size="small" 
                  @click="rejectApplication(application.id)"
                  class="mobile-action-btn"
                >
                  <el-icon><Close /></el-icon>
                  拒绝
                </el-button>
              </template>
              
              <el-button 
                type="info" 
                size="small" 
                @click="viewApplicationDetail(application)"
                class="mobile-action-btn"
              >
                <el-icon><View /></el-icon>
                详情
              </el-button>
              
              <el-button 
                type="danger" 
                size="small" 
                @click="deleteApplication(application.id)"
                class="mobile-action-btn"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
          
          <!-- 无数据状态 -->
          <div v-if="paginatedApplications.length === 0" class="empty-state">
            <el-empty :description="filteredApplications.length === 0 ? '暂无申请记录' : '当前页无数据'">
              <el-button type="primary" @click="openApplicationDialog('正式启用')">创建申请</el-button>
            </el-empty>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-wrapper" :class="{ 'mobile-pagination': isMobile }">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="filteredApplications.length"
            :page-sizes="isMobile ? [10, 20, 50] : [10, 20, 50, 100]"
            :layout="isMobile ? 'total, prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :small="isMobile"
          />
        </div>
      </template>
    </div>

    <!-- 申请表单对话框 -->
    <el-dialog 
      v-model="applicationDialogVisible" 
      :title="`新建${currentApplicationType}申请`"
      :width="isMobile ? '95%' : '600px'"
      @closed="resetApplicationForm"
      :class="{ 'mobile-dialog': isMobile }"
    >
      <el-form 
        ref="applicationFormRef" 
        :model="applicationForm" 
        :rules="applicationRules"
        :label-width="isMobile ? '80px' : '100px'"
      >
        <el-form-item label="工号" prop="employeeId">
          <el-input 
            v-model="applicationForm.employeeId" 
            placeholder="输入工号查找人员"
            @blur="lookupEmployee"
            :size="isMobile ? 'default' : 'default'"
          >
            <template #append>
              <el-button @click="lookupEmployee" :icon="Search">
                <span v-if="!isMobile">查找</span>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="姓名">
          <el-input 
            v-model="applicationForm.applicantName" 
            readonly 
            :size="isMobile ? 'default' : 'default'"
          />
        </el-form-item>
        
        <el-form-item label="当前部门">
          <el-input 
            v-model="applicationForm.currentDepartment" 
            readonly 
            :size="isMobile ? 'default' : 'default'"
          />
        </el-form-item>
        
        <el-form-item label="当前状态">
          <el-tag v-if="applicationForm.currentStatus" :type="getStatusTagType(applicationForm.currentStatus) as any">
            {{ applicationForm.currentStatus }}
          </el-tag>
        </el-form-item>
        
        <el-form-item label="目标部门">
          <el-select 
            v-model="applicationForm.targetDepartment" 
            placeholder="选择目标部门（可选）"
            clearable
            style="width: 100%"
            :size="isMobile ? 'default' : 'default'"
          >
            <el-option 
              v-for="dept in departments" 
              :key="dept" 
              :label="dept" 
              :value="dept" 
            />
          </el-select>
          <div class="form-tip">如不选择，默认保持当前部门</div>
        </el-form-item>
        
        <el-form-item label="申请日期" prop="applicationDate">
          <el-date-picker 
            v-model="applicationForm.applicationDate"
            type="date"
            placeholder="选择申请日期"
            style="width: 100%"
            :size="isMobile ? 'default' : 'default'"
          />
        </el-form-item>
        
        <el-form-item label="申请原因">
          <el-input 
            v-model="applicationForm.note"
            type="textarea"
            :rows="3"
            placeholder="请输入申请原因（可选）"
            maxlength="200"
            show-word-limit
            :size="isMobile ? 'default' : 'default'"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer" :class="{ 'mobile-dialog-footer': isMobile }">
          <el-button 
            @click="applicationDialogVisible = false"
            :size="isMobile ? 'default' : 'default'"
          >
            取消
          </el-button>
          <el-button 
            type="primary" 
            @click="submitApplication" 
            :loading="applicationStore.loading"
            :size="isMobile ? 'default' : 'default'"
          >
            提交申请
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 申请详情对话框 -->
    <el-dialog 
      v-model="detailDialogVisible" 
      title="申请详情" 
      :width="isMobile ? '95%' : '500px'"
      :class="{ 'mobile-dialog': isMobile }"
    >
      <div v-if="selectedApplication" class="application-detail" :class="{ 'mobile-detail': isMobile }">
        <el-descriptions 
          :column="isMobile ? 1 : 1" 
          border
          :size="isMobile ? 'default' : 'default'"
        >
          <el-descriptions-item label="申请类型">
            <el-tag :type="getApplicationTypeColor(selectedApplication.type) as any">
              {{ selectedApplication.type }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ selectedApplication.applicantName }}（{{ selectedApplication.employeeId }}）
          </el-descriptions-item>
          <el-descriptions-item label="当前部门">
            {{ selectedApplication.currentDepartment }}
          </el-descriptions-item>
          <el-descriptions-item label="目标部门" v-if="selectedApplication.targetDepartment">
            {{ selectedApplication.targetDepartment }}
          </el-descriptions-item>
          <el-descriptions-item label="申请状态">
            <el-tag :type="getApplicationStatusType(selectedApplication.status) as any">
              {{ selectedApplication.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDate(selectedApplication.applicationDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请原因" v-if="selectedApplication.note">
            {{ selectedApplication.note }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(selectedApplication.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <template #footer v-if="isMobile">
        <div class="mobile-dialog-footer">
          <el-button @click="detailDialogVisible = false" size="default">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { 
  DocumentAdd, 
  DocumentRemove, 
  Download, 
  Search, 
  Check, 
  Close, 
  Delete, 
  View,
  Filter,
  ArrowDown,
  InfoFilled,
  RefreshLeft,
  Operation
} from '@element-plus/icons-vue'
import { usePersonnelStore } from '@/stores/personnel'
import { useApplicationStore } from '@/stores/applications'
import { useMainStore } from '@/stores'
import { useDataInit } from '@/composables/useDataInit'
import type { ConductorApplication, EnhancedConductor } from '@/types'

// Store实例
const personnelStore = usePersonnelStore()
const applicationStore = useApplicationStore()
const mainStore = useMainStore()
const { initializeAllData } = useDataInit()

// 移动端检测
const isMobile = ref(false)
const showMobileFilter = ref(false)
const mobileSelectionMode = ref(false)

const checkMobileDevice = () => {
  const width = window.innerWidth
  isMobile.value = width <= 768
}

const handleResize = () => {
  checkMobileDevice()
}

// 响应式数据
const activeTab = ref('all')
const searchQuery = ref('')
const selectedDepartment = ref('')
const dateRange = ref<[Date, Date]>()
const currentPage = ref(1)
const pageSize = ref(10)

// 申请表单
const applicationDialogVisible = ref(false)
const currentApplicationType = ref<'正式启用' | '临时启用' | '免职'>('正式启用')
const applicationFormRef = ref()
const applicationForm = ref({
  employeeId: '',
  applicantName: '',
  currentDepartment: '',
  currentStatus: '',
  targetDepartment: '',
  applicationDate: new Date(),
  note: ''
})

// 申请详情
const detailDialogVisible = ref(false)
const selectedApplication = ref<ConductorApplication | null>(null)

// 批量选择
const selectedApplications = ref<string[]>([])

// 筛选相关计算属性
const hasActiveFilters = computed(() => {
  return !!(searchQuery.value || selectedDepartment.value || dateRange.value)
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (searchQuery.value) count++
  if (selectedDepartment.value) count++
  if (dateRange.value) count++
  return count
})

// 部门列表
const departments = computed(() => {
  const depts = new Set<string>()
  applicationStore.allApplications.forEach(app => {
    if (app.currentDepartment) depts.add(app.currentDepartment)
    if (app.targetDepartment) depts.add(app.targetDepartment)
  })
  return Array.from(depts).sort()
})

// 筛选和分页
const filteredApplications = computed(() => {
  let filtered = applicationStore.allApplications

  // Tab筛选
  if (activeTab.value !== 'all') {
    filtered = filtered.filter(app => app.type === activeTab.value)
  }

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(app => 
      app.applicantName.toLowerCase().includes(query) ||
      app.employeeId.toLowerCase().includes(query)
    )
  }

  // 部门筛选
  if (selectedDepartment.value) {
    filtered = filtered.filter(app => 
      app.currentDepartment === selectedDepartment.value ||
      app.targetDepartment === selectedDepartment.value
    )
  }

  // 日期范围筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter(app => {
      const appDate = new Date(app.applicationDate)
      return appDate >= startDate && appDate <= endDate
    })
  }

  return filtered.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
})

const paginatedApplications = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredApplications.value.slice(start, end)
})

const isFiltered = computed(() => {
  return filteredApplications.value.length !== applicationStore.allApplications.length
})

// 统计信息
const filteredStatistics = computed(() => {
  const stats = { '待处理': 0, '已通过': 0, '已拒绝': 0 }
  filteredApplications.value.forEach(app => {
    if (app.status in stats) {
      stats[app.status as keyof typeof stats]++
    }
  })
  return stats
})

// 批量选择相关
const selectAll = ref(false)
const isIndeterminate = computed(() => {
  const selected = selectedApplications.value.length
  const total = paginatedApplications.value.length
  return selected > 0 && selected < total
})

// 表格选择变化处理
const handleSelectionChange = (selection: any[]) => {
  selectedApplications.value = selection.map(app => app.id)
  const total = paginatedApplications.value.length
  selectAll.value = selectedApplications.value.length === total
}

const handleSelectAll = (value: any) => {
  const checked = Boolean(value)
  if (checked) {
    selectedApplications.value = paginatedApplications.value.map(app => app.id)
  } else {
    selectedApplications.value = []
  }
}

// 手机端选择相关方法
const toggleMobileSelectionMode = () => {
  mobileSelectionMode.value = !mobileSelectionMode.value
  if (!mobileSelectionMode.value) {
    selectedApplications.value = []
  }
}

const isApplicationSelected = (applicationId: string) => {
  return selectedApplications.value.includes(applicationId)
}

const handleCardSelection = (applicationId: string, checked: any) => {
  const isChecked = Boolean(checked)
  if (isChecked) {
    if (!selectedApplications.value.includes(applicationId)) {
      selectedApplications.value.push(applicationId)
    }
  } else {
    const index = selectedApplications.value.indexOf(applicationId)
    if (index > -1) {
      selectedApplications.value.splice(index, 1)
    }
  }
}

const handleCardClick = (application: ConductorApplication) => {
  if (mobileSelectionMode.value) {
    handleCardSelection(application.id, !isApplicationSelected(application.id))
  } else {
    viewApplicationDetail(application)
  }
}

// 申请表单验证规则
const applicationRules = {
  employeeId: [
    { required: true, message: '请输入工号', trigger: 'blur' }
  ],
  applicationDate: [
    { required: true, message: '请选择申请日期', trigger: 'change' }
  ]
}

// 事件处理方法
const handleTabChange = (tabName: any) => {
  currentPage.value = 1
  selectedApplications.value = []
}

const handleFilter = () => {
  currentPage.value = 1
  selectedApplications.value = []
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedDepartment.value = ''
  dateRange.value = undefined
  currentPage.value = 1
  selectedApplications.value = []
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

// 申请操作方法
const openApplicationDialog = (type: '正式启用' | '临时启用' | '免职') => {
  currentApplicationType.value = type
  applicationDialogVisible.value = true
}

const resetApplicationForm = () => {
  if (applicationFormRef.value) {
    applicationFormRef.value.resetFields()
  }
  applicationForm.value = {
    employeeId: '',
    applicantName: '',
    currentDepartment: '',
    currentStatus: '',
    targetDepartment: '',
    applicationDate: new Date(),
    note: ''
  }
}

const lookupEmployee = async () => {
  if (!applicationForm.value.employeeId) {
    ElMessage.warning('请输入工号')
    return
  }

  try {
    const employee = personnelStore.allConductors.find(
      c => c.employeeId === applicationForm.value.employeeId
    )

    if (employee) {
      applicationForm.value.applicantName = employee.name
      applicationForm.value.currentDepartment = employee.department
      applicationForm.value.currentStatus = employee.status
      ElMessage.success('人员信息查找成功')
    } else {
      ElMessage.error('未找到对应工号的人员')
      applicationForm.value.applicantName = ''
      applicationForm.value.currentDepartment = ''
      applicationForm.value.currentStatus = ''
    }
  } catch (error) {
    console.error('查找人员失败:', error)
    ElMessage.error('查找人员失败')
  }
}

const submitApplication = async () => {
  if (!applicationFormRef.value) return

  try {
    await applicationFormRef.value.validate()

    const newApplication: any = {
      type: currentApplicationType.value,
      applicantName: applicationForm.value.applicantName,
      employeeId: applicationForm.value.employeeId,
      currentDepartment: applicationForm.value.currentDepartment,
      targetDepartment: applicationForm.value.targetDepartment || applicationForm.value.currentDepartment,
      applicationDate: applicationForm.value.applicationDate.toISOString().split('T')[0],
      note: applicationForm.value.note,
      status: '待处理'
    }

    const applicationId = Date.now().toString()
    await applicationStore.applications[applicationForm.value.currentDepartment]?.push({
      id: applicationId,
      createdAt: Date.now(),
      ...newApplication
    })
    ElMessage.success('申请提交成功')
    applicationDialogVisible.value = false
    resetApplicationForm()
  } catch (error) {
    console.error('提交申请失败:', error)
    ElMessage.error('提交申请失败')
  }
}

const approveApplication = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm('确认通过这个申请吗？', '确认操作', {
      type: 'warning'
    })

    await applicationStore.updateApplicationStatus(applicationId, '已通过')
    ElMessage.success('申请已通过')
    
    // 从选中列表中移除
    const index = selectedApplications.value.indexOf(applicationId)
    if (index > -1) {
      selectedApplications.value.splice(index, 1)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('通过申请失败:', error)
      ElMessage.error('通过申请失败')
    }
  }
}

const rejectApplication = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm('确认拒绝这个申请吗？', '确认操作', {
      type: 'warning'
    })

    await applicationStore.updateApplicationStatus(applicationId, '已拒绝')
    ElMessage.success('申请已拒绝')
    
    // 从选中列表中移除
    const index = selectedApplications.value.indexOf(applicationId)
    if (index > -1) {
      selectedApplications.value.splice(index, 1)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('拒绝申请失败:', error)
      ElMessage.error('拒绝申请失败')
    }
  }
}

const deleteApplication = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm('确认删除这个申请吗？删除后无法恢复！', '危险操作', {
      type: 'error',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })

    await applicationStore.deleteApplication(applicationId)
    ElMessage.success('申请已删除')
    
    // 从选中列表中移除
    const index = selectedApplications.value.indexOf(applicationId)
    if (index > -1) {
      selectedApplications.value.splice(index, 1)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除申请失败:', error)
      ElMessage.error('删除申请失败')
    }
  }
}

const viewApplicationDetail = (application: ConductorApplication) => {
  selectedApplication.value = application
  detailDialogVisible.value = true
}

const batchApprove = async () => {
  if (selectedApplications.value.length === 0) {
    ElMessage.warning('请先选择要处理的申请')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认批量通过选中的 ${selectedApplications.value.length} 个申请吗？`, 
      '批量操作确认', 
      { type: 'warning' }
    )

    const promises = selectedApplications.value.map(id => 
      applicationStore.updateApplicationStatus(id, '已通过')
    )

    await Promise.all(promises)
    ElMessage.success(`成功批量通过 ${selectedApplications.value.length} 个申请`)
    selectedApplications.value = []
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量通过失败:', error)
      ElMessage.error('批量通过失败')
    }
  }
}

const exportApplications = () => {
  ElMessage.success('导出功能开发中...')
}

// 工具方法
const getApplicationTypeColor = (type: string): 'success' | 'warning' | 'danger' | 'info' => {
  const colors: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    '正式启用': 'success',
    '临时启用': 'warning', 
    '免职': 'danger'
  }
  return colors[type] || 'info'
}

const getApplicationStatusType = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    '待处理': 'warning',
    '已通过': 'success',
    '已拒绝': 'danger'
  }
  return types[status] || 'info'
}

const getStatusTagType = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    '正式启用': 'success',
    '临时启用': 'warning',
    '免职': 'info',
    '未启用': 'info'
  }
  return types[status] || 'info'
}

const formatDate = (date: string | Date) => {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

const formatDateTime = (date: string | Date | number) => {
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

// 生命周期
onMounted(async () => {
  await initializeAllData()
  checkMobileDevice()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.application-management {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 移动端布局 */
.mobile-layout {
  padding: 16px;
}

/* 操作栏样式 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.mobile-actions {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.left-actions, .right-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.mobile-actions .left-actions {
  gap: 6px;
  justify-content: space-between;
}

.mobile-actions .right-actions {
  gap: 6px;
  justify-content: flex-end;
}

.mobile-btn {
  padding: 6px 12px !important;
  font-size: 12px !important;
  min-width: auto !important;
  height: 32px !important;
  border-radius: 6px !important;
}

.mobile-actions .left-actions,
.mobile-actions .right-actions {
  justify-content: center;
  width: 100%;
}

/* 移动端按钮优化 - 确保一行显示 */
.mobile-actions .left-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  width: 100%;
}

.mobile-actions .right-actions {
  justify-content: center;
}

.mobile-btn:active {
  transform: scale(0.98);
}

/* Tab标签优化 */
.application-tabs {
  margin-bottom: 20px;
}

.mobile-tabs {
  margin-bottom: 16px;
}

.tab-label {
  padding: 4px 8px;
  font-size: 14px;
}

@media (max-width: 768px) {
  .tab-label {
    font-size: 12px;
    padding: 2px 4px;
  }
}

/* 筛选区域样式 */
.filter-section {
  margin-bottom: 20px;
}

.mobile-filter {
  margin-bottom: 16px;
}

.mobile-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mobile-filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.mobile-filter-toggle .el-icon {
  transition: transform 0.3s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

.active-filters-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-color-primary-light-9);
  padding: 2px 8px;
  border-radius: 12px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
}

.mobile-filter-bar {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.mobile-reset-btn {
  width: 100%;
  justify-content: center;
  min-height: 44px;
}

/* 统计信息样式 */
.statistics-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
  margin-bottom: 20px;
}

.mobile-stats {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.mobile-stats .summary-info {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.total-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.status-summary {
  display: flex;
  gap: 12px;
}

.mobile-stats .status-summary {
  flex-wrap: wrap;
  gap: 8px;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-count {
  font-weight: bold;
  margin-right: 2px;
}

/* 应用列表样式 */
.application-list {
  min-height: 400px;
}

/* 批量选择工具栏 */
.batch-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
  margin-bottom: 16px;
  gap: 12px;
}

/* PC端表格样式 */
.desktop-table {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.application-table {
  width: 100%;
}

.compact-table {
  font-size: 14px;
}

.applicant-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.applicant-avatar {
  flex-shrink: 0;
}

.applicant-info {
  min-width: 0;
}

.applicant-info .name {
  font-weight: 500;
  font-size: 14px;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.applicant-info .employee-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.2;
}

.date-cell {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.department-change {
  font-size: 12px;
}

.change-arrow {
  color: var(--el-color-primary);
  font-weight: 500;
}

.no-change {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.note-cell {
  max-width: 150px;
}

.note-text {
  cursor: help;
  color: var(--el-text-color-regular);
}

.no-note {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 8px;
  font-size: 12px;
  min-width: auto;
}

/* 手机端卡片样式 */
.mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  margin-bottom: 12px;
}

.mobile-selection-info {
  font-size: 14px;
  color: var(--el-color-primary);
  font-weight: 500;
}

.application-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
}

.application-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.application-card:active {
  transform: translateY(0) scale(0.98);
}

.application-card.selection-mode {
  padding-left: 48px;
}

.application-card.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.card-checkbox {
  position: absolute;
  left: 16px;
  top: 16px;
  z-index: 10;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.applicant-info {
  flex: 1;
  min-width: 0;
}

.applicant-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.applicant-details {
  flex: 1;
  min-width: 0;
}

.applicant-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}

.employee-id {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.application-type {
  flex-shrink: 0;
}

.application-status {
  flex-shrink: 0;
}

.card-content {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.change-text {
  color: var(--el-color-primary);
  font-weight: 500;
}

.note-text {
  color: var(--el-text-color-regular);
  line-height: 1.4;
  max-height: 3.6em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
  margin-top: 12px;
}

.mobile-action-btn {
  flex: 1;
  min-height: 44px;
  font-size: 14px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.mobile-action-btn:active {
  transform: scale(0.95);
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 分页样式 */
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.mobile-pagination {
  margin-top: 16px;
}

.mobile-pagination .el-pagination {
  font-size: 14px;
}

/* 对话框样式 */
.mobile-dialog {
  margin: 0;
  border-radius: 12px 12px 0 0;
  position: fixed !important;
  bottom: 0 !important;
  top: auto !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  max-height: 85vh;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.mobile-dialog-footer {
  flex-direction: column;
  gap: 8px;
}

.mobile-dialog-footer .el-button {
  width: 100%;
  min-height: 44px;
  font-size: 16px;
}

.application-detail {
  padding: 8px 0;
}

.mobile-detail {
  padding: 4px 0;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.3;
}

/* 工具类 */
.ml-2 {
  margin-left: 8px;
}

.text-gray-500 {
  color: var(--el-text-color-secondary);
}

/* 响应式优化 */
@media (max-width: 768px) {
  .application-management {
    padding: 12px;
    border-radius: 0;
    box-shadow: none;
  }
  
  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .left-actions,
  .right-actions {
    width: 100%;
    justify-content: center;
  }
  
  .filter-bar {
    padding: 12px;
    gap: 8px;
  }
  
  .statistics-bar {
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .total-text {
    font-size: 14px;
  }
  
  .status-tag {
    font-size: 12px;
  }
  
  .application-card {
    padding: 12px;
    border-radius: 8px;
  }
  
  .card-header {
    margin-bottom: 8px;
  }
  
  .applicant-name {
    font-size: 15px;
  }
  
  .card-content {
    margin-bottom: 12px;
  }
  
  .info-row {
    gap: 8px;
    margin-bottom: 6px;
  }
  
  .card-actions {
    gap: 6px;
    padding-top: 8px;
    margin-top: 8px;
  }
  
  .mobile-action-btn {
    font-size: 13px;
    min-height: 40px;
  }
}

@media (max-width: 480px) {
  .application-management {
    padding: 8px;
  }
  
  .mobile-btn {
    font-size: 13px;
    padding: 6px 12px;
    min-height: 40px;
  }
  
  .application-card {
    padding: 10px;
  }
  
  .applicant-name {
    font-size: 14px;
  }
  
  .info-value {
    font-size: 13px;
  }
  
  .mobile-action-btn {
    font-size: 12px;
    min-height: 36px;
  }
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.application-card {
  animation: fadeIn 0.3s ease-out;
}

.mobile-filter-bar {
  animation: fadeIn 0.3s ease-out;
}

/* 触摸反馈 */
@media (hover: none) {
  .application-card:hover {
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  .application-card:active {
    background: var(--el-color-primary-light-9);
  }
  
  .mobile-btn:hover {
    transform: none;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .application-card {
    background: var(--el-bg-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .filter-bar {
    background: var(--el-bg-color-page);
  }
  
  .statistics-bar {
    background: linear-gradient(135deg, var(--el-bg-color-page) 0%, var(--el-border-color) 100%);
  }
}
</style> 