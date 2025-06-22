<template>
  <router-view />
</template>

<script setup lang="ts">
import { useHotkeys } from '@/composables/useHotkeys'
import { useBackup } from '@/composables/useBackup'

// 启用快捷键系统
useHotkeys()

// 启用自动备份系统
useBackup()
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}
</style> 