import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TUIRoomEngine from '@tencentcloud/tuiroom-engine-js';
import { Dialog, IconChevronLeft, IconUser, useUIKit, Button, Toast } from '@tencentcloud/uikit-base-component-react';
import { Avatar, LiveView, LiveGift, LiveListEvent, LiveSeatEvent, BarrageList, BarrageInput, LiveAudienceList, useCoGuestState, useDeviceState, useLiveListState, useLiveAudienceState, useLiveSeatState, useLoginState, useRoomEngine } from 'tuikit-atomicx-react';
import LiveEndedIcon from '@/assets/live-ended.svg';
import { initRoomEngineLanguage } from '@/utils';
import { SeatApplicationButton } from '../../SeatApplication';
import type { LivePlayerViewProps } from '../types';
import styles from './LivePlayerViewPC.module.scss';

interface LivePlayerViewPCProps extends LivePlayerViewProps {
  className?: string;
}

const LivePlayerViewPC: React.FC<LivePlayerViewPCProps> = ({ className, liveId, onLeaveLive }) => {
  const { t, language } = useUIKit();
  const { currentLive, joinLive, leaveLive, subscribeEvent, unsubscribeEvent } = useLiveListState();
  const { audienceList, audienceCount } = useLiveAudienceState();
  const { loginUserInfo } = useLoginState();
  const roomEngine = useRoomEngine();
  const isJoiningRef = useRef(false);
  const [joinFailed, setJoinFailed] = useState(false);
  const [liveEndedOverlayVisible, setLiveEndedOverlayVisible] = useState(false);

  const handleJoinLive = useCallback(async (targetLiveId: string) => {
    if (isJoiningRef.current) {
      return;
    }
    isJoiningRef.current = true;
    try {
      await initRoomEngineLanguage(language);
      await joinLive({ liveId: targetLiveId });
    } catch (error) {
      // Room doesn't exist or join failed — show the ended overlay so the
      // user sees the same UI as when the host dismisses the room mid-stream.
      console.error('[LivePlayerViewPC] Failed to join live room:', error);
      isJoiningRef.current = false;
      setJoinFailed(true);
    }
  }, [joinLive, language]);

  useEffect(() => {
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
  }, [liveId, handleJoinLive, roomEngine.instance]);


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

  // Also show the ended overlay if joinLive failed
  // (room no longer exists on page refresh).
  useEffect(() => {
    if (joinFailed) {
      setLiveEndedOverlayVisible(true);
    }
  }, [joinFailed]);

  // ── Exit-while-co-guesting confirmation (aligned with the Vue3 demo's
  // `exitLiveDialog`): when the audience member is on a seat, leaving the
  // live room requires an explicit choice between ending the co-guest
  // connection first or exiting the room outright.
  const { connected: coGuestConnected } = useCoGuestState();
  const { leaveSeat } = useLiveSeatState();
  const { closeLocalCamera, closeLocalMicrophone } = useDeviceState();
  const isUserOnSeat = useMemo(
    () => coGuestConnected.some(user => user.userId === loginUserInfo?.userId),
    [coGuestConnected, loginUserInfo?.userId],
  );
  const [exitLiveDialogVisible, setExitLiveDialogVisible] = useState(false);

  const performLeaveLive = useCallback(async () => {
    // Wait for `leaveLive()` to finish BEFORE navigating away.
    //
    // Why: navigating away in `onLeaveLive` synchronously unmounts this view
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
      onLeaveLive();
    }
  }, [isMessageMuted, leaveLive, onLeaveLive]);

  const handleLeaveLive = useCallback(() => {
    if (isUserOnSeat) {
      setExitLiveDialogVisible(true);
      return;
    }
    void performLeaveLive();
  }, [isUserOnSeat, performLeaveLive]);

  // "End Co-guest": leave the seat and release local capture devices, then
  // stay in the room as a normal audience member (aligned with Vue3's
  // `handleEndCoGuest` -> `confirmLeaveSeat`).
  const handleEndCoGuest = useCallback(async () => {
    setExitLiveDialogVisible(false);
    try {
      await leaveSeat();
      try {
        await closeLocalCamera();
      } catch (error) {
        console.warn('Failed to close local camera after end co-guest:', error);
      }
      try {
        await closeLocalMicrophone();
      } catch (error) {
        console.warn('Failed to close local microphone after end co-guest:', error);
      }
    } catch (error) {
      console.error('Failed to leave seat:', error);
      Toast.error({ message: t('live_player_view.failed_to_leave_seat') });
    }
  }, [leaveSeat, closeLocalCamera, closeLocalMicrophone, t]);

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
          {/* Audience-side seat application entry (co-guesting), placed to the
              right of the gift bar's "More" entry (mirrors the Vue3 player
              bottom tools row). Hidden while the live has ended. */}
          {!liveEndedOverlayVisible && (
            <div className={styles.livePlayerView__seatApplication}>
              <SeatApplicationButton />
            </div>
          )}
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

      {/* Exit-while-co-guesting confirmation (aligned with the Vue3 demo's
          `exitLiveDialog`): body holds the tip copy; the three actions go
          into the dialog footer (Vue3's `#footer` slot with
          `.action-buttons { display:flex; gap:10px }`). Button colors match
          Vue3: gray cancel, red "End Co-guest", primary red "Exit Live". */}
      <Dialog
        visible={exitLiveDialogVisible}
        title={t('live_player_view.exit_live_dialog_title')}
        onClose={() => setExitLiveDialogVisible(false)}
        showConfirm={false}
        showCancel={false}
        width={420}
        footer={(
          <div className={styles.livePlayerView__exitActions}>
            <Button color="gray" onClick={() => setExitLiveDialogVisible(false)}>
              {t('live_player_view.cancel')}
            </Button>
            <Button color="red" onClick={() => void handleEndCoGuest()}>
              {t('live_player_view.end_co_guest')}
            </Button>
            <Button type="primary" color="red" onClick={() => void performLeaveLive()}>
              {t('live_player_view.exit_live')}
            </Button>
          </div>
        )}
      >
        <p className={styles.livePlayerView__exitTip}>{t('live_player_view.exit_live_co_guest_tip')}</p>
      </Dialog>
    </div>
  );
};

export { LivePlayerViewPC };