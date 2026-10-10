enum DeviceOpenFailureReason {
  PermissionDenied = 'permissionDenied',
  Unknown = 'unknown',
}

const CAMERA_NOT_AUTHORIZED_ERROR_CODE = -1101;
const MICROPHONE_NOT_AUTHORIZED_ERROR_CODE = -1105;

function classifyDeviceOpenFailure(error: unknown): DeviceOpenFailureReason {
  if (typeof error !== 'object' || error === null) {
    return DeviceOpenFailureReason.Unknown;
  }
  const code = 'code' in error ? Number(error.code) : undefined;
  if (code === CAMERA_NOT_AUTHORIZED_ERROR_CODE || code === MICROPHONE_NOT_AUTHORIZED_ERROR_CODE) {
    return DeviceOpenFailureReason.PermissionDenied;
  }
  const name = 'name' in error ? String(error.name) : '';
  return name === 'NotAllowedError' || name === 'PermissionDeniedError'
    ? DeviceOpenFailureReason.PermissionDenied
    : DeviceOpenFailureReason.Unknown;
}

function getDeviceOpenFailureDescriptionKey(reason: DeviceOpenFailureReason): string {
  return reason === DeviceOpenFailureReason.PermissionDenied
    ? 'live_player_view_h5.device_permission_unavailable_removed'
    : 'live_player_view_h5.device_open_failed_removed';
}

export { DeviceOpenFailureReason, classifyDeviceOpenFailure, getDeviceOpenFailureDescriptionKey };
