<template>
  <div class="cloud-security-settings">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>🔐 云同步安全设置</span>
          <el-tag :type="isSecurityConfigured ? 'success' : 'warning'" size="small">
            {{ isSecurityConfigured ? '已配置' : '未配置' }}
          </el-tag>
        </div>
      </template>

      <!-- 安全状态概览 -->
      <div class="security-status">
        <el-alert
          v-if="!isSecurityConfigured"
          title="⚠️ 安全提醒"
          type="warning"
          :closable="false"
          show-icon
        >
          为了保护您的数据安全，请配置API密钥。没有正确密钥的访问将被拒绝。
        </el-alert>

        <el-alert
          v-else
          title="✅ 安全保护已启用"
          type="success"
          :closable="false"
          show-icon
        >
          您的数据已受到加密保护，只有拥有正确密钥的设备才能访问。
        </el-alert>
      </div>

      <!-- API密钥配置 -->
      <div class="api-key-section">
        <h4>API访问密钥</h4>
        <div class="key-input-group">
          <el-input
            v-model="apiSecretInput"
            type="password"
            placeholder="请输入您的专用密钥"
            show-password
            clearable
            :disabled="saving"
          >
            <template #prepend>🔑 密钥</template>
          </el-input>
          <el-button 
            type="primary"
            @click="saveApiSecret"
            :loading="saving"
            :disabled="!apiSecretInput.trim()"
          >
            保存密钥
          </el-button>
        </div>
        
        <div class="key-help">
          <el-text size="small" type="info">
            密钥建议使用12位以上的随机字符串，如：MySecret2024@#
          </el-text>
          <div class="key-actions">
            <el-button
              size="small"
              type="info"
              text
              @click="generateRandomKey"
            >
              🎲 生成随机密钥
            </el-button>
            <el-button
              size="small"
              type="danger"
              text
              @click="clearApiSecret"
              :disabled="!isSecurityConfigured"
            >
              🗑️ 清除密钥
            </el-button>
          </div>
        </div>
      </div>

      <!-- 安全功能说明 -->
      <div class="security-features">
        <h4>安全功能</h4>
        <div class="feature-list">
          <div class="feature-item">
            <el-tag type="success" size="small">🔐 动态密钥</el-tag>
            <span>基于时间窗口的动态API密钥，5分钟自动刷新</span>
          </div>
          <div class="feature-item">
            <el-tag type="success" size="small">🔒 数据加密</el-tag>
            <span>所有同步数据使用AES-256加密传输和存储</span>
          </div>
          <div class="feature-item">
            <el-tag type="success" size="small">🖥️ 设备指纹</el-tag>
            <span>基于浏览器特征生成唯一设备标识</span>
          </div>
          <div class="feature-item">
            <el-tag type="success" size="small">🚫 访问控制</el-tag>
            <span>未授权访问自动拒绝，保护数据安全</span>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="usage-guide">
        <h4>使用说明</h4>
        <ol>
          <li><strong>设置密钥</strong>：输入一个只有您知道的密钥</li>
          <li><strong>多设备同步</strong>：在其他设备上输入相同的密钥</li>
          <li><strong>保密原则</strong>：不要将密钥告诉他人</li>
          <li><strong>密钥丢失</strong>：如果忘记密钥，需要重新设置（历史数据无法恢复）</li>
        </ol>
        
        <el-alert 
          title="重要提示"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top: 12px;"
        >
          <ul style="margin: 0; padding-left: 16px;">
            <li>密钥丢失将无法访问云端数据</li>
            <li>建议将密钥安全保存在密码管理器中</li>
            <li>更换密钥后，其他设备需要重新配置</li>
          </ul>
        </el-alert>
      </div>

      <!-- 高级选项 -->
      <div class="advanced-options">
        <el-collapse>
          <el-collapse-item title="🔧 高级选项" name="advanced">
            <div class="advanced-settings">
              <div class="setting-item">
                <span>数据加密</span>
                <el-switch 
                  v-model="encryptionEnabled"
                  @change="updateEncryptionSetting"
                  :disabled="saving"
                />
              </div>
              
              <div class="setting-item">
                <span>设备指纹</span>
                <el-text size="small" type="info">{{ deviceFingerprint }}</el-text>
              </div>
              
              <div class="setting-item">
                <span>当前API密钥时间窗口</span>
                <el-text size="small" type="info">{{ currentTimeWindow }}</el-text>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cloudSync } from '@/services/cloudSync'

