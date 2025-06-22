<template>
  <div class="virtual-table-container">
    <div class="virtual-table-header">
      <table class="el-table__header">
        <colgroup>
          <col v-for="(column, index) in columns" :key="index" :width="column.width" />
        </colgroup>
        <thead>
          <tr>
            <th
              v-for="(column, index) in columns"
              :key="index"
              class="el-table__cell"
              @click="handleSort(column)"
            >
              <div class="cell">
                {{ column.label }}
                <span v-if="column.sortable" class="caret-wrapper">
                  <i class="sort-caret ascending" :class="{ active: sortKey === column.prop && sortOrder === 'asc' }"></i>
                  <i class="sort-caret descending" :class="{ active: sortKey === column.prop && sortOrder === 'desc' }"></i>
                </span>
              </div>
            </th>
          </tr>
        </thead>
      </table>
    </div>
    
    <div
      ref="scrollContainerRef"
      class="virtual-table-body"
      :style="{ height: `${height}px` }"
      @scroll="handleScroll"
    >
      <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
        <table
          class="el-table__body"
          :style="{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%'
          }"
        >
          <colgroup>
            <col v-for="(column, index) in columns" :key="index" :width="column.width" />
          </colgroup>
          <tbody>
            <tr
              v-for="(row, rowIndex) in visibleData"
              :key="row[rowKey] || startIndex + rowIndex"
              class="el-table__row"
              :class="{ 'el-table__row--striped': stripe && (startIndex + rowIndex) % 2 === 1 }"
              @click="$emit('row-click', row)"
            >
              <td
                v-for="(column, colIndex) in columns"
                :key="colIndex"
                class="el-table__cell"
              >
                <div class="cell">
                  <slot
                    v-if="column.slot"
                    :name="column.slot"
                    :row="row"
                    :column="column"
                    :index="startIndex + rowIndex"
                  />
                  <span v-else>{{ getCellValue(row, column.prop) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'

interface Column {
  prop: string
  label: string
  width?: string | number
  sortable?: boolean
  slot?: string
}

interface Props {
  data: any[]
  columns: Column[]
  height?: number
  rowHeight?: number
  rowKey?: string
  stripe?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 600,
  rowHeight: 48,
  rowKey: 'id',
  stripe: false
})

const emit = defineEmits<{
  'row-click': [row: any]
  'sort-change': [{ prop: string; order: 'asc' | 'desc' | null }]
}>()

// 排序状态
const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

// 虚拟滚动相关
const scrollContainerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const startIndex = ref(0)
const endIndex = ref(0)
const offsetY = ref(0)

// 计算总高度
const totalHeight = computed(() => props.data.length * props.rowHeight)

// 计算可见行数
const visibleCount = computed(() => Math.ceil(props.height / props.rowHeight) + 2)

// 排序后的数据
const sortedData = computed(() => {
  if (!sortKey.value || !sortOrder.value) {
    return props.data
  }
  
  return [...props.data].sort((a, b) => {
    const aVal = getCellValue(a, sortKey.value!)
    const bVal = getCellValue(b, sortKey.value!)
    
    if (aVal === bVal) return 0
    
    if (sortOrder.value === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
})

// 可见数据
const visibleData = computed(() => {
  return sortedData.value.slice(startIndex.value, endIndex.value)
})

// 获取单元格值
const getCellValue = (row: any, prop: string) => {
  const keys = prop.split('.')
  let value = row
  for (const key of keys) {
    value = value?.[key]
  }
  return value
}

// 计算可见范围
const calculateRange = () => {
  const container = scrollContainerRef.value
  if (!container) return
  
  const scrollTop = container.scrollTop
  const start = Math.floor(scrollTop / props.rowHeight)
  const end = Math.min(start + visibleCount.value, props.data.length)
  
  startIndex.value = Math.max(0, start - 5) // 预加载5行
  endIndex.value = Math.min(props.data.length, end + 5) // 预加载5行
  offsetY.value = startIndex.value * props.rowHeight
}

// 处理滚动
const handleScroll = debounce(() => {
  calculateRange()
}, 10)

// 处理排序
const handleSort = (column: Column) => {
  if (!column.sortable) return
  
  if (sortKey.value === column.prop) {
    if (sortOrder.value === 'asc') {
      sortOrder.value = 'desc'
    } else if (sortOrder.value === 'desc') {
      sortKey.value = null
      sortOrder.value = null
    }
  } else {
    sortKey.value = column.prop
    sortOrder.value = 'asc'
  }
  
  emit('sort-change', {
    prop: sortKey.value || '',
    order: sortOrder.value
  })
}

// 监听数据变化
watch(() => props.data, () => {
  calculateRange()
})

// 监听高度变化
watch(() => props.height, () => {
  calculateRange()
})

onMounted(() => {
  calculateRange()
  window.addEventListener('resize', calculateRange)
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateRange)
})
</script>

<style lang="scss" scoped>
.virtual-table-container {
  position: relative;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  
  .virtual-table-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f5f7fa;
    border-bottom: 1px solid #ebeef5;
    
    table {
      width: 100%;
      table-layout: fixed;
    }
    
    th {
      padding: 12px 0;
      text-align: left;
      font-weight: 500;
      color: #909399;
      cursor: pointer;
      user-select: none;
      
      &:hover {
        background: #f0f2f5;
      }
    }
  }
  
  .virtual-table-body {
    overflow-y: auto;
    overflow-x: hidden;
    
    table {
      width: 100%;
      table-layout: fixed;
    }
    
    .el-table__row {
      &:hover {
        background-color: #f5f7fa;
      }
      
      &.el-table__row--striped {
        background: #fafafa;
      }
    }
  }
  
  .el-table__cell {
    padding: 0;
    border-bottom: 1px solid #ebeef5;
    
    .cell {
      padding: 12px 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .caret-wrapper {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    height: 14px;
    width: 24px;
    vertical-align: middle;
    cursor: pointer;
    overflow: initial;
    position: relative;
    margin-left: 4px;
    
    .sort-caret {
      width: 0;
      height: 0;
      border: 5px solid transparent;
      position: absolute;
      left: 7px;
      
      &.ascending {
        border-bottom-color: #c0c4cc;
        top: -5px;
        
        &.active {
          border-bottom-color: #409eff;
        }
      }
      
      &.descending {
        border-top-color: #c0c4cc;
        bottom: -5px;
        
        &.active {
          border-top-color: #409eff;
        }
      }
    }
  }
}
</style> 