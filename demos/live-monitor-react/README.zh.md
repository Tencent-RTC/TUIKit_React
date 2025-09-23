## 概述

简体中文 | [English](README.md)

本文对 TUILiveKit Demo 中的**监播页面**进行了详细的介绍，您可以在已有项目中直接参考本文档集成我们开发好的观看页面，也可以根据您的需求按照文档中的内容对页面的样式，布局以及功能项进行深度的定制。

## 功能概览
<table>
<tr>
<th rowspan="1" colSpan="1" >功能分类</td>

<th rowspan="1" colSpan="1" >具体能力</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >多路直播间同屏监播</td>

<td rowspan="1" colSpan="1" >支持同时展示8+路直播画面（具体数量可定制）。</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >低延迟播放</td>

<td rowspan="1" colSpan="1" >实时拉取直播流，画面延迟≤3秒。</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >独立音频控制</td>

<td rowspan="1" colSpan="1" >可单独开启/关闭任意一路直播间的声音，避免干扰。</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >一键查看详情</td>

<td rowspan="1" colSpan="1" >单击任意直播间窗口，快速进入详情页，查看主播信息等关键信息。</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >一键解散违规直播间</td>

<td rowspan="1" colSpan="1" >在详情页或监播面板直接操作，快速关停违规直播间，提升处置效率。</td>
</tr>
</table>


## **功能展示**

监播页面提供默认行为和风格，但如果默认行为和样式不能完全满足您的需求，您也可以对 UI 进行自定义。其中主要包含直播**多路直播间同屏监播、低延迟播放、独立音频控制、一键查看详情、一键解散违规直播间等。**

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/70981c828e1611f0b321525400e889b2.png)


## 快速跑通

### 步骤1：环境配置及开通服务

在进行快速接入之前，您需要参考[准备工作](https://write.woa.com/document/185222107981008896)，满足相关环境配置及开通对应服务。

### 步骤2: 下载 Demo
``` bash
git clone https://github.com/Tencent-RTC/TUIKit_React.git
```

### 步骤3: 安装依赖
``` bash
cd TUIKit_React/demos/live-monitor-react && npm install && cd server && npm install
```

### 步骤4: 启动服务端工程
``` typescript
// cd TUIKit_React/demos/live-monitor-react/server/config/index.js

const Config = {
  SdkAppId: 0,    // 输入您 TUILiveKit 服务的 SDKAppID
  SecretKey: '',  // 输入您 TUILiveKit 服务的 SDKSecretKey
  Identifier: 'administrator',
  Protocol: 'https://',
  Domain: 'console.tim.qq.com',
  Port: 9000,
};

module.exports = { Config };
```
``` bash
// 执行如下命令启动服务，默认访问地址为：http://localhost:9000/api
npm run start
```

### 步骤5: 启动前端工程
``` tsx
// cd TUIKit_React/demos/live-monitor-react/src/config/index.ts 

import { getBasicInfo } from './basic-info-config';

const sdkAppId = 0;         // 输入您 TUILiveKit 服务的 SDKAppID 
const secretKey = '';       // 输入您 TUILiveKit 服务的 SDKSecretKey
const defaultCoverUrl = ''; // 配置您直播封面的默认图片地址

const createBasicAccount = (userId?: string) => {
  return getBasicInfo(userId || `live_${Math.ceil(Math.random() * 10000000)}`, sdkAppId, secretKey);
};

export { sdkAppId, secretKey, createBasicAccount, defaultCoverUrl };
```
``` typescript
// cd TUIKit_React/demos/live-monitor-react/src/views/LiveMointor/index.tsx

import React, { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveMonitorState } from 'tuikit-atomicx-react';
import { safelyParse } from '../../utils';
import { Header } from '../../components/Header';
import { LiveList } from '../../components/LiveList';
import { Pagination } from '../../components/Pagination';
import { PaginationProvider } from '../../context/PaginationContext';
import styles from './LiveMonitor.module.scss';

const LiveMonitor: React.FC = () => {
  const { init, monitorLiveInfoList } = useLiveMonitorState();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const account = safelyParse(localStorage.getItem('tuiLiveMonitor-userInfo') || '');

    if (account) {
      init({
        baseUrl: 'http://localhost:9000/api', // 步骤4 中服务端默认访问地址 
        account: {
          sdkAppId: 0,  // 您 TUILiveKit 服务的 SDKAppID
          userId: '',   // 该用户在 步骤1 中的 userId
          password: '', // 该用户在 步骤1 中的 userSig
        },
      });
    } else {
      navigate('/login');
    }
  }, [init, navigate]);

  return (
  <UIKitProvider theme="dark">
    <div className={styles['live-monitor']}>
      <Header />
      <PaginationProvider>
        <LiveList monitorLiveInfoList={monitorLiveInfoList} />
        <div className={styles['live-pagination']}>
          <Pagination pageSize={10} />
        </div>
      </PaginationProvider>
    </div>
  </UIKitProvider>
  );
};

export default LiveMonitor;

```
``` java
npm run start
```

## 自由定制

通过上述方式您已经成功运行起监播页面的 Demo，此时若您需要对 UI 进行定制，您可以参考如下方式进行实现。其中定制内容包括但不限于对源码中的`颜色主题、字体、圆角、按钮、图标、输入框、弹框等`内容，都可以进行**增加、删除、修改**等操作，下列分别给出颜色主题、按钮以及图标的定制示例，您可以参考实现方式通用到其他组件，满足您的 UI 定制需要。

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/6fae3a548e1611f084bd5254007c27c5.png)


