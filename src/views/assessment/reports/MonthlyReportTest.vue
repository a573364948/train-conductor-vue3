<template>
  <div class="monthly-report-test">
    <h1>月度报表页面</h1>
    <p>这是一个测试页面，用于验证路由是否正常工作。</p>
    <el-button type="primary" @click="testClick">测试按钮</el-button>
    <p v-if="showMessage">路由工作正常！</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showMessage = ref(false)

const testClick = () => {
  showMessage.value = true
}
</script>

<style scoped>
.monthly-report-test {
  padding: 20px;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

p {
  margin: 10px 0;
  color: #666;
}
</style> 