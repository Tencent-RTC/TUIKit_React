## Overview

English | [简体中文](README.zh.md)

This document provides a detailed introduction to the **Live Monitoring Page** in the TUILiveKit Demo. You can directly reference this documentation to integrate our pre-developed monitoring page into your existing project, or customize the page's styling, layout, and functionality according to your requirements.

## Feature Overview
<table>
<tr>
<th rowspan="1" colSpan="1" >Feature Category</td>

<th rowspan="1" colSpan="1" >Specific Capabilities</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >Multi-stream Live Monitoring</td>

<td rowspan="1" colSpan="1" >Support simultaneous display of 8+ live streams (customizable quantity).</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >Low-latency Playback</td>

<td rowspan="1" colSpan="1" >Real-time live stream pulling with ≤3 second delay.</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >Independent Audio Control</td>

<td rowspan="1" colSpan="1" >Enable/disable audio for any live stream independently to avoid interference.</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >One-click Detail View</td>

<td rowspan="1" colSpan="1" >Click any live stream window to quickly access details page and view key information such as streamer details.</td>
</tr>

<tr>
<td rowspan="1" colSpan="1" >One-click Violation Stream Termination</td>

<td rowspan="1" colSpan="1" >Directly terminate违规 live streams from detail page or monitoring panel to improve handling efficiency.</td>
</tr>
</table>


## **Feature Demonstration**

The monitoring page provides default behavior and styling, but if the default behavior and styling don't fully meet your requirements, you can also customize the UI. This mainly includes **multi-stream live monitoring, low-latency playback, independent audio control, one-click detail view, one-click violation stream termination**, and more.

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/70981c828e1611f0b321525400e889b2.png)


## Quick Start

### Step 1: Environment Configuration and Service Activation

