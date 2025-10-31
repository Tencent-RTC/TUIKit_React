# Web Vite React Demo

这是一个基于 `@tencentcloud/chat-uikit-react` 的演示项目，使用 Vite + React + TypeScript 构建。

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
web-vite-react/
├── src/
│   ├── App.tsx          # 主应用组件
│   ├── main.tsx         # 应用入口
│   ├── index.css        # 全局样式
│   └── vite-env.d.ts    # Vite 类型定义
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
├── tsconfig.app.json    # 应用 TypeScript 配置
├── tsconfig.node.json   # Node.js TypeScript 配置
├── vite.config.ts       # Vite 配置
└── .eslintrc.cjs        # ESLint 配置
```

## 功能特性

- ✅ Vite 快速开发服务器
- ✅ React 18 + TypeScript
- ✅ 集成 chat-uikit-react
- ✅ ESLint 代码规范
- ✅ 路径别名支持 (@/*)