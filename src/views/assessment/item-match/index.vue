<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>项点匹配管理</h3>
          <div class="actions">
            <el-button type="primary" @click="autoMatch" :loading="loading">
              <el-icon><Refresh /></el-icon>
              自动匹配
            </el-button>
            <el-button @click="exportUnmatched">
              <el-icon><Download /></el-icon>
              导出未匹配项
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选条件 -->
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="匹配状态">
          <el-select v-model="filters.matchStatus" clearable placeholder="全部">
            <el-option label="已匹配" value="matched" />
            <el-option label="未匹配" value="unmatched" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索考核项描述" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadUnmatchedItems">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 统计信息 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <el-statistic title="总考核项" :value="stats.total" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已匹配" :value="stats.matched" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="未匹配" :value="stats.unmatched" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="匹配率" :value="matchRate" suffix="%" />
        </el-col>
      </el-row>

      <!-- 匹配列表 -->
      <el-table v-loading="loading" :data="displayItems" border>
        <el-table-column prop="item" label="考核项描述" min-width="300" show-overflow-tooltip />
        <el-table-column prop="frequency" label="出现次数" width="100" align="center" />
        <el-table-column label="匹配状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.matchedItem" type="success">已匹配</el-tag>
            <el-tag v-else type="info">未匹配</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标准项点" min-width="200">
          <template #default="{ row }">
            <div v-if="row.matchedItem" class="matched-item">
              <div class="item-code">{{ row.matchedItem.id }}</div>
              <div class="item-name">{{ row.matchedItem.name }}</div>
            </div>
            <span v-else class="unmatch-hint">--</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showMatchDialog(row)">
              {{ row.matchedItem ? '重新匹配' : '手动匹配' }}
            </el-button>
            <el-button v-if="row.matchedItem" link type="danger" @click="removeMatch(row)">
              解除关联
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="filteredItems.length"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
      />
    </el-card>

    <!-- 手动匹配对话框 -->
    <el-dialog
      v-model="matchDialogVisible"
      title="手动匹配标准项点"
      width="800"
      destroy-on-close
    >
      <div v-if="currentItem" class="match-dialog">
        <div class="current-item">
          <h4>当前考核项</h4>
          <p>{{ currentItem.item }}</p>
          <el-tag size="small">出现 {{ currentItem.frequency }} 次</el-tag>
        </div>

        <el-divider />

        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标准项点"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 标准项点列表 -->
        <div class="standard-items-list">
          <el-radio-group v-model="selectedItemId" class="items-radio-group">
            <div
              v-for="item in filteredStandardItems"
              :key="item.id"
              class="standard-item-option"
            >
              <el-radio :value="item.id">
                <div class="item-content">
                  <div class="item-header">
                    <span class="item-id">{{ item.id }}</span>
                    <el-tag size="small" type="primary">{{ item.category }}</el-tag>
                  </div>
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-desc">{{ item.description }}</div>
                </div>
              </el-radio>
            </div>
          </el-radio-group>
        </div>
      </div>

      <template #footer>
        <el-button @click="matchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMatch" :disabled="!selectedItemId">
          确认匹配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Refresh, Search } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import { ExcelProcessor } from '@/utils/excel'
import type { StandardAssessmentItem } from '@/types'

interface ItemMatch {
  item: string
  frequency: number
  matchedItem?: StandardAssessmentItem
  itemIds?: string[]
}

const mainStore = useMainStore()
const loading = ref(false)
const matchDialogVisible = ref(false)
const currentItem = ref<ItemMatch | null>(null)
const selectedItemId = ref('')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

const filters = reactive({
  matchStatus: '',
  keyword: ''
})

const stats = reactive({
  total: 0,
  matched: 0,
  unmatched: 0
})

const unmatchedItems = ref<ItemMatch[]>([])
const itemMatchMap = ref<Record<string, string>>({}) // 考核项描述 -> 标准项点ID

// 计算匹配率
const matchRate = computed(() => {
  if (stats.total === 0) return 0
  return Math.round((stats.matched / stats.total) * 100)
})

