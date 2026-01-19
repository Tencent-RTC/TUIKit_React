import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveListState } from 'tuikit-atomicx-react';
import { LiveHeader } from '@/components/LiveHeader';
import { LivePlayerView } from '@/components/LivePlayerView';
import styles from './LivePlayer.module.scss';

const LivePlayer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { joinLive } = useLiveListState();

  useEffect(() => {
    const liveId = searchParams.get('liveId');
    if (liveId) {
      joinLive({ liveId });
    }
  }, [searchParams, joinLive]);

  return (<div className={styles.livePlayer}>
    <LiveHeader className={styles.livePlayer__header} loginButtonVisible={false} />
    <div className={styles.livePlayer__body}>
      <LivePlayerView />
    </div>
  </div>);
};

export default LivePlayer;