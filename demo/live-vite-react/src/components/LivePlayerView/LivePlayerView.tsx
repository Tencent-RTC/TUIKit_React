import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import TUIRoomEngine, { TUIRoomEvents } from '@tencentcloud/tuiroom-engine-js';
import { IconChevronLeft, useUIKit, MessageBox, Button } from '@tencentcloud/uikit-base-component-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, LiveView, LiveGift, LiveListEvent, BarrageList, BarrageInput, LiveAudienceList, useLiveListState, useLiveAudienceState, useRoomEngine } from 'tuikit-atomicx-react';
import LiveEndedIcon from '../../assets/live-ended.svg';
import styles from './LivePlayerView.module.scss';

interface LivePlayerViewProps {
  className?: string;
}

const LivePlayerView: React.FC<LivePlayerViewProps> = ({ className }) => {
  const { t } = useUIKit();
  const navigate = useNavigate();
  const roomEngine = useRoomEngine();
  const { currentLive, leaveLive, subscribeEvent, unsubscribeEvent } = useLiveListState();
  const { audienceCount } = useLiveAudienceState();
  const [liveEndedOverlayVisible, setLiveEndedOverlayVisible] = useState(false);

  const handleAutoPlayFailed = useCallback(() => {
    MessageBox.alert({
      content: t('live_player_view.auto_play_failed_content'),
      confirmText: t('live_player_view.auto_play_failed_confirm'),
      showClose: false,
      modal: true,
    });
  }, [t]);

  const handleKickedOutOfLive = useCallback(() => {
    MessageBox.alert({
      title: t('live_player_view.unable_to_watch'),
      content: t('live_player_view.kicked_out_content'),
      confirmText: t('live_player_view.back_to_home'),
      showClose: false,
      modal: true,
      callback: () => {
        navigate('/live-list');
      },
    });
  }, [navigate, t]);

  const handleLiveEnded = useCallback(() => {
    setLiveEndedOverlayVisible(true);
  }, []);

  const handleLeaveLive = useCallback(async () => {
    try {
      await leaveLive();
      navigate('/live-list');
    } catch (error) {
      console.error('Failed to leave live:', error);
      MessageBox.alert({
        content: t('live_player_view.leave_live_failed_content'),
        confirmText: t('live_player_view.confirm'),
        showClose: false,
        modal: true,
      });
    }
  }, [leaveLive, navigate, t]);

  // Setup event listeners
  useEffect(() => {
    if (roomEngine.instance) {
      roomEngine.instance.on(TUIRoomEvents.onAutoPlayFailed, handleAutoPlayFailed);
    } else {
      TUIRoomEngine.once('ready', () => {
        roomEngine.instance?.on(TUIRoomEvents.onAutoPlayFailed, handleAutoPlayFailed);
      });
    }

    subscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);
    subscribeEvent(LiveListEvent.ON_KICKED_OUT_OF_LIVE, handleKickedOutOfLive);

    return () => {
      roomEngine.instance?.off(TUIRoomEvents.onAutoPlayFailed, handleAutoPlayFailed);
      unsubscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);
      unsubscribeEvent(LiveListEvent.ON_KICKED_OUT_OF_LIVE, handleKickedOutOfLive);
    };
  }, [handleAutoPlayFailed, handleLiveEnded, handleKickedOutOfLive]);

  return (
    <div className={`${styles.livePlayerView} ${className || ''}`}>
      <div className={styles.livePlayerView__left}>
        <div className={styles.livePlayerView__header}>
          <div className={styles.livePlayerView__headerContent}>
            <IconChevronLeft
              className={styles.livePlayerView__headerChevronLeft}
              size="32"
              onClick={handleLeaveLive}
            />
            <Avatar
              className={styles.livePlayerView__headerAvatar}
              src={currentLive?.liveOwner?.avatarUrl}
              size={32}
            />
            <span>{currentLive?.liveOwner?.userName || currentLive?.liveOwner?.userId}</span>
          </div>
        </div>
        <div className={styles.livePlayerView__player}>
          <LiveView />
          {liveEndedOverlayVisible && (
            <div className={styles.livePlayerView__liveEndedOverlay}>
              <div className={styles.livePlayerView__liveEndedContent}>
                <div className={styles.livePlayerView__liveEndedIcon}>
                  <img src={LiveEndedIcon} alt="live ended" />
                </div>
                <div className={styles.livePlayerView__liveEndedText}>
                  {t('live_player_view.live_ended_content')}
                </div>
                <Button type="default" onClick={handleLeaveLive}>
                  {t('live_player_view.back_to_live_list')}
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className={`${styles.livePlayerView__giftContainer} ${liveEndedOverlayVisible ? styles.disabled : ''}`}>
          <LiveGift />
        </div>
      </div>
      <div className={styles.livePlayerView__right}>
        <div className={styles.livePlayerView__audienceList}>
          <div className={styles.livePlayerView__audienceListTitle}>
            <span>
              {t('live_player_view.audience_list_title')}
              {' '}
            </span>
            <span className={styles.livePlayerView__audienceCount}>
              (
              {audienceCount}
              )
            </span>
          </div>
          <div className={styles.livePlayerView__audienceListContent}>
            <LiveAudienceList height="100%" />
          </div>
        </div>
        <div className={styles.livePlayerView__messageList}>
          <div className={styles.livePlayerView__messageListTitle}>
            <span>{t('live_player_view.message_list_title')}</span>
          </div>
          <div className={styles.livePlayerView__messageListContent}>
            <BarrageList />
            <BarrageInput />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePlayerView;
