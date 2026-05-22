import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useLiveListState, useRoomEngine } from 'tuikit-atomicx-react';
import { LiveHeader } from '@/components/LiveHeader';
import { LivePlayerView } from '@/components/LivePlayerView';
import { initRoomEngineLanguage } from '../../utils';
import styles from './LivePlayer.module.scss';
import TUIRoomEngine from '@tencentcloud/tuiroom-engine-js';

const LivePlayer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { language } = useUIKit();
  const { joinLive } = useLiveListState();
  const roomEngine = useRoomEngine();
  const isJoiningRef = useRef(false);
  const [joinFailed, setJoinFailed] = useState(false);

  const handleJoinLive = useCallback(async (liveId: string) => {
    if (isJoiningRef.current) {
      return;
    }
    isJoiningRef.current = true;
    try {
      await initRoomEngineLanguage(language);
      await joinLive({ liveId });
    } catch (error) {
      // Room doesn't exist or join failed — show the ended overlay so the
      // user sees the same UI as when the host dismisses the room mid-stream.
      console.error('[LivePlayer] Failed to join live room:', error);
      isJoiningRef.current = false;
      setJoinFailed(true);
    }
  }, [joinLive, language]);

  useEffect(() => {
    const liveId = searchParams.get('liveId');
    if (!liveId) {
      setJoinFailed(true);
      return;
    }

    if (roomEngine.instance) {
      handleJoinLive(liveId);
    } else {
      TUIRoomEngine.once('ready', () => {
        handleJoinLive(liveId);
      });
    }
  }, [searchParams, handleJoinLive, roomEngine.instance]);

  return (<div className={styles.livePlayer}>
    <div className={styles.livePlayer__header}>
      <LiveHeader loginButtonVisible={false} />
    </div>
    <div className={styles.livePlayer__body}>
      <LivePlayerView joinFailed={joinFailed} />
    </div>
  </div>);
};

export default LivePlayer;