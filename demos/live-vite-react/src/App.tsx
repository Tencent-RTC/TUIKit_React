import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { UIKitProvider, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { router } from './router';
import { initRoomEngineLanguage } from './utils/utils';
import './App.css';

function AppInner() {
  const { language } = useUIKit();

  useEffect(() => {
    initRoomEngineLanguage(language);
  }, [language]);

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <UIKitProvider theme="dark">
      <AppInner />
    </UIKitProvider>
  );
}

export default App;
