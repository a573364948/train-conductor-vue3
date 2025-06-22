<template>
  <el-container class="main-layout">
    <!-- PC端侧边栏 -->
    <el-aside 
      v-if="!isMobile" 
      :width="isCollapse ? '64px' : '240px'" 
      class="sidebar desktop-sidebar"
    >
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
          :icon="isCollapse ? Expand : Fold"
          circle
          @click="toggleCollapse"
        />
      </div>
    </el-aside>

    <!-- 手机端抽屉式侧边栏 -->
    <el-drawer
      v-if="isMobile"
      v-model="drawerVisible"
      direction="ltr"
      :with-header="false"
      :size="280"
      class="mobile-drawer"
    >
      <div class="mobile-sidebar">
        <div class="mobile-logo">
          <el-icon size="28"><DataAnalysis /></el-icon>
          <span class="logo-text">列车长考核系统</span>
        </div>
        
        <el-menu
          :default-active="activeMenu"
          class="mobile-menu"
          router
          @select="handleMobileMenuSelect"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>概览仪表板</span>
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
          
          <el-sub-menu index="assessment">
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
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-drawer>
    
    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="header" :class="{ 'mobile-header': isMobile }">
        <div class="header-left">
          <!-- 手机端汉堡包菜单按钮 -->
          <el-button 
            v-if="isMobile"
            icon="Menu" 
            text 
            @click="toggleDrawer"
            class="mobile-menu-btn"
          />
          <h1 class="page-title" :class="{ 'mobile-title': isMobile }">{{ pageTitle }}</h1>
        </div>
        <div class="header-right" :class="{ 'mobile-actions': isMobile }">
          <el-button 
            :icon="themeIcon" 
            :circle="!isMobile"
            :text="isMobile"
            @click="toggleTheme" 
            :title="themeTitle" 
            :size="isMobile ? 'small' : 'default'"
          />
          <el-button 
            icon="QuestionFilled" 
            :circle="!isMobile"
            :text="isMobile"
            @click="showHotkeys" 
            :title="isMobile ? '帮助' : '快捷键帮助 (Ctrl+/)'"
            :size="isMobile ? 'small' : 'default'"
          />
          <el-button 
            icon="Refresh" 
            :circle="!isMobile"
            :text="isMobile"
            @click="handleRefresh"
            :size="isMobile ? 'small' : 'default'"
          />
          <el-button 
            v-if="!isMobile"
            icon="FullScreen" 
            circle 
            @click="toggleFullScreen"
          />
        </div>
      </el-header>
      
      <!-- 内容区 -->
      <el-main class="main-content" :class="{ 'mobile-content': isMobile }">
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
  Moon,
  Menu
} from '@element-plus/icons-vue'
import { useTheme } from '@/composables/useTheme'
import { useHotkeys } from '@/composables/useHotkeys'

const route = useRoute()
const isCollapse = ref(false)
const drawerVisible = ref(false)
const isMobile = ref(false)
const { theme, isDark, toggleTheme } = useTheme()
const { showHotkeyHelp: showHotkeys } = useHotkeys()

// 检测移动端设备
const checkMobileDevice = () => {
  const width = window.innerWidth
  isMobile.value = width <= 768
  
  // 在移动端自动折叠PC端侧边栏
  if (isMobile.value) {
    isCollapse.value = true
  }
}

// 监听窗口大小变化
const handleResize = () => {
  checkMobileDevice()
  
  // 切换到PC端时自动关闭抽屉
  if (!isMobile.value) {
    drawerVisible.value = false
  }
}

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 页面标题
const pageTitle = computed(() => {
  const title = (route.meta?.title as string) || '列车长考核管理系统'
  // 手机端缩短标题
  if (isMobile.value && title.length > 8) {
    return title.replace('列车长考核管理系统', '考核系统')
  }
  return title
})

// 主题图标和标题
const themeIcon = computed(() => isDark.value ? Sunny : Moon)
const themeTitle = computed(() => {
  if (theme.value === 'auto') return '跟随系统'
  return isDark.value ? '浅色模式' : '深色模式'
})

// 切换侧边栏折叠（仅PC端）
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

// 切换移动端抽屉
const toggleDrawer = () => {
  drawerVisible.value = !drawerVisible.value
}

// 手机端菜单选择后自动关闭抽屉
const handleMobileMenuSelect = () => {
  drawerVisible.value = false
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

// 生命周期
onMounted(() => {
  checkMobileDevice()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
  
  .desktop-sidebar {
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
    height: 60px;
    
    &.mobile-header {
      padding: 0 12px;
      height: 56px;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
      
      .mobile-menu-btn {
        font-size: 20px;
        padding: 8px;
        min-width: 44px;
        height: 44px;
      }
    }
    
    .page-title {
      font-size: 20px;
      font-weight: 500;
      margin: 0;
      
      &.mobile-title {
        font-size: 16px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    
    .header-right {
      display: flex;
      gap: 10px;
      
      &.mobile-actions {
        gap: 4px;
        
        .el-button {
          min-width: 44px;
          height: 44px;
        }
      }
    }
  }
  
  .main-content {
    background-color: var(--bg-page);
    padding: 20px;
    
    &.mobile-content {
      padding: 12px;
    }
  }
}

// 手机端抽屉样式
.mobile-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
  }
  
  .mobile-sidebar {
    height: 100%;
    background-color: #001529;
    display: flex;
    flex-direction: column;
    
    .mobile-logo {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0 20px;
      
      .logo-text {
        margin-left: 12px;
      }
    }
    
    .mobile-menu {
      flex: 1;
      border-right: none;
      background-color: transparent;
      
      :deep(.el-menu-item) {
        color: rgba(255, 255, 255, 0.65);
        height: 48px;
        line-height: 48px;
        
        &:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        &.is-active {
          color: #fff;
          background-color: #1890ff;
        }
        
        .el-icon {
          margin-right: 12px;
        }
      }
      
      :deep(.el-sub-menu__title) {
        color: rgba(255, 255, 255, 0.65);
        height: 48px;
        line-height: 48px;
        
        &:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .el-icon {
          margin-right: 12px;
        }
      }
      
      :deep(.el-sub-menu) {
        .el-menu {
          background-color: #000c17;
          
          .el-menu-item {
            color: rgba(255, 255, 255, 0.65);
            padding-left: 60px !important;
            height: 44px;
            line-height: 44px;
            
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

// 响应式设计
@media (max-width: 768px) {
  .main-layout {
    .desktop-sidebar {
      display: none !important;
    }
  }
}

// iPhone SE 及更小屏幕适配
@media (max-width: 375px) {
  .main-layout {
    .header {
      &.mobile-header {
        padding: 0 8px;
      }
      
      .page-title {
        &.mobile-title {
          font-size: 14px;
        }
      }
      
      .header-right {
        &.mobile-actions {
          gap: 2px;
          
          .el-button {
            min-width: 40px;
            height: 40px;
          }
        }
      }
    }
    
    .main-content {
      &.mobile-content {
        padding: 8px;
      }
    }
  }
  
  .mobile-drawer {
    :deep(.el-drawer) {
      width: 260px !important;
    }
  }
}
</style> 