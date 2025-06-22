<template>
  <div class="upload-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>月度奖励数据上传</h2>
      <p class="page-description">上传列车长月度在岗奖励数据，包含月度得分和奖励金额等信息</p>
    </div>

    <!-- 月度奖励数据上传 -->
    <div class="upload-card">
      <div class="card-header">
        <h3>上传月度奖励文件</h3>
        <el-button type="primary" size="small" @click="downloadTemplate">
          <el-icon><Download /></el-icon>
          下载模板
        </el-button>
      </div>
      
      <div class="card-body">
        <div class="upload-section">
          <el-upload
            ref="uploadRef"
            class="upload-area"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .xlsx, .xls 格式，文件大小不超过 10MB
              </div>
            </template>
          </el-upload>
          
          <!-- 上传说明 -->
          <div class="upload-instructions">
            <h4>上传说明</h4>
            <ul>
              <li>此功能用于上传列车长<strong>月度奖励数据</strong>，包含工号、姓名、部门、奖励金额、月度得分等字段</li>
              <li>与"考核记录管理"中的扣分数据不同，这里上传的是<strong>正向激励数据</strong></li>
              <li>文件格式支持 .xlsx 和 .xls，文件大小不超过 10MB</li>
              <li>上传前可下载模板文件，确保数据格式正确</li>
              <li>系统会自动验证数据完整性，如有问题会及时提示</li>
            </ul>
          </div>
        </div>
        
        <!-- 数据预览 -->
        <div v-if="previewData.length > 0" class="preview-section">
          <h4>数据预览</h4>
          <div class="preview-info">
            <el-alert
              title="数据预览"
              :description="`检测到 ${previewData.length} 条数据记录，以下显示前10条`"
              type="info"
              :closable="false"
              class="mb-3"
            />
          </div>
          
          <el-table :data="previewData" border stripe max-height="300">
            <el-table-column prop="id" label="工号" width="100" />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="department" label="部门" min-width="150" />
            <el-table-column prop="rewardAmount" label="奖励金额" width="120">
              <template #default="{ row }">
                {{ row.rewardAmount }}元
              </template>
            </el-table-column>
            <el-table-column prop="monthlyScore" label="月度得分" width="120">
              <template #default="{ row }">
                {{ row.monthlyScore }}分
              </template>
            </el-table-column>
          </el-table>
          
          <div class="upload-controls">
            <el-form inline>
              <el-form-item label="选择月份">
                <el-date-picker
                  v-model="selectedMonth"
                  type="month"
                  placeholder="选择月份"
                  format="YYYY年MM月"
                  value-format="YYYY-MM"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="confirmUpload" :loading="uploading">
                  <el-icon><Upload /></el-icon>
                  确认上传
                </el-button>
                <el-button @click="cancelUpload">取消</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 数据管理 -->
    <div class="data-management card">
      <div class="card-header">
        <h3>数据管理</h3>
      </div>
      <div class="card-body">
        <el-table :data="monthlyDataList" v-loading="loading">
          <el-table-column prop="yearMonth" label="月份" width="120">
            <template #default="{ row }">
              {{ row.year }}-{{ String(row.month).padStart(2, '0') }}
            </template>
          </el-table-column>
          <el-table-column prop="totalCount" label="总人数" width="100">
            <template #default="{ row }">
              {{ row.data.length }}
            </template>
          </el-table-column>
          <el-table-column prop="activeCount" label="在岗人数" width="100">
            <template #default="{ row }">
              {{ row.data.filter((d: any) => d.isActive).length }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewDetails(row)">
                查看
              </el-button>
              <el-button type="danger" size="small" @click="deleteMonth(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, UploadFilled, Upload } from '@element-plus/icons-vue'
import { useMainStore } from '@/stores'
import { ExcelProcessor } from '@/utils/excel'
import type { UploadInstance, UploadFile } from 'element-plus'
import type { MonthlyData } from '@/types'

const mainStore = useMainStore()
const uploadRef = ref<UploadInstance>()
const uploading = ref(false)
const loading = computed(() => mainStore.loading)
const selectedMonth = ref('')
const previewData = ref<any[]>([])
const uploadedFile = ref<File | null>(null)

// 月度数据列表
const monthlyDataList = computed(() => {
  return mainStore.monthlyData.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })
})

// 下载模板
const downloadTemplate = () => {
  try {
    ExcelProcessor.downloadTemplate()
    ElMessage.success('模板下载成功')
  } catch (error) {
    ElMessage.error('模板下载失败')
  }
}

// 文件改变
const handleFileChange = async (file: UploadFile) => {
  if (!file.raw) return
  
  uploadedFile.value = file.raw
  
  try {
    // 读取文件
    const data = await ExcelProcessor.readFile(file.raw)
    
    // 验证数据
    const validation = ExcelProcessor.validateData(data)
    if (!validation.isValid) {
      ElMessage.error(validation.errors.join('\n'))
      uploadRef.value?.clearFiles()
      return
    }
    
    // 预览数据（显示前10条）
    const headers = data[0]
    const rows = data.slice(1, 11)
    
    const colIndex = {
      id: headers.indexOf('工号'),
      name: headers.indexOf('姓名'),
      department: headers.indexOf('部门'),
      rewardAmount: headers.indexOf('奖励金额'),
      monthlyScore: headers.indexOf('月度得分')
    }
    
    previewData.value = rows.map(row => ({
      id: row[colIndex.id],
      name: row[colIndex.name],
      department: row[colIndex.department],
      rewardAmount: row[colIndex.rewardAmount],
      monthlyScore: row[colIndex.monthlyScore]
    }))
    
    // 设置默认月份为当前月
    const now = new Date()
    selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
  } catch (error) {
    ElMessage.error('文件读取失败')
    uploadRef.value?.clearFiles()
  }
}

