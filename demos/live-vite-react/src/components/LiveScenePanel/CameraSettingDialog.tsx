import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TRTCCloud,
  TRTCVideoFillMode,
  TRTCVideoMirrorType,
  TRTCVideoResolution,
  TRTCVideoResolutionMode,
  TRTCVideoRotation,
} from '@tencentcloud/tuiroom-engine-js';
import {
  Dialog,
  Option,
  Select,
  Toast,
  ToastType,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import { useDeviceState } from 'tuikit-atomicx-react';
import MirrorOffIcon from './icons/MirrorOffIcon';
import MirrorOnIcon from './icons/MirrorOnIcon';
import styles from './LiveScenePanel.module.scss';
import type { MediaSource } from 'tuikit-atomicx-react';

interface CameraSettingDialogProps {
  mediaSource: MediaSource | null;
  onClose: () => void;
  onAddCameraMaterial: (material: Partial<MediaSource>) => void;
  onUpdateCameraMaterial: (material: Partial<MediaSource>) => void;
}

type ResolutionOption = {
  label: string;
  value: string;
};

// Sorted from high to low, landscape first then portrait. 1:1 copy of
// the Vue3 implementation.
const landscapeResolutions = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 960, height: 540 },
  { width: 640, height: 360 },
];

const portraitResolutions = [
  { width: 1080, height: 1920 },
  { width: 720, height: 1280 },
  { width: 540, height: 960 },
  { width: 360, height: 640 },
];

const defaultResolutions: ResolutionOption[] = [
  ...landscapeResolutions.map(r => ({ label: `${r.width}x${r.height}`, value: `${r.width}x${r.height}` })),
  ...portraitResolutions.map(r => ({ label: `${r.width}x${r.height}`, value: `${r.width}x${r.height}` })),
];

const RESOLUTION_ENUM_MAP: Record<number, string> = {
  [TRTCVideoResolution.TRTCVideoResolution_640_360]: '640x360',
  [TRTCVideoResolution.TRTCVideoResolution_960_540]: '960x540',
  [TRTCVideoResolution.TRTCVideoResolution_1280_720]: '1280x720',
  [TRTCVideoResolution.TRTCVideoResolution_1920_1080]: '1920x1080',
};

// Cache camera capabilities by deviceId to avoid redundant getUserMedia
// calls when switching back to a previously inspected camera.
const capabilitiesCache = new Map<string, MediaTrackCapabilities | null>();

// 1:1 copy of Vue3 `const previewTRTCCloud = new TRTCCloud();`, but
// lazily constructed so we can safely re-create the instance after an
// `onBeforeUnmount` path that called `destroy()` nulls its internal
// `_trtc`. Vue gets away with a module-level const because its SFC
// lifecycle + HMR flow rarely hits a second mount on a destroyed
// singleton, but in React under StrictMode / repeated dialog opens we
// do hit that path and the next `setCurrentCameraDevice` throws
// "Cannot read properties of null (reading 'updateLocalVideo')".
let previewTRTCCloud: TRTCCloud | null = null;
function getPreviewCloud(): TRTCCloud {
  if (!previewTRTCCloud) {
    previewTRTCCloud = new TRTCCloud();
  }
  return previewTRTCCloud;
}
function resetPreviewCloud() {
  previewTRTCCloud = null;
}

// Stop the device test session and destroy the preview TRTCCloud sub
// instance so the underlying camera (e.g. USB UVC like C920) is fully
// released before any other code path issues a new getUserMedia() on
// the same deviceId. Safari (WebKit) does not share capture sessions
// across two MediaStreamTracks bound to the same physical device in
// the same page, so when the mixer's addMediaSource() runs while the
// preview cloud still holds the camera at 1920x1080, WebKit tears the
// existing capture session down and re-negotiates, which on USB cams
// takes 5-10 seconds. Releasing the preview cloud first avoids the
// double-occupancy and brings the first-frame latency back to ~1s.
//
// Safe to call multiple times: when there is no live preview cloud
// the call short-circuits and does nothing.
async function teardownPreviewCloud() {
  if (!previewTRTCCloud) {
    return;
  }
  const cloud = previewTRTCCloud;
  // Drop the module-level reference *before* awaiting so that any
  // re-entrant call (e.g. the unmount cleanup that fires right after
  // handleConfirm resolves) sees the singleton as already gone and
  // does not try to tear down the same instance again.
  resetPreviewCloud();
  try {
    await cloud.stopCameraDeviceTest();
  } catch {
    // ignore
  }
  try {
    cloud.destroy();
  } catch {
    // ignore
  }
}

