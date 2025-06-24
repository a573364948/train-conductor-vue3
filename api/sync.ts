import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

interface SyncData {
  deviceId: string
  timestamp: number
  data: any
  checksum?: string
  encrypted?: boolean
}

// 从环境变量获取安全配置
const API_SECRET = process.env.SYNC_API_SECRET || 'default-secret-change-me'
const ENCRYPTION_KEY = process.env.SYNC_ENCRYPTION_KEY || 'default-key-32-chars-long-please'

// 简单的内存存储（生产环境建议使用Redis或数据库）
const dataStore = new Map<string, SyncData>()

// 验证API密钥
function validateApiKey(req: VercelRequest): boolean {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey
  if (!apiKey) return false
  
  // 生成期望的API密钥 (基于时间的动态密钥)
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)) // 5分钟窗口
  const expectedKey = crypto
    .createHmac('sha256', API_SECRET)
    .update(timestamp.toString())
    .digest('hex')
    .substring(0, 16)
  
  // 也接受前一个时间窗口的密钥（允许时钟偏差）
  const prevTimestamp = timestamp - 1
  const prevExpectedKey = crypto
    .createHmac('sha256', API_SECRET)
    .update(prevTimestamp.toString())
    .digest('hex')
    .substring(0, 16)
  
  return apiKey === expectedKey || apiKey === prevExpectedKey
}

// 数据加密
function encryptData(data: any): string {
  const text = JSON.stringify(data)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// 数据解密
function decryptData(encryptedData: string): any {
  const [ivHex, encrypted] = encryptedData.split(':')
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return JSON.parse(decrypted)
}

// 生成设备指纹
function generateDeviceFingerprint(req: VercelRequest): string {
  const userAgent = req.headers['user-agent'] || ''
  const acceptLanguage = req.headers['accept-language'] || ''
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
  
  return crypto
    .createHash('sha256')
    .update(`${userAgent}:${acceptLanguage}:${ip}`)
    .digest('hex')
    .substring(0, 12)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 添加CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 检查请求体大小（Vercel限制4.5MB）
  const contentLength = parseInt(req.headers['content-length'] || '0')
  if (contentLength > 4 * 1024 * 1024) { // 4MB限制
    return res.status(413).json({
      success: false,
      message: '数据过大，请减少数据量或分批上传'
    })
  }

  // 验证API密钥
  if (!validateApiKey(req)) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    })
  }

  try {
    const { method, body, query } = req
    const deviceId = (query.deviceId as string) || generateDeviceFingerprint(req)

    switch (method) {
      case 'GET':
        // 获取数据
        const data = dataStore.get(deviceId)
        if (!data) {
          return res.status(404).json({ 
            success: false, 
            message: '未找到数据' 
          })
        }
        
        // 解密数据返回
        const decryptedData = data.encrypted ? decryptData(data.data) : data.data
        
        return res.status(200).json({
          success: true,
          data: decryptedData,
          timestamp: data.timestamp,
          checksum: data.checksum
        })

      case 'POST':
        // 保存数据（加密）
        const encryptedData = encryptData(body.data)
        const syncData: SyncData = {
          deviceId,
          timestamp: Date.now(),
          data: encryptedData,
          checksum: generateChecksum(body.data),
          encrypted: true
        }
        
        dataStore.set(deviceId, syncData)
        
        return res.status(200).json({
          success: true,
          message: '数据同步成功',
          timestamp: syncData.timestamp
        })

      case 'PUT':
        // 更新数据（带冲突检测）
        const existingData = dataStore.get(deviceId)
        const clientTimestamp = body.timestamp
        
        if (existingData && existingData.timestamp > clientTimestamp) {
          return res.status(409).json({
            success: false,
            message: '数据冲突，服务器数据更新',
            serverData: existingData.data,
            serverTimestamp: existingData.timestamp
          })
        }
        
        const updatedData: SyncData = {
          deviceId,
          timestamp: Date.now(),
          data: body.data,
          checksum: generateChecksum(body.data)
        }
        
        dataStore.set(deviceId, updatedData)
        
        return res.status(200).json({
          success: true,
          message: '数据更新成功',
          timestamp: updatedData.timestamp
        })

      case 'DELETE':
        // 删除数据
        dataStore.delete(deviceId)
        return res.status(200).json({
          success: true,
          message: '数据删除成功'
        })

      default:
        return res.status(405).json({ 
          success: false, 
          message: '方法不支持' 
        })
    }
  } catch (error: any) {
    console.error('API Error:', error)
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    })
  }
}

// 生成数据校验和
function generateChecksum(data: any): string {
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return hash.toString(36)
}