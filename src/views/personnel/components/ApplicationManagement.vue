<template>
  <div class="application-management">
    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="left-actions">
        <el-button type="primary" @click="openApplicationDialog('正式启用')">
          <el-icon><DocumentAdd /></el-icon>
          正式启用申请
        </el-button>
        <el-button @click="openApplicationDialog('临时启用')">
          <el-icon><DocumentAdd /></el-icon>
          临时启用申请
        </el-button>
        <el-button @click="openApplicationDialog('免职')">
          <el-icon><DocumentRemove /></el-icon>
          免职申请
        </el-button>
      </div>
      
      <div class="right-actions">
        <el-button 
          v-if="selectedApplications.length > 0" 
          type="success" 
          @click="batchApprove"
        >
          <el-icon><Check /></el-icon>
          批量通过 ({{ selectedApplications.length }})
        </el-button>

        <el-button @click="exportApplications">
          <el-icon><Download /></el-icon>
          导出记录
        </el-button>
      </div>
    </div>

    <!-- Tab页筛选 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="application-tabs">
      <el-tab-pane label="所有申请" name="all" />
      <el-tab-pane label="正式启用" name="正式启用" />
      <el-tab-pane label="临时启用" name="临时启用" />
      <el-tab-pane label="免职" name="免职" />
    </el-tabs>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input 
        v-model="searchQuery" 
        placeholder="搜索姓名或工号"
        prefix-icon="Search"
        clearable
        style="width: 200px"
        @input="handleFilter"
      />
      <el-select 
        v-model="selectedDepartment" 
        placeholder="所有部门" 
        clearable
        style="width: 150px"
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
        style="width: 240px"
        @change="handleFilter"
      />
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <!-- 申请统计 -->
    <div class="statistics-bar">
      <div class="summary-info">
        <span class="total-text">
          共 <strong>{{ applicationStore.allApplications.length }}</strong> 个申请
          <template v-if="isFiltered">
            · 筛选出 <strong>{{ filteredApplications.length }}</strong> 个
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
        <div class="batch-toolbar" v-if="filteredApplications.length > 0">
          <el-checkbox 
            v-model="selectAll" 
            :indeterminate="isIndeterminate"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
          <span class="ml-2 text-gray-500">已选择 {{ selectedApplications.length }} 项</span>
        </div>

        <!-- 申请表格列表 -->
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
                <el-tag :type="getApplicationTypeColor(row.type)" size="small">
                  {{ row.type }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag 
                  :type="getApplicationStatusType(row.status)"
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
            
            <el-table-column label="操作" width="260" fixed="right">
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

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="filteredApplications.length"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </template>
    </div>

    <!-- 申请表单对话框 -->
    <el-dialog 
      v-model="applicationDialogVisible" 
      :title="`新建${currentApplicationType}申请`"
      width="600px"
      @closed="resetApplicationForm"
    >
      <el-form 
        ref="applicationFormRef" 
        :model="applicationForm" 
        :rules="applicationRules"
        label-width="100px"
      >
        <el-form-item label="工号" prop="employeeId">
          <el-input 
            v-model="applicationForm.employeeId" 
            placeholder="输入工号查找人员"
            @blur="lookupEmployee"
          >
            <template #append>
              <el-button @click="lookupEmployee" :icon="Search">查找</el-button>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="姓名">
          <el-input v-model="applicationForm.applicantName" readonly />
        </el-form-item>
        
        <el-form-item label="当前部门">
          <el-input v-model="applicationForm.currentDepartment" readonly />
        </el-form-item>
        
        <el-form-item label="当前状态">
          <el-tag v-if="applicationForm.currentStatus" :type="getStatusTagType(applicationForm.currentStatus)">
            {{ applicationForm.currentStatus }}
          </el-tag>
        </el-form-item>
        
        <el-form-item label="目标部门">
          <el-select 
            v-model="applicationForm.targetDepartment" 
            placeholder="选择目标部门（可选）"
            clearable
            style="width: 100%"
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
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="applicationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApplication" :loading="applicationStore.loading">
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <!-- 申请详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="申请详情" width="500px">
      <div v-if="selectedApplication" class="application-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="申请类型">
            <el-tag :type="getApplicationTypeColor(selectedApplication.type)">
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
            <el-tag :type="getApplicationStatusType(selectedApplication.status)">
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
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { 
  DocumentAdd, 
  DocumentRemove, 
  Download, 
  Search, 
  Check, 
  Close, 
  Delete, 
  View
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

// 计算属性
const departments = computed(() => mainStore.departments)

const filteredApplications = computed(() => {
  let filtered = [...applicationStore.allApplications]
  
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
    filtered = filtered.filter(app => app.currentDepartment === selectedDepartment.value)
  }
  
  // 日期范围筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter(app => {
      const appDate = new Date(app.applicationDate)
      return appDate >= startDate && appDate <= endDate
    })
  }
  
  // 复杂排序：未通过申请排前面按部门排序，其他申请按时间倒序
  filtered.sort((a, b) => {
    // 未处理申请优先
    if (a.status === '待处理' && b.status !== '待处理') return -1
    if (a.status !== '待处理' && b.status === '待处理') return 1
    
    // 如果都是待处理，按部门排序
    if (a.status === '待处理' && b.status === '待处理') {
      if (a.currentDepartment !== b.currentDepartment) {
        return a.currentDepartment.localeCompare(b.currentDepartment, 'zh-CN')
      }
      // 同部门内按时间倒序
      return new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
    }
    
    // 其他申请按时间倒序
    return new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
  })
  
  return filtered
})

