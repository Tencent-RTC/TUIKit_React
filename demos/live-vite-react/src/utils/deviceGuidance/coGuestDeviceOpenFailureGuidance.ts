// Classification and guidance copy for device-open failures after the host
// accepts a seat application. Ported 1:1 from the Vue3 demo
// (`TUILiveKit/utils/deviceGuidance/coGuestDeviceOpenFailureGuidance.ts`).

export enum CoGuestDeviceOpenFailureReason {
  PermissionDenied = 'permissionDenied',
  Unknown = 'unknown',
}

const CAMERA_NOT_AUTHORIZED_ERROR_CODE = -1101;
const MICROPHONE_NOT_AUTHORIZED_ERROR_CODE = -1105;

export function classifyCoGuestDeviceOpenFailure(error: unknown): CoGuestDeviceOpenFailureReason {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? Number(error.code)
    : undefined;
  if (
    code === CAMERA_NOT_AUTHORIZED_ERROR_CODE
    || code === MICROPHONE_NOT_AUTHORIZED_ERROR_CODE
  ) {
    return CoGuestDeviceOpenFailureReason.PermissionDenied;
  }
  const name = typeof error === 'object' && error !== null && 'name' in error
    ? String(error.name)
    : '';
  return name === 'NotAllowedError' || name === 'PermissionDeniedError'
    ? CoGuestDeviceOpenFailureReason.PermissionDenied
    : CoGuestDeviceOpenFailureReason.Unknown;
}

export function getCoGuestDeviceOpenFailureGuidanceKeys(
  reason: CoGuestDeviceOpenFailureReason,
): {
  titleKey: string;
  descKey: string;
} {
  return {
    titleKey: 'seat_application.device_open_failure.title',
    descKey: reason === CoGuestDeviceOpenFailureReason.PermissionDenied
      ? 'seat_application.device_open_failure.permission_denied_desc'
      : 'seat_application.device_open_failure.unknown_desc',
  };
}
