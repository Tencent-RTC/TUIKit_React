# Web Vite React Demo

English | [简体中文](./README_ZH.md) 

A demo project based on `@tencentcloud/chat-uikit-react`, built with Vite + React + TypeScript.

## 🚀 Recommended: AI Integration Assistant

We provide a brand-new AI integration approach. If you don't need the complete Demo project and just want to get started quickly with integration, we recommend using our more efficient AI Integration Assistant. Simply describe your requirements, and it will automatically generate integration code, significantly improving development efficiency.

[Click here to experience AI Integration](https://trtc.io/document/72277?product=chat&menulabel=uikit&platform=react)

## 🚀 Recommended: Only view Chat UIKit

RTCube project is a comprehensive demonstration of multi-product capabilities in RTC scenarios, including sample code for products like Chat, Call, and Room.

If you only want to view the Chat product capabilities, you can clone the [rtc-chat-web](https://gitee.com/tencent-cloud-uikit/rtc-chat-web) project:

```bash
git clone https://gitee.com/tencent-cloud-uikit/rtc-chat-web.git
```

## Project Overview

This project demonstrates how to integrate Tencent Cloud Chat UIKit into a React application, providing the following features:

- 💬 **Chat** - instant messaging

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Tencent Cloud IM account with SDKAppID and SecretKey

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rtcube/demos/web-vite-react
```

### 2. Install Dependencies

```bash
# Install dependencies from the project root
npm i
```

### 3. Run the Project

```bash
npm run dev
```

## Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Reusable components
├── config/          # Configuration files
├── debug/           # Debug utilities (UserSig generation)
├── locales/         # i18n language files
├── pages/           # Page components
│   ├── HomePage/    # Home page
│   ├── LoginPage/   # Login page
│   └── StagesPage/  # Stage selection page
├── router/          # Route configuration
├── scenes/          # Feature scenes
│   ├── ChatPage/    # Chat scene
├── styles/          # Global styles and mixins
├── App.tsx          # Root component
└── main.tsx         # Entry point
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Language**: TypeScript 5
- **Routing**: React Router 6
- **Styling**: SCSS Modules
- **UI Components**: @tencentcloud/chat-uikit-react

## Documentation

- [Chat UIKit React Documentation](https://trtc.io/document/50055?product=chat&menulabel=uikit&platform=react)
- [Tencent Cloud IM Product](https://trtc.io/document/chat-overview?product=chat&menulabel=uikit&platform=react)

## License

This project is for demonstration purposes only.
