import { UIKitProvider } from '@tencentcloud/chat-uikit-react';
import { RouterProvider } from 'react-router-dom';
import { i18nInit } from './locales';
import { router } from './router';

i18nInit();

function App() {
  return (
    <UIKitProvider language="zh-CN" theme="dark">
      <RouterProvider router={router} />
    </UIKitProvider>
  );
}

export default App;
