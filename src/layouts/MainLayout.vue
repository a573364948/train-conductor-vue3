<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '240px'" class="sidebar">
      <div class="logo">
        <el-icon size="24"><DataAnalysis /></el-icon>
        <span v-if="!isCollapse" class="logo-text">列车长考核系统</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        class="sidebar-menu"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>概览仪表板</template>
        </el-menu-item>
        
        <el-sub-menu index="data">
          <template #title>
            <el-icon><Upload /></el-icon>
            <span>数据管理</span>
          </template>
                        <el-menu-item index="/upload">月度奖励数据上传</el-menu-item>
          <el-menu-item index="/assessment-management">考核记录管理</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="personnel">
          <template #title>
            <el-icon><User /></el-icon>
            <span>人员管理</span>
          </template>
          <el-menu-item index="/personnel/archive">人员档案</el-menu-item>
          <el-menu-item index="/personnel/applications">申请审批</el-menu-item>
          <el-menu-item index="/personnel/changes">异动记录</el-menu-item>
          <el-menu-item index="/personnel/import">数据导入</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="assessment" popper-class="custom-submenu">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>考核管理</span>
          </template>
          <el-menu-item index="/assessment/records">考核记录</el-menu-item>
          <el-menu-item index="/assessment/item-management">项点管理</el-menu-item>
          <el-menu-item index="/assessment/issue-tracking">问题追踪</el-menu-item>
          <el-menu-item index="/assessment/reward-analysis">奖励分析</el-menu-item>
          <el-menu-item index="/assessment/reports">考核报表</el-menu-item>
          <el-menu-item index="/assessment/monthly-report">月度报表</el-menu-item>
                          <el-menu-item index="/assessment/yearly-report">年度报表</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="analysis">
          <template #title>
            <el-icon><Histogram /></el-icon>
            <span>考核分析</span>
          </template>
          <el-menu-item index="/score-overview">评分总览</el-menu-item>
          <el-menu-item index="/score-analysis">详细分析</el-menu-item>
          <el-menu-item index="/trend-analysis">趋势分析</el-menu-item>
          <el-menu-item index="/segment-overall-analysis">全段整体分析</el-menu-item>
          <el-menu-item index="/management-intensity-analysis">管理力度分析</el-menu-item>
          <el-menu-item index="/comprehensive-monthly-report">月度综合报表</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="statistics">
          <template #title>
            <el-icon><PieChart /></el-icon>
            <span>统计分析</span>
          </template>
          <el-menu-item index="/statistics">奖励统计</el-menu-item>
          <el-menu-item index="/attendance-status">在岗统计</el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer">
        <el-button
          :icon="isCollapse ? 'Expand' : 'Fold'"
          circle
          @click="toggleCollapse"
        />
      </div>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="header-left">
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
        <div class="header-right">
          <el-button :icon="themeIcon" circle @click="toggleTheme" :title="themeTitle" />
          <el-button icon="QuestionFilled" circle @click="showHotkeys" title="快捷键帮助 (Ctrl+/)" />
          <el-button icon="Refresh" circle @click="handleRefresh" />
          <el-button icon="FullScreen" circle @click="toggleFullScreen" />
        </div>
      </el-header>
      
      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  DataAnalysis,
  Upload,
  User,
  Histogram,
  PieChart,
  Setting,
  Expand,
  Fold,
  Refresh,
  FullScreen,
  Sunny,
  Moon
} from '@element-plus/icons-vue'
import { useTheme } from '@/composables/useTheme'
import { useHotkeys } from '@/composables/useHotkeys'

const route = useRoute()
const isCollapse = ref(false)
const { theme, isDark, toggleTheme } = useTheme()
const { showHotkeyHelp: showHotkeys } = useHotkeys()

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 页面标题
const pageTitle = computed(() => route.meta?.title || '列车长考核管理系统')

// 主题图标和标题
const themeIcon = computed(() => isDark.value ? Sunny : Moon)
const themeTitle = computed(() => {
  if (theme.value === 'auto') return '跟随系统'
  return isDark.value ? '浅色模式' : '深色模式'
})

// 切换侧边栏折叠
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

// 刷新页面
const handleRefresh = () => {
  window.location.reload()
}

// 全屏切换
const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
  
  .sidebar {
    background-color: #001529;
    transition: width 0.3s;
    display: flex;
    flex-direction: column;
    
    .logo {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      
      .logo-text {
        margin-left: 10px;
        white-space: nowrap;
        overflow: hidden;
      }
    }
    
    .sidebar-menu {
      flex: 1;
      border-right: none;
      background-color: transparent;
      
      :deep(.el-menu-item),
      :deep(.el-sub-menu__title) {
        color: rgba(255, 255, 255, 0.65);
        
        &:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        &.is-active {
          color: #fff;
          background-color: #1890ff;
        }
      }
      
      // 子菜单样式
      :deep(.el-sub-menu) {
        .el-menu {
          background-color: #000c17;
          
          .el-menu-item {
            color: rgba(255, 255, 255, 0.65);
            padding-left: 60px !important;
            
            &:hover {
              color: #fff;
              background-color: rgba(255, 255, 255, 0.08);
            }
            
            &.is-active {
              color: #fff;
              background-color: #1890ff;
            }
          }
        }
      }
    }
    
    .sidebar-footer {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
  }
  
  .header {
    background-color: var(--bg-white);
    box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    
    .page-title {
      font-size: 20px;
      font-weight: 500;
      margin: 0;
    }
    
    .header-right {
      display: flex;
      gap: 10px;
    }
  }
  
  .main-content {
    background-color: var(--bg-page);
    padding: 20px;
  }
}

// 页面切换动画
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style> 