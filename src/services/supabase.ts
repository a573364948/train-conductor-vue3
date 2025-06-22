import { createClient } from '@supabase/supabase-js'

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// 数据同步服务
export class CloudSyncService {
  private tableName = 'conductor_data'
  private userId: string = 'anonymous' // 后续可以接入用户认证

  constructor() {
    this.initializeUser()
  }

  private async initializeUser() {
    // 生成或获取用户唯一标识
    let userId = localStorage.getItem('sync_user_id')
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('sync_user_id', userId)
    }
    this.userId = userId
  }

  /**
   * 上传数据到云端
   */
  async uploadData(dataType: string, data: any) {
    try {
      const payload = {
        user_id: this.userId,
        data_type: dataType,
        data: data,
        updated_at: new Date().toISOString(),
        device_info: {
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      }

      const { data: result, error } = await supabase
        .from(this.tableName)
        .upsert(payload, {
          onConflict: 'user_id,data_type'
        })

      if (error) {
        console.error('上传数据失败:', error)
        throw error
      }

      console.log(`✅ ${dataType} 数据已同步到云端`)
      return result
    } catch (error) {
      console.error('云同步上传失败:', error)
      throw error
    }
  }

  /**
   * 从云端下载数据
   */
  async downloadData(dataType: string) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', this.userId)
        .eq('data_type', dataType)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 是没有数据的错误码
        console.error('下载数据失败:', error)
        throw error
      }

      if (data) {
        console.log(`📥 从云端获取 ${dataType} 数据成功`)
        return data.data
      } else {
        console.log(`📭 云端暂无 ${dataType} 数据`)
        return null
      }
    } catch (error) {
      console.error('云同步下载失败:', error)
      throw error
    }
  }

  /**
   * 获取所有数据类型的同步状态
   */
  async getSyncStatus() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('data_type, updated_at, device_info')
        .eq('user_id', this.userId)

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('获取同步状态失败:', error)
      return []
    }
  }

  /**
   * 批量同步所有数据
   */
  async syncAllData(localData: Record<string, any>) {
    const results = {
      uploaded: [] as string[],
      downloaded: [] as string[],
      errors: [] as { type: string; error: string }[]
    }

    // 上传本地数据到云端
    for (const [dataType, data] of Object.entries(localData)) {
      if (data && Object.keys(data).length > 0) {
        try {
          await this.uploadData(dataType, data)
          results.uploaded.push(dataType)
        } catch (error) {
          results.errors.push({ 
            type: dataType, 
            error: error instanceof Error ? error.message : '上传失败' 
          })
        }
      }
    }

    return results
  }

  /**
   * 设置实时同步监听
   */
  setupRealTimeSync(dataType: string, callback: (data: any) => void) {
    const channel = supabase
      .channel(`sync_${dataType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.tableName,
          filter: `user_id=eq.${this.userId} AND data_type=eq.${dataType}`
        },
        (payload) => {
          console.log(`🔄 ${dataType} 数据实时更新:`, payload)
          if (payload.new && (payload.new as any).data) {
            callback((payload.new as any).data)
          }
        }
      )
      .subscribe()

    return channel
  }

  /**
   * 检查云端连接状态
   */
  async checkConnection() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('id')
        .limit(1)

      return !error
    } catch (error) {
      console.error('云端连接检查失败:', error)
      return false
    }
  }

  /**
   * 获取用户ID
   */
  getUserId() {
    return this.userId
  }

  /**
   * 重置用户ID（用于切换账户）
   */
  resetUserId() {
    localStorage.removeItem('sync_user_id')
    this.initializeUser()
  }
}

// 创建全局同步服务实例
export const cloudSync = new CloudSyncService()

// 导出便捷函数
export const uploadToCloud = (dataType: string, data: any) => cloudSync.uploadData(dataType, data)
export const downloadFromCloud = (dataType: string) => cloudSync.downloadData(dataType)
export const checkCloudConnection = () => cloudSync.checkConnection() 