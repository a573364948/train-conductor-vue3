# Tailwind CSS生产环境构建指南

当需要将系统部署到生产环境时，应该使用构建工具生成优化的Tailwind CSS，而不是使用CDN。

## 前置条件

确保已安装Node.js和npm。

## 构建步骤

1. 安装Tailwind CLI:
```bash
npm install -D tailwindcss
```

2. 确认已创建配置文件和源CSS文件:
   - `tailwind.config.js` - 配置文件
   - `src/input.css` - 包含Tailwind指令的源CSS文件

3. 运行构建命令:
```bash
npx tailwindcss -i src/input.css -o dist/output.css --minify
```

4. 修改HTML文件中的引用:
   - 删除或注释掉CDN引用: 
   ```html
   <!-- <script src="https://cdn.tailwindcss.com"></script> -->
   <!-- <script src="tailwind-config.js"></script> -->
   ```
   - 添加构建后的CSS文件引用:
   ```html
   <link href="dist/output.css" rel="stylesheet">
   ```

## 自定义样式

如需添加自定义样式，编辑`src/input.css`文件，然后重新运行构建命令。

## 调试和开发

在开发过程中，可以使用以下命令实时更新CSS:
```bash
npx tailwindcss -i src/input.css -o dist/output.css --watch
``` 