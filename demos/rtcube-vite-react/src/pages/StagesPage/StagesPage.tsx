import { useEffect } from 'react';
import { useLoginState, LoginStatus, useUIKit } from '@tencentcloud/chat-uikit-react';
import { Button } from '@tencentcloud/uikit-base-component-react';
import { useNavigate, useParams } from 'react-router-dom';
import Logo from '../../assets/RTCubeLogo.png';
import { getEnabledScenes } from '../../config/scenes';
import CallPage from '../../scenes/CallPage';
import ChatPage from '../../scenes/ChatPage';
import LivePage from '../../scenes/LivePage';
import RoomPage from '../../scenes/RoomPage';
import styles from './StagesPage.module.scss';

function StagesPage() {
  const navigate = useNavigate();
  const { logout, status, loginUserInfo } = useLoginState();
  const { sceneId } = useParams();
  const { t } = useUIKit();

  useEffect(() => {
    if (status !== LoginStatus.SUCCESS) {
      navigate('/login');
    }
  }, [sceneId, status, loginUserInfo, navigate]);

  const scenes = getEnabledScenes();

  function switchScene(key: string) {
    if (key === sceneId) {
      return;
    }
    navigate(`/stages/${key}`, { replace: true });
  }

  function renderSceneContent() {
    switch (sceneId) {
      case 'chat':
        return <ChatPage />;
      case 'call':
        return <CallPage />;
      case 'live':
        return <LivePage />;
      case 'room':
        return <RoomPage />;
      default:
        return <ChatPage />;
    }
  }

  function handleLogout() {
    logout();
    localStorage.removeItem('im-user-info');
  }

  return (
    <div className={styles.stagePage}>
      <header className={styles.stageHeader}>
        <div className={styles.stageHeaderLeft}>
          <img
            src={Logo}
            alt="RTCube Logo"
            className={styles.stageHeaderLogo}
            onClick={() => navigate('/')}
          />
          {scenes.map(scene => (
            <button
              key={scene.key}
              className={`${styles.pill} ${scene.key === sceneId ? styles.active : ''}`}
              onClick={() => switchScene(scene.key)}
            >
              {t(scene.label)}
            </button>
          ))}
        </div>
        <div className={styles.stageHeaderRight}>
          <Button onClick={handleLogout}>
            {t('page.stages.logout')}
          </Button>
        </div>
      </header>
      {renderSceneContent()}
    </div>
  );
}

export {
  StagesPage,
};
