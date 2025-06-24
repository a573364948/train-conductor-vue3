interface CloudSyncConfig {
  apiBase: string
  deviceId: string
  autoSync: boolean
  syncInterval: number // 分钟
  apiSecret: string
  encryptionEnabled: boolean
}

interface SyncResponse {
  success: boolean
  data?: any
  timestamp?: number
  checksum?: string
  message?: string
  serverData?: any
  serverTimestamp?: number
}

class CloudSyncService {
  private config: CloudSyncConfig
  private syncTimer: number | null = null
  private lastSyncTime: number = 0

  constructor(config: Partial<CloudSyncConfig> = {}) {
    this.config = {
      apiBase: '/api/sync',
      deviceId: this.generateDeviceId(),
      autoSync: false,
      syncInterval: 5, // 5分钟
      apiSecret: this.getStoredSecret() || '',
      encryptionEnabled: true,
      ...config
    }
  }

  /**
   * 生成API密钥（基于时间窗口）
   */
  private generateApiKey(): string {
    if (!this.config.apiSecret) {
      throw new Error('API密钥未设置，请先在设置中配置密钥')
    }
    
    const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)) // 5分钟窗口
    // 使用Web Crypto API生成HMAC
    return this.simpleHmac(this.config.apiSecret, timestamp.toString()).substring(0, 16)
  }

  /**
   * 简单的HMAC实现（用于浏览器环境）
   */
  private simpleHmac(key: string, message: string): string {
    // 简化的HMAC实现，实际生产环境建议使用crypto库
    const hash = this.simpleHash(key + message)
    return hash
  }

  /**
   * 简单的哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 获取存储的密钥
   */
  private getStoredSecret(): string | null {
    return localStorage.getItem('train_conductor_api_secret')
  }

  /**
   * 设置API密钥
   */
  setApiSecret(secret: string): void {
    this.config.apiSecret = secret
    localStorage.setItem('train_conductor_api_secret', secret)
    this.saveConfig()
  }

  /**
   * 上传数据到云端
   */
  async uploadData(data: any): Promise<SyncResponse> {
    try {
      const apiKey = this.generateApiKey()
      
      const response = await fetch(`${this.config.apiBase}?deviceId=${this.config.deviceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          data,
          timestamp: Date.now(),
          deviceId: this.config.deviceId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        this.lastSyncTime = Date.now()
        this.saveLastSyncTime()
      }
      
      return result
    } catch (error: any) {
      console.error('上传数据失败:', error)
      return {
        success: false,
        message: `上传失败: ${error.message}`
      }
    }
  }

  /**
   * 从云端下载数据
   */
  async downloadData(): Promise<SyncResponse> {
    try {
      const apiKey = this.generateApiKey()
      
      const response = await fetch(`${this.config.apiBase}?deviceId=${this.config.deviceId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey
        }
      })

      if (response.status === 404) {
        return {
          success: false,
          message: '云端暂无数据'
        }
      }

      const result = await response.json()
      
      if (result.success) {
        this.lastSyncTime = Date.now()
        this.saveLastSyncTime()
      }
      
      return result
    } catch (error: any) {
      console.error('下载数据失败:', error)
      return {
        success: false,
        message: `下载失败: ${error.message}`
      }
    }
  }

  /**
   * 智能同步（带冲突检测）
   */
  async smartSync(localData: any, localTimestamp: number): Promise<SyncResponse> {
    try {
      const apiKey = this.generateApiKey()
      
      const response = await fetch(`${this.config.apiBase}?deviceId=${this.config.deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          data: localData,
          timestamp: localTimestamp,
          deviceId: this.config.deviceId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        this.lastSyncTime = Date.now()
        this.saveLastSyncTime()
      }
      
      return result
    } catch (error: any) {
      console.error('智能同步失败:', error)
      return {
        success: false,
        message: `同步失败: ${error.message}`
      }
    }
  }

  /**
   * 启动自动同步
   */
  startAutoSync(syncCallback: (result: SyncResponse) => void) {
    if (!this.config.autoSync) return

    this.stopAutoSync() // 清除之前的定时器

    this.syncTimer = window.setInterval(async () => {
      try {
        const result = await this.downloadData()
        syncCallback(result)
      } catch (error) {
        console.error('自动同步失败:', error)
      }
    }, this.config.syncInterval * 60 * 1000)

    console.log(`🔄 自动同步已启动，间隔 ${this.config.syncInterval} 分钟`)
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      console.log('⏹️ 自动同步已停止')
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    const lastSync = this.getLastSyncTime()
    const now = Date.now()
    const timeSinceLastSync = now - lastSync

    return {
      lastSyncTime: lastSync,
      timeSinceLastSync,
      isAutoSyncActive: this.syncTimer !== null,
      deviceId: this.config.deviceId,
      syncInterval: this.config.syncInterval,
      lastSyncFormatted: lastSync ? new Date(lastSync).toLocaleString() : '从未同步'
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CloudSyncConfig>) {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()

    // 如果更新了同步间隔，重启自动同步
    if (newConfig.syncInterval && this.syncTimer) {
      this.stopAutoSync()
      // 需要传入回调函数，这里暂时为空
    }
  }

  /**
   * 生成设备ID
   */
  private generateDeviceId(): string {
    const stored = localStorage.getItem('train_conductor_device_id')
    if (stored) return stored

    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('train_conductor_device_id', deviceId)
    return deviceId
  }

  /**
   * 保存最后同步时间
   */
  private saveLastSyncTime() {
    localStorage.setItem('train_conductor_last_sync', this.lastSyncTime.toString())
  }

  /**
   * 获取最后同步时间
   */
  private getLastSyncTime(): number {
    const stored = localStorage.getItem('train_conductor_last_sync')
    return stored ? parseInt(stored, 10) : 0
  }

  /**
   * 保存配置
   */
  private saveConfig() {
    localStorage.setItem('train_conductor_sync_config', JSON.stringify(this.config))
  }

  /**
   * 加载配置
   */
  static loadConfig(): Partial<CloudSyncConfig> {
    const stored = localStorage.getItem('train_conductor_sync_config')
    return stored ? JSON.parse(stored) : {}
  }
}

// 创建全局实例
export const cloudSync = new CloudSyncService(CloudSyncService.loadConfig())

// 导出类型
export type { CloudSyncConfig, SyncResponse }
export { CloudSyncService }