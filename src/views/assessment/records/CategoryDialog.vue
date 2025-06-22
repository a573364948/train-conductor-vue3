<template>
  <el-dialog v-model="visible" title="设置考核类别" width="500px">
    <div>
      <p class="mb-2">考核项目：<strong>{{ description }}</strong></p>
      <el-radio-group v-model="selectedCategory">
        <el-radio v-for="cat in categories" :key="cat" :label="cat">{{ cat }}</el-radio>
      </el-radio-group>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineExpose } from 'vue'

const props = defineProps<{ categories: string[] }>()

const visible = ref(false)
const description = ref('')
const selectedCategory = ref('')

function open(desc: string, current: string) {
  description.value = desc
  selectedCategory.value = current || ''
  visible.value = true
}

function handleConfirm() {
  if (!selectedCategory.value) return
  visible.value = false
  emit('confirm', { description: description.value, category: selectedCategory.value })
}

const emit = defineEmits(['confirm'])

defineExpose({ open })
</script>

<style scoped>
.mb-2 { margin-bottom: 8px; }
</style> 