### 1. 颜色主题

如步骤五中代码示例，您可以使用操作 theme 的值来满足您切换颜色主题。
``` java
<UIKitProvider theme="dark">  // theme 传入 dark 时，界面整体颜色主题为黑色主题
  xxx                         // theme 传入 light 时，界面整体颜色主题为白色主题
</UIKitProvider>
```

### 2. 按钮 Button

若您需要对按钮 Button 进行新增或替换等 UI 定制，您可以通过如下方式进行实现，以直播列表页面操作的三个按钮为例。参考下图，您可以找到对应 Button 指定位置源码，对当前部分的按钮进行**增加、删除、替换**等 UI 定制操作。

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/e47048fb8e2211f0818a52540099c741.png)


### 3. 图标 Icon

若您需要对图标 Icon 进行新增或替换等 UI 定制，您可以通过如下方式进行实现，以直播列表中的的 Icon 为例。通过下述指引，您可以找到对应 Icon 位置，进行增加、删除、替换等 UI 定制操作。

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/bb6a23c18e2211f0974b52540044a08e.png)


## 生产环境部署

### 步骤1：部署服务端工程

> **说明：**
> 

> 本文档以部署到腾讯 [云函数](https://cloud.tencent.com/document/product/583) 为例，server 工程已经包含了部署到云函数所必要的 [scf_bootstrap](https://cloud.tencent.com/document/product/583/56126) 文件，参照指引您便可将服务正常部署。
> 

1. 本地构建服务端代码。

   ``` bash
   # 进入 server 工程
   cd server
   
   # 构建产物
   npm run build
   ```   

   > **注意：**
   > 

   > 构建产物默认存放在 dist 目录。
   > 

2. 登录 [Serverless 控制台](https://console.cloud.tencent.com/scf/index?rid=1)，单击左侧导航栏到**函数服务**。

3. 在主界面上方单击新建，进入函数创建流程。

4. 选择**从头开始**来新建函数，并填写函数基础配置。如下图所示： 

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/038b38cb8e1611f0b321525400e889b2.png)

  - **函数类型：**选择 “Web 函数”。

  - **函数名称：**填写您自己的函数名称。

  - **地域：**填写您的函数部署地域。

  - **运行环境：**选择 “Node.js 18.15”。

5. 在**函数服务**中进入您刚刚创建的 Web 函数。

6. 在**函数管理**页面的函数代码的提交方法中选择本地上传文件夹，将**步骤1**构建的 **dist **目录内的 **src **文件夹上传后单击**部署**。

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/034ad93f8e1611f0ae9d5254001c06ec.png)

7. 等待函数代码加载完毕，检查 **src/config/index.js** 文件内的 `SdkAppId` 和 `SecretKey` 是否填写。

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/032611198e1611f0814e525400bf7822.png)

8. 按如下指引新建终端。

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/0384dc0a8e1611f0818a52540099c741.png)

9. 进入`src`目录安装依赖。

   ``` bash
   cd src
   
   npm install
   ```
10. 依赖安装完毕后单击**部署。**

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/031207d48e1611f0818a52540099c741.png)

11. 部署完成后单击左侧**函数 URL**，复制内网访问链接（http 或者 https 协议的链接均可）。

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/02f337f28e1611f0bd05525400454e06.png)

12. 进入接口测试工具（以 ApiFox 为例），在刚刚复制链接的最后加上 `/api/test`，单击**发送**后查看响应结果。

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/03af5b508e1611f0b321525400e889b2.png)


### 步骤2：部署前端工程
1. 通过**步骤1**部署云函数成功后，假设您的函数 URL 访问链接为 `https://live-monitor-test.tencentscf.com`。您只需调整 **TUIKit_React/demos/live-monitor-react/src/views/live-monitor/index.tsx** 组件中 **init** 方法内的 **baseUrl** 为上述 URL 访问链接即可。

2. 构建前端代码。

   ``` bash
   # 进入 live-monitor-react 目录
   cd TUIKit_React/demos/live-monitor-react
   
   # 构建项目
   npm run build
   ```

## 其他文档
- [TUILiveKit 开通服务](https://cloud.tencent.com/document/product/647/105439)

- [TUILiveKit 跑通 Demo](https://cloud.tencent.com/document/product/647/113798)

- [TUILiveKit 快速接入](https://cloud.tencent.com/document/product/647/113799)

- [云函数新手指引](https://cloud.tencent.com/document/product/583/54786)
