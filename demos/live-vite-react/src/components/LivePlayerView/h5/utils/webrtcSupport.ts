import { Toast } from '@tencentcloud/uikit-base-component-react';

// Native-API capability probe. `trtc-sdk-v5` is only a transitive dependency,
// so `TRTC.isSupported()` cannot be imported reliably under pnpm isolation.
interface WebRTCCapability {
  canPullVideo: boolean;
  canPushAudio: boolean;
  canPushVideo: boolean;
}

interface CodecList {
  mimeType?: string;
}

interface CapabilityApi {
  getCapabilities?: (kind: string) => { codecs?: CodecList[] } | null;
}

let cachedCapability: Promise<WebRTCCapability> | null = null;

function readVideoCodecs(api: CapabilityApi | undefined): CodecList[] | null {
  if (!api || typeof api.getCapabilities !== 'function') {
    return null;
  }
  try {
    const result = api.getCapabilities('video');
    return Array.isArray(result?.codecs) ? result.codecs : null;
  } catch {
    return null;
  }
}

function hasVideoCodec(codecs: CodecList[] | null): boolean {
  // Missing API means unknown; fail open and let the SDK report the precise error.
  if (!codecs) {
    return true;
  }
  return codecs.some((codec) => {
    const mimeType = (codec.mimeType || '').toLowerCase();
    return mimeType === 'video/h264' || mimeType === 'video/vp8';
  });
}

function probeCapability(): WebRTCCapability {
  const win = window as unknown as Record<string, unknown>;
  const hasPeerConnection = !!(win.RTCPeerConnection || win.webkitRTCPeerConnection || win.mozRTCPeerConnection);
  const hasMediaDevices = !!navigator?.mediaDevices?.getUserMedia;
  const canPushAudio = hasPeerConnection && hasMediaDevices;
  return {
    canPullVideo: hasPeerConnection && hasVideoCodec(readVideoCodecs(win.RTCRtpReceiver as CapabilityApi | undefined)),
    canPushAudio,
    canPushVideo: canPushAudio && hasVideoCodec(readVideoCodecs(win.RTCRtpSender as CapabilityApi | undefined)),
  };
}

function checkWebRTCSupport(): Promise<WebRTCCapability> {
  if (!cachedCapability) {
    cachedCapability = Promise.resolve().then(probeCapability).catch((error) => {
      console.warn('[checkWebRTCSupport] probe failed, treating as supported:', error);
      return { canPullVideo: true, canPushAudio: true, canPushVideo: true };
    });
  }
  return cachedCapability;
}

function showWebRTCUnsupportedToast(t: (key: string) => string) {
  Toast.warning({
    message: t('live_player_view_h5.browser_capability_incomplete'),
    duration: 4000,
  });
}

export { checkWebRTCSupport, showWebRTCUnsupportedToast };
export type { WebRTCCapability };
