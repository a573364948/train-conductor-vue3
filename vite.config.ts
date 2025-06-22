import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      // Vue性能优化
      script: {
        defineModel: true,
        propsDestructure: true
      }
    }),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '列车长考核管理系统',
        short_name: '列车长考核',
        description: '列车长考核数据管理和分析系统',
        theme_color: '#409eff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // 性能优化：依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      '@element-plus/icons-vue',
      'echarts',
      'vue-echarts',
      'lodash-es',
      'dayjs'
    ],
    exclude: [
      // 排除大型依赖的预构建
      'html2canvas',
      'jspdf'
    ]
  },
  // 构建优化
  build: {
    // 构建性能优化
    target: 'esnext',
    minify: 'esbuild',
    // 代码分割优化
    rollupOptions: {
      output: {
        // 手动分割chunks以优化加载
        manualChunks: {
          // 核心Vue相关
          vue: ['vue', 'vue-router', 'pinia'],
          // UI组件库
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          // 图表相关
          charts: ['echarts', 'vue-echarts'],
          // 工具库
          utils: ['lodash-es', 'dayjs', '@vueuse/core'],
          // PDF和导出相关（懒加载）
          export: ['html2canvas', 'jspdf', 'xlsx']
        }
      }
    },
    // 优化chunk大小
    chunkSizeWarningLimit: 1000,
    // 开启源码映射（开发时）
    sourcemap: process.env.NODE_ENV === 'development'
  },
  // 服务器优化
  server: {
    port: 3000,
    host: true,
    open: true,
    // 性能优化
    hmr: {
      overlay: false // 减少HMR开销
    },
    // 预热频繁使用的文件
    warmup: {
      clientFiles: [
        './src/main.ts',
        './src/App.vue',
        './src/stores/index.ts',
        './src/router/index.ts'
      ]
    }
  },
  // 开发优化
  esbuild: {
    // 移除console和debugger（生产环境）
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  // CSS优化
  css: {
    // 开发时不生成source map以提升性能
    devSourcemap: false
  }
}) 