const paginatedApplications = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredApplications.value.slice(start, end)
})

const isFiltered = computed(() => {
  return activeTab.value !== 'all' || 
         searchQuery.value !== '' || 
         selectedDepartment.value !== '' || 
         dateRange.value !== null
})

const filteredStatistics = computed(() => {
  const stats = {
    待处理: 0,
    已通过: 0,
    已拒绝: 0
  }
  
  filteredApplications.value.forEach(app => {
    stats[app.status as keyof typeof stats]++
  })
  
  return stats
})

// 批量选择相关
const selectAll = computed({
  get: () => selectedApplications.value.length === paginatedApplications.value.length && paginatedApplications.value.length > 0,
  set: (value: boolean) => {
    if (value) {
      selectedApplications.value = paginatedApplications.value.map(app => app.id)
    } else {
      selectedApplications.value = []
    }
  }
})

const isIndeterminate = computed(() => {
  const selectedCount = selectedApplications.value.length
  const totalCount = paginatedApplications.value.length
  return selectedCount > 0 && selectedCount < totalCount
})

// 表单验证规则
const applicationRules = {
  employeeId: [
    { required: true, message: '请输入工号', trigger: 'blur' }
  ],
  applicationDate: [
    { required: true, message: '请选择申请日期', trigger: 'change' }
  ]
}

// 方法
const handleTabChange = () => {
  currentPage.value = 1
  selectedApplications.value = []
}

const handleFilter = () => {
  currentPage.value = 1
  selectedApplications.value = []
}

const resetFilters = () => {
  activeTab.value = 'all'
  searchQuery.value = ''
  selectedDepartment.value = ''
  dateRange.value = undefined
  currentPage.value = 1
  selectedApplications.value = []
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  selectedApplications.value = []
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  selectedApplications.value = []
}

const handleSelectAll = (value: any) => {
  selectAll.value = value as boolean
}

const toggleSelection = (applicationId: string) => {
  const index = selectedApplications.value.indexOf(applicationId)
  if (index > -1) {
    selectedApplications.value.splice(index, 1)
  } else {
    selectedApplications.value.push(applicationId)
  }
}

// 表格选择变化处理
const handleSelectionChange = (selection: any[]) => {
  selectedApplications.value = selection.map(app => app.id)
}

// 申请相关方法
const openApplicationDialog = (type: '正式启用' | '临时启用' | '免职') => {
  currentApplicationType.value = type
  applicationDialogVisible.value = true
  applicationForm.value.applicationDate = new Date()
}

const resetApplicationForm = () => {
  applicationForm.value = {
    employeeId: '',
    applicantName: '',
    currentDepartment: '',
    currentStatus: '',
    targetDepartment: '',
    applicationDate: new Date(),
    note: ''
  }
  applicationFormRef.value?.resetFields()
}

