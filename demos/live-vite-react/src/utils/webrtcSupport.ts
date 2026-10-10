// WebRTC capability probe (PC entry point for seat application).
// Ported from the Vue3 demo (`TUILiveKit/utils/webrtcSupport`).
//
// Rationale (kept from the Vue3 source):
//   Some browsers (in-app web-views without WebRTC, low-version Android stock
//   browsers, the WeChat X5 kernel, etc.) cannot pull a live stream at all,
//   and several others can pull but cannot push when the user tries to apply
//   for a seat. Without an upfront capability probe these users see a silent
//   failure on "apply for seat" with no explanation.
//
// Why we DON'T import TRTC.isSupported() here:
//   The official probe is the most accurate, but `trtc-sdk-v5` is not a
//   direct dependency of this demo — it ships transitively. Under pnpm's
//   strict isolation, importing it directly would be fragile. We rely on
//   widely-available native browser APIs instead; the SDK will still surface
//   its own precise errors at apply time as a second layer of defense.
//
// Why a single cached Promise:
//   Capability is constant for the lifetime of the page. The apply-for-seat
//   click handler and the video co-broadcast preflight both await this; a
//   module-level cache keeps it to a single probe.

import { Toast } from '@tencentcloud/uikit-base-component-react';

export type WebRTCCapability = {
  raw: {
    hasMediaDevices: boolean;
    hasRTCPeerConnection: boolean;
    hasH264Decode: boolean;
    hasVp8Decode: boolean;
    hasH264Encode: boolean;
    hasVp8Encode: boolean;
  };
  canPullAudio: boolean;
  canPullVideo: boolean;
  canPushAudio: boolean;
  canPushVideo: boolean;
  shouldBlockEntry: boolean;
};

export type CheckOptions = {
  // Bypass the cache. Reserved for unit tests only.
  force?: boolean;
};

let cached: Promise<WebRTCCapability> | null = null;

export function checkWebRTCSupport(opts: CheckOptions = {}): Promise<WebRTCCapability> {
  if (!opts.force && cached) return cached;
  cached = (async () => {
    try {
      return await probeOnce();
    } catch (error) {
      console.warn('[checkWebRTCSupport] probe threw, treating as supported:', error);
      // Fail-open: a bug in the probe must not lock real users out.
      return permissiveFallback();
    }
  })();
  return cached;
}

async function probeOnce(): Promise<WebRTCCapability> {
  const hasMediaDevices = !!(navigator?.mediaDevices?.getUserMedia);
  const hasRTCPeerConnection = detectRTCPeerConnection();
  const codecs = detectVideoCodecs();

  const canPullAudio = hasRTCPeerConnection;
  const canPullVideo = canPullAudio && (codecs.hasH264Decode || codecs.hasVp8Decode);
  const canPushAudio = canPullAudio && hasMediaDevices;
  const canPushVideo = canPushAudio && (codecs.hasH264Encode || codecs.hasVp8Encode);

  return {
    raw: {
      hasMediaDevices,
      hasRTCPeerConnection,
      hasH264Decode: codecs.hasH264Decode,
      hasVp8Decode: codecs.hasVp8Decode,
      hasH264Encode: codecs.hasH264Encode,
      hasVp8Encode: codecs.hasVp8Encode,
    },
    canPullAudio,
    canPullVideo,
    canPushAudio,
    canPushVideo,
    shouldBlockEntry: !canPullVideo,
  };
}

function detectRTCPeerConnection(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return !!(w.RTCPeerConnection || w.webkitRTCPeerConnection || w.mozRTCPeerConnection);
}

type CodecCapability = {
  hasH264Decode: boolean;
  hasVp8Decode: boolean;
  hasH264Encode: boolean;
  hasVp8Encode: boolean;
};

// When the capability APIs are missing (older Safari, ancient Edge), we
// degrade to "assume supported" because the SDK will surface a precise error
// at the actual push moment. Returning false here would over-block.
function detectVideoCodecs(): CodecCapability {
  const fallback: CodecCapability = {
    hasH264Decode: true,
    hasVp8Decode: true,
    hasH264Encode: true,
    hasVp8Encode: true,
  };

  if (typeof window === 'undefined') return fallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RtpReceiver = (window as any).RTCRtpReceiver;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RtpSender = (window as any).RTCRtpSender;

  const decodeCaps = readCapabilityList(RtpReceiver, 'video');
  const encodeCaps = readCapabilityList(RtpSender, 'video');

  if (!decodeCaps && !encodeCaps) return fallback;

  return {
    hasH264Decode: decodeCaps ? hasMimeType(decodeCaps, 'video/h264') : true,
    hasVp8Decode: decodeCaps ? hasMimeType(decodeCaps, 'video/vp8') : true,
    hasH264Encode: encodeCaps ? hasMimeType(encodeCaps, 'video/h264') : true,
    hasVp8Encode: encodeCaps ? hasMimeType(encodeCaps, 'video/vp8') : true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCapabilityList(api: any, kind: 'audio' | 'video'): { mimeType?: string }[] | null {
  if (!api || typeof api.getCapabilities !== 'function') return null;
  try {
    const result = api.getCapabilities(kind);
    if (!result || !Array.isArray(result.codecs)) return null;
    return result.codecs;
  } catch {
    return null;
  }
}

function hasMimeType(codecs: { mimeType?: string }[], target: string): boolean {
  const lower = target.toLowerCase();
  return codecs.some(codec => (codec.mimeType || '').toLowerCase() === lower);
}

function permissiveFallback(): WebRTCCapability {
  return {
    raw: {
      hasMediaDevices: true,
      hasRTCPeerConnection: true,
      hasH264Decode: true,
      hasVp8Decode: true,
      hasH264Encode: true,
      hasVp8Encode: true,
    },
    canPullAudio: true,
    canPullVideo: true,
    canPushAudio: true,
    canPushVideo: true,
    shouldBlockEntry: false,
  };
}

// Single Toast emitter shared across every guard surface (apply preflight,
// video co-broadcast preflight). Centralizing message + duration here keeps
// any future copy / timing change consistent across all guard points.
type Translator = (key: string) => string;

export function showWebRTCUnsupportedToast(t: Translator): void {
  Toast.warning({
    message: t('seat_application.webrtc_unsupported'),
    duration: 4000,
  });
}

// Exposed for unit tests only.
export const __test__ = {
  resetCacheForTest: () => {
    cached = null;
  },
};
