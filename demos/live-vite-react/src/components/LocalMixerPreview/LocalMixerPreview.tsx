import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import TUIRoomEngine, {
  TRTCVideoResolutionMode,
  TRTCVideoRotation,
  TUIVideoQuality,
} from '@tencentcloud/tuiroom-engine-js';
import { useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useLiveListState, useRoomEngine, useVideoMixerState } from 'tuikit-atomicx-react';
import MixerControl from './MixerControl';
import styles from './LocalMixerPreview.module.scss';

const MIXER_VIEW_ID = 'local-video-mixer';
// DOM id that the LiveGiftState AnimationPlayerManager (SVGA / MP4
// gift player) binds to by default. Matches the `DEFAULT_VIEW` inside
// `uikit-component-react/.../LiveGiftState/AnimationPlayerManager.ts`
// and the id that <LiveView> already renders on the audience side.
// Rendering a matching element on the pusher side lets anchors see the
// magic-cat / super-car gift animations play over their own composed
// video - same behavior Vue3 has inherited from <LiveCoreView>.
//
// Note: the pusher page and the audience page are mounted on different
// routes, so the element with this id only exists in one of them at a
// time; no DOM-id collision in practice.
const GIFT_PLAYER_VIEW_ID = 'livekit-svg-special-effects';
const CONTROL_MARGIN_WITH_MEDIA_SOURCE = 6;
const DEFAULT_CONTROL_SIZE = { width: 320, height: 54 };

function getCanvasSize(quality: TUIVideoQuality, resMode: TRTCVideoResolutionMode) {
  const sizeMap: Record<number, { width: number; height: number }> = {
    [TUIVideoQuality.kVideoQuality_360p]: { width: 640, height: 360 },
    [TUIVideoQuality.kVideoQuality_540p]: { width: 960, height: 540 },
    [TUIVideoQuality.kVideoQuality_720p]: { width: 1280, height: 720 },
    [TUIVideoQuality.kVideoQuality_1080p]: { width: 1920, height: 1080 },
  };
  const base = sizeMap[quality] || sizeMap[TUIVideoQuality.kVideoQuality_720p];
  if (resMode === TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait) {
    return { width: base.height, height: base.width };
  }
  return base;
}

function isLandscapeLayout(layoutTemplate?: number) {
  return Boolean(layoutTemplate && layoutTemplate >= 200 && layoutTemplate <= 599);
}

/**
 * LocalMixerPreview - React port of Vue3 `StreamMixer/LocalMixer/index.vue`.
 *
 * Design contract (do NOT diverge from this without revisiting Vue):
 *   1. The `<div id="local-video-mixer">` is handed wholesale to the SDK
 *      via `mediaSourceManager.bindPreviewArea(view)`. The SDK's designer
 *      then injects its own children (the mixer canvas + a moveAndResize
 *      overlay) and binds mousedown / mousemove / mouseup events on
 *      them. ALL drag / resize / select interaction is handled inside
 *      the SDK; React must NOT render a selection box, resize handles,
 *      or attach pointer listeners on top of this view.
 *   2. The store layer (atomicx-react VideoMixerState) listens to
 *      onSourceMoved / onSourceResized / onSourceSelected events and
 *      writes the resulting layout/selection state back into
 *      `mediaSourceList`. This is the only path that mutates the mix
 *      from interactive editing.
 *   3. The MixerControl floating toolbar is rendered in React on top of
 *      the active source. It only computes its own translate transform
 *      based on activeMediaSource.layout.rect; it does not bind pointer
 *      events on the preview surface.
 *   4. publish lifecycle is driven solely by `currentLive.liveId`:
 *      undefined -> id  →  startPublish()
 *      id        -> ''  →  stopPublish()
 *      Nothing else (no rebindPreviewArea, no DOM clearing, no plugin
 *      restart). startPublish/stopPublish never replace the
 *      mixVideoTrack the audience side has subscribed to.
 *   5. `mediaSourceManager.destroy()` is only called on real unmount.
 */
