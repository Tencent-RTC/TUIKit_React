// Camera preview guidance for the device-selection dialog. Ported from the
// Vue3 demo (`TUILiveKit/utils/deviceGuidance/cameraPreviewGuidance.ts`),
// with i18n keys re-scoped to this demo's naming convention.

import { DeviceSelectionType } from './deviceSelectionEmptyGuidance';

export enum CameraPreviewFailure {
  None = 'none',
  Preview = 'preview',
  Switch = 'switch',
}

export function getCameraPreviewGuidanceKeys(failure: CameraPreviewFailure): {
  titleKey: string;
  descKey: string;
} | null {
  if (failure === CameraPreviewFailure.None) {
    return null;
  }
  return {
    titleKey: 'seat_application.camera_preview.failed_title',
    descKey: failure === CameraPreviewFailure.Switch
      ? 'seat_application.camera_preview.switch_failed_desc'
      : 'seat_application.camera_preview.preview_failed_desc',
  };
}

export function getCameraPreviewUnavailableGuidanceKeys(): {
  titleKey: string;
  descKey: string;
} {
  return {
    titleKey: 'seat_application.camera_preview.unavailable_title',
    descKey: 'seat_application.camera_preview.unavailable_desc',
  };
}

export function getDeviceSelectionRequirementKey(input: {
  type: DeviceSelectionType;
  microphoneCount: number;
  cameraCount: number;
}): string | null {
  if (input.type === DeviceSelectionType.Video) {
    if (input.microphoneCount === 0 && input.cameraCount === 0) {
      return 'seat_application.device_selection.requirement_both';
    }
    if (input.microphoneCount === 0) {
      return 'seat_application.device_selection.requirement_microphone';
    }
    if (input.cameraCount === 0) {
      return 'seat_application.device_selection.requirement_camera';
    }
    return null;
  }
  if (input.type === DeviceSelectionType.Audio) {
    if (input.microphoneCount === 0) {
      return 'seat_application.device_selection.requirement_microphone';
    }
  }
  return null;
}