// 响应式状态
const apiSecretInput = ref('')
const saving = ref(false)
const encryptionEnabled = ref(true)

// 计算属性
const isSecurityConfigured = computed(() => {
  return !!localStorage.getItem('train_conductor_api_secret')
})

const deviceFingerprint = computed(() => {
  const stored = localStorage.getItem('train_conductor_device_id')
  return stored ? stored.slice(-8) : 'unknown'
})

const currentTimeWindow = computed(() => {
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000))
  const date = new Date(timestamp * 5 * 60 * 1000)
  return date.toLocaleTimeString()
})

// 方法
const saveApiSecret = async () => {
  if (!apiSecretInput.value.trim()) {
    ElMessage.warning('请输入API密钥')
    return
  }

  if (apiSecretInput.value.length < 8) {
    ElMessage.warning('密钥长度至少8位')
    return
  }

  try {
    saving.value = true
    
    cloudSync.setApiSecret(apiSecretInput.value.trim())
    
    ElMessage.success('API密钥已保存')
    apiSecretInput.value = ''
    
  } catch (error: any) {
    ElMessage.error(`保存失败: ${error.message}`)
  } finally {
    saving.value = false
  }
}

const generateRandomKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  apiSecretInput.value = result
  ElMessage.info('已生成随机密钥，请记住并保存')
}

const clearApiSecret = async () => {
  try {
    await ElMessageBox.confirm(
      '清除密钥后将无法访问云端数据，确定要清除吗？',
      '确认清除',
      {
        confirmButtonText: '确认清除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    localStorage.removeItem('train_conductor_api_secret')
    cloudSync.setApiSecret('')
    
    ElMessage.success('API密钥已清除')
    
  } catch {
    // 用户取消
  }
}

const updateEncryptionSetting = (enabled: boolean) => {
  cloudSync.updateConfig({ encryptionEnabled: enabled })
  ElMessage.success(`数据加密已${enabled ? '启用' : '禁用'}`)
}

// 生命周期
onMounted(() => {
  // 初始化设置
  const config = cloudSync.getSyncStatus()
  // encryptionEnabled.value = config.encryptionEnabled !== false
})
</script>

<style lang="scss" scoped>
.cloud-security-settings {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .security-status {
    margin-bottom: 24px;
  }

  .api-key-section {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px 0;
      color: #303133;
    }
    
    .key-input-group {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      
      .el-input {
        flex: 1;
      }
    }
    
    .key-help {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      
      .key-actions {
        display: flex;
        gap: 8px;
      }
    }
  }

  .security-features {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px 0;
      color: #303133;
    }
    
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .feature-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        
        &:last-child {
          border-bottom: none;
        }
        
        span {
          font-size: 14px;
          color: #606266;
        }
      }
    }
  }

  .usage-guide {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px 0;
      color: #303133;
    }
    
    ol {
      margin: 0;
      padding-left: 20px;
      
      li {
        margin: 8px 0;
        line-height: 1.5;
      }
    }
  }

  .advanced-options {
    .advanced-settings {
      .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;
        
        &:last-child {
          border-bottom: none;
        }
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .cloud-security-settings {
    .key-input-group {
      flex-direction: column;
    }
    
    .key-help {
      flex-direction: column;
      align-items: flex-start;
      
      .key-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
    
    .feature-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }
}
</style>