// 筛选后的数据
const filteredItems = computed(() => {
  let items = unmatchedItems.value
  
  if (filters.matchStatus) {
    items = items.filter(item => {
      const isMatched = !!item.matchedItem
      return filters.matchStatus === 'matched' ? isMatched : !isMatched
    })
  }
  
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    items = items.filter(item => 
      item.item.toLowerCase().includes(keyword)
    )
  }
  
  return items
})

// 分页数据
const displayItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredItems.value.slice(start, end)
})

// 标准项点列表
const standardItems = computed(() => {
  const items = mainStore.database?.standardAssessmentItems || {}
  return Object.values(items)
})

// 搜索过滤标准项点
const filteredStandardItems = computed(() => {
  if (!searchKeyword.value) return standardItems.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return standardItems.value.filter(item =>
    item.name.toLowerCase().includes(keyword) ||
    item.description.toLowerCase().includes(keyword) ||
    item.id.toLowerCase().includes(keyword) ||
    item.category.toLowerCase().includes(keyword)
  )
})

// 加载未匹配项
const loadUnmatchedItems = async () => {
  loading.value = true
  try {
    const records = mainStore.database?.assessmentDB || []
    const itemFrequency = new Map<string, Set<string>>()
    
    // 统计考核项出现频率
    records.forEach(record => {
      record.details.forEach(detail => {
        if (detail.item) {
          if (!itemFrequency.has(detail.item)) {
            itemFrequency.set(detail.item, new Set())
          }
          // 记录出现的记录ID
          itemFrequency.get(detail.item)!.add(record.id)
        }
      })
    })
    
    // 转换为数组并匹配标准项点
    const items: ItemMatch[] = []
    itemFrequency.forEach((recordIds, item) => {
      const matchedId = itemMatchMap.value[item]
      const matchedItem = matchedId ? mainStore.database?.standardAssessmentItems[matchedId] : undefined
      
      items.push({
        item,
        frequency: recordIds.size,
        matchedItem,
        itemIds: Array.from(recordIds)
      })
    })
    
    // 按频率降序排序
    items.sort((a, b) => b.frequency - a.frequency)
    unmatchedItems.value = items
    
    // 更新统计
    updateStats()
  } finally {
    loading.value = false
  }
}

// 更新统计信息
const updateStats = () => {
  stats.total = unmatchedItems.value.length
  stats.matched = unmatchedItems.value.filter(item => item.matchedItem).length
  stats.unmatched = stats.total - stats.matched
}

// 显示匹配对话框
const showMatchDialog = (item: ItemMatch) => {
  currentItem.value = item
  selectedItemId.value = item.matchedItem?.id || ''
  searchKeyword.value = ''
  matchDialogVisible.value = true
}

// 确认匹配
const confirmMatch = async () => {
  if (!currentItem.value || !selectedItemId.value) return
  
  const standardItem = mainStore.database?.standardAssessmentItems[selectedItemId.value]
  if (!standardItem) return
  
  // 更新匹配映射
  itemMatchMap.value[currentItem.value.item] = standardItem.id
  
  // 更新当前项
  currentItem.value.matchedItem = standardItem
  
  // 更新所有相关的考核记录
  await updateAssessmentRecords(currentItem.value.item, standardItem)
  
  updateStats()
  matchDialogVisible.value = false
  ElMessage.success('匹配成功')
}

// 解除关联
const removeMatch = async (item: ItemMatch) => {
  await ElMessageBox.confirm(
    '确定要解除该项的关联吗？',
    '解除关联',
    {
      type: 'warning'
    }
  )
  
  delete itemMatchMap.value[item.item]
  item.matchedItem = undefined
  
  // 更新相关考核记录
  await updateAssessmentRecords(item.item, null)
  
  updateStats()
  ElMessage.success('已解除关联')
}

// 更新考核记录
const updateAssessmentRecords = async (itemDescription: string, standardItem: StandardAssessmentItem | null) => {
  if (!mainStore.database) return
  
  const records = mainStore.database.assessmentDB || []
  let updatedCount = 0
  
  records.forEach(record => {
    let updated = false
    record.details.forEach(detail => {
      if (detail.item === itemDescription) {
        if (standardItem) {
          detail.itemCode = standardItem.id
          detail.itemName = standardItem.name
          detail.itemCategory = standardItem.category
        } else {
          detail.itemCode = ''
          detail.itemName = ''
          detail.itemCategory = ''
        }
        updated = true
      }
    })
    if (updated) updatedCount++
  })
  
  // 保存到数据库
  await mainStore.saveDatabase()
  
  ElMessage.success(`已更新 ${updatedCount} 条考核记录`)
}

