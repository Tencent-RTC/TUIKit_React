// Device-selection dialog guidance helpers. Ported 1:1 from the Vue3 demo
// (`TUILiveKit/utils/deviceGuidance/deviceSelectionEmptyGuidance.ts`), with
// i18n keys re-scoped to this demo's naming convention.

export enum DeviceSelectionType {
  Audio = 'audio',
  Video = 'video',
}

export type DevicePermissionState = PermissionState | 'unsupported';

export function shouldShowDeviceEmptyGuidance(input: {
  type: DeviceSelectionType;
  microphoneCount: number;
  cameraCount: number;
  microphonePermission?: DevicePermissionState;
  cameraPermission?: DevicePermissionState;
}): boolean {
  const guidance = getDeviceEmptyFieldGuidance(input);
  return guidance.showCamera || guidance.showMicrophone;
}

export function getDeviceEmptyFieldGuidance(input: {
  type: DeviceSelectionType;
  microphoneCount: number;
  cameraCount: number;
  microphonePermission?: DevicePermissionState;
  cameraPermission?: DevicePermissionState;
}): {
  showCamera: boolean;
  showMicrophone: boolean;
} {
  return {
    showCamera: input.type === DeviceSelectionType.Video
      && (input.cameraCount === 0 || input.cameraPermission === 'denied'),
    showMicrophone: input.microphoneCount === 0 || input.microphonePermission === 'denied',
  };
}

export function getDeviceEmptyGuidanceKeys(): {
  descKey: string;
} {
  return {
    descKey: 'seat_application.device_selection.empty_guidance_desc',
  };
}
