import { useCallback, useEffect, useRef, useState } from 'react';
import { Toast, useUIKit } from '@tencentcloud/uikit-base-component-react';
import {
  GuestEvent,
  NoResponseReason,
  SeatApplicationErrorCode,
  useCoGuestState,
  useDeviceState,
  useLiveListState,
  useLoginState,
} from 'tuikit-atomicx-react';
import type { CoGuestEventInfoMap } from 'tuikit-atomicx-react';
import {
  ConnectionType,
  PermissionFlowDecision,
  decidePermissionFlow,
  getPermissionFailureMessageKey,
  isPermissionAuthFailure,
  probeMediaPermission,
} from '../utils/mediaPermission';
import type { PermissionProbeResult } from '../utils/mediaPermission';
import { checkWebRTCSupport, showWebRTCUnsupportedToast } from '../utils/webrtcSupport';
import { classifyDeviceOpenFailure } from '../utils/deviceOpenFailure';
import type { DeviceOpenFailureReason } from '../utils/deviceOpenFailure';

enum PermissionPrimerMode {
  Primer = 'primer',
  Blocked = 'blocked',
}

const SEAT_REQUEST_TIMEOUT_SECONDS = 60;
const ANY_SEAT_INDEX = -1;
// Landscape layout templates only support audio co-guests, except 1v1.
const LANDSCAPE_LAYOUT_TEMPLATE_MIN = 200;
const LANDSCAPE_LAYOUT_TEMPLATE_MAX = 599;
const LANDSCAPE_1V1_LAYOUT_TEMPLATE = 400;

const SEAT_APPLICATION_ERROR_MESSAGE_KEYS: Partial<Record<SeatApplicationErrorCode, string>> = {
  [SeatApplicationErrorCode.MAX_SEAT_COUNT_LIMIT]: 'live_player_view_h5.seat_error_count_limit',
  [SeatApplicationErrorCode.INSUFFICIENT_OPERATION_PERMISSIONS]: 'live_player_view_h5.seat_error_no_permission',
  [SeatApplicationErrorCode.SEAT_LOCKED]: 'live_player_view_h5.seat_error_locked',
  [SeatApplicationErrorCode.SEAT_OCCUPIED]: 'live_player_view_h5.seat_error_occupied',
  [SeatApplicationErrorCode.ALL_SEAT_OCCUPIED]: 'live_player_view_h5.seat_error_all_occupied',
  [SeatApplicationErrorCode.ALREADY_ON_THE_SEAT_QUEUE]: 'live_player_view_h5.request_already_sent',
  [SeatApplicationErrorCode.ALREADY_IN_SEAT]: 'live_player_view_h5.already_on_seat',
  [SeatApplicationErrorCode.USER_ALREADY_ON_SEAT]: 'live_player_view_h5.already_on_seat',
  [SeatApplicationErrorCode.SEAT_NOT_SUPPORT_LINK_MIC]: 'live_player_view_h5.seat_error_not_supported',
};

function isAudioOnlyLayout(layoutTemplate?: number): boolean {
  if (layoutTemplate === undefined || layoutTemplate === LANDSCAPE_1V1_LAYOUT_TEMPLATE) {
    return false;
  }
  return layoutTemplate >= LANDSCAPE_LAYOUT_TEMPLATE_MIN && layoutTemplate <= LANDSCAPE_LAYOUT_TEMPLATE_MAX;
}

function useSeatApplication() {
  const { t } = useUIKit();
  const {
    connected,
    applicants,
    applyForSeat,
    cancelApplication,
    disConnect,
    subscribeEvent,
    unsubscribeEvent,
  } = useCoGuestState();
  const {
    openLocalMicrophone,
    closeLocalMicrophone,
    openLocalCamera,
    closeLocalCamera,
  } = useDeviceState();
  const { loginUserInfo } = useLoginState();
  const { currentLive } = useLiveListState();

  const userId = loginUserInfo?.userId;
  const isApplyingSeat = !!userId && applicants.some(item => item.userId === userId);
  const isUserOnSeat = !!userId && connected.some(item => item.userId === userId);

  const [connectionTypeSheetVisible, setConnectionTypeSheetVisible] = useState(false);
  const [connectionTypeAudioOnly, setConnectionTypeAudioOnly] = useState(false);
  const [videoAdjustVisible, setVideoAdjustVisible] = useState(false);
  const [permissionPrimerVisible, setPermissionPrimerVisible] = useState(false);
  const [permissionPrimerMode, setPermissionPrimerMode] = useState(PermissionPrimerMode.Primer);
  const [requestConnectionType, setRequestConnectionType] = useState(ConnectionType.Audio);
  const [cancelApplicationSheetVisible, setCancelApplicationSheetVisible] = useState(false);
  const [seatControlSheetVisible, setSeatControlSheetVisible] = useState(false);
  const [deviceOpenFailureReason, setDeviceOpenFailureReason] = useState<DeviceOpenFailureReason | null>(null);

  // Event callbacks and post-await code read these refs to avoid stale closures.
  const tRef = useRef(t);
  tRef.current = t;
  const requestConnectionTypeRef = useRef(ConnectionType.Audio);
  const takeSeatIndexRef = useRef(ANY_SEAT_INDEX);
  const isLeavingSeatRef = useRef(false);

  const updateConnectionType = useCallback((type: ConnectionType) => {
    requestConnectionTypeRef.current = type;
    setRequestConnectionType(type);
  }, []);

  useEffect(() => {
    if (!isUserOnSeat) {
      isLeavingSeatRef.current = false;
      setSeatControlSheetVisible(false);
    }
  }, [isUserOnSeat]);

  useEffect(() => {
    if (!isApplyingSeat) {
      setCancelApplicationSheetVisible(false);
    }
  }, [isApplyingSeat]);

  const closeLocalDevices = useCallback(async () => {
    try {
      await closeLocalCamera();
    } catch (error) {
      console.warn('[useSeatApplication] Failed to close local camera:', error);
    }
    try {
      await closeLocalMicrophone();
    } catch (error) {
      console.warn('[useSeatApplication] Failed to close local microphone:', error);
    }
  }, [closeLocalCamera, closeLocalMicrophone]);

  const openConnectionTypeSheet = useCallback((audioOnly: boolean, defaultType: ConnectionType) => {
    setConnectionTypeAudioOnly(audioOnly);
    updateConnectionType(defaultType);
    setConnectionTypeSheetVisible(true);
  }, [updateConnectionType]);

  const handleApplyForSeat = useCallback(async (seatIndex: number = ANY_SEAT_INDEX) => {
    if (isApplyingSeat) {
      Toast.warning({ message: t('live_player_view_h5.request_already_sent') });
      return;
    }
    if (isUserOnSeat) {
      Toast.warning({ message: t('live_player_view_h5.already_on_seat') });
      return;
    }
    // Only the audio floor is enforced here; video encoding is checked after
    // the viewer actually picks video co-guesting.
    const capability = await checkWebRTCSupport();
    if (!capability.canPushAudio) {
      showWebRTCUnsupportedToast(t);
      return;
    }
    takeSeatIndexRef.current = seatIndex;
    if (isAudioOnlyLayout(currentLive?.layoutTemplate)) {
      openConnectionTypeSheet(true, ConnectionType.Audio);
    } else {
      openConnectionTypeSheet(false, ConnectionType.Video);
    }
  }, [currentLive?.layoutTemplate, isApplyingSeat, isUserOnSeat, openConnectionTypeSheet, t]);

  const applyAfterPermissionProbe = useCallback(async (
    probePromise: Promise<PermissionProbeResult> | null,
    cameFromPrimer: boolean,
  ) => {
    try {
      const probe = probePromise ? await probePromise : { ok: true };
      if (!probe.ok) {
        if (isPermissionAuthFailure(probe.reason)) {
          // Swap the open primer into recovery mode instead of closing and
          // reopening it, which would flicker.
          setPermissionPrimerMode(PermissionPrimerMode.Blocked);
          setPermissionPrimerVisible(true);
          return;
        }
        if (probe.reason) {
          Toast.warning({
            message: tRef.current(getPermissionFailureMessageKey(probe.reason, requestConnectionTypeRef.current)),
            duration: 4000,
          });
        }
        if (cameFromPrimer) {
          setPermissionPrimerVisible(false);
        }
        return;
      }
      if (cameFromPrimer) {
        setPermissionPrimerVisible(false);
      }
      try {
        await applyForSeat({ seatIndex: takeSeatIndexRef.current, timeout: SEAT_REQUEST_TIMEOUT_SECONDS });
      } catch (error) {
        console.error('[useSeatApplication] Failed to apply for seat:', error);
        Toast.error({ message: tRef.current('live_player_view_h5.apply_for_seat_failed') });
      }
    } catch (error) {
      console.error('[useSeatApplication] Unexpected error during seat application:', error);
      if (cameFromPrimer) {
        setPermissionPrimerVisible(false);
      }
    }
  }, [applyForSeat]);

  const confirmConnectionType = useCallback(async (type: ConnectionType) => {
    updateConnectionType(type);
    if (isApplyingSeat) {
      setConnectionTypeSheetVisible(false);
      await cancelApplication();
      return;
    }
    if (type === ConnectionType.Video) {
      const capability = await checkWebRTCSupport();
      if (!capability.canPushVideo) {
        showWebRTCUnsupportedToast(tRef.current);
        setConnectionTypeSheetVisible(false);
        updateConnectionType(ConnectionType.Audio);
        return;
      }
    }
    setConnectionTypeSheetVisible(false);

    const decision = await decidePermissionFlow(type);
    if (decision === PermissionFlowDecision.ShowPrimer || decision === PermissionFlowDecision.ShowBlocked) {
      setPermissionPrimerMode(decision === PermissionFlowDecision.ShowPrimer
        ? PermissionPrimerMode.Primer
        : PermissionPrimerMode.Blocked);
      setPermissionPrimerVisible(true);
      return;
    }
    // Already granted: skip the probe so the device indicator does not flash.
    await applyAfterPermissionProbe(null, false);
  }, [applyAfterPermissionProbe, cancelApplication, isApplyingSeat, updateConnectionType]);

  const closeConnectionTypeSheet = useCallback(() => {
    setConnectionTypeSheetVisible(false);
    updateConnectionType(ConnectionType.Audio);
  }, [updateConnectionType]);

  const openVideoAdjust = useCallback(() => {
    setConnectionTypeSheetVisible(false);
    setVideoAdjustVisible(true);
  }, []);

  const closeVideoAdjust = useCallback(() => {
    setVideoAdjustVisible(false);
  }, []);

  const handleVideoAdjustApply = useCallback(() => {
    setVideoAdjustVisible(false);
    confirmConnectionType(ConnectionType.Video);
  }, [confirmConnectionType]);

  // Must stay synchronous: getUserMedia has to start inside the tap gesture.
  const handlePermissionPrimerConfirm = useCallback(() => {
    const probePromise = probeMediaPermission(requestConnectionTypeRef.current);
    applyAfterPermissionProbe(probePromise, true);
  }, [applyAfterPermissionProbe]);

  const handlePermissionPrimerCancel = useCallback(() => {
    setPermissionPrimerVisible(false);
    updateConnectionType(ConnectionType.Audio);
  }, [updateConnectionType]);

  const openCancelApplicationSheet = useCallback(() => {
    if (isUserOnSeat) {
      Toast.warning({ message: t('live_player_view_h5.already_on_seat') });
      return;
    }
    if (!isApplyingSeat) {
      Toast.warning({ message: t('live_player_view_h5.not_applied_for_seat') });
      return;
    }
    setCancelApplicationSheetVisible(true);
  }, [isApplyingSeat, isUserOnSeat, t]);

  const closeCancelApplicationSheet = useCallback(() => {
    setCancelApplicationSheetVisible(false);
  }, []);

  const confirmCancelApplication = useCallback(async () => {
    try {
      await cancelApplication();
    } catch (error) {
      console.error('[useSeatApplication] Failed to cancel seat application:', error);
      Toast.error({ message: tRef.current('live_player_view_h5.cancel_application_failed') });
    } finally {
      setCancelApplicationSheetVisible(false);
    }
  }, [cancelApplication]);

  const openSeatControlSheet = useCallback(() => {
    if (isLeavingSeatRef.current) {
      return;
    }
    if (!isUserOnSeat) {
      Toast.warning({ message: t('live_player_view_h5.not_on_seat') });
      return;
    }
    setSeatControlSheetVisible(true);
  }, [isUserOnSeat, t]);

  const closeSeatControlSheet = useCallback(() => {
    setSeatControlSheetVisible(false);
  }, []);

  // `disConnect` only updates the seat; local capture must be closed explicitly.
  const confirmLeaveSeat = useCallback(async () => {
    if (isLeavingSeatRef.current) {
      return;
    }
    isLeavingSeatRef.current = true;
    try {
      await disConnect();
      await closeLocalDevices();
    } catch (error) {
      isLeavingSeatRef.current = false;
      console.error('[useSeatApplication] Failed to leave seat:', error);
      Toast.error({ message: tRef.current('live_player_view_h5.leave_seat_failed') });
    } finally {
      setSeatControlSheetVisible(false);
    }
  }, [closeLocalDevices, disConnect]);

  const closeDeviceOpenFailure = useCallback(() => {
    setDeviceOpenFailureReason(null);
  }, []);

  useEffect(() => {
    const handleApplicationResponded = async (
      eventInfo: CoGuestEventInfoMap[GuestEvent.onGuestApplicationResponded],
    ) => {
      if (!eventInfo.isAccept) {
        Toast.warning({ message: tRef.current('live_player_view_h5.application_rejected') });
        return;
      }
      // The viewer may revoke permission between the probe and the host's
      // acceptance; leave the seat rather than occupying it silently.
      try {
        await openLocalMicrophone();
        if (requestConnectionTypeRef.current === ConnectionType.Video) {
          await openLocalCamera();
        }
        Toast.success({ message: tRef.current('live_player_view_h5.co_guest_success') });
      } catch (error) {
        console.error('[useSeatApplication] Failed to open local device after host accepted:', error);
        setDeviceOpenFailureReason(classifyDeviceOpenFailure(error));
        try {
          await disConnect();
        } catch (disconnectError) {
          console.warn('[useSeatApplication] Failed to disconnect after device open failure:', disconnectError);
        }
        await closeLocalDevices();
      } finally {
        requestConnectionTypeRef.current = ConnectionType.Audio;
        setRequestConnectionType(ConnectionType.Audio);
      }
    };

    const handleApplicationNoResponse = (
      eventInfo: CoGuestEventInfoMap[GuestEvent.onGuestApplicationNoResponse],
    ) => {
      let messageKey = 'live_player_view_h5.application_no_response';
      if (eventInfo.reason === NoResponseReason.timeout) {
        messageKey = 'live_player_view_h5.application_timeout';
      } else if (eventInfo.reason === NoResponseReason.alreadySeated) {
        messageKey = 'live_player_view_h5.already_on_seat';
      }
      Toast.warning({ message: tRef.current(messageKey) });
    };

    const handleKickedOffSeat = () => {
      Toast.warning({ message: tRef.current('live_player_view_h5.kicked_off_seat') });
      closeLocalDevices();
    };

    const handleApplicationError = (eventInfo: CoGuestEventInfoMap[GuestEvent.onGuestApplicationError]) => {
      const messageKey = SEAT_APPLICATION_ERROR_MESSAGE_KEYS[eventInfo.code]
        || 'live_player_view_h5.apply_for_seat_failed';
      Toast.error({ message: tRef.current(messageKey) });
    };

    subscribeEvent(GuestEvent.onGuestApplicationResponded, handleApplicationResponded);
    subscribeEvent(GuestEvent.onGuestApplicationNoResponse, handleApplicationNoResponse);
    subscribeEvent(GuestEvent.onKickedOffSeat, handleKickedOffSeat);
    subscribeEvent(GuestEvent.onGuestApplicationError, handleApplicationError);
    return () => {
      unsubscribeEvent(GuestEvent.onGuestApplicationResponded, handleApplicationResponded);
      unsubscribeEvent(GuestEvent.onGuestApplicationNoResponse, handleApplicationNoResponse);
      unsubscribeEvent(GuestEvent.onKickedOffSeat, handleKickedOffSeat);
      unsubscribeEvent(GuestEvent.onGuestApplicationError, handleApplicationError);
    };
  }, [closeLocalDevices, disConnect, openLocalCamera, openLocalMicrophone, subscribeEvent, unsubscribeEvent]);

  return {
    isApplyingSeat,
    isUserOnSeat,
    requestConnectionType,
    connectionTypeSheetVisible,
    connectionTypeAudioOnly,
    videoAdjustVisible,
    permissionPrimerVisible,
    permissionPrimerMode,
    cancelApplicationSheetVisible,
    seatControlSheetVisible,
    deviceOpenFailureReason,
    handleApplyForSeat,
    confirmConnectionType,
    closeConnectionTypeSheet,
    openVideoAdjust,
    closeVideoAdjust,
    handleVideoAdjustApply,
    handlePermissionPrimerConfirm,
    handlePermissionPrimerCancel,
    openCancelApplicationSheet,
    closeCancelApplicationSheet,
    confirmCancelApplication,
    openSeatControlSheet,
    closeSeatControlSheet,
    confirmLeaveSeat,
    closeDeviceOpenFailure,
  };
}

type SeatApplication = ReturnType<typeof useSeatApplication>;

export { useSeatApplication, PermissionPrimerMode };
export type { SeatApplication };
