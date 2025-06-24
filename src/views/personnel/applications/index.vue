<template>
  <div class="personnel-applications">
    <!-- 临时的移动端检测提示 -->
    <div v-if="showMobileDebug" class="mobile-debug-info">
      <el-alert 
        :title="`当前屏幕宽度: ${screenWidth}px`" 
        :type="isMobile ? 'success' : 'info'"
        show-icon
        :closable="false"
        class="debug-alert"
      >
        <template #default>
          <p><strong>移动端检测:</strong> {{ isMobile ? '✅ 已启用手机端优化' : '❌ PC端显示' }}</p>
          <p><strong>当前时间:</strong> {{ currentTime }}</p>
          <el-button size="small" @click="showMobileDebug = false">关闭调试</el-button>
        </template>
      </el-alert>
    </div>
    
    <ApplicationManagement />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ApplicationManagement from '@/views/personnel/components/ApplicationManagement.vue'

// 移动端检测调试
const showMobileDebug = ref(true)
const isMobile = ref(false)
const screenWidth = ref(0)
const currentTime = ref('')

const checkMobileDevice = () => {
  screenWidth.value = window.innerWidth
  isMobile.value = window.innerWidth <= 768
}

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('zh-CN')
}

const handleResize = () => {
  checkMobileDevice()
}

onMounted(() => {
  checkMobileDevice()
  updateTime()
  
  // 5秒后自动关闭调试信息
  setTimeout(() => {
    showMobileDebug.value = false
  }, 10000)
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 每秒更新时间
  const timer = setInterval(updateTime, 1000)
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    clearInterval(timer)
  })
})
</script>

<style lang="scss" scoped>
.personnel-applications {
  height: 100%;
}

.mobile-debug-info {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 300px;
  
  @media (max-width: 768px) {
    position: fixed;
    top: 10px;
    left: 10px;
    right: 10px;
    max-width: none;
  }
}

.debug-alert {
  margin-bottom: 0;
  
  :deep(.el-alert__content) {
    p {
      margin: 4px 0;
      font-size: 12px;
    }
  }
}
</style> 