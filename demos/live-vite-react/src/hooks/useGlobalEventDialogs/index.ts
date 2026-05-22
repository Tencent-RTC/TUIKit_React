import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageBox, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useLoginState, useLiveListState, LiveListEvent, LiveKickedOutReason } from 'tuikit-atomicx-react';
import type { LiveListEventInfo } from 'tuikit-atomicx-react';
import { STORAGE_KEYS } from '@/constants';

const KICKED_OUT_CONTENT_MAP: Partial<Record<LiveKickedOutReason, string>> = {
  [LiveKickedOutReason.BY_ADMIN]: 'global_event.kicked_out_by_admin',
  [LiveKickedOutReason.BY_SERVER]: 'global_event.kicked_out_by_server',
  [LiveKickedOutReason.FOR_NETWORK_DISCONNECTED]: 'global_event.kicked_out_network_disconnected',
  [LiveKickedOutReason.FOR_JOIN_ROOM_STATUS_INVALID_DURING_OFFLINE]: 'global_event.kicked_out_join_status_invalid',
  [LiveKickedOutReason.FOR_COUNT_OF_JOINED_ROOMS_EXCEED_LIMIT]: 'global_event.kicked_out_rooms_exceed_limit',
};

/**
 * Centralized hook for all SDK event-driven dialogs in the demo.
 *
 * Subscribes to login-state changes and live-list events, shows MessageBox
 * alerts when needed, and handles credential cleanup + navigation.
 *
 * Must be called once in a component that:
 *   1. Is mounted after login (has access to router context)
 *   2. Persists across page navigations (e.g. ProtectedRoute)
 *
 * Covers:
 *   - Account kicked offline (loginStatus: success → idle/error)
 *   - Kicked out of live room (ON_KICKED_OUT_OF_LIVE, all reasons except
 *     BY_LOGGED_ON_OTHER_DEVICE which is covered by the loginStatus path)
 *
 * Does NOT cover (intentionally left in components):
 *   - ON_LIVE_ENDED → LivePlayerView Overlay (visual, page-specific)
 *   - leaveLive() failure → LivePlayerView MessageBox (user action feedback)
 *   - "Watching own live" → LiveList MessageBox (user action feedback)
 */
export function useGlobalEventDialogs(): void {
  const { t } = useUIKit();
  const navigate = useNavigate();
  const { status: loginStatus } = useLoginState();
  const { subscribeEvent, unsubscribeEvent } = useLiveListState();

  // ── 1. Account kicked offline / login expired ──────────────────────
  // When the SDK kicks the user offline (or sig expires), loginStatus
  // transitions from 'success' → 'idle' (or 'error'). Show a dialog so
  // the user knows what happened regardless of which page they are on.
  // Credentials are cleared in the dialog callback (NOT synchronously)
  // so ProtectedRoute won't redirect before the user sees the prompt.
  // Note: LiveHeader separately watches loginStatus to set its own
  // hasAttemptedLoginRef flag, which prevents auto-login from firing
  // before this dialog callback runs.
  const wasLoggedInRef = useRef(false);
  const hasShownKickDialogRef = useRef(false);

  useEffect(() => {
    if (loginStatus === 'success') {
      wasLoggedInRef.current = true;
      hasShownKickDialogRef.current = false;
    } else if (
      wasLoggedInRef.current
      && !hasShownKickDialogRef.current
      && (loginStatus === 'idle' || loginStatus === 'error')
    ) {
      wasLoggedInRef.current = false;
      hasShownKickDialogRef.current = true;

      MessageBox.alert({
        title: t('global_event.kicked_offline_title'),
        content: t('global_event.kicked_offline_content'),
        confirmText: t('global_event.back_to_login'),
        showClose: false,
        modal: true,
        callback: () => {
          sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
          navigate('/login');
        },
      });
    }
  }, [loginStatus, navigate, t]);

  // ── 2. Kicked out of live room ─────────────────────────────────────
  // Covers all ON_KICKED_OUT_OF_LIVE reasons except BY_LOGGED_ON_OTHER_DEVICE
  // (which is already handled by the loginStatus transition above, and is
  // more timely + works on all pages, not just the player page).
  useEffect(() => {
    const handleKickedOut = (eventInfo: LiveListEventInfo) => {
      const { reason } = eventInfo;

      if (reason === LiveKickedOutReason.BY_LOGGED_ON_OTHER_DEVICE) {
        return;
      }

      const contentKey = KICKED_OUT_CONTENT_MAP[reason as LiveKickedOutReason]
        || 'global_event.kicked_out_content';

      MessageBox.alert({
        title: t('global_event.unable_to_watch'),
        content: t(contentKey),
        confirmText: t('global_event.back_to_home'),
        showClose: false,
        modal: true,
        callback: () => {
          navigate('/live-list');
        },
      });
    };

    subscribeEvent(LiveListEvent.ON_KICKED_OUT_OF_LIVE, handleKickedOut);
    return () => {
      unsubscribeEvent(LiveListEvent.ON_KICKED_OUT_OF_LIVE, handleKickedOut);
    };
  }, [subscribeEvent, unsubscribeEvent, navigate, t]);
}
