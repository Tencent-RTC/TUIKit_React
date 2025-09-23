import { useLayoutEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { UIKitProvider, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { router } from './router';
import { enResource, zhResource, addI18n } from './i18n';
import './App.css';

function AppInner() {
  const { setLanguage } = useUIKit();
  useLayoutEffect(() => {
    addI18n('en-US', enResource);
    addI18n('zh-CN', zhResource);
    setLanguage(navigator.language);
  }, [setLanguage]);
  return <RouterProvider router={router} />;
}

function App() {
  return (
    <UIKitProvider>
      <AppInner />
    </UIKitProvider>
  );
}

export default App;
