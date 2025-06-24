# 网站图标指南

本项目使用SVG格式的图标作为主要网站图标，同时提供了备用的ICO格式以增强兼容性。

## 当前实现

当前的实现使用了以下文件：

- `favicon.svg` - 主要的矢量图标，支持现代浏览器
- `favicon.ico` - 备用图标，提供给不支持SVG图标的旧版浏览器

HTML中的引用方式：

```html
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="favicon.ico" type="image/x-icon">
<link rel="shortcut icon" href="favicon.ico">
```

## 生产环境优化建议

对于生产环境，建议生成更完整的图标集合：

1. 生成不同尺寸的PNG图标（16x16, 32x32, 48x48, 96x96, 144x144, 192x192, 512x512）
2. 生成优化的favicon.ico文件（包含16x16和32x32尺寸）
3. 创建网站清单文件（site.webmanifest）以支持PWA功能

可以使用项目中提供的`favicon-generator.js`脚本作为参考，但需要先安装必要的依赖：

```bash
npm install sharp to-ico
node favicon-generator.js
```

## 图标设计说明

当前图标设计代表了列车长管理系统的主题：
- 蓝色圆形背景代表专业和可靠
- 列车和轨道图案代表铁路系统
- 列车长帽子象征管理职责

如需修改设计，请编辑`favicon.svg`文件，然后重新生成所有格式的图标。 