// 自动匹配
const autoMatch = async () => {
  loading.value = true
  try {
    const unmatched = unmatchedItems.value.filter(item => !item.matchedItem)
    let matchedCount = 0
    
    for (const item of unmatched) {
      const matched = findBestMatch(item.item)
      if (matched) {
        itemMatchMap.value[item.item] = matched.id
        item.matchedItem = matched
        await updateAssessmentRecords(item.item, matched)
        matchedCount++
      }
    }
    
    updateStats()
    ElMessage.success(`自动匹配完成，成功匹配 ${matchedCount} 项`)
  } finally {
    loading.value = false
  }
}

// 查找最佳匹配
const findBestMatch = (description: string): StandardAssessmentItem | null => {
  const items = standardItems.value
  const descLower = description.toLowerCase()
  
  // 精确匹配
  let matched = items.find(item => 
    item.description.toLowerCase() === descLower ||
    item.name.toLowerCase() === descLower
  )
  
  // 包含匹配
  if (!matched) {
    matched = items.find(item => 
      item.description.toLowerCase().includes(descLower) ||
      descLower.includes(item.description.toLowerCase())
    )
  }
  
  // 关键词匹配
  if (!matched) {
    const keywords = descLower.split(/[,，、\/\s]/).filter(k => k.length > 2)
    if (keywords.length > 0) {
      matched = items.find(item => {
        const itemText = `${item.name} ${item.description}`.toLowerCase()
        return keywords.every(keyword => itemText.includes(keyword))
      })
    }
  }
  
  return matched || null
}

// 导出未匹配项
const exportUnmatched = () => {
  const unmatched = unmatchedItems.value.filter(item => !item.matchedItem)
  
  if (unmatched.length === 0) {
    ElMessage.warning('没有未匹配的项')
    return
  }
  
  const data = unmatched.map(item => ({
    考核项描述: item.item,
    出现次数: item.frequency,
    匹配状态: '未匹配',
    建议匹配: ''
  }))
  
  const excelProcessor = new ExcelProcessor()
  excelProcessor.exportToExcel(data, '未匹配考核项')
}

onMounted(() => {
  loadUnmatchedItems()
})
</script>

<style lang="scss" scoped>
.page-container {
  padding: 16px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
    }
    
    .actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .filter-form {
    margin-bottom: 20px;
  }
  
  .stats-row {
    margin-bottom: 20px;
    
    :deep(.el-statistic) {
      text-align: center;
    }
  }
  
  .matched-item {
    .item-code {
      font-size: 12px;
      color: var(--el-color-primary);
      font-weight: 500;
    }
    
    .item-name {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-top: 2px;
    }
  }
  
  .unmatch-hint {
    color: var(--el-text-color-disabled);
  }
  
  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }
}

.match-dialog {
  .current-item {
    background: var(--el-fill-color-light);
    padding: 16px;
    border-radius: 4px;
    
    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
    
    p {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
    }
  }
  
  .search-input {
    margin: 16px 0;
  }
  
  .standard-items-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    padding: 8px;
    
    .items-radio-group {
      width: 100%;
    }
    
    .standard-item-option {
      margin-bottom: 8px;
      
      :deep(.el-radio) {
        width: 100%;
        height: auto;
        padding: 12px;
        margin-right: 0;
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        
        &:hover {
          border-color: var(--el-color-primary);
        }
        
        .el-radio__label {
          width: 100%;
          white-space: normal;
        }
      }
      
      .item-content {
        width: 100%;
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          
          .item-id {
            font-weight: 500;
            color: var(--el-color-primary);
          }
        }
        
        .item-name {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .item-desc {
          font-size: 12px;
          color: var(--el-text-color-regular);
          line-height: 1.4;
        }
      }
    }
  }
}
</style>
