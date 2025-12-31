import { UIKitProvider } from '@tencentcloud/chat-uikit-react';
import { RouterProvider } from 'react-router-dom';
import { i18nInit } from './locales';
import { router } from './router';

i18nInit();

const browserLang = navigator.language;
const language = browserLang.startsWith('zh') ? 'zh-CN' : 'en-US';

function App() {
  return (
    <UIKitProvider 
      // language={language} 
      theme="light"
    >
      <RouterProvider router={router} />
    </UIKitProvider>
  );
}

export default App;
