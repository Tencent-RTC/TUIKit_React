import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronLeft, IconUser, useUIKit, Button, Toast } from '@tencentcloud/uikit-base-component-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, LiveView, LiveGift, LiveListEvent, LiveSeatEvent, BarrageList, BarrageInput, LiveAudienceList, useLiveListState, useLiveAudienceState, useLiveSeatState, useLoginState } from 'tuikit-atomicx-react';
import LiveEndedIcon from '../../assets/live-ended.svg';
import styles from './LivePlayerView.module.scss';

interface LivePlayerViewProps {
  className?: string;
  /** When true, displays the "live ended" overlay immediately (e.g. when
   *  joinLive fails because the room no longer exists). */
  joinFailed?: boolean;
}

const LivePlayerView: React.FC<LivePlayerViewProps> = ({ className, joinFailed }) => {
  const { t } = useUIKit();
  const navigate = useNavigate();
  const { currentLive, leaveLive, subscribeEvent, unsubscribeEvent } = useLiveListState();
  const { audienceList, audienceCount } = useLiveAudienceState();
  const { loginUserInfo } = useLoginState();
  const [liveEndedOverlayVisible, setLiveEndedOverlayVisible] = useState(false);


  // Audience-side default playback quality is driven entirely by
  // `tuikit-atomicx-react`'s LivePlayerState — `initializeResolution`
  // queries the CDN-available variant list and picks the SDK-preferred
  // entry (highest available, matching Vue). We deliberately do NOT
  // override that here: a previous attempt to "align with the publisher
  // default" by force-switching to 720P was wrong, because the publisher's
  // actual encoding resolution is dynamic (host can pick 1080P / 720P /
  // 540P / 360P at pusher start) and there is no client-side signal for
  // the source resolution. Re-querying on every (re)appearance of a
  // liveId — including the case where the host refreshes and re-creates
  // the live with the same id — is handled inside LivePlayerState's
  // `liveListState.subscribe` listener so that audience-side defaults
  // stay consistent with the publisher across host re-publishes.


  // Mute detection: show toast when the current user is muted/unmuted by the host
  // Aligned with Vue's `watch(isMessageMuted)` behavior — only fires on value
  // transitions while the component is mounted.
  const isMessageMuted = useMemo(() => {
    const localUser = audienceList?.find(item => item.userId === loginUserInfo?.userId);
    return !!localUser?.isMessageDisabled;
  }, [audienceList, loginUserInfo?.userId]);

  const prevMutedRef = useRef(false);
  useEffect(() => {
    if (isMessageMuted === prevMutedRef.current) {
      return;
    }
    if (isMessageMuted) {
      Toast.info({ message: t('live_player_view.you_have_been_muted') });
    } else {
      Toast.info({ message: t('live_player_view.you_have_been_unmuted') });
    }
    prevMutedRef.current = isMessageMuted;
  }, [isMessageMuted, t]);

  // Mic/camera host-control detection: surface a toast whenever the host
  // disables or restores the current user's microphone/camera permission
  // while on-seat. Backed by LiveSeatState's dedicated events, which
  // already filter by the local user and the admin-initiated cause —
  // no SDK-level listener or reason check needed here.
  //
  // Note: restoring permission does NOT auto-open the device — the user
  // must turn it on manually, which is reflected in the toast wording.
  const { subscribeEvent: subscribeSeatEvent, unsubscribeEvent: unsubscribeSeatEvent } = useLiveSeatState();
  useEffect(() => {
    const handleLocalMicrophoneClosedByAdmin = () => {
      Toast.info({ message: t('live_player_view.your_microphone_permission_disabled_by_host') });
    };
    const handleLocalCameraClosedByAdmin = () => {
      Toast.info({ message: t('live_player_view.your_camera_permission_disabled_by_host') });
    };
    const handleLocalMicrophoneOpenedByAdmin = () => {
      Toast.info({ message: t('live_player_view.your_microphone_permission_restored_by_host') });
    };
    const handleLocalCameraOpenedByAdmin = () => {
      Toast.info({ message: t('live_player_view.your_camera_permission_restored_by_host') });
    };

    subscribeSeatEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_CLOSED_BY_ADMIN, handleLocalMicrophoneClosedByAdmin);
    subscribeSeatEvent(LiveSeatEvent.ON_LOCAL_CAMERA_CLOSED_BY_ADMIN, handleLocalCameraClosedByAdmin);
    subscribeSeatEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_OPENED_BY_ADMIN, handleLocalMicrophoneOpenedByAdmin);
    subscribeSeatEvent(LiveSeatEvent.ON_LOCAL_CAMERA_OPENED_BY_ADMIN, handleLocalCameraOpenedByAdmin);

    return () => {
      unsubscribeSeatEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_CLOSED_BY_ADMIN, handleLocalMicrophoneClosedByAdmin);
      unsubscribeSeatEvent(LiveSeatEvent.ON_LOCAL_CAMERA_CLOSED_BY_ADMIN, handleLocalCameraClosedByAdmin);
      unsubscribeSeatEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_OPENED_BY_ADMIN, handleLocalMicrophoneOpenedByAdmin);
      unsubscribeSeatEvent(LiveSeatEvent.ON_LOCAL_CAMERA_OPENED_BY_ADMIN, handleLocalCameraOpenedByAdmin);
    };
  }, [subscribeSeatEvent, unsubscribeSeatEvent, t]);

  // Kicked-out-of-live dialogs are now handled globally by
  // useGlobalEventDialogs() in ProtectedRoute.

  const handleLiveEnded = useCallback(() => {
    setLiveEndedOverlayVisible(true);
  }, []);

  // Also show the ended overlay if the parent indicates joinLive failed
  // (room no longer exists on page refresh).
  useEffect(() => {
    if (joinFailed) {
      setLiveEndedOverlayVisible(true);
    }
  }, [joinFailed]);

  const handleLeaveLive = useCallback(async () => {
    // Wait for `leaveLive()` to finish BEFORE navigating away.
    //
    // Why: `navigate('/live-list')` synchronously unmounts this view
    // (including the inner <LiveView />). If we navigate first, React
    // tears down the player while RoomEngine's leave state machine is
    // still in flight - listeners that the leave flow depends on get
    // detached, and the engine ends up in a "half-exited" state
    // (`room_manager.joined_room` stays `1`). The next time the user
    // enters the same room, `EnterRoom` hits the
    // "repeat enter room, ignore it" branch in the wasm engine: the
    // join promise resolves successfully but the subscription pipeline
    // is never re-established, so the audience just sees an endless
    // loading spinner.
    //
    // Suppress the misleading "unmuted" toast that would otherwise fire
    // when `audienceList` clears during the leave: pin the previous
    // muted flag so the diff effect short-circuits.
    prevMutedRef.current = isMessageMuted;
    try {
      await leaveLive();
    } catch (error) {
      console.error('Failed to leave live:', error);
    } finally {
      navigate('/live-list');
    }
  }, [isMessageMuted, leaveLive, navigate]);

  // Setup event listeners.
  // Note: autoplay-failed handling is now built into <LiveView> — no need to
  // subscribe to TUIRoomEvents.onAutoPlayFailed here.
  // Note: ON_KICKED_OUT_OF_LIVE is handled by useGlobalEventDialogs() globally.
  useEffect(() => {
    subscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);

    return () => {
      unsubscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);
    };
  }, [handleLiveEnded]);

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
            {liveEndedOverlayVisible ? (
              <>
                <div className={styles.livePlayerView__headerEndedAvatar}>
                  <IconUser size="24" />
                </div>
                <span>{t('live_player_view.live_ended_content')}</span>
              </>
            ) : (
              <>
                <Avatar
                  className={styles.livePlayerView__headerAvatar}
                  src={currentLive?.liveOwner?.avatarUrl}
                  size={32}
                />
                <span className={styles.livePlayerView__headerName}>
                  {currentLive?.liveOwner?.userName || currentLive?.liveOwner?.userId}
                </span>
              </>
            )}
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
            <BarrageInput
              disabled={liveEndedOverlayVisible}
              placeholder={liveEndedOverlayVisible ? t('live_player_view.live_ended') : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePlayerView;