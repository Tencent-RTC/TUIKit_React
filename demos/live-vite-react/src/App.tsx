import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import TUIRoomEngine from '@tencentcloud/tuiroom-engine-js';
import { UIKitProvider, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { router } from './router';
import { initRoomEngineLanguage } from './utils/utils';
import './App.css';

function AppInner() {
  const { language } = useUIKit();

  // Wait for TUIRoomEngine to be ready before calling callExperimentalAPI.
  // On page refresh inside a live room the engine has not initialised yet.
  useEffect(() => {
    TUIRoomEngine.once('ready', () => {
      initRoomEngineLanguage(language);
    });
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
