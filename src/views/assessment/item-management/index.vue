<template>
  <div class="item-management-container">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>项点管理</h3>
          <div class="header-actions">
            <el-button 
              v-if="activeTab === 'matching'" 
              type="primary" 
              @click="refreshMatching"
              :loading="loading"
            >
              <el-icon><Refresh /></el-icon>
              刷新匹配
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="item-tabs">
        <!-- Tab 1: 标准项点库管理 -->
        <el-tab-pane label="标准项点库" name="library">
          <StandardItemLibrary />
        </el-tab-pane>

        <!-- Tab 2: 项点匹配管理 -->
        <el-tab-pane label="项点匹配" name="matching">
          <ItemMatching />
        </el-tab-pane>

        <!-- Tab 3: 统计概览 -->
        <el-tab-pane label="统计概览" name="overview">
          <ItemOverview />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import StandardItemLibrary from './components/StandardItemLibrary.vue'
import ItemMatching from './components/ItemMatching.vue'
import ItemOverview from './components/ItemOverview.vue'

const activeTab = ref('library')
const loading = ref(false)

// 提供共享状态给子组件
provide('refreshTrigger', ref(0))

const refreshMatching = () => {
  // 触发匹配组件刷新
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}
</script>

<style lang="scss" scoped>
.item-management-container {
  padding: 16px;
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
    
    .header-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .item-tabs {
    :deep(.el-tabs__content) {
      padding-top: 20px;
    }
  }
}
</style> 