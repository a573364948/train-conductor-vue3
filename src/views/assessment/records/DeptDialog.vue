<template>
  <el-dialog v-model="visible" title="设置考核部门" width="500px">
    <div>
      <p class="mb-2">当前记录：<strong>{{ conductorName }}</strong> - {{ assessDate }}</p>
      <el-form>
        <el-form-item label="考核部门">
          <el-input v-model="selectedDept" placeholder="请输入考核部门名称" />
        </el-form-item>
        <el-form-item label="考核类型">
          <el-radio-group v-model="selectedType">
            <el-radio label="科室">科室</el-radio>
            <el-radio label="车队">车队</el-radio>
            <el-radio label="其他">其他</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineExpose } from 'vue'

const visible = ref(false)
const conductorName = ref('')
const assessDate = ref('')
const selectedDept = ref('')
const selectedType = ref<'科室' | '车队' | '其他'>('科室')
const recordId = ref('')

function open(record: any) {
  conductorName.value = record.conductorName
  assessDate.value = record.assessDate
  selectedDept.value = record.assessorDepartmentName || ''
  selectedType.value = record.assessDeptType || '科室'
  recordId.value = record.id
  visible.value = true
}

function handleConfirm() {
  if (!selectedDept.value.trim()) return
  visible.value = false
  emit('confirm', { 
    recordId: recordId.value,
    department: selectedDept.value.trim(), 
    type: selectedType.value 
  })
}

const emit = defineEmits(['confirm'])

defineExpose({ open })
</script>

<style scoped>
.mb-2 { margin-bottom: 8px; }
</style> 