function isPortraitResolution(resolution: string) {
  if (!resolution) {
    return false;
  }
  const [w, h] = resolution.split('x').map(Number);
  return h > w;
}

function getLocalFillMode(resolution: string) {
  // Portrait → Fit (preserve aspect ratio), landscape → Fill.
  return isPortraitResolution(resolution)
    ? TRTCVideoFillMode.TRTCVideoFillMode_Fit
    : TRTCVideoFillMode.TRTCVideoFillMode_Fill;
}

function isNotAllowedError(error: unknown) {
  return error instanceof Error && error.name === 'NotAllowedError';
}

function getSingleSelectValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CameraSettingDialog(props: CameraSettingDialogProps) {
  const { mediaSource, onClose, onAddCameraMaterial, onUpdateCameraMaterial } = props;
  const { t } = useUIKit();
  const { cameraList, getCameraList } = useDeviceState();
  const videoPreviewRef = useRef<HTMLDivElement | null>(null);
  const [currentCameraId, setCurrentCameraId] = useState<string>(
    mediaSource?.camera?.cameraId || cameraList[0]?.deviceId || '',
  );
  const [currentResolution, setCurrentResolution] = useState('');
  const [isMirror, setIsMirror] = useState<boolean>(
    mediaSource?.layout?.mirror === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable || false,
  );
  const [videoResolutionList, setVideoResolutionList] = useState<ResolutionOption[]>([]);
  // Tracks the brief window between the user clicking Confirm and the
  // dialog actually unmounting (after teardownPreviewCloud resolves
  // and the parent flips its `showCameraSettingDialog` flag). Used to
  // disable the buttons / show a "submitting" label so the user can
  // not double-click and queue a second addMediaSource() call.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(
    () => (mediaSource ? t('Update Camera') : t('Add Camera')),
    [mediaSource, t],
  );

  // Refresh cameraList when the dialog opens. useDeviceState is async
  // and may still have an empty list on the first mount (for example
  // right after page load while the RoomEngine is still bootstrapping),
  // which would otherwise keep the Confirm button disabled forever.
  useEffect(() => {
    Promise.resolve(getCameraList()).catch(() => undefined);
  }, [getCameraList]);

  // 1:1 copy of Vue3 generateVideoResolutionList().
  const generateVideoResolutionList = useCallback(async (deviceId: string) => {
    const currentCamera = cameraList.find(item => item.deviceId === deviceId);
    if (!currentCamera) {
      return defaultResolutions;
    }
    try {
      let capabilities: MediaTrackCapabilities | null = null;
      if (capabilitiesCache.has(deviceId)) {
        capabilities = capabilitiesCache.get(deviceId) ?? null;
      } else {
        // Use exact constraint so capabilities are read from the
        // requested camera rather than whatever was active last.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
        });
        const track = stream.getVideoTracks()[0];
        capabilities = track.getCapabilities ? track.getCapabilities() : null;
        track.stop();
        capabilitiesCache.set(deviceId, capabilities);
      }

      let list: ResolutionOption[] = defaultResolutions;
      if (capabilities?.width && capabilities?.height) {
        const maxWidth = capabilities.width.max ?? 0;
        const maxHeight = capabilities.height.max ?? 0;
        if (!maxWidth || !maxHeight) {
          setVideoResolutionList(defaultResolutions);
          return defaultResolutions;
        }
        // Always provide both landscape and portrait resolutions,
        // filtered by the camera's reported max dimension. Virtual
        // cameras on macOS (OBS etc.) report landscape caps but can
        // actually output portrait frames, so exposing both lets the
        // user pick whatever works.
        const maxDimension = Math.max(maxWidth, maxHeight);
        const supported = [...landscapeResolutions, ...portraitResolutions]
          .filter(({ width, height }) => width <= maxDimension && height <= maxDimension)
          .sort((a, b) => {
            const aIsPortrait = a.height > a.width ? 1 : 0;
            const bIsPortrait = b.height > b.width ? 1 : 0;
            if (aIsPortrait !== bIsPortrait) {
              return aIsPortrait - bIsPortrait;
            }
            return (b.width * b.height) - (a.width * a.height);
          });
        list = supported.map(({ width, height }) => ({
          label: `${width}x${height}`,
          value: `${width}x${height}`,
        }));
      }
      setVideoResolutionList(list);
      return list;
    } catch (error) {
      console.error('Failed to get camera capabilities:', error);
      if (isNotAllowedError(error)) {
        Toast({
          type: ToastType.WARNING,
          message: t('Please check the current browser camera permission'),
        });
      }
      setVideoResolutionList(defaultResolutions);
      return defaultResolutions;
    }
  }, [cameraList, t]);

  // 1:1 copy of Vue3 watch(cameraList): if the current camera was
  // unplugged, fall back to the first available one and re-read
  // capabilities + switch the preview to it.
  useEffect(() => {
    (async () => {
      if (!cameraList.find(item => item.deviceId === currentCameraId)) {
        const next = cameraList[0]?.deviceId || '';
        setCurrentCameraId(next);
        if (next) {
          await generateVideoResolutionList(next);
          try {
            await getPreviewCloud().setCurrentCameraDevice(next);
          } catch {
            // ignore, caller will see camera preview in the right state
          }
        }
      }
    })().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraList]);

  // 1:1 copy of Vue3 onMounted(): pick the initial camera, generate
  // its resolutions, pick the initial resolution, then startCameraDeviceTest
  // and apply the render params. Runs exactly once per dialog open,
  // and only after cameraList is non-empty - the getUserMedia probe
  // inside generateVideoResolutionList depends on a valid deviceId.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (hasMountedRef.current || cameraList.length === 0) {
      return;
    }
    hasMountedRef.current = true;
    (async () => {
      try {
        let initialCameraId = '';
        if (mediaSource?.camera?.cameraId) {
          initialCameraId = mediaSource.camera.cameraId;
          await getPreviewCloud().setCurrentCameraDevice(initialCameraId);
        } else if (cameraList[0]?.deviceId) {
          initialCameraId = cameraList[0].deviceId;
          await getPreviewCloud().setCurrentCameraDevice(initialCameraId);
        }
        setCurrentCameraId(initialCameraId);

        const list = await generateVideoResolutionList(initialCameraId);

        let initialResolution = '';
        if (mediaSource?.camera?.resolution) {
          const res = mediaSource.camera.resolution as
            | number
            | { width: number; height: number };
          if (typeof res === 'object' && 'width' in res && 'height' in res) {
            initialResolution = `${res.width}x${res.height}`;
          } else {
            initialResolution = RESOLUTION_ENUM_MAP[res as number] || '1920x1080';
          }
        } else if (list.length > 0) {
          initialResolution = list[0].value;
        }
        setCurrentResolution(initialResolution);

        if (videoPreviewRef.current) {
          // Use startCameraDeviceTest for preview. Unlike startLocalPreview,
          // it works as a device-test session: setCurrentCameraDevice will
          // automatically refresh the preview stream when switching cameras.
          // This matches the Vue3 implementation behavior.
          await getPreviewCloud().startCameraDeviceTest(videoPreviewRef.current);
          // Re-apply setCurrentCameraDevice AFTER startCameraDeviceTest to ensure
          // the preview shows the correct camera. startCameraDeviceTest may start
          // with the system default camera, ignoring the setCurrentCameraDevice
          // call made before it on a freshly created TRTCCloud instance.
          if (initialCameraId) {
            await getPreviewCloud().setCurrentCameraDevice(initialCameraId);
          }
          await getPreviewCloud().setLocalRenderParams({
            rotation: TRTCVideoRotation.TRTCVideoRotation0,
            fillMode: getLocalFillMode(initialResolution),
            mirrorType: isMirror
              ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
              : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
          });
        }
      } catch (error) {
        console.error('[CameraSettingDialog] mount flow failed:', error);
        if (isNotAllowedError(error)) {
          Toast({
            type: ToastType.WARNING,
            message: t('Please check the current browser camera permission'),
          });
        }
      }
    })().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraList]);

  // 1:1 copy of Vue3 watch(currentResolution): push updated encoder
  // params + render params into the preview cloud whenever the
  // dropdown changes.
  //
  // IMPORTANT: Vue's watch is lazy (no `immediate: true`), meaning it
  // does NOT fire on the initial value. React's useEffect always runs
  // on mount, which would race with the bootstrap effect's
  // startCameraDeviceTest() call and issue setVideoEncoderParam against an
  // _trtc that hasn't been wired up yet - the SDK then warns
  // "Cannot read properties of null (reading 'updateLocalVideo')".
  // Skip the very first run to match Vue semantics.
  const skipFirstResolutionEffectRef = useRef(true);
  useEffect(() => {
    if (!currentResolution) {
      return;
    }
    if (skipFirstResolutionEffectRef.current) {
      skipFirstResolutionEffectRef.current = false;
      return;
    }
    (async () => {
      try {
        // IMPORTANT: explicitly pass `mirrorType: Disable` here.
        //
        // The TRTC web SDK defaults `videoEncoderParams.mirrorType` to
        // `Auto`, which mirrors front-camera frames at the encoder level.
        // Although this `previewTRTCCloud` is a sub instance and is not
        // the one publishing the live stream, we have observed audience-
        // side reports of "all sources appear mirrored" right after
        // closing the camera setting dialog. The repro is timing-
        // sensitive (StrictMode double-mount + getUserMedia race), but
        // pinning the encoder mirror to Disable here makes the preview
        // cloud's encoder state deterministic regardless of the SDK
        // default, eliminating any possibility of the preview cloud
        // leaking an "auto-mirrored" encoder into the published mix.
        await getPreviewCloud().setVideoEncoderParam({
          videoResolution: TRTCVideoResolution.TRTCVideoResolution_1920_1080,
          videoFps: 15,
          videoBitrate: 1000,
          resMode: isPortraitResolution(currentResolution)
            ? TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait
            : TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape,
          mirrorType: TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
        });
        await getPreviewCloud().setLocalRenderParams({
          rotation: TRTCVideoRotation.TRTCVideoRotation0,
          fillMode: getLocalFillMode(currentResolution),
          mirrorType: isMirror
            ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
            : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
        });
      } catch (error) {
        console.warn('[CameraSettingDialog] update encoder/render params failed:', error);
      }
    })().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResolution]);

  // 1:1 copy of Vue3 onBeforeUnmount(): stop the preview and
  // destroy the TRTCCloud sub instance so the camera is released.
  // Note: we do NOT re-create the singleton here - Vue keeps the
  // module-level const alive between dialog opens because unmount
  // runs `destroy()`, which on the shared cloud nulls shareInstance.
  // In our case the singleton is NEVER the shareInstance (we always
  // `new TRTCCloud()`), so destroy on the sub instance only tears
  // down its own _trtc/_testTrtc. Match Vue exactly to be safe.
  //
  // handleConfirm may have already torn the preview cloud down before
  // the dialog unmount runs (so the freshly added mixer source can
  // grab the camera on Safari without a 6-7s re-negotiation). In that
  // case `teardownPreviewCloud` is a no-op.
  useEffect(() => () => {
    teardownPreviewCloud().catch(() => undefined);
  }, []);

  // 1:1 copy of Vue3 watch(props.mediaSource, { deep: true }).
  // If the parent swaps which source is being edited while the
  // dialog is open, sync form state + switch the preview camera.
  useEffect(() => {
    if (!mediaSource) {
      return;
    }
    (async () => {
      const cameraConfig = mediaSource.camera;
      if (cameraConfig) {
        if (currentCameraId !== cameraConfig.cameraId) {
          setCurrentCameraId(cameraConfig.cameraId);
          await generateVideoResolutionList(cameraConfig.cameraId);
          try {
            await getPreviewCloud().setCurrentCameraDevice(cameraConfig.cameraId);
          } catch {
            // ignore
          }
        }
        if (cameraConfig.resolution) {
          if (typeof cameraConfig.resolution === 'object'
            && 'width' in cameraConfig.resolution
            && 'height' in cameraConfig.resolution) {
            const { width, height } = cameraConfig.resolution as { width: number; height: number };
            setCurrentResolution(`${width}x${height}`);
          } else {
            setCurrentResolution(RESOLUTION_ENUM_MAP[cameraConfig.resolution as number] || '1920x1080');
          }
        }
      }
      const nextMirror = mediaSource.layout?.mirror === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;
      setIsMirror(nextMirror);
      try {
        await getPreviewCloud().setLocalRenderParams({
          rotation: TRTCVideoRotation.TRTCVideoRotation0,
          fillMode: getLocalFillMode(currentResolution),
          mirrorType: nextMirror
            ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
            : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
        });
      } catch {
        // ignore
      }
    })().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaSource]);

  // 1:1 copy of Vue3 handleCameraChange().
  const handleCameraChange = useCallback(async (value: unknown) => {
    const nextCameraId = String(getSingleSelectValue(value) || '');
    if (!nextCameraId) {
      return;
    }
    setCurrentCameraId(nextCameraId);
    const list = await generateVideoResolutionList(nextCameraId);
    if (list.length > 0) {
      setCurrentResolution(list[0].value);
    }
    try {
      await getPreviewCloud().setCurrentCameraDevice(nextCameraId);
    } catch (error) {
      console.warn('[CameraSettingDialog] setCurrentCameraDevice failed:', error);
    }
  }, [generateVideoResolutionList]);

  // 1:1 copy of Vue3 toggleMirror().
  const toggleMirror = useCallback(() => {
    const next = !isMirror;
    setIsMirror(next);
    getPreviewCloud().setLocalRenderParams({
      rotation: TRTCVideoRotation.TRTCVideoRotation0,
      fillMode: getLocalFillMode(currentResolution),
      mirrorType: next
        ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
        : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
    }).catch(() => undefined);
  }, [currentResolution, isMirror]);

  // 1:1 copy of Vue3 handleConfirm(), with one Safari-specific tweak:
  // tear down the preview TRTCCloud *before* notifying the parent so
  // the camera is fully released by the time addMediaSource() issues
  // its own getUserMedia() on the same deviceId. See teardownPreviewCloud
  // for why this matters on WebKit (USB cameras would otherwise stall
  // for 6-10s on the first frame).
  const handleConfirm = async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    const [width, height] = currentResolution.split('x').map(Number);
    const currentCameraName = cameraList.find(item => item.deviceId === currentCameraId)?.deviceName;

    await teardownPreviewCloud();

    if (!mediaSource) {
      onAddCameraMaterial({
        name: currentCameraName,
        camera: {
          cameraId: currentCameraId,
          resolution: { width, height },
        },
        layout: {
          mirror: isMirror
            ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
            : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
        },
      } as unknown as Partial<MediaSource>);
      return;
    }

    const hasCameraNameChanged = mediaSource.name !== cameraList.find(
      item => item.deviceId === mediaSource.camera?.cameraId,
    )?.deviceName;
    const updateInfo: Record<string, unknown> = {
      camera: {
        cameraId: currentCameraId,
        resolution: { width, height },
      },
      layout: {
        mirror: isMirror
          ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
          : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
      },
    };
    if (!hasCameraNameChanged) {
      updateInfo.name = currentCameraName;
    }
    onUpdateCameraMaterial(updateInfo as unknown as Partial<MediaSource>);
  };

  return (
    <Dialog
      visible
      title={title}
      confirmText={isSubmitting ? t('Adding...') : title}
      cancelText={t('Cancel')}
      confirmDisabled={cameraList.length === 0 || isSubmitting}
      cancelDisabled={isSubmitting}
      showClose={!isSubmitting}
      onConfirm={handleConfirm}
      onCancel={isSubmitting ? undefined : onClose}
      onClose={isSubmitting ? undefined : onClose}
      className={styles['camera-setting-dialog']}
      style={{ width: 600 }}
    >
      <div className={styles['dialog-body']}>
        {/* startLocalPreview injects its own <video>/<canvas> into this
            container. Do not render any siblings on top of it. */}
        <div ref={videoPreviewRef} className={styles['video-preview']} />
        <div className={styles['basic-setting']}>
          <div className={styles['item-setting']}>
            <span className={styles.title}>{t('Camera')}</span>
            <Select
              value={currentCameraId}
              placeholder={t('Camera')}
              theme="dark"
              style={{ width: '100%' }}
              onChange={handleCameraChange}
            >
              {cameraList.map(item => (
                <Option key={item.deviceId} value={item.deviceId} label={item.deviceName} />
              ))}
            </Select>
          </div>
          <div className={styles['item-setting']}>
            <span className={styles.title}>{t('Resolution')}</span>
            <Select
              value={currentResolution}
              placeholder={t('Resolution')}
              theme="dark"
              style={{ width: '100%' }}
              onChange={value => setCurrentResolution(String(getSingleSelectValue(value) || ''))}
            >
              {videoResolutionList.map(item => (
                <Option key={item.value} value={item.value} label={item.label} />
              ))}
            </Select>
          </div>
          <button
            type="button"
            className={classNames(styles['mirror-container'], {
              [styles['mirror-active']]: isMirror,
            })}
            onClick={toggleMirror}
            title={t('Mirror')}
          >
            {isMirror
              ? <MirrorOnIcon width={18} height={18} />
              : <MirrorOffIcon width={18} height={18} />}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
