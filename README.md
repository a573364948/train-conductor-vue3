# 列车长考核管理系统 Vue 3 版本

## 🚀 快速开始

### 1. 安装 Node.js (如果还没安装)
访问 https://nodejs.org/ 下载并安装 LTS 版本

### 2. 安装项目依赖
在项目根目录打开命令行，运行：

```bash
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```

项目将在 http://localhost:3000 启动

## 📁 项目结构

```
train-conductor-vue3/
├── src/
│   ├── api/              # IndexedDB 数据库操作
│   ├── assets/           # 静态资源
│   ├── components/       # 公共组件
│   ├── composables/      # 组合式函数
│   ├── layouts/          # 布局组件
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia 状态管理
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面组件
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── public/               # 公共资源
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── vite.config.ts        # Vite 配置
```

## 🔧 开发指南

### 创建新页面
1. 在 `src/views/` 下创建页面组件
2. 在 `src/router/index.ts` 中添加路由
3. 在 `src/stores/` 中创建相关的状态管理

### 创建新组件
1. 在 `src/components/` 下创建组件
2. 使用 TypeScript 定义 props 和 emits
3. 遵循组合式 API 规范

### 数据库操作
- 所有 IndexedDB 操作封装在 `src/api/database.ts`
- 使用 TypeScript 接口定义数据模型
- 提供异步操作和错误处理

## 📋 待办事项

- [ ] 完成基础路由配置
- [ ] 迁移 IndexedDB 数据库操作
- [ ] 创建主布局组件
- [ ] 迁移仪表盘页面
- [ ] 迁移数据上传功能
- [ ] 迁移考核分析模块
- [ ] 添加数据安全功能
- [ ] 优化性能

## 🛠️ 技术栈

- Vue 3.4 + TypeScript
- Vite 5 构建工具
- Element Plus UI 组件库
- Pinia 状态管理
- Vue Router 4 路由管理
- ECharts 5 图表库
- VueUse 组合式函数库 