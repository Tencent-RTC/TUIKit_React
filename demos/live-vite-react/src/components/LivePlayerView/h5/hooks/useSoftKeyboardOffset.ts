import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// The bar's SCSS reads `bottom: calc(<baseline> + var(--keyboard-offset, 0px))`.
// Lift via `bottom`, never `transform`: a transformed ancestor would become the
// containing block of the input's fixed outside-tap mask.
const KEYBOARD_OFFSET_CSS_VAR = '--keyboard-offset';
// iOS fires a burst of viewport events while the keyboard animates; write once
// after the burst settles so content does not slide in lockstep.
const VIEWPORT_SETTLE_DELAY_MS = 120;
// Fallback write when no viewport event arrives on first focus.
const FINAL_SYNC_DELAY_MS = 400;

const isIOSWithVisualViewport = (() => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !!window.visualViewport;
})();

function preventScroll(event: TouchEvent) {
  event.preventDefault();
}

// iOS <= 25 scrolls the document up to reveal the focused input, dragging the
// fixed player root with it.
function pinDocumentScroll() {
  if (window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  if (document.documentElement.scrollTop !== 0) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body.scrollTop !== 0) {
    document.body.scrollTop = 0;
  }
}

function useSoftKeyboardOffset(barRef: RefObject<HTMLElement | null>) {
  const settleTimerRef = useRef(0);
  const finalSyncTimerRef = useRef(0);

  const writeOffset = useCallback(() => {
    const element = barRef.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) {
      return;
    }
    // Do not subtract `viewport.offsetTop`; pinDocumentScroll already undoes it.
    const hiddenHeight = Math.max(0, window.innerHeight - viewport.height);
    const maxOffset = Math.max(0, viewport.height - element.offsetHeight - 8);
    const offset = Math.min(hiddenHeight, maxOffset);
    if (offset > 0) {
      element.style.setProperty(KEYBOARD_OFFSET_CSS_VAR, `${offset}px`);
    } else {
      element.style.removeProperty(KEYBOARD_OFFSET_CSS_VAR);
    }
  }, [barRef]);

  const handleViewportChange = useCallback(() => {
    pinDocumentScroll();
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(writeOffset, VIEWPORT_SETTLE_DELAY_MS);
  }, [writeOffset]);

  const detach = useCallback(() => {
    window.removeEventListener('touchmove', preventScroll);
    window.clearTimeout(settleTimerRef.current);
    window.clearTimeout(finalSyncTimerRef.current);
    const viewport = window.visualViewport;
    if (isIOSWithVisualViewport && viewport) {
      viewport.removeEventListener('resize', handleViewportChange);
      viewport.removeEventListener('scroll', handleViewportChange);
    }
    barRef.current?.style.removeProperty(KEYBOARD_OFFSET_CSS_VAR);
  }, [barRef, handleViewportChange]);

  const handleInputFocus = useCallback(() => {
    window.addEventListener('touchmove', preventScroll, { passive: false });
    const viewport = window.visualViewport;
    if (!isIOSWithVisualViewport || !viewport) {
      return;
    }
    viewport.addEventListener('resize', handleViewportChange);
    viewport.addEventListener('scroll', handleViewportChange);
    // Do not scroll synchronously here: iOS aborts the keyboard-open flow.
    window.clearTimeout(finalSyncTimerRef.current);
    finalSyncTimerRef.current = window.setTimeout(writeOffset, FINAL_SYNC_DELAY_MS);
  }, [handleViewportChange, writeOffset]);

  const handleInputBlur = useCallback(() => {
    detach();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [detach]);

  useEffect(() => detach, [detach]);

  return { handleInputFocus, handleInputBlur };
}

export { useSoftKeyboardOffset };
