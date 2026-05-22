import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Toast,
  ToastType,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import {
  TRTCMediaSourceType,
  TUIVideoQuality,
} from '@tencentcloud/tuiroom-engine-js';
import classNames from 'classnames';
import type { MediaSource } from 'tuikit-atomicx-react';
import { useDeviceState, useVideoMixerState } from 'tuikit-atomicx-react';
import styles from './LiveScenePanel.module.scss';
import CameraSettingDialog from './CameraSettingDialog';
import LiveSceneSelect from './LiveSceneSelect';
import MaterialItem from './MaterialItem';
import MaterialRenameDialog from './MaterialRenameDialog';

const PLUGIN_NOT_STARTED_RETRY_DELAY_MS = 300;
const PLUGIN_NOT_STARTED_MAX_RETRIES = 3;

function isPluginNotStartedError(error: unknown) {
  if (!error) {
    return false;
  }
  const message = String((error as { message?: string })?.message || error || '');
  const code = (error as { code?: string | number })?.code;
  return code === 'OPERATION_ABORT'
    || code === 5998
    || message.includes('updatePlugin abort: not started')
    || message.includes('OPERATION_ABORT');
}

function createSourceId(type: TRTCMediaSourceType) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${type}_${crypto.randomUUID().slice(0, 5)}`;
  }
  return `${type}_${Math.random().toString(36).slice(2, 7)}`;
}

function getCanvasSize(videoResolution: TUIVideoQuality, isLandscape: boolean) {
  const sizeMap = {
    [TUIVideoQuality.kVideoQuality_360p]: { width: 640, height: 360 },
    [TUIVideoQuality.kVideoQuality_540p]: { width: 960, height: 540 },
    [TUIVideoQuality.kVideoQuality_720p]: { width: 1280, height: 720 },
    [TUIVideoQuality.kVideoQuality_1080p]: { width: 1920, height: 1080 },
  };
  const baseSize = sizeMap[videoResolution] || sizeMap[TUIVideoQuality.kVideoQuality_720p];
  return isLandscape ? baseSize : { width: baseSize.height, height: baseSize.width };
}

export default function LiveScenePanel() {
  const { t } = useUIKit();
  const { getCameraList, cameraList } = useDeviceState();
  const {
    mediaSourceList,
    publishVideoQuality,
    currentLiveOrientation,
    addMediaSource,
    updateMediaSource,
    removeMediaSource,
    clearMediaSource,
    enableLocalVideoMixer,
  } = useVideoMixerState();

  const [showCameraSettingDialog, setShowCameraSettingDialog] = useState(false);
  const [showMaterialRenameDialog, setShowMaterialRenameDialog] = useState(false);
  const [cameraSettingMediaSource, setCameraSettingMediaSource] = useState<MediaSource | null>(null);
  const [renameMaterial, setRenameMaterial] = useState<MediaSource | null>(null);

  const mediaSourceListWithZOrderSort = useMemo(
    () => [...mediaSourceList].sort((item1, item2) => (item2.layout?.zOrder || 0) - (item1.layout?.zOrder || 0)),
    [mediaSourceList],
  );

  useEffect(() => {
    enableLocalVideoMixer();
    void getCameraList();

    return () => {
      clearMediaSource();
    };
  }, [clearMediaSource, enableLocalVideoMixer, getCameraList]);

  // The TRTC web SDK starts its VideoMixer plugin asynchronously inside
  // bindPreviewArea(). If a user adds a media source before that startup
  // completes, the SDK throws OPERATION_ABORT ("updatePlugin abort: not
  // started") and silently drops the source from the published mix - the
  // first source already in the mix keeps occupying the canvas, while every
  // source added after it is missing on the viewer side. Retry briefly so
  // the call lands once the plugin is ready.
  const addMediaSourceWithRetry = useCallback(async (source: MediaSource) => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= PLUGIN_NOT_STARTED_MAX_RETRIES; attempt += 1) {
      try {
        await addMediaSource(source);
        return;
      } catch (error) {
        lastError = error;
        if (!isPluginNotStartedError(error)) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, PLUGIN_NOT_STARTED_RETRY_DELAY_MS));
      }
    }
    throw lastError;
  }, [addMediaSource]);

  // External-camera hot-plug recovery (label-based).
  //
  // When the user unplugs and re-plugs an external camera, the TRTC web
  // SDK fires `onDeviceChanged` with `kMediaDeviceStateAdd` and the
  // shared VideoMixerState handler calls `mediaSourceManager.updateMediaSource`
  // on every source whose `camera.cameraId` matches the re-added device.
  // On the React build that update path no-ops (the SDK keeps holding
  // the previously-bound, now-dead MediaStreamTrack) and the preview
  // freezes on the last frame captured before the unplug.
  //
  // The earlier recovery here matched by `deviceId`: when a deviceId
  // disappeared and the same deviceId reappeared, we did remove + add
  // on the matching source. That assumption is unsafe — Chromium /
  // WebKit do NOT guarantee a stable deviceId across unplug-replug
  // cycles for USB UVC cameras, especially when the user moves to a
  // different USB port or the OS reissues a new mediaDevices session
  // key. When the deviceId changes, the old recovery code can never
  // match the source against the new list, so:
  //   - `LiveScenePanel`'s recovery effect bails out (`sources = []`).
  //   - `VideoMixerState.onDeviceChanged` also bails out (its filter
  //     compares `item.camera.cameraId === deviceId`, but the source
  //     still carries the *old* cameraId).
  // The dead MediaStreamTrack stays bound to the mixer channel until
  // some unrelated SDK code path reissues `getUserMedia()` without
  // `deviceId.exact`, and the browser's default-camera fallback hands
  // it whichever camera happens to be first in `enumerateDevices()` —
  // on macOS this is often OBS Virtual Camera. Net effect: the
  // pusher's local mixer preview shows the right physical camera but
  // the published mix stream silently switches to OBS for the audience.
  //
  // To make recovery robust against deviceId churn, we anchor on the
  // `deviceName` (browser-reported label) instead. For each camera
  // source we remember the deviceName we saw at add-time. When the
  // cameraList changes, we look at every camera source whose current
  // cameraId is no longer in the cameraList; if a *new* deviceId with
  // the same deviceName has just appeared, we treat that as the same
  // physical camera coming back, rewrite the source's cameraId to the
  // new deviceId, and force remove + add to bind a fresh
  // MediaStreamTrack.
  //
  // Edge cases handled:
  //   - Two cameras with the same label (e.g. two identical webcams):
  //     we only auto-recover when there's exactly one unambiguous
  //     candidate not already claimed by another live source.
  //   - First mount baseline: we just record the snapshot; nothing to
  //     recover yet.
  //   - Sources whose camera is still present: untouched (the common
  //     case, e.g. resolution probes briefly toggling cameraList).
  const cameraListRef = useRef(cameraList);
  useEffect(() => {
    cameraListRef.current = cameraList;
  }, [cameraList]);

  const mediaSourceListRef = useRef(mediaSourceList);
  useEffect(() => {
    mediaSourceListRef.current = mediaSourceList;
  }, [mediaSourceList]);

  // Map<sourceId, deviceName>. Deliberately decoupled from
  // `MediaSource.name`, which the user can rename via the rename
  // dialog: once renamed it no longer reflects the OS-reported label
  // and would defeat label-based matching.
  const sourceDeviceNameRef = useRef<Map<string, string>>(new Map());

  // Keep the source -> deviceName map in sync with the live
  // mediaSourceList. We refresh on every list change so newly added
  // sources record their label from the *current* cameraList snapshot,
  // and removed sources are pruned. We never overwrite an existing
  // entry: once a source has a remembered label, that label is the
  // anchor for future recovery even if cameraList briefly drops it
  // (e.g. mid-unplug, when the cameraId is already gone but the
  // source still exists).
  useEffect(() => {
    const knownNames = sourceDeviceNameRef.current;
    const liveSourceIds = new Set<string>();
    mediaSourceList.forEach((source) => {
      if (source.type !== TRTCMediaSourceType.kCamera) {
        return;
      }
      liveSourceIds.add(source.id);
      if (knownNames.has(source.id)) {
        return;
      }
      const cameraId = source.camera?.cameraId;
      if (!cameraId) {
        return;
      }
      const deviceName = cameraListRef.current.find(item => item.deviceId === cameraId)?.deviceName;
      if (deviceName) {
        knownNames.set(source.id, deviceName);
      }
    });
    // Prune entries whose source has been removed.
    knownNames.forEach((_, id) => {
      if (!liveSourceIds.has(id)) {
        knownNames.delete(id);
      }
    });
  }, [mediaSourceList]);

  // First-mount baseline guard. We don't run recovery on the very
  // first cameraList we see — there's nothing to "re-plug" yet, and
  // the bootstrap flow may also fire this effect before any source
  // exists.
  const hasCameraListBaselineRef = useRef(false);
  useEffect(() => {
    if (!hasCameraListBaselineRef.current) {
      hasCameraListBaselineRef.current = true;
      return;
    }

    const currentIds = new Set(cameraList.map(item => item.deviceId));
    const knownNames = sourceDeviceNameRef.current;

    // For each camera source whose deviceId is gone, look up its
    // remembered deviceName and search the current cameraList for a
    // candidate deviceId that:
    //   1. matches that deviceName, AND
    //   2. is not already claimed by some other still-alive camera
    //      source (so we never accidentally migrate a source onto a
    //      camera that is currently in use by a different source).
    const liveSources = mediaSourceListRef.current;
    const inUseCameraIds = new Set(
      liveSources
        .filter(item => item.type === TRTCMediaSourceType.kCamera && item.camera?.cameraId)
        .map(item => item.camera!.cameraId),
    );

    type RecoveryPlan = { source: MediaSource; nextCameraId: string };
    const plans: RecoveryPlan[] = [];

    liveSources.forEach((source) => {
      if (source.type !== TRTCMediaSourceType.kCamera) {
        return;
      }
      const oldCameraId = source.camera?.cameraId;
      if (!oldCameraId || currentIds.has(oldCameraId)) {
        // Camera still present under the same deviceId → nothing to do.
        return;
      }
      const deviceName = knownNames.get(source.id);
      if (!deviceName) {
        // We never recorded a label for this source (e.g. it was
        // added before cameraList contained the device). Skip rather
        // than guess.
        return;
      }
      const candidates = cameraList.filter(
        item => item.deviceName === deviceName
          && item.deviceId !== oldCameraId
          && !inUseCameraIds.has(item.deviceId),
      );
      if (candidates.length !== 1) {
        // Either the camera hasn't reappeared yet, or there are
        // multiple identically-labelled candidates and we can't tell
        // which one belongs to this source. Stay silent — better to
        // leave the source frozen than to bind it to the wrong
        // physical device (which is the exact failure mode this
        // change is trying to prevent).
        return;
      }
      plans.push({ source, nextCameraId: candidates[0].deviceId });
      // Mark the candidate as claimed so a second source with the
      // same label in the same recovery pass can't pick it too.
      inUseCameraIds.add(candidates[0].deviceId);
    });

    if (plans.length === 0) {
      return;
    }

    // Process serially: removeMediaSource and addMediaSource both
    // mutate the shared mixer plugin state, and running them in
    // parallel can race the SDK's internal queue. Use reduce to chain
    // promises instead of a for-await loop (no-await-in-loop).
    const recoverySteps = plans.map(({ source, nextCameraId }) => async () => {
      try {
        await removeMediaSource(source);
        // Preserve id / layout / name; only swap cameraId so the
        // on-screen position, size, mirror settings, and (possibly
        // user-renamed) display name stay put across the unplug-replug.
        const recovered: MediaSource = {
          ...source,
          camera: {
            ...(source.camera as NonNullable<MediaSource['camera']>),
            cameraId: nextCameraId,
          },
        };
        await addMediaSourceWithRetry(recovered);
        // Refresh the remembered label against the new cameraId
        // (deviceName itself shouldn't change, but the entry might
        // have come back with a slightly different label suffix on
        // some platforms — keep the map honest).
        const refreshedName = cameraListRef.current
          .find(item => item.deviceId === nextCameraId)?.deviceName;
        if (refreshedName) {
          sourceDeviceNameRef.current.set(source.id, refreshedName);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[LiveScenePanel] camera hot-plug recovery failed for source', source.id, error);
      }
    });
    recoverySteps
      .reduce<Promise<void>>((acc, step) => acc.then(step), Promise.resolve())
      .catch(() => undefined);
    // Intentionally only reacts to cameraList. The recovery flow uses
    // refs for mediaSourceList / cameraList / handlers so it always
    // sees the latest values without re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraList]);

  const addCameraMaterial = async (material: Partial<MediaSource>) => {
    // Close the dialog *immediately* so the user does not stare at a
    // frozen preview while the mixer's getUserMedia() warms up. The
    // dialog will have already torn down its preview TRTCCloud (see
    // CameraSettingDialog.handleConfirm) so the camera is fully
    // released by the time we issue the mixer-side capture below -
    // critical on Safari, which serialises captures of the same
    // physical camera and otherwise stalls 6-10s on first frame.
    setShowCameraSettingDialog(false);
    try {
      const deviceName = cameraList.find(item => item.deviceId === material.camera?.cameraId)?.deviceName;
      await addMediaSourceWithRetry({
        id: material.id || createSourceId(TRTCMediaSourceType.kCamera),
        type: TRTCMediaSourceType.kCamera,
        name: deviceName || t('Camera'),
        ...material,
      } as MediaSource);
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        Toast({
          type: ToastType.WARNING,
          message: t('Please check the current browser camera permission'),
        });
      }
    }
  };

  const handleUpdateMaterial = async (material: MediaSource, materialOption: Partial<MediaSource>) => {
    // Same rationale as addCameraMaterial: close the dialog first so
    // the preview cloud tears down and releases the camera before
    // updateMediaSource re-issues getUserMedia for the new resolution.
    setShowCameraSettingDialog(false);
    setShowMaterialRenameDialog(false);
    await updateMediaSource(material, materialOption);
  };

  const updateMaterialName = (material: MediaSource) => {
    setRenameMaterial(material);
    setShowMaterialRenameDialog(true);
  };

  const updateCameraSetting = (material: MediaSource) => {
    setCameraSettingMediaSource(material);
    setShowCameraSettingDialog(true);
  };

  const addImageMaterial = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement)?.files?.[0];
      if (!file) {
        return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      image.onload = async () => {
        const { width: canvasWidth, height: canvasHeight } = getCanvasSize(
          publishVideoQuality,
          currentLiveOrientation === 'landscape',
        );
        const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);

        try {
          await addMediaSourceWithRetry({
            id: createSourceId(TRTCMediaSourceType.kImage),
            type: TRTCMediaSourceType.kImage,
            name: t('Image'),
            image: { url },
            layout: {
              rect: {
                left: 0,
                top: 0,
                right: image.width * scale,
                bottom: image.height * scale,
              },
            },
          } as MediaSource);
        } catch (error) {
          // If adding the image source fails (e.g. mixer plugin still not
          // ready after retries), release the object URL to avoid leaking
          // browser memory. On success we intentionally KEEP the URL alive
          // for the lifetime of the source; the underlying TRTC SDK keeps
          // an internal <img> reference that re-reads from the same blob
          // URL on every mixer re-layout (rotation, resolution change,
          // template switch, etc.). Revoking the URL immediately after a
          // successful add caused the image to vanish on the next mixer
          // refresh, which the user observed as "添加图片偶现不显示" when
          // a camera/screen source happens to trigger a relayout right
          // after the image is added.
          URL.revokeObjectURL(url);
          throw error;
        }
      };
    };
    input.click();
  };

  const selectMaterial = async (type: TRTCMediaSourceType) => {
    switch (type) {
      case TRTCMediaSourceType.kCamera:
        setCameraSettingMediaSource(null);
        setShowCameraSettingDialog(true);
        break;
      case TRTCMediaSourceType.kScreen:
        try {
          await addMediaSourceWithRetry({
            id: createSourceId(TRTCMediaSourceType.kScreen),
            type: TRTCMediaSourceType.kScreen,
            name: t('Screen'),
            screen: {
              sourceId: 'screen',
              resolution: { width: 5760, height: 3240 },
              systemAudio: true,
              fps: 15,
            },
          } as MediaSource);
        } catch (error) {
          // Aligned with the Vue3 demo `addMediaSource(...)` call site,
          // which has no try/catch around the screen-share path: the SDK
          // already logs the underlying cause (NotAllowedError when the
          // user clicks Cancel, NotFoundError when no screen is shared,
          // etc.) via its own console.error, so we should NOT surface a
          // generic "请检查浏览器屏幕共享权限" toast on top of that.
          //
          // We previously tried to detect "user-cancelled" by sniffing
          // `error.name === 'NotAllowedError'`, but the TRTC web SDK
          // wraps the original DOMException into a brand-new error with
          // `code: 'INVALID_PARAMETER'` / message `all sources mix
          // failed code:5000` before rejecting `addMediaSource`. The
          // original `NotAllowedError` is consumed inside the SDK and
          // is not reachable from here, so any name/message-based
          // heuristic is fundamentally unreliable.
          //
          // The only error class still worth surfacing is
          // OPERATION_ABORT (the VideoMixer plugin was not yet started
          // when the user clicked Add - this is recoverable by retrying
          // a moment later, which `addMediaSourceWithRetry` already
          // attempts a few times before giving up).
          if (isPluginNotStartedError(error)) {
            Toast({
              type: ToastType.WARNING,
              message: t('Failed to add screen share, please try again after the mixer preview is ready'),
            });
          }
        }
        break;
      case TRTCMediaSourceType.kImage:
        addImageMaterial();
        break;
      default:
        Toast({
          type: ToastType.WARNING,
          message: t('This type of material is not supported yet'),
        });
        break;
    }
  };

  return (
    <div
      className={classNames(styles['live-scene-panel'], {
        [styles['no-material']]: mediaSourceList.length === 0,
      })}
    >
      <LiveSceneSelect
        displayMode={mediaSourceList.length === 0 ? 'panel' : 'button'}
        onAddMaterial={selectMaterial}
      />

      <div className={styles['materials-list']}>
        {mediaSourceListWithZOrderSort.map((material) => (
          <MaterialItem
            key={material.id}
            material={material}
            onCameraSetting={updateCameraSetting}
            onRename={updateMaterialName}
          />
        ))}
      </div>

      {showCameraSettingDialog && (
        <CameraSettingDialog
          mediaSource={cameraSettingMediaSource}
          onClose={() => setShowCameraSettingDialog(false)}
          onAddCameraMaterial={addCameraMaterial}
          onUpdateCameraMaterial={(materialOption) => {
            if (!cameraSettingMediaSource) {
              return;
            }
            void handleUpdateMaterial(cameraSettingMediaSource, materialOption);
          }}
        />
      )}

      {showMaterialRenameDialog && renameMaterial && (
        <MaterialRenameDialog
          material={renameMaterial}
          onClose={() => setShowMaterialRenameDialog(false)}
          onRename={(name) => {
            void handleUpdateMaterial(renameMaterial, { name });
          }}
        />
      )}
    </div>
  );
}
