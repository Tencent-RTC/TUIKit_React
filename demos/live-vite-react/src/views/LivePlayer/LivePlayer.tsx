import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLoginState } from 'tuikit-atomicx-react';
import { LiveHeader } from '@/components/LiveHeader';
import { LivePlayerView } from '@/components/LivePlayerView';
import { useAutoLogin } from '@/hooks';
import { isMobile } from '@/utils/environment';
import styles from './LivePlayer.module.scss';

interface LivePlayerLayoutProps {
  children: React.ReactNode;
}

const LivePlayerLayoutPC: React.FC<LivePlayerLayoutProps> = ({ children }) => (
  <div className={styles.livePlayer}>
    <div className={styles.livePlayer__header}>
      <LiveHeader loginButtonVisible={false} />
    </div>
    <div className={styles.livePlayer__body}>
      {children}
    </div>
  </div>
);

const LivePlayerLayoutH5: React.FC<LivePlayerLayoutProps> = ({ children }) => {
  const { loginUserInfo } = useLoginState();
  // The H5 page has no LiveHeader, so it restores the login session itself.
  useAutoLogin();

  if (!loginUserInfo?.userId) {
    return null;
  }
  return <>{children}</>;
};

const LivePlayerLayout = isMobile ? LivePlayerLayoutH5 : LivePlayerLayoutPC;

const LivePlayer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const liveId = searchParams.get('liveId') || '';

  const handleLeaveLive = useCallback(() => {
    navigate('/live-list');
  }, [navigate]);

  return (
    <LivePlayerLayout>
      <LivePlayerView key={liveId} liveId={liveId} onLeaveLive={handleLeaveLive} />
    </LivePlayerLayout>
  );
};

export default LivePlayer;
