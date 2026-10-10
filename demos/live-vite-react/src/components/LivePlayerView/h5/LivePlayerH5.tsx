import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Button,
  Dialog,
  IconArrowStrokeBack,
  IconFullscreen,
  Toast,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import TUIRoomEngine from '@tencentcloud/tuiroom-engine-js';
import {
  Avatar,
  BarrageList,
  LiveKickedOutReason,
  LiveLikeEvents,
  LiveListEvent,
  LiveView,
  useLiveAudienceState,
  useLiveGiftState,
  useLiveLikeState,
  useLiveListState,
  useLivePlayerState,
  useLiveSeatState,
  useLoginState,
  useRoomEngine,
} from 'tuikit-atomicx-react';
import type { LikeInfo, LiveListEventInfo } from 'tuikit-atomicx-react';
import { initRoomEngineLanguage } from '@/utils';
import { BarrageInputH5 } from './components/BarrageInputH5/BarrageInputH5';
import { AudienceListH5 } from './components/AudienceListH5/AudienceListH5';
import { BottomSheet } from './components/BottomSheet/BottomSheet';
import { FullscreenOverlayH5 } from './components/FullscreenOverlayH5/FullscreenOverlayH5';
import { GiftButton, GiftPanelH5 } from './components/GiftPanelH5/GiftPanelH5';
import { IconLike } from './components/Icons';
import { LikeAnimation } from './components/LikeAnimation/LikeAnimation';
import type { LikeAnimationHandle } from './components/LikeAnimation/LikeAnimation';
import { SeatApplicationButton, SeatApplicationPanel } from './components/SeatApplication/SeatApplicationPanel';
import { useBarrageSeatAvoidance } from './hooks/useBarrageSeatAvoidance';
import { PortalTargetContext } from './hooks/usePortalTarget';
import type { PortalTarget } from './hooks/usePortalTarget';
import { useSeatApplication } from './hooks/useSeatApplication';
import { useSoftKeyboardOffset } from './hooks/useSoftKeyboardOffset';
import styles from './LivePlayerH5.module.scss';

const KICKED_OUT_MESSAGE_KEYS: Partial<Record<LiveKickedOutReason, string>> = {
  [LiveKickedOutReason.BY_ADMIN]: 'live_player_view_h5.kicked_out_by_admin',
  [LiveKickedOutReason.BY_SERVER]: 'live_player_view_h5.kicked_out_by_server',
  [LiveKickedOutReason.FOR_NETWORK_DISCONNECTED]: 'live_player_view_h5.kicked_out_network_disconnected',
  [LiveKickedOutReason.FOR_JOIN_ROOM_STATUS_INVALID_DURING_OFFLINE]: 'live_player_view_h5.kicked_out_join_status_invalid',
  [LiveKickedOutReason.FOR_COUNT_OF_JOINED_ROOMS_EXCEED_LIMIT]: 'live_player_view_h5.kicked_out_rooms_exceed_limit',
};
// Phones keep the 158px design width; tablets widen with the viewport.
const BARRAGE_INPUT_WIDTH = 'clamp(158px, 40vw, 360px)';
const EXIT_DIALOG_DANGER_ACTION_CLASS = `${styles['live-player-h5-exit-dialog-action']} ${styles['is-danger']}`;
const LIKE_ANIMATION_COUNT = 3;
const TOP_AUDIENCE_COUNT = 3;

interface LiveSession {
  liveId: string;
  joinPromise: Promise<void>;
  isJoined: boolean;
  leaveTimerId: number | null;
}

// React StrictMode mounts, unmounts and remounts in development. Leaving is
// deferred one tick so a remount for the same live reuses the in-flight join
// instead of leaving and re-entering the room.
let activeSession: LiveSession | null = null;

// `currentLive` is only set once joinLive resolves, so a join still in flight
// must be awaited; otherwise it completes after the viewer left and keeps them in the room.
async function leaveJoinedLive(session: LiveSession | null, isInLive: boolean, leaveLive: () => Promise<void>) {
  if (session && !session.isJoined) {
    const joined = await session.joinPromise.then(() => true, () => false);
    if (!joined) {
      return;
    }
  } else if (!isInLive) {
    return;
  }
  await leaveLive();
}

interface OwnerSnapshot {
  name: string;
  avatarUrl: string;
}

interface LivePlayerH5Props {
  liveId: string;
  onLeaveLive: () => void;
}