// 文件数量超限
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 确认上传
const confirmUpload = async () => {
  if (!uploadedFile.value) return
  if (!selectedMonth.value) {
    ElMessage.warning('请选择月份')
    return
  }
  
  const [year, month] = selectedMonth.value.split('-').map(Number)
  
  // 检查是否已有该月数据
  const existing = mainStore.monthlyData.find(m => m.year === year && m.month === month)
  if (existing) {
    const confirm = await ElMessageBox.confirm(
      `${year}年${month}月的数据已存在，是否覆盖？`,
      '提示',
      {
        confirmButtonText: '覆盖',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).catch(() => false)
    
    if (!confirm) return
  }
  
  uploading.value = true
  
  try {
    // 读取完整数据
    const data = await ExcelProcessor.readFile(uploadedFile.value)
    
    // 处理数据
    const monthlyData = ExcelProcessor.processMonthlyData(data, year, month)
    
    // 更新数据库
    if (!mainStore.database) {
      await mainStore.loadDatabase()
    }
    
    // 添加或更新月度数据
    const existingIndex = mainStore.database!.monthlyData.findIndex(
      m => m.year === year && m.month === month
    )
    
    if (existingIndex >= 0) {
      mainStore.database!.monthlyData[existingIndex] = monthlyData
    } else {
      mainStore.database!.monthlyData.push(monthlyData)
    }
    
    // 更新列车长基本信息
    monthlyData.data.forEach(conductor => {
      if (!mainStore.database!.conductorDB[conductor.id]) {
        mainStore.database!.conductorDB[conductor.id] = {
          id: conductor.id,
          name: conductor.name,
          department: conductor.department
        }
      }
    })
    
    // 保存到数据库
    await mainStore.saveDatabase()
    
    ElMessage.success('数据上传成功')
    
    // 清理
    cancelUpload()
    
  } catch (error) {
    ElMessage.error('数据上传失败')
  } finally {
    uploading.value = false
  }
}

// 取消上传
const cancelUpload = () => {
  uploadRef.value?.clearFiles()
  previewData.value = []
  uploadedFile.value = null
  selectedMonth.value = ''
}

// 查看详情
const viewDetails = (monthData: MonthlyData) => {
  ElMessage.info(`查看 ${monthData.year}年${monthData.month}月 数据功能开发中...`)
}

// 删除月份数据
const deleteMonth = async (monthData: MonthlyData) => {
  const confirm = await ElMessageBox.confirm(
    `确定要删除 ${monthData.year}年${monthData.month}月 的数据吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (!confirm) return
  
  try {
    // 从数据库中删除
    const index = mainStore.database!.monthlyData.findIndex(
      m => m.year === monthData.year && m.month === monthData.month
    )
    
    if (index >= 0) {
      mainStore.database!.monthlyData.splice(index, 1)
      await mainStore.saveDatabase()
      ElMessage.success('删除成功')
    }
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  // 加载数据
  mainStore.loadDatabase()
})
</script>

<style lang="scss" scoped>
.upload-container {
  max-width: 1200px;
  margin: 0 auto;
  
  .page-header {
    margin-bottom: 24px;
    text-align: center;
    
    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .page-description {
      margin: 0;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }
  
  .upload-card {
    background: var(--bg-white);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;
    border: 1px solid var(--border-light);
    
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 8px 8px 0 0;
      
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }
    
    .card-body {
      padding: 24px;
    }
  }
  
  .upload-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  
  .upload-area {
    width: 100%;
    
    :deep(.el-upload-dragger) {
      width: 100%;
      height: 200px;
      border: 2px dashed var(--primary-light);
      border-radius: 8px;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: var(--primary-color);
        background-color: var(--primary-bg);
      }
    }
    
    :deep(.el-icon--upload) {
      font-size: 48px;
      color: var(--primary-color);
      margin-bottom: 16px;
    }
    
    :deep(.el-upload__text) {
      font-size: 16px;
      color: var(--text-primary);
      
      em {
        color: var(--primary-color);
        font-style: normal;
        font-weight: 600;
      }
    }
    
    :deep(.el-upload__tip) {
      color: var(--text-secondary);
      font-size: 12px;
      margin-top: 8px;
    }
  }
  
  .upload-instructions {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 20px;
    border-left: 4px solid var(--primary-color);
    
    h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    ul {
      margin: 0;
      padding-left: 20px;
      
      li {
        margin-bottom: 8px;
        font-size: 14px;
        line-height: 1.5;
        color: var(--text-regular);
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
  
  .preview-section {
    border-top: 1px solid var(--border-light);
    padding-top: 24px;
    
    h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .preview-info {
      margin-bottom: 16px;
    }
    
    .upload-controls {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .el-form {
        display: flex;
        align-items: center;
        gap: 16px;
      }
    }
  }
  
  .data-management {
    background: var(--bg-white);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-light);
    
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-light);
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 8px 8px 0 0;
      
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }
    
    .card-body {
      padding: 24px;
    }
  }
}

.mb-3 {
  margin-bottom: 12px;
}
</style> 