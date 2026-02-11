import React, { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useLiveListState } from 'tuikit-atomicx-react';
import { LiveHeader } from '@/components/LiveHeader';
import { LivePlayerView } from '@/components/LivePlayerView';
import { initRoomEngineLanguage } from '../../utils';
import styles from './LivePlayer.module.scss';

const LivePlayer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { language } = useUIKit();
  const { joinLive } = useLiveListState();

  const handleJoinLive = useCallback(async (liveId: string) => {
    await initRoomEngineLanguage(language);
    await joinLive({ liveId });
  }, [joinLive]);

  useEffect(() => {
    const liveId = searchParams.get('liveId');
    if (liveId) {
      handleJoinLive(liveId);
    }
  }, [searchParams, handleJoinLive]);

  return (<div className={styles.livePlayer}>
    <LiveHeader className={styles.livePlayer__header} loginButtonVisible={false} />
    <div className={styles.livePlayer__body}>
      <LivePlayerView />
    </div>
  </div>);
};

export default LivePlayer;