const LivePlayerH5: React.FC<LivePlayerH5Props> = ({ liveId, onLeaveLive }) => {
  const { t, language } = useUIKit();
  const roomEngine = useRoomEngine();
  const { currentLive, joinLive, leaveLive, subscribeEvent, unsubscribeEvent } = useLiveListState();
  const { audienceList, audienceCount, fetchAudienceList } = useLiveAudienceState();
  const { canvas } = useLiveSeatState();
  const { giftInfoList } = useLiveGiftState();
  const { sendLike, subscribeEvent: subscribeLikeEvent, unsubscribeEvent: unsubscribeLikeEvent } = useLiveLikeState();
  const { isFullscreen, requestFullscreen, exitFullscreen, hideControlBar } = useLivePlayerState();
  const { loginUserInfo } = useLoginState();
  const seatApplication = useSeatApplication();
  const { isUserOnSeat, isApplyingSeat, confirmLeaveSeat, confirmCancelApplication } = seatApplication;

  const [leaveDialogText, setLeaveDialogText] = useState('');
  const [exitOnSeatDialogVisible, setExitOnSeatDialogVisible] = useState(false);
  const [exitWhileApplyingDialogVisible, setExitWhileApplyingDialogVisible] = useState(false);
  const [audienceSheetVisible, setAudienceSheetVisible] = useState(false);
  const [giftSheetVisible, setGiftSheetVisible] = useState(false);
  const [fullscreenOverlayContainer, setFullscreenOverlayContainer] = useState<HTMLDivElement | null>(null);
  const [liveEndedVisible, setLiveEndedVisible] = useState(false);
  const [ownerSnapshot, setOwnerSnapshot] = useState<OwnerSnapshot>({ name: '', avatarUrl: '' });

  const bottomBarRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const likeAnimationRef = useRef<LikeAnimationHandle>(null);
  const pendingLikeCountRef = useRef(0);
  const isKickedOutRef = useRef(false);
  const hasExitedRef = useRef(false);
  const sessionRef = useRef<LiveSession | null>(null);
  const currentLiveIdRef = useRef<string | undefined>(currentLive?.liveId);
  currentLiveIdRef.current = currentLive?.liveId;
  const isUserOnSeatRef = useRef(isUserOnSeat);
  isUserOnSeatRef.current = isUserOnSeat;
  const engineReadyRef = useRef(!!roomEngine.instance);
  engineReadyRef.current = !!roomEngine.instance;
  const languageRef = useRef(language);
  languageRef.current = language;

  const { handleInputFocus, handleInputBlur } = useSoftKeyboardOffset(bottomBarRef);
  useBarrageSeatAvoidance(messagesRef);
  const isInLive = !!currentLive?.liveId;
  // Only a landscape stream gains anything from fullscreen. On-seat viewers are
  // excluded because LiveView drops its controls for them.
  const canEnterFullscreen = isInLive && !!canvas && canvas.width > canvas.height && !isUserOnSeat;
  const isFullscreenRef = useRef(isFullscreen);
  isFullscreenRef.current = isFullscreen;
  // While fullscreen, page popups move into the overlay: anything outside the fullscreen frame is hidden or unrotated.
  const fullscreenFrame = isFullscreen ? fullscreenOverlayContainer : null;
  const portalTarget = useMemo<PortalTarget>(
    () => ({ container: fullscreenFrame, isLandscapeFrame: !!fullscreenFrame }),
    [fullscreenFrame],
  );

  const showLeaveDialog = useCallback((text: string) => {
    setLeaveDialogText(previous => previous || text);
  }, []);

  useEffect(() => {
    const owner = currentLive?.liveOwner;
    if (owner?.userId) {
      setOwnerSnapshot({ name: owner.userName || owner.userId, avatarUrl: owner.avatarUrl || '' });
    }
  }, [currentLive?.liveOwner]);

  // Tint the document black: iOS Safari briefly shifts fixed elements while
  // the soft keyboard opens and would expose a white page edge.
  useEffect(() => {
    const htmlBackground = document.documentElement.style.backgroundColor;
    const bodyBackground = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = 'black';
    document.body.style.backgroundColor = 'black';
    return () => {
      document.documentElement.style.backgroundColor = htmlBackground;
      document.body.style.backgroundColor = bodyBackground;
    };
  }, []);

  // The fullscreen entry and FullscreenOverlayH5 replace the built-in control bar.
  useEffect(() => {
    hideControlBar();
    return () => {
      if (isFullscreenRef.current) {
        exitFullscreen().catch(() => {});
      }
    };
  }, [exitFullscreen, hideControlBar]);

  // Dialogs and the ended page live outside LiveView and cannot show in fullscreen.
  const needsPageUi = !!leaveDialogText || liveEndedVisible;
  useEffect(() => {
    if (isFullscreen && (needsPageUi || !canEnterFullscreen)) {
      exitFullscreen().catch(() => {});
    }
  }, [canEnterFullscreen, exitFullscreen, isFullscreen, needsPageUi]);

  useEffect(() => {
    if (!liveId.trim()) {
      showLeaveDialog(t('live_player_view_h5.live_id_empty'));
      return undefined;
    }

    let session: LiveSession;
    if (activeSession?.liveId === liveId && activeSession.leaveTimerId !== null) {
      window.clearTimeout(activeSession.leaveTimerId);
      activeSession.leaveTimerId = null;
      session = activeSession;
    } else {
      const waitForEngine = engineReadyRef.current
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          TUIRoomEngine.once('ready', () => resolve());
        });
      const newSession: LiveSession = {
        liveId,
        leaveTimerId: null,
        isJoined: false,
        joinPromise: Promise.resolve(),
      };
      newSession.joinPromise = waitForEngine
        .then(() => initRoomEngineLanguage(languageRef.current))
        .then(async () => {
          await joinLive({ liveId });
          newSession.isJoined = true;
        });
      session = newSession;
      activeSession = session;
    }
    sessionRef.current = session;
    let disposed = false;
    session.joinPromise.catch((error: unknown) => {
      console.error('[LivePlayerH5] Failed to join live:', error);
      if (!disposed) {
        showLeaveDialog(t('live_player_view_h5.join_live_failed'));
      }
    });

    return () => {
      disposed = true;
      if (hasExitedRef.current) {
        if (activeSession === session) {
          activeSession = null;
        }
        return;
      }
      session.leaveTimerId = window.setTimeout(async () => {
        if (activeSession === session) {
          activeSession = null;
        }
        // End co-guesting first so the host does not see a phantom guest.
        if (isUserOnSeatRef.current) {
          await confirmLeaveSeat();
        }
        leaveJoinedLive(session, !!currentLiveIdRef.current, leaveLive).catch((error: unknown) => {
          console.error('[LivePlayerH5] Failed to leave live on unmount:', error);
        });
      }, 0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  const isMessageMuted = useMemo(() => {
    const localAudience = audienceList.find(item => item.userId === loginUserInfo?.userId);
    return !!localAudience?.isMessageDisabled;
  }, [audienceList, loginUserInfo?.userId]);
  const prevMutedRef = useRef(false);
  useEffect(() => {
    if (isMessageMuted === prevMutedRef.current) {
      return;
    }
    prevMutedRef.current = isMessageMuted;
    Toast.info({
      message: t(isMessageMuted ? 'live_player_view_h5.you_have_been_muted' : 'live_player_view_h5.you_have_been_unmuted'),
    });
  }, [isMessageMuted, t]);

  useEffect(() => {
    const handleKickedOut = (eventInfo: LiveListEventInfo) => {
      const reason = eventInfo.reason as LiveKickedOutReason;
      // Covered by the account-level kicked-offline flow.
      if (reason === LiveKickedOutReason.BY_LOGGED_ON_OTHER_DEVICE) {
        return;
      }
      // Suppress the "live ended" overlay: the live goes on for everyone else.
      isKickedOutRef.current = true;
      showLeaveDialog(t(KICKED_OUT_MESSAGE_KEYS[reason] || 'live_player_view_h5.kicked_out_of_live'));
    };
    const handleLiveEnded = () => {
      if (!isKickedOutRef.current) {
        setAudienceSheetVisible(false);
        setLiveEndedVisible(true);
      }
    };
    subscribeEvent(LiveListEvent.ON_KICKED_OUT_OF_LIVE, handleKickedOut);
    subscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);
    return () => {
      unsubscribeEvent(LiveListEvent.ON_KICKED_OUT_OF_LIVE, handleKickedOut);
      unsubscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);
    };
  }, [showLeaveDialog, subscribeEvent, t, unsubscribeEvent]);

  useEffect(() => {
    const handleReceiveLikes = (likeInfo: LikeInfo) => {
      // The local animation already played when this user liked.
      if (likeInfo.sender?.userId === loginUserInfo?.userId) {
        return;
      }
      likeAnimationRef.current?.playLikeAnimation(LIKE_ANIMATION_COUNT);
    };
    subscribeLikeEvent(LiveLikeEvents.ON_RECEIVE_LIKES_MESSAGE, handleReceiveLikes);
    return () => {
      unsubscribeLikeEvent(LiveLikeEvents.ON_RECEIVE_LIKES_MESSAGE, handleReceiveLikes);
    };
  }, [loginUserInfo?.userId, subscribeLikeEvent, unsubscribeLikeEvent]);

  const handleSendLike = async () => {
    // Failed likes are carried over into the next attempt.
    const count = 1 + pendingLikeCountRef.current;
    try {
      await sendLike(count);
      pendingLikeCountRef.current = 0;
      likeAnimationRef.current?.playLikeAnimation(LIKE_ANIMATION_COUNT);
    } catch {
      pendingLikeCountRef.current += 1;
    }
  };

  const showAudienceSheet = async () => {
    try {
      await fetchAudienceList?.();
    } catch (error) {
      console.warn('[LivePlayerH5] Failed to fetch audience list:', error);
    }
    setAudienceSheetVisible(true);
  };

  // Leave the room before notifying the parent: navigating first unmounts the
  // player mid-leave and leaves RoomEngine half exited.
  const exitLive = async () => {
    if (hasExitedRef.current) {
      return;
    }
    hasExitedRef.current = true;
    setLeaveDialogText('');
    setExitOnSeatDialogVisible(false);
    setExitWhileApplyingDialogVisible(false);
    // Pin the muted flag so clearing the audience list does not toast "unmuted".
    prevMutedRef.current = isMessageMuted;
    if (isUserOnSeatRef.current) {
      await confirmLeaveSeat();
    }
    try {
      await leaveJoinedLive(sessionRef.current, !!currentLiveIdRef.current, leaveLive);
    } catch (error) {
      console.error('[LivePlayerH5] Failed to leave live:', error);
    }
    onLeaveLive();
  };

  const handleCloseClick = () => {
    if (isUserOnSeat) {
      setExitOnSeatDialogVisible(true);
      return;
    }
    if (isApplyingSeat) {
      setExitWhileApplyingDialogVisible(true);
      return;
    }
    exitLive();
  };

  const handleEndCoGuest = () => {
    setExitOnSeatDialogVisible(false);
    confirmLeaveSeat();
  };

  const handleExitWhileApplying = async () => {
    setExitWhileApplyingDialogVisible(false);
    await confirmCancelApplication();
    await exitLive();
  };

  const handleEnterFullscreen = async () => {
    const result = await requestFullscreen();
    if (!result.success) {
      console.warn('[LivePlayerH5] Failed to enter fullscreen:', result.error);
    }
  };

  const toolbarActions = (
    <div className={styles['live-player-h5-actions']}>
      {giftInfoList.length > 0 && <GiftButton onClick={() => setGiftSheetVisible(true)} />}
      <SeatApplicationButton seatApplication={seatApplication} />
      {giftInfoList.length > 0 && (
        <div
          className={styles['live-player-h5-like']}
          onClick={() => {
            handleSendLike();
          }}
        >
          <IconLike size={20} />
        </div>
      )}
    </div>
  );

  const pendingCard = isApplyingSeat && (
    <div className={styles['live-player-h5-pending-card']} onClick={seatApplication.openCancelApplicationSheet}>
      <Avatar src={loginUserInfo?.avatarUrl} size={40} />
      <span className={styles['live-player-h5-pending-text']}>
        {t('live_player_view_h5.pending_approval')}
        <span className={styles['live-player-h5-pending-dots']} />
      </span>
    </div>
  );

  return (
    <div className={styles['live-player-h5']}>
      <div className={styles['live-player-h5-top']}>
        <div className={styles['live-player-h5-top-left']}>
          <div className={styles['live-player-h5-back']} onClick={handleCloseClick}>
            <IconArrowStrokeBack size="20" />
          </div>
          <div className={styles['live-player-h5-owner']}>
            <Avatar src={currentLive?.liveOwner?.avatarUrl} size={24} className={styles['live-player-h5-owner-avatar']} />
            <span>{currentLive?.liveOwner?.userName || currentLive?.liveOwner?.userId}</span>
          </div>
        </div>
        <div className={styles['live-player-h5-top-right']}>
          <div
            className={styles['live-player-h5-audience']}
            onClick={() => {
              showAudienceSheet();
            }}
          >
            {audienceList.slice(0, TOP_AUDIENCE_COUNT).map(item => (
              <Avatar key={item.userId} src={item.avatarUrl} size={24} />
            ))}
            <div className={styles['live-player-h5-audience-count']}>{audienceCount}</div>
          </div>
        </div>
      </div>

      <div className={styles['live-player-h5-stream']} style={{ visibility: canvas ? 'visible' : 'hidden' }}>
        <LiveView
          onEmptySeatClick={(seatIndex) => {
            seatApplication.handleApplyForSeat(seatIndex);
          }}
          fullscreenOverlay={(
            <FullscreenOverlayH5
              toolbar={toolbarActions}
              onContainerChange={setFullscreenOverlayContainer}
              onExit={() => {
                exitFullscreen().catch(() => {});
              }}
            />
          )}
        />
      </div>

      {canEnterFullscreen && !isFullscreen && (
        <div
          className={styles['live-player-h5-fullscreen-entry']}
          onClick={() => {
            handleEnterFullscreen();
          }}
        >
          <IconFullscreen size="20" />
        </div>
      )}

      {fullscreenFrame && pendingCard ? createPortal(pendingCard, fullscreenFrame) : pendingCard}

      <div ref={messagesRef} className={styles['live-player-h5-messages']}>
        <BarrageList style={{ backgroundColor: 'transparent' }} />
      </div>

      <div ref={bottomBarRef} className={styles['live-player-h5-bottom']}>
        <BarrageInputH5
          width={BARRAGE_INPUT_WIDTH}
          disabled={!isInLive}
          placeholder={isInLive ? undefined : t('live_player_view_h5.live_not_started')}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        {toolbarActions}
        {fullscreenFrame
          ? createPortal(<LikeAnimation ref={likeAnimationRef} />, fullscreenFrame)
          : <LikeAnimation ref={likeAnimationRef} />}
      </div>

      {/* Popups reachable from the fullscreen toolbar follow the fullscreen frame. */}
      <PortalTargetContext.Provider value={portalTarget}>
        <GiftPanelH5 visible={giftSheetVisible} onClose={() => setGiftSheetVisible(false)} />
        <SeatApplicationPanel seatApplication={seatApplication} />
      </PortalTargetContext.Provider>

      {liveEndedVisible && (
        <div className={styles['live-player-h5-ended']}>
          <div className={styles['live-player-h5-ended-title']}>{t('live_player_view_h5.live_ended')}</div>
          <Avatar src={ownerSnapshot.avatarUrl} size={85} className={styles['live-player-h5-owner-avatar']} />
          <span className={styles['live-player-h5-ended-name']}>{ownerSnapshot.name}</span>
          <Button
            type="default"
            className={styles['live-player-h5-ended-back']}
            onClick={() => {
              exitLive();
            }}
          >
            {t('live_player_view_h5.back_to_live_list')}
          </Button>
        </div>
      )}

      <BottomSheet
        visible={audienceSheetVisible}
        title={`${t('live_player_view_h5.online_viewers')} (${audienceCount})`}
        height="90%"
        showBack
        onClose={() => setAudienceSheetVisible(false)}
      >
        <div className={styles['live-player-h5-audience-list']}>
          <AudienceListH5 />
        </div>
      </BottomSheet>

      <Dialog
        visible={!!leaveDialogText}
        width="80%"
        center
        showClose={false}
        showCancel={false}
        content={leaveDialogText}
        confirmText={t('live_player_view_h5.confirm')}
        onConfirm={() => {
          exitLive();
        }}
        onClose={() => {
          exitLive();
        }}
      />

      <Dialog
        visible={exitOnSeatDialogVisible}
        width="80%"
        center
        className={styles['live-player-h5-exit-dialog']}
        title={t('live_player_view_h5.exit_live')}
        content={t('live_player_view_h5.exit_live_on_seat_tip')}
        onClose={() => setExitOnSeatDialogVisible(false)}
        // Buttons must be direct footer children so the mobile Dialog stacks them as an action list.
        footer={(
          <>
            <Button type="text" className={EXIT_DIALOG_DANGER_ACTION_CLASS} onClick={handleEndCoGuest}>
              {t('live_player_view_h5.end_co_guest')}
            </Button>
            <Button
              type="text"
              className={EXIT_DIALOG_DANGER_ACTION_CLASS}
              onClick={() => {
                exitLive();
              }}
            >
              {t('live_player_view_h5.exit_live')}
            </Button>
            <Button
              type="text"
              className={styles['live-player-h5-exit-dialog-action']}
              onClick={() => setExitOnSeatDialogVisible(false)}
            >
              {t('live_player_view_h5.cancel')}
            </Button>
          </>
        )}
      />

      <Dialog
        visible={exitWhileApplyingDialogVisible}
        width="80%"
        center
        title={t('live_player_view_h5.exit_live')}
        content={t('live_player_view_h5.exit_live_while_applying_tip')}
        confirmText={t('live_player_view_h5.confirm')}
        cancelText={t('live_player_view_h5.cancel')}
        onConfirm={() => {
          handleExitWhileApplying();
        }}
        onCancel={() => setExitWhileApplyingDialogVisible(false)}
        onClose={() => setExitWhileApplyingDialogVisible(false)}
      />
    </div>
  );
};

export { LivePlayerH5 };
