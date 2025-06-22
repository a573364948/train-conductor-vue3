# 云同步配置指南

## 🎯 方案选择对比

| 方案 | 复杂度 | 免费额度 | 实时同步 | 推荐指数 |
|------|--------|----------|----------|----------|
| **Supabase** | ⭐⭐ | 500MB数据库 | ✅ | ⭐⭐⭐⭐⭐ |
| **Vercel KV** | ⭐⭐⭐ | 30KB存储 | ❌ | ⭐⭐⭐⭐ |
| **JSONBin.io** | ⭐ | 1000次/月 | ❌ | ⭐⭐⭐ |
| **自建API** | ⭐⭐⭐⭐⭐ | 无限制 | ✅ | ⭐⭐⭐⭐⭐ |

---

## 🥇 推荐方案：Supabase配置

### 1. 注册Supabase账户
访问 [https://supabase.com](https://supabase.com) 注册免费账户

### 2. 创建新项目
- 点击 "New Project"
- 输入项目名称（如：train-conductor-sync）
- 选择区域（推荐Singapore）
- 设置数据库密码

### 3. 获取配置信息
在项目设置页面找到：
- **Project URL**: `https://your-project-id.supabase.co`
- **API Key (anon public)**: `eyJhbGciOiJIUzI1NiIsInR5...`

### 4. 创建数据表
在SQL编辑器中执行：

```sql
-- 创建数据同步表
CREATE TABLE conductor_data (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  device_info JSONB,
  UNIQUE(user_id, data_type)
);

-- 启用实时同步
ALTER PUBLICATION supabase_realtime ADD TABLE conductor_data;

-- 创建索引提升性能
CREATE INDEX idx_conductor_data_user_type ON conductor_data(user_id, data_type);
CREATE INDEX idx_conductor_data_updated ON conductor_data(updated_at DESC);
```

### 5. 配置环境变量
在项目根目录创建 `.env.local` 文件：

```env
# Supabase配置
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonymous-key

# 同步设置
VITE_SYNC_ENABLED=true
VITE_AUTO_SYNC_INTERVAL=300000
```

### 6. 启用功能
在主布局中添加云同步组件：

```vue
<template>
  <div class="main-layout">
    <!-- 其他内容 -->
    
    <!-- 云同步面板 -->
    <el-drawer v-model="showSyncPanel" title="云同步管理" size="400px">
      <CloudSync />
    </el-drawer>
    
    <!-- 云同步按钮 -->
    <el-button @click="showSyncPanel = true" class="sync-btn">
      <el-icon><CloudUpload /></el-icon>
      云同步
    </el-button>
  </div>
</template>

<script setup>
import CloudSync from '@/components/CloudSync.vue'
import { ref } from 'vue'

const showSyncPanel = ref(false)
</script>
```

---

## 🥈 备选方案：Vercel KV配置

### 1. 在Vercel项目中启用KV
- 访问 [Vercel Dashboard](https://vercel.com/dashboard)
- 进入项目设置 → Storage → Create KV Database

### 2. 获取连接信息
```env
VITE_VERCEL_KV_URL=your-kv-rest-url
VITE_VERCEL_KV_TOKEN=your-kv-rest-token
```

### 3. 使用Vercel KV服务
创建 `src/services/vercelKV.ts`：

```typescript
class VercelKVSync {
  private baseUrl = import.meta.env.VITE_VERCEL_KV_URL
  private token = import.meta.env.VITE_VERCEL_KV_TOKEN

  async set(key: string, data: any) {
    const response = await fetch(`${this.baseUrl}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async get(key: string) {
    const response = await fetch(`${this.baseUrl}/get/${key}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
    return response.json()
  }
}
```

---

## 🥉 简单方案：JSONBin.io配置

### 1. 注册JSONBin账户
访问 [https://jsonbin.io](https://jsonbin.io) 注册免费账户

### 2. 创建API密钥
在用户设置中生成API密钥

### 3. 配置环境变量
```env
VITE_JSONBIN_API_KEY=your-api-key
VITE_SYNC_PROVIDER=jsonbin
```

### 4. 使用JSONBin服务
创建 `src/services/jsonbin.ts`：

```typescript
class JSONBinSync {
  private apiKey = import.meta.env.VITE_JSONBIN_API_KEY
  private baseUrl = 'https://api.jsonbin.io/v3'

  async createBin(data: any) {
    const response = await fetch(`${this.baseUrl}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': this.apiKey
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async updateBin(binId: string, data: any) {
    const response = await fetch(`${this.baseUrl}/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': this.apiKey
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }
}
```

---

## 📱 使用方法

### 1. 自动同步
- 开启自动同步开关
- 设置同步间隔（建议5-10分钟）
- 系统会自动上传本地数据变更

### 2. 手动同步
- **上传到云端**：将本地数据备份到云端
- **从云端恢复**：下载云端数据覆盖本地
- **查看同步状态**：检查各数据类型的同步时间

### 3. 跨设备访问
- 在新设备上输入设备同步ID
- 系统自动下载云端数据
- 实现多设备数据一致性

### 4. 团队协作
- 分享设备同步ID给团队成员
- 多人可访问相同数据
- 支持实时数据更新通知

---

## 🔧 高级配置

### 数据冲突处理
```typescript
// 在store中配置冲突处理策略
const syncConfig = {
  conflictResolution: 'latest-wins', // 最新优先
  backupBeforeSync: true,            // 同步前备份
  validateData: true                 // 数据验证
}
```

### 离线支持
```typescript
// 检测网络状态
window.addEventListener('online', () => {
  cloudSync.resumeSync()
})

window.addEventListener('offline', () => {
  cloudSync.pauseSync()
})
```

### 数据压缩
```typescript
// 大数据量时启用压缩
const compressedData = LZString.compress(JSON.stringify(data))
await cloudSync.uploadData('personnel', compressedData)
```

---

## 🚨 注意事项

### 安全建议
- ✅ 定期备份设备同步ID
- ✅ 不要在公共场所分享同步ID
- ✅ 定期检查云端数据完整性
- ❌ 不要在不信任的设备上登录

### 性能优化
- 大量数据建议分批同步
- 设置合理的同步间隔
- 避免频繁的全量同步
- 使用增量同步减少网络负载

### 故障排除
1. **连接失败**：检查网络和API密钥
2. **数据丢失**：查看同步历史记录
3. **同步冲突**：手动选择保留的数据版本
4. **权限错误**：确认API密钥权限设置

---

## 📞 技术支持

如有问题，请检查：
1. 浏览器控制台错误信息
2. 网络连接状态
3. API服务状态
4. 环境变量配置

技术交流群：[加入讨论](mailto:support@example.com) 