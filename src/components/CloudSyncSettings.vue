<template>
  <div class="cloud-sync-settings">
    <!-- 安全设置 -->
    <CloudSecuritySettings />
    
    <el-card style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span>☁️ 云端同步设置</span>
          <el-tag :type="syncStatusText === '同步成功' ? 'success' : 'info'" size="small">
            {{ syncStatusText }}
          </el-tag>
        </div>
      </template>

      <!-- 同步状态概览 -->
      <div class="sync-overview">
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="设备ID">
            <el-text size="small" type="info">{{ syncStatus.deviceId.slice(-8) }}</el-text>
          </el-descriptions-item>
          <el-descriptions-item label="最后同步">
            {{ syncStatus.lastSyncFormatted }}
          </el-descriptions-item>
          <el-descriptions-item label="自动同步">
            <el-tag :type="isAutoSyncEnabled ? 'success' : 'info'" size="small">
              {{ isAutoSyncEnabled ? '已开启' : '已关闭' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="同步间隔">
            {{ syncStatus.syncInterval }} 分钟
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 手动同步操作 -->
      <div class="manual-sync">
        <h4>手动同步</h4>
        <div class="sync-buttons">
          <el-button 
            type="primary" 
            :icon="Upload" 
            :loading="isSyncing"
            :disabled="!canSync"
            @click="handleUpload"
          >
            上传到云端
          </el-button>
          
          <el-button 
            type="success" 
            :icon="Download" 
            :loading="isSyncing"
            @click="handleDownload"
          >
            从云端下载
          </el-button>
          
          <el-button 
            type="warning" 
            :icon="Refresh" 
            :loading="isSyncing"
            :disabled="!canSync"
            @click="handleSmartSync"
          >
            智能同步
          </el-button>
        </div>
        
        <el-alert 
          v-if="lastSyncResult && !lastSyncResult.success"
          :title="lastSyncResult.message"
          type="error"
          :closable="false"
          show-icon
          style="margin-top: 12px;"
        />
      </div>

      <!-- 自动同步设置 -->
      <div class="auto-sync-settings">
        <h4>自动同步设置</h4>
        
        <div class="setting-item">
          <div class="setting-label">
            <span>启用自动同步</span>
            <el-text size="small" type="info">定期从云端检查数据更新</el-text>
          </div>
          <el-switch 
            v-model="autoSyncEnabled"
            @change="handleAutoSyncToggle"
          />
        </div>

        <div class="setting-item" v-show="autoSyncEnabled">
          <div class="setting-label">
            <span>同步间隔</span>
            <el-text size="small" type="info">自动检查更新的时间间隔</el-text>
          </div>
          <el-select 
            :model-value="syncStatus.syncInterval"
            @change="handleIntervalChange"
            style="width: 120px;"
          >
            <el-option label="1分钟" :value="1" />
            <el-option label="5分钟" :value="5" />
            <el-option label="10分钟" :value="10" />
            <el-option label="30分钟" :value="30" />
            <el-option label="1小时" :value="60" />
          </el-select>
        </div>
      </div>

      <!-- 同步说明 -->
      <div class="sync-help">
        <h4>使用说明</h4>
        <ul>
          <li>📤 <strong>上传到云端</strong>：将当前设备的数据保存到云端</li>
          <li>📥 <strong>从云端下载</strong>：将云端数据同步到当前设备（会提示是否覆盖）</li>
          <li>🔄 <strong>智能同步</strong>：自动检测冲突，安全地同步数据</li>
          <li>⚡ <strong>自动同步</strong>：定期检查云端更新，发现新数据时提示</li>
        </ul>
        
        <el-alert 
          title="注意事项"
          type="warning"
          :closable="false"
          show-icon
        >
          <ul style="margin: 0; padding-left: 16px;">
            <li>数据存储在Vercel免费服务中，重启后数据会丢失</li>
            <li>建议定期手动备份重要数据</li>
            <li>多设备使用时，请使用"智能同步"避免数据冲突</li>
          </ul>
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Upload, Download, Refresh } from '@element-plus/icons-vue'
import { useCloudSync } from '@/composables/useCloudSync'
import CloudSecuritySettings from './CloudSecuritySettings.vue'

// 使用云同步功能
const {
  isSyncing,
  isAutoSyncEnabled,
  syncStatus,
  lastSyncResult,
  canSync,
  syncStatusText,
  uploadToCloud,
  downloadFromCloud,
  smartSync,
  toggleAutoSync,
  setSyncInterval,
  updateSyncStatus
} = useCloudSync()

// 本地状态
const autoSyncEnabled = ref(isAutoSyncEnabled.value)

// 监听自动同步状态变化
watch(isAutoSyncEnabled, (newValue) => {
  autoSyncEnabled.value = newValue
})

// 事件处理
const handleUpload = async () => {
  await uploadToCloud()
  updateSyncStatus()
}

const handleDownload = async () => {
  await downloadFromCloud()
  updateSyncStatus()
}

const handleSmartSync = async () => {
  await smartSync()
  updateSyncStatus()
}

const handleAutoSyncToggle = (enabled: boolean) => {
  toggleAutoSync(enabled)
}

const handleIntervalChange = (minutes: number) => {
  setSyncInterval(minutes)
}
</script>

<style lang="scss" scoped>
.cloud-sync-settings {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sync-overview {
    margin-bottom: 24px;
  }

  .manual-sync {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px 0;
      color: #303133;
    }
    
    .sync-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }

  .auto-sync-settings {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 16px 0;
      color: #303133;
    }
    
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .setting-label {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    }
  }

  .sync-help {
    h4 {
      margin: 0 0 12px 0;
      color: #303133;
    }
    
    ul {
      margin: 0 0 16px 0;
      padding-left: 16px;
      
      li {
        margin: 8px 0;
        line-height: 1.5;
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .cloud-sync-settings {
    .sync-buttons {
      flex-direction: column;
      
      .el-button {
        width: 100%;
      }
    }
    
    .setting-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      
      .setting-label {
        width: 100%;
      }
      
      .el-switch,
      .el-select {
        align-self: flex-end;
      }
    }
  }
}
</style>