const lookupEmployee = async () => {
  const employeeId = applicationForm.value.employeeId.trim()
  if (!employeeId) {
    ElMessage.warning('请输入工号')
    return
  }
  
  const conductor = personnelStore.getConductorByEmployeeId(employeeId)
  if (!conductor) {
    ElMessage.error('未找到该工号对应的列车长')
    applicationForm.value.applicantName = ''
    applicationForm.value.currentDepartment = ''
    applicationForm.value.currentStatus = ''
    return
  }
  
  // 填充表单
  applicationForm.value.applicantName = conductor.name
  applicationForm.value.currentDepartment = conductor.department
  applicationForm.value.currentStatus = conductor.status
  applicationForm.value.targetDepartment = conductor.department // 默认目标部门为当前部门
}

const validateApplication = (form: typeof applicationForm.value, type: string) => {
  const conductor = personnelStore.getConductorByEmployeeId(form.employeeId)
  if (!conductor) {
    throw new Error('未找到该工号对应的列车长')
  }
  
  // 状态重复检查
  if (type === conductor.status) {
    throw new Error(`该列车长已经是${type}状态`)
  }
  
  // 免职状态检查
  if (conductor.status === '免职' && type !== '正式启用') {
    throw new Error('免职人员只能申请正式启用')
  }
  
  // 重复申请检查
  const existingApp = applicationStore.allApplications.find(app => 
    app.employeeId === form.employeeId && 
    app.type === type && 
    app.status === '待处理'
  )
  
  if (existingApp) {
    throw new Error(`该员工已有待处理的${type}申请`)
  }
}

const submitApplication = async () => {
  try {
    await applicationFormRef.value?.validate()
    
    const form = applicationForm.value
    const type = currentApplicationType.value
    
    // 验证申请
    validateApplication(form, type)
    
    // 跨部门申请确认
    if (form.targetDepartment && form.targetDepartment !== form.currentDepartment) {
      await ElMessageBox.confirm(
        `确定要将"${form.applicantName}"的部门从"${form.currentDepartment}"变更为"${form.targetDepartment}"吗？`,
        '跨部门申请确认',
        { type: 'warning' }
      )
    }
    
    // 提交申请
    const applicationData = {
      type,
      employeeId: form.employeeId,
      applicantName: form.applicantName,
      currentDepartment: form.currentDepartment,
      targetDepartment: form.targetDepartment || form.currentDepartment,
      applicationDate: form.applicationDate.toISOString().split('T')[0],
      note: form.note
    }
    
    await applicationStore.submitApplication(applicationData)
    
    ElMessage.success('申请提交成功')
    applicationDialogVisible.value = false
    
  } catch (error: any) {
    if (error.message) {
      ElMessage.error(error.message)
    }
  }
}

// 审批相关方法
const approveApplication = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm('确定要通过此申请吗？', '确认操作', {
      type: 'success'
    })
    
    await applicationStore.updateApplicationStatus(applicationId, '已通过')
    
    const application = applicationStore.allApplications.find(a => a.id === applicationId)
    if (application) {
      ElNotification.success({
        title: '申请审批成功',
        message: `已通过"${application.type}"申请，列车长"${application.applicantName}"的状态已更新`
      })
    }
    
  } catch (error) {
    // 用户取消操作
  }
}

const rejectApplication = async (applicationId: string) => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      '请输入拒绝原因（可选）', 
      '拒绝申请', 
      {
        inputPlaceholder: '输入拒绝原因...',
        inputType: 'textarea'
      }
    )
    
    await ElMessageBox.confirm('确定要拒绝此申请吗？', '确认操作', {
      type: 'warning'
    })
    
    await applicationStore.updateApplicationStatus(applicationId, '已拒绝')
    
    ElMessage.success('申请已拒绝')
    
  } catch (error) {
    // 用户取消操作
  }
}

const deleteApplication = async (applicationId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除此申请吗？此操作无法撤销！', '确认删除', {
      type: 'error'
    })
    
    await applicationStore.deleteApplication(applicationId)
    
    // 从选择列表中移除
    const index = selectedApplications.value.indexOf(applicationId)
    if (index > -1) {
      selectedApplications.value.splice(index, 1)
    }
    
    ElMessage.success('申请已删除')
    
  } catch (error) {
    // 用户取消操作
  }
}

