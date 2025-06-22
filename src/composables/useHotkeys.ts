import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useTheme } from './useTheme'
import { usePrint } from './usePrint'

export interface Hotkey {
  keys: string[]
  description: string
  handler: () => void
  category?: string
}

export function useHotkeys() {
  const router = useRouter()
  const { toggleTheme } = useTheme()
  const { printPreview } = usePrint()
  
  // 定义快捷键
  const hotkeys: Hotkey[] = [
    // 导航快捷键
    {
      keys: ['alt', 'd'],
      description: '跳转到仪表板',
      handler: () => router.push('/dashboard'),
      category: '导航'
    },
    {
      keys: ['alt', 'u'],
      description: '跳转到数据上传',
      handler: () => router.push('/upload'),
      category: '导航'
    },
    {
      keys: ['alt', 'p'],
      description: '跳转到人员管理',
      handler: () => router.push('/personnel'),
      category: '导航'
    },
    {
      keys: ['alt', 's'],
      description: '跳转到统计报表',
      handler: () => router.push('/statistics'),
      category: '导航'
    },
    
    // 功能快捷键
    {
      keys: ['ctrl', 'p'],
      description: '打印当前页面',
      handler: () => printPreview(),
      category: '功能'
    },
    {
      keys: ['ctrl', 'shift', 't'],
      description: '切换主题',
      handler: () => toggleTheme(),
      category: '功能'
    },
    {
      keys: ['ctrl', '/'],
      description: '显示快捷键帮助',
      handler: () => showHotkeyHelp(),
      category: '功能'
    },
    {
      keys: ['esc'],
      description: '关闭弹窗/返回',
      handler: () => handleEscape(),
      category: '功能'
    },
    
    // 操作快捷键
    {
      keys: ['ctrl', 'n'],
      description: '新建/上传',
      handler: () => handleNew(),
      category: '操作'
    },
    {
      keys: ['ctrl', 's'],
      description: '保存',
      handler: () => handleSave(),
      category: '操作'
    },
    {
      keys: ['f5'],
      description: '刷新数据',
      handler: () => handleRefresh(),
      category: '操作'
    }
  ]
  
  // 当前按下的键
  const pressedKeys = new Set<string>()
  
  // 检查快捷键是否匹配
  const checkHotkey = (hotkey: Hotkey): boolean => {
    return hotkey.keys.every(key => pressedKeys.has(key.toLowerCase()))
  }
  
  // 键盘按下事件
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    
    // 添加修饰键
    if (e.ctrlKey) pressedKeys.add('ctrl')
    if (e.altKey) pressedKeys.add('alt')
    if (e.shiftKey) pressedKeys.add('shift')
    if (e.metaKey) pressedKeys.add('meta')
    
    // 添加按键
    pressedKeys.add(key)
    
    // 检查是否触发快捷键
    for (const hotkey of hotkeys) {
      if (checkHotkey(hotkey)) {
        e.preventDefault()
        hotkey.handler()
        break
      }
    }
  }
  
  // 键盘释放事件
  const handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    
    // 清除按键
    pressedKeys.delete(key)
    pressedKeys.delete('ctrl')
    pressedKeys.delete('alt')
    pressedKeys.delete('shift')
    pressedKeys.delete('meta')
  }
  
  // 显示快捷键帮助
  const showHotkeyHelp = () => {
    const categories = hotkeys.reduce((acc, hotkey) => {
      const category = hotkey.category || '其他'
      if (!acc[category]) acc[category] = []
      acc[category].push(hotkey)
      return acc
    }, {} as Record<string, Hotkey[]>)
    
    const helpHtml = Object.entries(categories)
      .map(([category, keys]) => `
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 8px 0; color: #409eff;">${category}</h4>
          ${keys.map(k => `
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <kbd style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace;">
                ${k.keys.join(' + ').toUpperCase()}
              </kbd>
              <span>${k.description}</span>
            </div>
          `).join('')}
        </div>
      `).join('')
    
    ElMessage({
      dangerouslyUseHTMLString: true,
      message: `<div style="min-width: 300px;"><h3>快捷键帮助</h3>${helpHtml}</div>`,
      duration: 0,
      showClose: true,
      customClass: 'hotkey-help-message'
    })
  }
  
  // ESC 键处理
  const handleEscape = () => {
    // 关闭所有消息框
    const messages = document.querySelectorAll('.el-message')
    messages.forEach(msg => {
      const closeBtn = msg.querySelector('.el-message__closeBtn') as HTMLElement
      closeBtn?.click()
    })
    
    // 关闭所有对话框
    const dialogs = document.querySelectorAll('.el-dialog__wrapper')
    dialogs.forEach(dialog => {
      const closeBtn = dialog.querySelector('.el-dialog__close') as HTMLElement
      closeBtn?.click()
    })
  }
  
  // 新建操作
  const handleNew = () => {
    const currentRoute = router.currentRoute.value
    if (currentRoute.path === '/upload') {
      // 触发上传
      const uploadBtn = document.querySelector('.el-upload__input') as HTMLElement
      uploadBtn?.click()
    } else {
      router.push('/upload')
    }
  }
  
  // 保存操作
  const handleSave = () => {
    ElMessage.info('保存功能根据当前页面自动触发')
  }
  
  // 刷新操作
  const handleRefresh = () => {
    window.location.reload()
  }
  
  // 注册和注销快捷键
  const register = () => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
  }
  
  const unregister = () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    pressedKeys.clear()
  }
  
  // 生命周期
  onMounted(() => {
    register()
  })
  
  onUnmounted(() => {
    unregister()
  })
  
  return {
    hotkeys,
    showHotkeyHelp,
    register,
    unregister
  }
} 