export default function LocalMixerPreview() {
  const { t } = useUIKit();
  const { currentLive } = useLiveListState();
  const {
    activeMediaSource,
    enableLocalVideoMixer,
    publishVideoQuality,
    mediaSourceList,
  } = useVideoMixerState();
  const roomEngine = useRoomEngine();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const mixerControlRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [mixerControlSize, setMixerControlSize] = useState(DEFAULT_CONTROL_SIZE);
  const [mixerControlStyle, setMixerControlStyle] = useState<CSSProperties>({
    transform: 'translate(0px, 0px)',
  });

  // Pusher defaults to landscape. Before OrientationSwitch's effect
  // applies the default landscape layoutTemplate, currentLive.layoutTemplate
  // is 0/undefined right after mount and again after endLive() resets
  // currentLive to its default. Treating those transient states as
  // landscape avoids a portrait→landscape flicker on first render.
  const isLandscape = useMemo(() => {
    const layoutTemplate = currentLive?.layoutTemplate;
    if (layoutTemplate) {
      return isLandscapeLayout(layoutTemplate);
    }
    return true;
  }, [currentLive?.layoutTemplate]);

  const canvasSize = useMemo(
    () => getCanvasSize(
      publishVideoQuality,
      isLandscape
        ? TRTCVideoResolutionMode.TRTCVideoResolutionModeLandscape
        : TRTCVideoResolutionMode.TRTCVideoResolutionModePortrait,
    ),
    [isLandscape, publishVideoQuality],
  );

  // ---------------------------------------------------------------
  //  Enable mixer state on mount (pulls in initMediaSourceManager).
  // ---------------------------------------------------------------
  useEffect(() => {
    enableLocalVideoMixer();
  }, [enableLocalVideoMixer]);

  // We intentionally do NOT call setGiftPlayerView() here. The
  // AnimationPlayerManager singleton (from LiveGiftState) defaults its
  // `currentView` to `livekit-svg-special-effects` - the same id we
  // render on the mixer preview - so gift animations hit our DOM node
  // out of the box. <LiveView> on the audience page also uses this
  // same id; the two pages never mount at the same time, so no DOM-id
  // collision occurs.
  //
  // Switching to a custom id would require calling setGiftPlayerView()
  // from inside this component, which in turn requires re-exporting it
  // through `tuikit-atomicx-react`. Using the default id keeps the fix
  // demo-local with no package API change.

  // ---------------------------------------------------------------
  //  Track the container's measured size. Since the container itself
  //  is aspect-ratio-locked (see JSX below), stageSize is simply the
  //  container size - the SDK paints into this same box, and the
  //  MixerControl placement math uses it as the "viewport" for
  //  activeMediaSource.layout.rect.
  //
  //  We also measure the *parent* (`.centerBody`) so we can pick the
  //  right anchor axis for the aspect-ratio: anchor by width when the
  //  parent is wider than the canvas ratio (use `width:100%; height:auto`),
  //  anchor by height otherwise. Either way the container ends up as
  //  the biggest inscribed rectangle of canvasSize ratio.
  // ---------------------------------------------------------------
  const [parentSize, setParentSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const parent = containerRef.current.parentElement;
    if (!parent) {
      return undefined;
    }
    const update = () => {
      const parentRect = parent.getBoundingClientRect();
      setParentSize(prev => (
        prev.width === Math.round(parentRect.width)
        && prev.height === Math.round(parentRect.height)
          ? prev
          : { width: Math.round(parentRect.width), height: Math.round(parentRect.height) }
      ));

      const node = containerRef.current;
      if (!node) {
        return;
      }
      const { width, height } = node.getBoundingClientRect();
      if (!width || !height) {
        return;
      }
      setStageSize(prev => (
        prev.width === Math.round(width) && prev.height === Math.round(height)
          ? prev
          : { width: Math.round(width), height: Math.round(height) }
      ));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Decide whether to anchor the aspect-ratio box to the parent's
  // width (letterbox top/bottom) or height (pillarbox left/right).
  const anchorByHeight = useMemo(() => {
    if (!parentSize.width || !parentSize.height) {
      // On first paint before the ResizeObserver lands, fall back to
      // "anchor by height" for landscape and "anchor by width" for
      // portrait so the preview never starts 0-sized. Close enough
      // visually for a single frame.
      return canvasSize.width >= canvasSize.height;
    }
    const parentRatio = parentSize.width / parentSize.height;
    const canvasRatio = canvasSize.width / canvasSize.height;
    // Anchor-by-height when parent is wider than the canvas ratio:
    // stretching to 100% height would leave pillarbox on the sides.
    // Otherwise anchor-by-width and letterbox top/bottom.
    return parentRatio > canvasRatio;
  }, [canvasSize.height, canvasSize.width, parentSize.height, parentSize.width]);

  // ---------------------------------------------------------------
  //  bindPreviewArea once the engine is ready. This is the spot
  //  where the SDK starts the VideoMixer plugin and creates the
  //  designer; both are required before startPublish() can publish
  //  a non-null mixVideoTrack.
  // ---------------------------------------------------------------
  useEffect(() => {
    let destroyed = false;
    const tryBind = async () => {
      const manager = roomEngine.instance?.getTRTCCloud().getMediaMixingManager();
      if (!manager || destroyed || !previewRef.current) {
        return;
      }
      try {
        await manager.bindPreviewArea(previewRef.current);
      } catch (error) {
        // The SDK rejects pending startPlugin calls with OPERATION_ABORT
        // when bindPreviewArea is invoked again before the previous one
        // settles (StrictMode double-mount). The newer call still wins,
        // so we just log and move on.
        console.warn('[LocalMixerPreview] bindPreviewArea failed:', error);
      }
    };
    if (roomEngine.instance) {
      void tryBind();
    } else {
      TUIRoomEngine.once('ready', () => void tryBind());
    }
    return () => {
      destroyed = true;
    };
  }, [roomEngine.instance]);

  // ---------------------------------------------------------------
  //  publish lifecycle, driven only by currentLive.liveId. We use
  //  prevLiveIdRef so that StrictMode's synthetic mount→cleanup→
  //  remount cycle does not trigger a stop+restart that would
  //  replace mixVideoTrack mid-publish.
  // ---------------------------------------------------------------
  const prevLiveIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevLiveIdRef.current;
    const next = currentLive?.liveId;
    prevLiveIdRef.current = next;
    if (prev === next) {
      return;
    }
    const manager = roomEngine.instance?.getTRTCCloud().getMediaMixingManager();
    if (!manager) {
      return;
    }
    if (next) {
      manager.startPublish().catch(error => {
        console.warn('[LocalMixerPreview] startPublish failed:', error);
      });
    } else {
      manager.stopPublish().catch(error => {
        console.warn('[LocalMixerPreview] stopPublish failed:', error);
      });
    }
  }, [currentLive?.liveId, roomEngine.instance]);

  // ---------------------------------------------------------------
  //  destroy on real unmount. Scheduled on the next tick and
  //  cancelled if the effect remounts immediately (StrictMode dev
  //  cleanup) so we don't tear down the mixer pipeline that
  //  enableLocalVideoMixer() just registered.
  // ---------------------------------------------------------------
  const destroyTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (destroyTimerRef.current !== null) {
      window.clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }
    return () => {
      destroyTimerRef.current = window.setTimeout(() => {
        destroyTimerRef.current = null;
        const manager = roomEngine.instance?.getTRTCCloud().getMediaMixingManager();
        manager?.destroy?.();
      }, 0);
    };
  }, [roomEngine.instance]);

  // ---------------------------------------------------------------
  //  MixerControl floating toolbar position. Computed from
  //  activeMediaSource.layout.rect mapped to stage coordinates.
  //  This block is purely visual: no events bound on the preview.
  // ---------------------------------------------------------------
  const updateMixerControlStyle = useCallback(() => {
    const rect = activeMediaSource?.layout?.rect;
    if (!rect || !stageSize.width || !stageSize.height) {
      return;
    }
    // MixerControl is a child of the stage (aspect-ratio-locked box),
    // so its translate origin is the stage's top-left. All coords are
    // computed relative to the stage, not the outer black viewport.
    const viewportWidth = stageSize.width;
    const viewportHeight = stageSize.height;
    const scale = Math.max(viewportWidth / canvasSize.width, viewportHeight / canvasSize.height);
    const previewWidth = canvasSize.width * scale;
    const previewHeight = canvasSize.height * scale;

    const rotation = activeMediaSource?.layout?.rotation || TRTCVideoRotation.TRTCVideoRotation0;
    const sourceWidth = rect.right - rect.left;
    const sourceHeight = rect.bottom - rect.top;
    const sourceTop = rect.top * scale - (previewHeight - viewportHeight) / 2;
    const sourceLeft = rect.left * scale - (previewWidth - viewportWidth) / 2;
    const isSideways = rotation === TRTCVideoRotation.TRTCVideoRotation90
      || rotation === TRTCVideoRotation.TRTCVideoRotation270;
    const sourceDisplayWidth = (isSideways ? sourceHeight : sourceWidth) * scale;
    const sourceDisplayHeight = (isSideways ? sourceWidth : sourceHeight) * scale;

    const sourceBottom = sourceTop + sourceDisplayHeight;
    const sourceCenterX = sourceLeft + sourceDisplayWidth / 2;

    let controlLeft = sourceCenterX - mixerControlSize.width / 2;
    let controlTop = sourceTop - CONTROL_MARGIN_WITH_MEDIA_SOURCE - mixerControlSize.height;

    if (controlLeft < 0) {
      controlLeft = 0;
    } else if (controlLeft + mixerControlSize.width > viewportWidth) {
      controlLeft = viewportWidth - mixerControlSize.width;
    }
    const topAvailable = sourceTop;
    const bottomAvailable = viewportHeight - sourceBottom;
    if (controlTop >= 0 && topAvailable >= mixerControlSize.height + CONTROL_MARGIN_WITH_MEDIA_SOURCE) {
      controlTop = Math.min(controlTop, viewportHeight - mixerControlSize.height);
    } else if (bottomAvailable >= mixerControlSize.height + CONTROL_MARGIN_WITH_MEDIA_SOURCE) {
      controlTop = Math.max(0, sourceBottom + CONTROL_MARGIN_WITH_MEDIA_SOURCE);
    } else {
      controlTop = Math.max(0, sourceTop - mixerControlSize.height - CONTROL_MARGIN_WITH_MEDIA_SOURCE);
    }

    setMixerControlStyle({
      transform: `translate(${Math.round(controlLeft)}px, ${Math.round(controlTop)}px)`,
    });
  }, [
    activeMediaSource?.layout?.rect,
    activeMediaSource?.layout?.rotation,
    canvasSize.height,
    canvasSize.width,
    mixerControlSize.height,
    mixerControlSize.width,
    stageSize.height,
    stageSize.width,
  ]);

  useEffect(() => {
    if (!mixerControlRef.current) {
      return undefined;
    }
    const sync = () => {
      const rect = mixerControlRef.current?.getBoundingClientRect() || DEFAULT_CONTROL_SIZE;
      if (!rect.width || !rect.height) {
        return;
      }
      setMixerControlSize(prev => (
        Math.round(prev.width) === Math.round(rect.width)
        && Math.round(prev.height) === Math.round(rect.height)
          ? prev
          : { width: rect.width, height: rect.height }
      ));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(mixerControlRef.current);
    return () => ro.disconnect();
  }, [activeMediaSource?.id]);

  useEffect(() => {
    updateMixerControlStyle();
  }, [updateMixerControlStyle]);

  return (
    <div
      ref={containerRef}
      className={styles['local-mixer-container']}
      // The outer black preview box itself is aspect-ratio-locked to
      // the publish canvas (16:9 landscape, 9:16 portrait). We anchor
      // the box to whichever axis of the parent flex slot is the
      // binding constraint:
      //   - parent wider than canvas ratio → anchor height to 100%,
      //     width is derived from aspect-ratio
      //   - parent taller than canvas ratio → anchor width to 100%,
      //     height is derived from aspect-ratio
      // so the result is always the largest inscribed rectangle of
      // the canvas ratio that fits into the flex parent.
      style={{
        aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
        width: anchorByHeight ? 'auto' : '100%',
        height: anchorByHeight ? '100%' : 'auto',
      }}
    >
      <div
        ref={previewRef}
        id={MIXER_VIEW_ID}
        className={styles['local-mixer-content']}
      />
      {/*
        SVGA/MP4 gift animation target. Positioned absolutely over the
        composed-video preview so that effect gifts (magic cat, super
        car, ...) animate in front of all mixer sources but behind the
        mixer-control floating toolbar. pointer-events: none keeps it
        from intercepting clicks on the SDK selection box below it.
      */}
      <div id={GIFT_PLAYER_VIEW_ID} className={styles['gift-player-view']} />
      {activeMediaSource && (
        <div
          ref={mixerControlRef}
          className={styles['mixer-control-wrap']}
          style={mixerControlStyle}
        >
          <MixerControl activeMediaSource={activeMediaSource} />
        </div>
      )}
      {mediaSourceList.length === 0 && (
        <div className={styles['local-mixer-placeholder']}>
          <span className={styles['placeholder-text']}>{t('live_pusher.no_video')}</span>
        </div>
      )}
    </div>
  );
}
