// Seat application orchestration (audience side), React port of the Vue3
// demo's `SeatApplication/useSeatApplication.ts` (module-level singleton).
//
// Deliberate divergence from the Vue3 source (documented in
// docs/co-guest-technical-design.md §2.2): this demo has a single mount
// point (the player bottom bar), so the dialog orchestration state lives in
// ONE hook instance instead of the Vue3 module-level shared refs.
//
// Scope: PC only. The Vue3 H5 branch (Permission-First primer drawer +
// synchronous getUserMedia inside the user-gesture window) is NOT ported —
// this demo has no H5 view. The apply flow therefore always goes through
// the PC path: connection-type dialog -> device-selection dialog -> apply.
//
// Engine/SDK facts preserved 1:1 from the Vue3 implementation:
//   - applyForSeat({ seatIndex: -1, timeout: 60 })
//   - on accept: openLocalMicrophone (+ openLocalCamera for video); on open
//     failure: disConnect + close devices + guidance dialog (never leave a
//     muted occupied seat)
//   - leaveSeat / kicked-off-seat do NOT tear down local capture: devices
//     must be closed explicitly
//   - landscape (template 200-599, non-1v1) allows audio-only co-guesting

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toast, useUIKit } from '@tencentcloud/uikit-base-component-react';
import {
  CoGuestEventInfoMap,
  GuestEvent,
  LiveOrientation,
  NoResponseReason,
  useCoGuestState,
  useDeviceState,
  useLiveListState,
  useLoginState,
} from 'tuikit-atomicx-react';
import { checkWebRTCSupport, showWebRTCUnsupportedToast } from '../../utils/webrtcSupport';
import {
  CoGuestDeviceOpenFailureReason,
  DeviceSelectionType,
  classifyCoGuestDeviceOpenFailure,
  getCoGuestDeviceOpenFailureGuidanceKeys,
} from '../../utils/deviceGuidance';
import { TUISeatLayoutTemplate } from './constants';

const TASK_SEAT_REQUEST_TIMEOUT = 60;

