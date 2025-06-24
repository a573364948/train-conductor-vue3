<template>
  <el-dialog
    v-model="visible"
    title="导入预览"
    width="1200px"
    @closed="$emit('update:modelValue', false)"
  >
    <!-- 统计信息 -->
    <div class="preview-summary">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-statistic title="总记录数" :value="totalRecords" prefix="📋" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="新增记录" :value="newRecords" prefix="🆕" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="更新记录" :value="updateRecords" prefix="🔄" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="跳过记录" :value="skipRecords" prefix="⏭️" />
        </el-col>
      </el-row>
    </div>
    
    <!-- 操作工具栏 -->
    <div class="toolbar">
      <div class="filter-options">
        <el-select v-model="actionFilter" placeholder="筛选操作类型" style="width: 150px;">
          <el-option label="全部" value="all" />
          <el-option label="新增" value="create" />
          <el-option label="更新" value="update" />
          <el-option label="跳过" value="skip" />
        </el-select>
        
        <el-select v-model="confidenceFilter" placeholder="筛选置信度" style="width: 150px;">
          <el-option label="全部置信度" value="all" />
          <el-option label="高置信度(>80%)" value="high" />
          <el-option label="中置信度(50-80%)" value="medium" />
          <el-option label="低置信度(<50%)" value="low" />
        </el-select>
      </div>
      
      <div class="batch-actions">
        <el-dropdown @command="handleBatchAction">
          <el-button type="primary">
            批量操作 <el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="acceptAll">接受所有智能匹配</el-dropdown-item>
              <el-dropdown-item command="createAll">全部设为新增</el-dropdown-item>
              <el-dropdown-item command="updateAll">可更新的设为更新</el-dropdown-item>
              <el-dropdown-item divided command="skipConflicts">跳过有冲突的记录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    
    <!-- 预览表格 -->
    <div class="preview-table">
      <el-table 
        :data="filteredMatches" 
        border 
        stripe
        @selection-change="handleSelectionChange"
        row-key="index"
        max-height="500"
      >
        <el-table-column type="selection" width="50" />
        
        <el-table-column label="行号" width="60">
          <template #default="{ row }">
            {{ row.index + 1 }}
          </template>
        </el-table-column>
        
        <el-table-column label="导入数据" width="200">
          <template #default="{ row }">
            <div class="import-data">
              <div class="employee-info">
                <strong>{{ row.importRow.name }}</strong>
                <span class="employee-id">({{ row.importRow.employeeId }})</span>
              </div>
              <div class="department">{{ row.importRow.department }}</div>
              <el-tag size="small" :type="getStatusTagType(row.importRow.status)">
                {{ row.importRow.status }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="操作类型" width="120">
          <template #default="{ row }">
            <el-select 
              v-model="row.action" 
              size="small"
              @change="handleActionChange(row)"
            >
              <el-option label="新增" value="create">
                <span>🆕 新增</span>
              </el-option>
              <el-option 
                label="更新" 
                value="update" 
                :disabled="!row.existingRecord"
              >
                <span>🔄 更新</span>
              </el-option>
              <el-option label="跳过" value="skip">
                <span>⏭️ 跳过</span>
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        
        <el-table-column label="匹配置信度" width="120">
          <template #default="{ row }">
            <div class="confidence-info">
              <el-progress 
                :percentage="Math.round(row.confidence * 100)"
                :status="getConfidenceStatus(row.confidence)"
                :stroke-width="6"
                :show-text="false"
              />
              <span class="confidence-text">{{ Math.round(row.confidence * 100) }}%</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="匹配的现有记录" width="200">
          <template #default="{ row }">
            <div v-if="row.existingRecord" class="existing-record">
              <div class="record-info">
                <strong>{{ row.existingRecord.name }}</strong>
                <span class="employee-id">({{ row.existingRecord.employeeId }})</span>
              </div>
              <div class="department">{{ row.existingRecord.department }}</div>
              <el-tag size="small" :type="getStatusTagType(row.existingRecord.status)">
                {{ row.existingRecord.status }}
              </el-tag>
            </div>
            <span v-else class="no-match">无匹配记录</span>
          </template>
        </el-table-column>
        
        <el-table-column label="变更内容" min-width="250">
          <template #default="{ row }">
            <div v-if="row.differences && row.differences.length > 0" class="differences">
              <el-tag 
                v-for="diff in row.differences.slice(0, 3)" 
                :key="diff.field"
                size="small"
                :type="getDifferenceTagType(diff.type)"
                class="diff-tag"
              >
                {{ diff.fieldLabel }}: {{ diff.currentValue }} → {{ diff.newValue }}
              </el-tag>
              <el-popover 
                v-if="row.differences.length > 3"
                placement="top"
                width="300"
                trigger="hover"
              >
                <template #reference>
                  <span class="more-diffs">+{{ row.differences.length - 3 }}项变更</span>
                </template>
                <template #default>
                  <div class="all-differences">
                    <div 
                      v-for="diff in row.differences" 
                      :key="diff.field"
                      class="diff-item"
                    >
                      <strong>{{ diff.fieldLabel }}:</strong>
                      <br>
                      <span class="old-value">{{ diff.currentValue || '(空)' }}</span>
                      →
                      <span class="new-value">{{ diff.newValue || '(空)' }}</span>
                    </div>
                  </div>
                </template>
              </el-popover>
            </div>
            <span v-else-if="row.action === 'create'" class="new-record">新增记录</span>
            <span v-else class="no-changes">无变更</span>
          </template>
        </el-table-column>
        
        <el-table-column label="冲突信息" width="150">
          <template #default="{ row }">
            <div v-if="row.conflicts && row.conflicts.length > 0" class="conflicts">
              <el-tag 
                v-for="conflict in row.conflicts" 
                :key="conflict.type"
                size="small"
                :type="getConflictTagType(conflict.severity)"
              >
                {{ getConflictDescription(conflict.type) }}
              </el-tag>
            </div>
            <span v-else class="no-conflicts">无冲突</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              @click="showMatchDetail(row)"
              type="primary"
              text
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredMatches.length"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <div class="summary-text">
          将要处理 {{ processCount }} 条记录：
          新增 {{ finalNewCount }} 条，更新 {{ finalUpdateCount }} 条，跳过 {{ finalSkipCount }} 条
        </div>
        <div class="action-buttons">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="confirmImport" :disabled="processCount === 0">
            确认导入
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import type { MatchResult } from '@/types/importExport'

// Props
interface Props {
  modelValue: boolean
  matches: MatchResult[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [matches: MatchResult[]]
}>()

// 响应式数据
const actionFilter = ref('all')
const confidenceFilter = ref('all')
const selectedMatches = ref<MatchResult[]>([])
const currentPage = ref(1)
const pageSize = ref(20)

// 控制对话框显示
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 统计计算
const totalRecords = computed(() => props.matches.length)
const newRecords = computed(() => props.matches.filter(m => m.action === 'create').length)
const updateRecords = computed(() => props.matches.filter(m => m.action === 'update').length)
const skipRecords = computed(() => props.matches.filter(m => m.action === 'skip').length)

// 筛选结果
const filteredMatches = computed(() => {
  let filtered = [...props.matches]
  
  // 按操作类型筛选
  if (actionFilter.value !== 'all') {
    filtered = filtered.filter(m => m.action === actionFilter.value)
  }
  
  // 按置信度筛选
  if (confidenceFilter.value !== 'all') {
    filtered = filtered.filter(m => {
      const confidence = m.confidence * 100
      switch (confidenceFilter.value) {
        case 'high': return confidence > 80
        case 'medium': return confidence >= 50 && confidence <= 80
        case 'low': return confidence < 50
        default: return true
      }
    })
  }
  
  return filtered
})

// 最终统计
const processCount = computed(() => props.matches.filter(m => m.action !== 'skip').length)
const finalNewCount = computed(() => props.matches.filter(m => m.action === 'create').length)
const finalUpdateCount = computed(() => props.matches.filter(m => m.action === 'update').length)
const finalSkipCount = computed(() => props.matches.filter(m => m.action === 'skip').length)

// 状态相关方法
const getStatusTagType = (status: string) => {
  switch (status) {
    case '正式启用': return 'success'
    case '临时启用': return 'warning'
    case '后备': return 'info'
    case '免职': return 'danger'
    default: return 'info'
  }
}

const getConfidenceStatus = (confidence: number) => {
  if (confidence > 0.8) return 'success'
  if (confidence > 0.5) return 'warning'
  if (confidence > 0) return 'exception'
  return 'normal'
}

const getDifferenceTagType = (type: string) => {
  switch (type) {
    case 'addition': return 'success'
    case 'modification': return 'warning'
    case 'deletion': return 'danger'
    default: return 'info'
  }
}

const getConflictTagType = (severity: string) => {
  switch (severity) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'info'
    default: return 'info'
  }
}

const getConflictDescription = (type: string) => {
  switch (type) {
    case 'employeeId': return '工号冲突'
    case 'name': return '姓名冲突'
    case 'complex': return '复杂冲突'
    default: return '未知冲突'
  }
}

// 事件处理
const handleSelectionChange = (selection: MatchResult[]) => {
  selectedMatches.value = selection
}

const handleActionChange = (match: MatchResult) => {
  // 可以在这里添加额外的验证逻辑
  console.log('操作变更:', match.importRow.name, match.action)
}

const handleBatchAction = (command: string) => {
  switch (command) {
    case 'acceptAll':
      // 接受所有智能匹配结果（保持当前action不变）
      ElMessage.success('已接受所有智能匹配结果')
      break
      
    case 'createAll':
      props.matches.forEach(match => {
        match.action = 'create'
      })
      ElMessage.success('已将所有记录设为新增')
      break
      
    case 'updateAll':
      props.matches.forEach(match => {
        if (match.existingRecord) {
          match.action = 'update'
        }
      })
      ElMessage.success('已将所有可更新记录设为更新')
      break
      
    case 'skipConflicts':
      props.matches.forEach(match => {
        if (match.conflicts && match.conflicts.length > 0) {
          match.action = 'skip'
        }
      })
      ElMessage.success('已跳过所有有冲突的记录')
      break
  }
}

const showMatchDetail = (match: MatchResult) => {
  // 显示详细匹配信息的对话框
  console.log('显示详情:', match)
  ElMessage.info('详情功能开发中...')
}

const confirmImport = () => {
  if (processCount.value === 0) {
    ElMessage.warning('没有要处理的记录')
    return
  }
  
  emit('confirm', props.matches)
  visible.value = false
}
</script>

<style lang="scss" scoped>
.preview-summary {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  
  :deep(.el-statistic) {
    text-align: center;
    
    .el-statistic__head {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
    
    .el-statistic__content {
      font-size: 24px;
      font-weight: 600;
    }
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  .filter-options {
    display: flex;
    gap: 12px;
  }
}

.preview-table {
  margin-bottom: 16px;
  
  .import-data, .existing-record {
    .employee-info, .record-info {
      margin-bottom: 4px;
      
      .employee-id {
        color: var(--el-text-color-placeholder);
        font-size: 12px;
        margin-left: 4px;
      }
    }
    
    .department {
      font-size: 13px;
      color: var(--el-text-color-regular);
      margin-bottom: 4px;
    }
  }
  
  .no-match {
    color: var(--el-text-color-placeholder);
    font-style: italic;
  }
  
  .confidence-info {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .confidence-text {
      font-size: 12px;
      color: var(--el-text-color-regular);
      min-width: 35px;
    }
  }
  
  .differences {
    .diff-tag {
      margin: 2px 4px 2px 0;
      font-size: 11px;
    }
    
    .more-diffs {
      color: var(--el-color-primary);
      cursor: pointer;
      font-size: 12px;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
  
  .all-differences {
    .diff-item {
      margin-bottom: 8px;
      font-size: 13px;
      
      .old-value {
        color: var(--el-color-danger);
      }
      
      .new-value {
        color: var(--el-color-success);
      }
    }
  }
  
  .conflicts {
    .el-tag {
      margin: 2px 0;
      font-size: 11px;
    }
  }
  
  .no-conflicts, .no-changes, .new-record {
    font-size: 13px;
    color: var(--el-text-color-placeholder);
  }
  
  .new-record {
    color: var(--el-color-success);
    font-weight: 500;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .summary-text {
    font-size: 14px;
    color: var(--el-text-color-regular);
    
    strong {
      color: var(--el-color-primary);
    }
  }
  
  .action-buttons {
    display: flex;
    gap: 8px;
  }
}
</style> 