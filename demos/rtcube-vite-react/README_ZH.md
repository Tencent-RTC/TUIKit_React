# Web Vite React Demo

简体中文 | [English](./README.md)

这是一个基于 `@tencentcloud/chat-uikit-react` 的演示项目，使用 Vite + React + TypeScript 构建。

## 🚀 推荐：使用更高效的 AI 集成助手

我们为您提供了全新的 AI 集成方式，如果您不需要完整的 Demo 工程，只想快速开始集成，推荐您使用更高效的 AI 集成助手，只需要简单描述您的需求，即可自动生成集成代码，大幅提升开发效率。

[点击这里，立即体验 AI 集成](https://cloud.tencent.com/document/product/269/124481)

## 🚀 推荐：仅查看 Chat UIKit

RTCube 项目是一个全面展示 RTC 场景下多产品能力的示例工程，包括 Chat、Call、Room 等产品的示例代码。

如果您只想要查看 Chat 产品能力，可以 clone [rtc-chat-web](https://gitee.com/tencent-cloud-uikit/rtc-chat-web) 项目：

```bash
git clone https://gitee.com/tencent-cloud-uikit/rtc-chat-web.git
```

## 项目说明

本项目演示了如何将腾讯云 Chat UIKit 集成到 React 应用中，提供以下功能场景：

- 💬 **聊天** - 即时通讯

## 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- 腾讯云 IM 账号，需要 SDKAppID 和 SecretKey

## 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd rtcube/demos/web-vite-react
```

### 2. 安装依赖

```bash
# 在项目根目录安装依赖
npm i
```

### 3. 运行项目

```bash
npm run dev
```

## 项目结构

```
src/
├── assets/          # 静态资源
├── components/      # 可复用组件
├── config/          # 配置文件
├── debug/           # 调试工具（UserSig 生成）
├── locales/         # 国际化语言文件
├── pages/           # 页面组件
│   ├── HomePage/    # 首页
│   ├── LoginPage/   # 登录页
│   └── StagesPage/  # 场景选择页
├── router/          # 路由配置
├── scenes/          # 功能场景
│   ├── ChatPage/    # 聊天场景
├── styles/          # 全局样式和混入
├── App.tsx          # 根组件
└── main.tsx         # 入口文件
```

## 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |

## 技术栈

- **框架**: React 18
- **构建工具**: Vite 5
- **语言**: TypeScript 5
- **路由**: React Router 6
- **样式**: SCSS Modules
- **UI 组件**: @tencentcloud/chat-uikit-react

## 相关文档

- [Chat UIKit React 文档](https://cloud.tencent.com/document/product/269/83749)
- [腾讯云即时通信 IM](https://cloud.tencent.com/document/product/269)

## 免责声明

本项目仅供演示目的使用。