export function useSeatApplication() {
  const { t } = useUIKit();
  const { connected, applicants, applyForSeat, disConnect, cancelApplication, subscribeEvent, unsubscribeEvent } = useCoGuestState();
  const {
    microphoneList,
    cameraList,
    currentMicrophone,
    currentCamera,
    getMicrophoneList,
    getCameraList,
    setCurrentMicrophone,
    setCurrentCamera,
    openLocalMicrophone,
    openLocalCamera,
    closeLocalMicrophone,
    closeLocalCamera,
  } = useDeviceState();
  const { loginUserInfo } = useLoginState();
  const { currentLive } = useLiveListState();

  // --- dialog orchestration state (single instance, see file header) ------
  const [connectionTypeDialogVisible, setConnectionTypeDialogVisible] = useState(false);
  const [deviceSelectionDialogVisible, setDeviceSelectionDialogVisible] = useState(false);
  const [cancelApplicationDialogVisible, setCancelApplicationDialogVisible] = useState(false);
  const [leaveSeatDialogVisible, setLeaveSeatDialogVisible] = useState(false);
  const [requestConnectionType, setRequestConnectionType] = useState<DeviceSelectionType>(DeviceSelectionType.Audio);
  // Mirror of requestConnectionType for event callbacks. The guest-event
  // subscriptions are registered once on mount (see SeatApplicationButton),
  // so a callback closure would capture the INITIAL value ('audio') forever
  // — after the user picks "video co-broadcasting" the accepted-by-host
  // handler would still see 'audio' and never open the camera. Reading the
  // ref keeps the mounted callback in sync with the latest selection.
  // (Vue3 has no such trap: its handlers read the reactive ref directly.)
  const requestConnectionTypeRef = useRef(requestConnectionType);
  useEffect(() => {
    requestConnectionTypeRef.current = requestConnectionType;
  }, [requestConnectionType]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [deviceOpenFailureGuidanceVisible, setDeviceOpenFailureGuidanceVisible] = useState(false);
  const [deviceOpenFailureReason, setDeviceOpenFailureReason] = useState<CoGuestDeviceOpenFailureReason>(CoGuestDeviceOpenFailureReason.Unknown);
  // Prevent errors from multiple clicks when leaving seat.
  const isLeavingSeatRef = useRef(false);
  // seatIndex for the pending apply (-1 = auto seat).
  const takeSeatIndexRef = useRef(-1);

  const deviceOpenFailureGuidanceCopy = useMemo(
    () => getCoGuestDeviceOpenFailureGuidanceKeys(deviceOpenFailureReason),
    [deviceOpenFailureReason],
  );

  const isApplyingSeat = useMemo(
    () => applicants.some(applicant => applicant.userId === loginUserInfo?.userId),
    [applicants, loginUserInfo?.userId],
  );
  const isUserOnSeat = useMemo(
    () => connected.some(connectedUser => connectedUser.userId === loginUserInfo?.userId),
    [connected, loginUserInfo?.userId],
  );

  const currentLiveOrientation = useMemo<LiveOrientation>(() => {
    if (currentLive && currentLive.layoutTemplate >= 200 && currentLive.layoutTemplate <= 599) {
      return LiveOrientation.LANDSCAPE;
    }
    return LiveOrientation.PORTRAIT;
  }, [currentLive]);

  const applySeatBtnText = useMemo(() => {
    if (isApplyingSeat) {
      return t('seat_application.cancel_apply');
    }
    return isUserOnSeat ? t('seat_application.leave_seat') : t('seat_application.apply');
  }, [isApplyingSeat, isUserOnSeat, t]);

  // Reset isLeavingSeat after the seat is actually left; close the leave
  // dialog if the seat state changed underneath (e.g. kicked off).
  useEffect(() => {
    if (!isUserOnSeat && isLeavingSeatRef.current) {
      isLeavingSeatRef.current = false;
    }
    if (!isUserOnSeat && leaveSeatDialogVisible) {
      setLeaveSeatDialogVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserOnSeat]);

  // Close the cancel-application dialog once the application is gone
  // (host responded / timeout / cancelled elsewhere).
  useEffect(() => {
    if (!isApplyingSeat && cancelApplicationDialogVisible) {
      setCancelApplicationDialogVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApplyingSeat]);

  const handleApplyForSeat = useCallback(async (index: number = -1) => {
    if (isApplyingSeat) {
      Toast.warning({
        message: t('seat_application.toast.request_sent'),
      });
      return;
    }
    if (isUserOnSeat) {
      Toast.warning({
        message: t('seat_application.toast.already_on_seat'),
      });
      return;
    }
    // Pre-flight WebRTC capability check (push-audio level). Only the audio
    // floor is enforced here: landscape rooms allow audio-only co-guesting
    // and the user may still pick the audio entry from the dialog. The
    // video-encoder check is done later in handleConnectionTypeConfirm so
    // we don't pre-emptively block users who only intend to apply for
    // audio co-guesting.
    const capability = await checkWebRTCSupport();
    if (!capability.canPushAudio) {
      showWebRTCUnsupportedToast(t);
      return;
    }
    takeSeatIndexRef.current = index;
    // Connection-type policy by live orientation / template (1:1 with Vue3):
    //   - Landscape (non-1v1 template): audio-only co-guesting. PC keeps the
    //     historical fast path — skip the chooser dialog and rely on the
    //     device-selection dialog as the visible confirmation.
    //   - Landscape 1v1 template / portrait: full chooser dialog.
    const isLandscape1v1Template = currentLive?.layoutTemplate === TUISeatLayoutTemplate.LandscapeDynamic_1v1;
    const isLandscapeAudioOnly = currentLiveOrientation === LiveOrientation.LANDSCAPE && !isLandscape1v1Template;
    if (isLandscapeAudioOnly) {
      // PC fast path: pre-select audio so the device dialog reads the
      // right intent, then open it directly.
      setRequestConnectionType(DeviceSelectionType.Audio);
      setDeviceSelectionDialogVisible(true);
      return;
    }
    setRequestConnectionType(DeviceSelectionType.Video);
    setConnectionTypeDialogVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApplyingSeat, isUserOnSeat, currentLive?.layoutTemplate, currentLiveOrientation, t]);

  const closeDeviceOpenFailureGuidance = useCallback(() => {
    setDeviceOpenFailureGuidanceVisible(false);
  }, []);

  const openLeaveSeatDialog = useCallback(() => {
    if (isLeavingSeatRef.current) {
      return;
    }
    if (!isUserOnSeat) {
      Toast.warning({
        message: t('seat_application.toast.not_on_seat'),
      });
      return;
    }
    setLeaveSeatDialogVisible(true);
  }, [isUserOnSeat, t]);

  const confirmLeaveSeat = useCallback(async () => {
    if (isLeavingSeatRef.current) {
      return;
    }
    isLeavingSeatRef.current = true;
    try {
      await disConnect();
      // After leaving the seat, close local devices to release the capture.
      // `disConnect()` (== roomEngine.leaveSeat()) only updates seat state; it
      // does not tear down getUserMedia tracks — without these calls the
      // camera indicator light stays on and the local preview keeps showing
      // the last frame.
      try {
        await closeLocalCamera();
      } catch (error) {
        console.warn('Failed to close local camera after leaveSeat:', error);
      }
      try {
        await closeLocalMicrophone();
      } catch (error) {
        console.warn('Failed to close local microphone after leaveSeat:', error);
      }
    } catch (error) {
      isLeavingSeatRef.current = false;
      console.error('Failed to leave seat:', error);
      Toast.error({
        message: t('seat_application.toast.leave_failed'),
      });
    } finally {
      setLeaveSeatDialogVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disConnect, closeLocalCamera, closeLocalMicrophone, t]);

  const closeLeaveSeatDialog = useCallback(() => {
    setLeaveSeatDialogVisible(false);
  }, []);

  const handleCancelApplicationOnSeat = useCallback(() => {
    if (isUserOnSeat) {
      Toast.warning({
        message: t('seat_application.toast.already_on_seat'),
      });
      return;
    }
    if (!isApplyingSeat) {
      Toast.warning({
        message: t('seat_application.toast.not_applied'),
      });
      return;
    }
    setCancelApplicationDialogVisible(true);
  }, [isUserOnSeat, isApplyingSeat, t]);

  const handleCancelApplicationConfirm = useCallback(async () => {
    try {
      await cancelApplication();
    } catch (error) {
      Toast.error({
        message: t('seat_application.toast.cancel_apply_failed'),
      });
      console.error('Failed to cancel application for seat:', error);
    } finally {
      setCancelApplicationDialogVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelApplication, t]);

  const handleCancelApplicationCancel = useCallback(() => {
    setCancelApplicationDialogVisible(false);
  }, []);

  const handleConnectionTypeCancel = useCallback(() => {
    setConnectionTypeDialogVisible(false);
    setRequestConnectionType(DeviceSelectionType.Audio);
  }, []);

  const handleConnectionTypeConfirm = useCallback(async () => {
    if (isApplyingSeat) {
      await cancelApplication();
      setConnectionTypeDialogVisible(false);
      return;
    }

    // Video co-groadcasting requires a working video encoder. Audio was
    // already cleared by handleApplyForSeat's canPushAudio gate.
    if (requestConnectionType === DeviceSelectionType.Video) {
      const capability = await checkWebRTCSupport();
      if (!capability.canPushVideo) {
        showWebRTCUnsupportedToast(t);
        setConnectionTypeDialogVisible(false);
        // Reset so the next entry to the dialog is not biased.
        setRequestConnectionType(DeviceSelectionType.Audio);
        return;
      }
    }

    setConnectionTypeDialogVisible(false);
    setDeviceSelectionDialogVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApplyingSeat, cancelApplication, requestConnectionType, t]);

  const handleDeviceCancel = useCallback(() => {
    setDeviceSelectionDialogVisible(false);
    setSelectedMicrophoneId('');
    setSelectedCameraId('');
  }, []);

  const handleDeviceConfirm = useCallback(async () => {
    const canConfirm = requestConnectionType === DeviceSelectionType.Video
      ? !!(selectedMicrophoneId && selectedCameraId)
      : !!selectedMicrophoneId;
    if (!canConfirm) {
      return;
    }
    try {
      if (selectedMicrophoneId) {
        await setCurrentMicrophone({ deviceId: selectedMicrophoneId });
      }
      if (requestConnectionType === DeviceSelectionType.Video && selectedCameraId) {
        await setCurrentCamera({ deviceId: selectedCameraId });
      }
      setDeviceSelectionDialogVisible(false);
      await applyForSeat({
        seatIndex: takeSeatIndexRef.current,
        timeout: TASK_SEAT_REQUEST_TIMEOUT,
      });
    } catch (error) {
      console.error('Failed to set devices or apply for seat:', error);
      Toast.error({
        message: t('seat_application.toast.apply_failed'),
      });
      setDeviceSelectionDialogVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestConnectionType, selectedMicrophoneId, selectedCameraId, setCurrentMicrophone, setCurrentCamera, applyForSeat, t]);

  // Auto-select devices when the device-selection dialog opens.
  // NOTE: only fetch the lists here — do NOT derive the selected ids from
  // the (stale) closure state after the await. React state updates from the
  // store land in the NEXT render, so `microphoneList` inside this callback
  // is still the pre-fetch value (the Vue3 port uses store refs and does not
  // have this issue). The two effects below sync the selection when the
  // freshly fetched lists arrive.
  const initAutoSelectDevice = useCallback(async () => {
    await getMicrophoneList();
    if (requestConnectionType === DeviceSelectionType.Video) {
      await getCameraList();
    }
  }, [requestConnectionType, getMicrophoneList, getCameraList]);

  useEffect(() => {
    if (deviceSelectionDialogVisible) {
      void initAutoSelectDevice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceSelectionDialogVisible]);

  // Sync the microphone selection once the fetched list lands (or the
  // current device changes). Keeps a user's manual choice (`prev`).
  useEffect(() => {
    if (!deviceSelectionDialogVisible) {
      return;
    }
    setSelectedMicrophoneId(prev => (
      prev || currentMicrophone?.deviceId || microphoneList[0]?.deviceId || ''
    ));
  }, [deviceSelectionDialogVisible, microphoneList, currentMicrophone]);

  useEffect(() => {
    if (!deviceSelectionDialogVisible || requestConnectionType !== DeviceSelectionType.Video) {
      return;
    }
    setSelectedCameraId(prev => (
      prev || currentCamera?.deviceId || cameraList[0]?.deviceId || ''
    ));
  }, [deviceSelectionDialogVisible, cameraList, currentCamera, requestConnectionType]);

  // --- guest event handlers (registered by the button component) -----------

  const handleGuestApplicationResponded = useCallback(
    async (eventInfo: CoGuestEventInfoMap[GuestEvent.onGuestApplicationResponded]) => {
      if (eventInfo.isAccept) {
        // Read the connection type from the ref: this callback is
        // subscribed once on mount and must see the user's latest choice.
        const connectionType = requestConnectionTypeRef.current;
        // Second-line defense: if any required device fails to open, leave
        // the seat and clean up so the host never sees a "muted occupied
        // seat" (the user may have revoked permission between the apply and
        // the host's acceptance).
        try {
          await openLocalMicrophone();
          if (connectionType === DeviceSelectionType.Video) {
            await openLocalCamera();
          }
          Toast.success({
            message: t('seat_application.toast.apply_success'),
          });
        } catch (error) {
          console.error('Failed to open local device after host accept:', error);
          setDeviceOpenFailureReason(classifyCoGuestDeviceOpenFailure(error));
          setDeviceOpenFailureGuidanceVisible(true);
          try {
            await disConnect();
          } catch (disconnectError) {
            console.warn('Failed to disconnect after device open failure:', disconnectError);
          }
          // Best-effort cleanup of any partially-opened device.
          try {
            await closeLocalMicrophone();
          } catch (closeError) {
            console.warn('Failed to close local microphone after device open failure:', closeError);
          }
          try {
            await closeLocalCamera();
          } catch (closeError) {
            console.warn('Failed to close local camera after device open failure:', closeError);
          }
        } finally {
          // Reset connection type so the next application starts clean.
          setRequestConnectionType(DeviceSelectionType.Audio);
        }
      } else {
        Toast.warning({
          message: t('seat_application.toast.apply_rejected'),
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [openLocalMicrophone, openLocalCamera, disConnect, closeLocalMicrophone, closeLocalCamera, t],
  );

  const handleGuestApplicationNoResponse = useCallback(
    (eventInfo: CoGuestEventInfoMap[GuestEvent.onGuestApplicationNoResponse]) => {
      let message = t('seat_application.toast.no_response');
      if (eventInfo.reason === NoResponseReason.timeout) {
        message = t('seat_application.toast.timeout');
      } else if (eventInfo.reason === NoResponseReason.alreadySeated) {
        message = t('seat_application.toast.already_seated');
      }
      Toast.warning({ message });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [t],
  );

  const handleKickedOffSeat = useCallback(
    async (eventInfo: CoGuestEventInfoMap[GuestEvent.onKickedOffSeat]) => {
      console.log(`User kicked off seat: seatIndex=${eventInfo.seatIndex}, operator=${eventInfo.hostUser?.userId}`);
      Toast.warning({
        message: t('seat_application.toast.kicked_off_seat'),
      });
      // The SDK already updated the seat state, but local capture won't be
      // torn down automatically — close devices so the local preview clears
      // and the indicator light turns off.
      try {
        await closeLocalCamera();
      } catch (error) {
        console.warn('Failed to close local camera after kicked off seat:', error);
      }
      try {
        await closeLocalMicrophone();
      } catch (error) {
        console.warn('Failed to close local microphone after kicked off seat:', error);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [closeLocalCamera, closeLocalMicrophone, t],
  );

  const handleGuestApplicationError = useCallback(
    (eventInfo: CoGuestEventInfoMap[GuestEvent.onGuestApplicationError]) => {
      Toast.error({
        message: t(eventInfo.message),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [t],
  );

  const subscribeEvents = useCallback(() => {
    subscribeEvent(GuestEvent.onGuestApplicationResponded, handleGuestApplicationResponded);
    subscribeEvent(GuestEvent.onGuestApplicationNoResponse, handleGuestApplicationNoResponse);
    subscribeEvent(GuestEvent.onKickedOffSeat, handleKickedOffSeat);
    subscribeEvent(GuestEvent.onGuestApplicationError, handleGuestApplicationError);
  }, [
    subscribeEvent,
    handleGuestApplicationResponded,
    handleGuestApplicationNoResponse,
    handleKickedOffSeat,
    handleGuestApplicationError,
  ]);

  const unsubscribeEvents = useCallback(() => {
    unsubscribeEvent(GuestEvent.onGuestApplicationResponded, handleGuestApplicationResponded);
    unsubscribeEvent(GuestEvent.onGuestApplicationNoResponse, handleGuestApplicationNoResponse);
    unsubscribeEvent(GuestEvent.onKickedOffSeat, handleKickedOffSeat);
    unsubscribeEvent(GuestEvent.onGuestApplicationError, handleGuestApplicationError);
    setDeviceOpenFailureGuidanceVisible(false);
    setDeviceOpenFailureReason(CoGuestDeviceOpenFailureReason.Unknown);
  }, [
    unsubscribeEvent,
    handleGuestApplicationResponded,
    handleGuestApplicationNoResponse,
    handleKickedOffSeat,
    handleGuestApplicationError,
  ]);

  return {
    isApplyingSeat,
    isUserOnSeat,
    applySeatBtnText,
    connectionTypeDialogVisible,
    deviceSelectionDialogVisible,
    cancelApplicationDialogVisible,
    leaveSeatDialogVisible,
    requestConnectionType,
    setRequestConnectionType,
    selectedMicrophoneId,
    setSelectedMicrophoneId,
    selectedCameraId,
    setSelectedCameraId,
    deviceOpenFailureGuidanceVisible,
    deviceOpenFailureGuidanceCopy,
    microphoneList,
    cameraList,
    handleApplyForSeat,
    closeDeviceOpenFailureGuidance,
    openLeaveSeatDialog,
    confirmLeaveSeat,
    closeLeaveSeatDialog,
    handleCancelApplicationOnSeat,
    handleConnectionTypeConfirm,
    handleConnectionTypeCancel,
    handleDeviceConfirm,
    handleDeviceCancel,
    handleCancelApplicationConfirm,
    handleCancelApplicationCancel,
    initAutoSelectDevice,
    subscribeEvents,
    unsubscribeEvents,
  };
}
