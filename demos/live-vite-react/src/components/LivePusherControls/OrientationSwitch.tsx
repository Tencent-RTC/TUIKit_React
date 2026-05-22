import { useEffect, useRef, useState } from 'react';
import { IconHorizontalMode, IconPortrait, Toast, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { LiveOrientation, useLiveListState } from 'tuikit-atomicx-react';
import PusherControlButton from './PusherControlButton';
import { TUISeatLayoutTemplate } from './types';

function isValidLayout(layout?: number) {
  return Boolean(layout && layout !== 0);
}

function isLandscapeLayout(layout: number) {
  return layout < TUISeatLayoutTemplate.PortraitDynamic_Grid9
    && layout >= TUISeatLayoutTemplate.LandscapeDynamic_1v3;
}

function isPortraitLayout(layout: number) {
  return layout >= TUISeatLayoutTemplate.PortraitDynamic_Grid9;
}

/**
 * OrientationSwitch — React port of Vue3 `OrientationSwitch.vue`.
 *
 * Two pieces of state: a watched `layoutTemplate` (read from
 * useLiveListState) and a local `currentOrientation` we drive ourselves.
 * Vue intentionally keeps these decoupled - the layoutTemplate watch
 * pushes orientation, and the click handler decides next layout based
 * on orientation - so that during the brief "layoutTemplate = 0" window
 * after endLive the button still displays the previous orientation
 * instead of falling back to landscape.
 */
export default function OrientationSwitch() {
  const { t } = useUIKit();
  const { currentLive, updateLiveInfo } = useLiveListState();
  const layoutBeforeLiveRef = useRef<number>(TUISeatLayoutTemplate.LandscapeDynamic_1v3);
  const [currentOrientation, setCurrentOrientation] = useState<LiveOrientation>(LiveOrientation.LANDSCAPE);

  const layoutTemplate = currentLive?.layoutTemplate;
  const liveId = currentLive?.liveId;

  // 1:1 of Vue3 watch(currentLive.value?.layoutTemplate, immediate=true).
  useEffect(() => {
    const hasLiveId = Boolean(liveId);

    // After endLive() the layout transiently flips to 0 - restore the
    // last user-picked layout. We use the same "layoutBeforeLive" ref
    // Vue keeps as a closure variable.
    if (!isValidLayout(layoutTemplate) && !hasLiveId) {
      void updateLiveInfo({ layoutTemplate: layoutBeforeLiveRef.current });
      return;
    }

    // Remember the layout the user actually went live with so that
    // ending the live session restores the matching orientation.
    //
    // The original implementation only captured the layout BEFORE the
    // live started (i.e. when `!hasLiveId && isValidLayout`). That
    // misses an important case: after a page refresh the local state
    // is reset, so `layoutBeforeLiveRef.current` falls back to its
    // default (LandscapeDynamic_1v3). If the user then resumes a
    // portrait live via the restore-prompt and later ends it, the
    // effect above would push the *default landscape* layout back,
    // flipping the pusher from portrait to landscape - which the user
    // reported as "刷新后再 endLive 从竖屏变成了横屏".
    //
    // By also capturing the current layoutTemplate while the live is
    // running, we always restore to the orientation the live was
    // actually streamed in, regardless of whether the user joined a
    // fresh or restored session.
    if (isValidLayout(layoutTemplate)) {
      layoutBeforeLiveRef.current = layoutTemplate!;
    }

    if (layoutTemplate) {
      if (isLandscapeLayout(layoutTemplate)) {
        setCurrentOrientation(LiveOrientation.LANDSCAPE);
      } else if (isPortraitLayout(layoutTemplate)) {
        setCurrentOrientation(LiveOrientation.PORTRAIT);
      }
    }
  }, [layoutTemplate, liveId, updateLiveInfo]);

  // 1:1 of Vue3 watch(currentLive.value?.liveId, immediate=true) — make
  // sure we always have a sane default landscape layout on the very
  // first load (when both liveId and layoutTemplate are empty).
  useEffect(() => {
    if (!liveId && !isValidLayout(layoutTemplate)) {
      void updateLiveInfo({ layoutTemplate: layoutBeforeLiveRef.current });
    }
    // We intentionally only depend on liveId — running this whenever
    // layoutTemplate changes would race with the previous effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  const handleOrientationSwitch = () => {
    if (liveId) {
      Toast.error({ message: t('live_pusher.cannot_switch_orientation_during_live') });
      return;
    }

    if (currentOrientation === LiveOrientation.PORTRAIT) {
      void updateLiveInfo({ layoutTemplate: TUISeatLayoutTemplate.LandscapeDynamic_1v3 });
    } else {
      void updateLiveInfo({ layoutTemplate: TUISeatLayoutTemplate.PortraitDynamic_Grid9 });
    }
  };

  const isLandscape = currentOrientation === LiveOrientation.LANDSCAPE;

  return (
    <PusherControlButton
      // Use `dimmed` rather than `disabled` so the click still goes
      // through during a live session; the handler then surfaces a
      // toast explaining that orientation cannot be switched mid-live,
      // matching Vue3's `OrientationSwitch.vue` behavior.
      dimmed={Boolean(liveId)}
      icon={isLandscape ? <IconHorizontalMode size="24" /> : <IconPortrait size="24" />}
      label={isLandscape ? t('live_pusher.landscape') : t('live_pusher.portrait')}
      onClick={handleOrientationSwitch}
    />
  );
}
