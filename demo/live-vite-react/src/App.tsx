import { useLayoutEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { UIKitProvider, useUIKit } from '@tencentcloud/uikit-base-component-react';
import TUIRoomEngine from '@tencentcloud/tuiroom-engine-js';
import { router } from './router';
import './App.css';

async function initRoomEngineLanguage() {
  let language: string = 'en';
  if (navigator.language.includes('en')) {
    language = 'en';
  } else if (navigator.language.includes('zh')) {
    language = 'zh-Hans';
  }
  await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
    api: 'setCurrentLanguage',
    params: {
      language,
    },
  }));
}

function AppInner() {
  const { setLanguage } = useUIKit();
  useLayoutEffect(() => {
    setLanguage(navigator.language);
    TUIRoomEngine.once('ready', () => {
      initRoomEngineLanguage();
    })
  }, [setLanguage]);
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