Before quick integration, you need to refer to [Prerequisites](https://write.woa.com/document/185222107981008896) to meet the relevant environment configuration and activate corresponding services.

### Step 2: Download Demo
``` bash
git clone https://github.com/Tencent-RTC/TUIKit_React.git
```

### Step 3: Install Dependencies
``` bash
cd TUIKit_React/demos/live-monitor-react && npm install && cd server && npm install
```

### Step 4: Start Server Project
``` typescript
// cd TUIKit_React/demos/live-monitor-react/server/config/index.js

const Config = {
  SdkAppId: 0,    // Enter your TUILiveKit service SDKAppID
  SecretKey: '',  // Enter your TUILiveKit service SDKSecretKey
  Identifier: 'administrator',
  Protocol: 'https://',
  Domain: 'console.tim.qq.com',
  Port: 9000,
};

module.exports = { Config };
```
``` bash
// Execute the following command to start the server, default access address: http://localhost:9000/api
npm run start
```

### Step 5: Start Frontend Project
``` tsx
// cd TUIKit_React/demos/live-monitor-react/src/config/index.ts 

import { getBasicInfo } from './basic-info-config';

const sdkAppId = 0;         // Enter your TUILiveKit service SDKAppID 
const secretKey = '';       // Enter your TUILiveKit service SDKSecretKey
const defaultCoverUrl = ''; // Configure your default live stream cover image URL

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
        baseUrl: 'http://localhost:9000/api', // Default server access address from Step 4
        account: {
          sdkAppId: 0,  // Your TUILiveKit service SDKAppID
          userId: '',   // The userId from Step 1
          password: '', // The userSig from Step 1
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

## Customization

Through the above method, you have successfully run the monitoring page Demo. If you need to customize the UI, you can refer to the following implementation methods. Customization content includes but is not limited to **color themes, fonts, border radius, buttons, icons, input fields, popups**, etc. in the source code, all of which can be **added, deleted, or modified**. The following provides customization examples for color themes, buttons, and icons. You can refer to the implementation methods and apply them to other components to meet your UI customization needs.

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/6fae3a548e1611f084bd5254007c27c5.png)


### 1. Color Theme

As shown in the code example in Step 5, you can use the theme value to switch color themes.
``` java
<UIKitProvider theme="dark">  // When theme is "dark", the overall interface color theme is dark
  xxx                         // When theme is "light", the overall interface color theme is light
</UIKitProvider>
```

### 2. Button Component

If you need to add or replace UI customization for buttons, you can implement it through the following method, using the three operation buttons on the live stream list page as an example. Refer to the image below to find the corresponding Button source code location and perform **add, delete, replace** UI customization operations on the current button section.

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/e47048fb8e2211f0818a52540099c741.png)


### 3. Icon Component

If you need to add or replace UI customization for icons, you can implement it through the following method, using the icons in the live stream list as an example. Through the following guidance, you can find the corresponding Icon location and perform add, delete, replace UI customization operations.

![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/bb6a23c18e2211f0974b52540044a08e.png)


## Production Environment Deployment

### Step 1: Deploy Server Project

> **Note:**
> 
> This document uses deployment to Tencent [Cloud Functions](https://cloud.tencent.com/document/product/583) as an example. The server project already includes the necessary [scf_bootstrap](https://cloud.tencent.com/document/product/583/56126) file for deployment to cloud functions. Follow the guide to deploy the service normally.
> 

1. Build server code locally.

   ``` bash
   # Enter server project
   cd server
   
   # Build artifacts
   npm run build
   ```   

   > **Note:**
   > 
   > Build artifacts are stored in the dist directory by default.
   > 

2. Log in to [Serverless Console](https://console.cloud.tencent.com/scf/index?rid=1) and click **Function Service** in the left navigation bar.

3. Click **Create** in the main interface to enter the function creation process.

4. Select **Start from scratch** to create a new function and fill in the basic function configuration. As shown in the figure below: 

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/038b38cb8e1611f0b321525400e889b2.png)

  - **Function Type:** Select "Web Function".

  - **Function Name:** Fill in your own function name.

  - **Region:** Fill in your function deployment region.

  - **Runtime Environment:** Select "Node.js 18.15".

5. Enter the Web function you just created in **Function Service**.

6. In the **Function Management** page, select "Upload local folder" for the function code submission method, upload the **src** folder from the **dist** directory built in **Step 1**, then click **Deploy**.

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/034ad93f8e1611f0ae9d5254001c06ec.png)

7. Wait for the function code to load completely, then check if `SdkAppId` and `SecretKey` in the **src/config/index.js** file are filled in.

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/032611198e1611f0814e525400bf7822.png)

8. Create a new terminal following the guidance below.

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/0384dc0a8e1611f0818a52540099c741.png)

9. Enter the `src` directory to install dependencies.

   ``` bash
   cd src
   
   npm install
   ```
10. Click **Deploy** after dependency installation is complete.

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/031207d48e1611f0818a52540099c741.png)

11. After deployment is complete, click **Function URL** on the left and copy the internal access link (both http and https protocol links are acceptable).

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/02f337f28e1611f0bd05525400454e06.png)

12. Enter the API testing tool (using ApiFox as an example), add `/api/test` to the end of the copied link, click **Send** and check the response result.

   ![](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100027862798/03af5b508e1611f0b321525400e889b2.png)


### Step 2: Deploy Frontend Project
1. After successfully deploying the cloud function through **Step 1**, assuming your function URL access link is `https://live-monitor-test.tencentscf.com`. You only need to adjust the **baseUrl** in the **init** method of the **TUIKit_React/demos/live-monitor-react/src/views/live-monitor/index.tsx** component to the above URL access link.

2. Build frontend code.

   ``` bash
   # Enter live-monitor-react directory
   cd TUIKit_React/demos/live-monitor-react
   
   # Build project
   npm run build
   ```

## Additional Documentation
- [TUILiveKit Service Activation](https://trtc.io/document/60033?product=live&menulabel=uikit&platform=web)

- [TUILiveKit Demo Walkthrough](https://trtc.io/document/66940?product=live&menulabel=uikit&platform=web)

- [TUILiveKit Quick Integration](https://trtc.io/document/66938?product=live&menulabel=uikit&platform=web)

- [Serverless Cloud Function Guide](https://www.tencentcloud.com/document/product/583/45901)