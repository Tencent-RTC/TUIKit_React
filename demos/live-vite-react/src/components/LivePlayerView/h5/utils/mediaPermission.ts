enum ConnectionType {
  Video = 'video',
  Audio = 'audio',
}

enum PermissionFailureReason {
  MicrophoneDenied = 'microphoneDenied',
  CameraDenied = 'cameraDenied',
  DeviceNotFound = 'deviceNotFound',
  DeviceBusy = 'deviceBusy',
  Unknown = 'unknown',
}

enum PermissionFlowDecision {
  Skip = 'skip',
  ShowPrimer = 'showPrimer',
  ShowBlocked = 'showBlocked',
}

interface PermissionProbeResult {
  ok: boolean;
  reason?: PermissionFailureReason;
}

type PermissionStateOrUnsupported = PermissionState | 'unsupported';

const PERMISSION_FAILURE_MESSAGE_KEYS: Record<PermissionFailureReason, string> = {
  [PermissionFailureReason.MicrophoneDenied]: 'live_player_view_h5.microphone_access_denied',
  [PermissionFailureReason.CameraDenied]: 'live_player_view_h5.camera_access_denied',
  [PermissionFailureReason.DeviceNotFound]: 'live_player_view_h5.no_camera_or_microphone',
  [PermissionFailureReason.DeviceBusy]: 'live_player_view_h5.device_busy',
  [PermissionFailureReason.Unknown]: 'live_player_view_h5.device_access_failed',
};

function isPermissionAuthFailure(reason?: PermissionFailureReason): boolean {
  return reason === PermissionFailureReason.MicrophoneDenied || reason === PermissionFailureReason.CameraDenied;
}

function getPermissionFailureMessageKey(reason: PermissionFailureReason, type: ConnectionType): string {
  if (reason === PermissionFailureReason.DeviceNotFound && type === ConnectionType.Audio) {
    return 'live_player_view_h5.no_microphone';
  }
  return PERMISSION_FAILURE_MESSAGE_KEYS[reason];
}

function classifyMediaError(error: unknown, type: ConnectionType): PermissionFailureReason {
  if (!(error instanceof DOMException)) {
    return PermissionFailureReason.Unknown;
  }
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return type === ConnectionType.Video ? PermissionFailureReason.CameraDenied : PermissionFailureReason.MicrophoneDenied;
    case 'NotFoundError':
    case 'OverconstrainedError':
      return PermissionFailureReason.DeviceNotFound;
    case 'NotReadableError':
    case 'TrackStartError':
      return PermissionFailureReason.DeviceBusy;
    default:
      return PermissionFailureReason.Unknown;
  }
}

async function queryPermissionState(name: 'camera' | 'microphone'): Promise<PermissionStateOrUnsupported> {
  const permissions = navigator?.permissions;
  if (!permissions?.query) {
    return 'unsupported';
  }
  try {
    const status = await permissions.query({ name: name as PermissionName });
    return status.state;
  } catch {
    return 'unsupported';
  }
}

// Only an explicit `granted` skips the primer; `unsupported` (common on iOS
// Safari and WeChat web-views) still educates the user first.
async function decidePermissionFlow(type: ConnectionType): Promise<PermissionFlowDecision> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    return PermissionFlowDecision.Skip;
  }
  const microphoneState = await queryPermissionState('microphone');
  if (microphoneState === 'denied') {
    return PermissionFlowDecision.ShowBlocked;
  }
  if (type === ConnectionType.Video) {
    const cameraState = await queryPermissionState('camera');
    if (cameraState === 'denied') {
      return PermissionFlowDecision.ShowBlocked;
    }
    return microphoneState === 'granted' && cameraState === 'granted'
      ? PermissionFlowDecision.Skip
      : PermissionFlowDecision.ShowPrimer;
  }
  return microphoneState === 'granted' ? PermissionFlowDecision.Skip : PermissionFlowDecision.ShowPrimer;
}

async function requestMediaAccess(type: ConnectionType): Promise<PermissionProbeResult> {
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === ConnectionType.Video ? { facingMode: 'user' } : false,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: classifyMediaError(error, type) };
  } finally {
    // Release immediately so the device is not held while waiting for the host.
    stream?.getTracks().forEach(track => track.stop());
  }
}

// iOS Safari and WeChat web-views only show the native permission prompt when
// getUserMedia runs inside the tap gesture. Callers must invoke this
// synchronously in the click handler, before any `await`.
function probeMediaPermission(type: ConnectionType): Promise<PermissionProbeResult> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    return Promise.resolve({ ok: true });
  }
  return requestMediaAccess(type);
}

export {
  ConnectionType,
  PermissionFailureReason,
  PermissionFlowDecision,
  decidePermissionFlow,
  getPermissionFailureMessageKey,
  isPermissionAuthFailure,
  probeMediaPermission,
};
export type { PermissionProbeResult };
