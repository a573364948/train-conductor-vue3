import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { inject } from '@vercel/analytics'

import App from './App.vue'
import router from './router'
import { useMainStore } from './stores'

// 样式
import './styles/index.scss'

// 初始化Vercel Analytics
inject()

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 初始化数据库加载
const mainStore = useMainStore()
mainStore.loadDatabase().then(() => {
  console.log('应用启动完成，数据库已加载')
}).catch(err => {
  console.error('应用启动时数据库加载失败:', err)
})

app.mount('#app') 