const batchApprove = async () => {
  if (selectedApplications.value.length === 0) {
    ElMessage.warning('请选择要批量通过的申请')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要批量通过选中的 ${selectedApplications.value.length} 个申请吗？`, 
      '批量审批确认', 
      { type: 'success' }
    )
    
    const results = await applicationStore.batchApproveApplications(selectedApplications.value)
    
    ElNotification.success({
      title: '批量审批完成',
      message: `成功通过 ${results.success} 个申请，失败 ${results.failed} 个`
    })
    
    selectedApplications.value = []
    
  } catch (error) {
    // 用户取消操作
  }
}

const viewApplicationDetail = (application: ConductorApplication) => {
  selectedApplication.value = application
  detailDialogVisible.value = true
}

const exportApplications = () => {
  if (filteredApplications.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  
  const exportData = filteredApplications.value.map((app, index) => ({
    序号: index + 1,
    申请类型: app.type,
    工号: app.employeeId,
    姓名: app.applicantName,
    当前部门: app.currentDepartment,
    目标部门: app.targetDepartment,
    申请日期: app.applicationDate,
    状态: app.status,
    申请原因: app.note || ''
  }))
  
  // 这里可以集成Excel导出功能
  console.log('导出数据:', exportData)
  ElMessage.success('导出功能开发中...')
}



// 工具方法
const getApplicationStatusType = (status: string) => {
  switch (status) {
    case '待处理': return 'warning'
    case '已通过': return 'success'
    case '已拒绝': return 'danger'
    default: return 'info'
  }
}

const getApplicationTypeColor = (type: string) => {
  switch (type) {
    case '正式启用': return 'success'
    case '临时启用': return 'warning'
    case '免职': return 'danger'
    default: return 'info'
  }
}

const getStatusTagType = (status: string) => {
  switch (status) {
    case '正式启用': return 'success'
    case '临时启用': return 'warning'
    case '后备': return 'info'
    case '免职': return 'danger'
    default: return 'info'
  }
}

const formatDate = (date: string | number) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 生命周期
onMounted(async () => {
  await initializeAllData()
})
</script>

<style lang="scss" scoped>
.application-management {
  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .left-actions, .right-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .application-tabs {
    margin-bottom: 16px;
    
    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }
  }
  
  .filter-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .statistics-bar {
    margin-bottom: 16px;
    
    .summary-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e4e7ed;
      
      .total-text {
        font-size: 14px;
        color: var(--el-text-color-primary);
        
        strong {
          color: var(--el-color-primary);
          font-weight: 600;
        }
      }
      
      .status-summary {
        display: flex;
        gap: 8px;
        
        .status-tag {
          .status-count {
            font-weight: 600;
            margin-right: 4px;
          }
        }
      }
    }
  }
  
  .batch-toolbar {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #f0f2f5;
    border-radius: 6px;
    margin-bottom: 16px;
  }
  
  .application-table {
    margin-bottom: 24px;
    
    .compact-table {
      :deep(.el-table__row) {
        height: 48px;
      }
      
      :deep(.el-table__cell) {
        padding: 8px 12px;
        
        .cell {
          line-height: 1.4;
        }
      }
      
      :deep(.el-table__header) {
        .el-table__cell {
          background: #f8f9fa;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }
      }
    }
    
    .applicant-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .applicant-avatar {
        flex-shrink: 0;
      }
      
      .applicant-info {
        min-width: 0;
        
        .name {
          font-weight: 500;
          font-size: 14px;
          color: var(--el-text-color-primary);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .employee-id {
          font-size: 12px;
          color: var(--el-text-color-regular);
          white-space: nowrap;
        }
      }
    }
    
    .date-cell {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
    
    .department-change {
      .change-arrow {
        color: var(--el-color-warning);
        font-weight: 500;
        font-size: 12px;
      }
    }
    
    .no-change, .no-note {
      color: var(--el-text-color-placeholder);
      font-style: italic;
    }
    
    .note-cell {
      .note-text {
        cursor: pointer;
        font-size: 14px;
        color: var(--el-text-color-regular);
        
        &:hover {
          color: var(--el-color-primary);
        }
      }
    }
    
    .action-buttons {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: flex-start;
      flex-wrap: nowrap;
      
      .action-btn {
        min-width: 60px;
        height: 32px;
        padding: 6px 12px;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        
        .el-icon {
          font-size: 12px;
          margin-right: 4px;
        }
        
        &.el-button--small {
          min-height: 32px;
          line-height: 1;
        }
      }
    }
  }
  
  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
  }
  
  .form-tip {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    margin-top: 4px;
  }
  
  .application-detail {
    .el-descriptions {
      :deep(.el-descriptions__label) {
        width: 100px;
      }
    }
  }
}
</style> 