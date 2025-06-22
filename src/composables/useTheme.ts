import { ref, watch, onMounted } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'

const THEME_KEY = 'train-conductor-theme'

export function useTheme() {
  const theme = ref<Theme>('light')
  const isDark = ref(false)
  
  // 获取系统主题偏好
  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  // 应用主题
  const applyTheme = (t: Theme) => {
    let effectiveTheme: 'light' | 'dark'
    
    if (t === 'auto') {
      effectiveTheme = getSystemTheme()
    } else {
      effectiveTheme = t
    }
    
    isDark.value = effectiveTheme === 'dark'
    
    // 更新 HTML 类名
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // 更新 Element Plus 主题
    document.documentElement.style.setProperty(
      '--el-bg-color',
      effectiveTheme === 'dark' ? '#141414' : '#ffffff'
    )
    document.documentElement.style.setProperty(
      '--el-bg-color-page',
      effectiveTheme === 'dark' ? '#0a0a0a' : '#f2f3f5'
    )
    document.documentElement.style.setProperty(
      '--el-text-color-primary',
      effectiveTheme === 'dark' ? '#e4e7ed' : '#303133'
    )
    document.documentElement.style.setProperty(
      '--el-text-color-regular',
      effectiveTheme === 'dark' ? '#cfd3dc' : '#606266'
    )
    document.documentElement.style.setProperty(
      '--el-border-color',
      effectiveTheme === 'dark' ? '#363637' : '#dcdfe6'
    )
    document.documentElement.style.setProperty(
      '--el-border-color-light',
      effectiveTheme === 'dark' ? '#262627' : '#e4e7ed'
    )
    document.documentElement.style.setProperty(
      '--el-border-color-lighter',
      effectiveTheme === 'dark' ? '#1d1d1d' : '#ebeef5'
    )
    document.documentElement.style.setProperty(
      '--el-fill-color',
      effectiveTheme === 'dark' ? '#262627' : '#f0f2f5'
    )
    document.documentElement.style.setProperty(
      '--el-fill-color-light',
      effectiveTheme === 'dark' ? '#1d1d1d' : '#f5f7fa'
    )
    document.documentElement.style.setProperty(
      '--el-fill-color-lighter',
      effectiveTheme === 'dark' ? '#191919' : '#fafafa'
    )
  }
  
  // 设置主题
  const setTheme = (t: Theme) => {
    theme.value = t
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }
  
  // 切换主题
  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(theme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }
  
  // 初始化
  onMounted(() => {
    // 从本地存储读取主题
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      theme.value = savedTheme
    }
    
    applyTheme(theme.value)
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'auto') {
        applyTheme('auto')
      }
    })
  })
  
  // 监听主题变化
  watch(theme, (newTheme) => {
    applyTheme(newTheme)
  })
  
  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  }
} 