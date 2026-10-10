import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useLiveSeatState } from 'tuikit-atomicx-react';

// The list's SCSS reads `height: min(<design height>, 25%, var(--barrage-max-height, ...))`.
const BARRAGE_MAX_HEIGHT_CSS_VAR = '--barrage-max-height';
// LiveView does not export this id; it must match `STREAM_CONTAINER_ID` in uikit-component-react.
const STREAM_CONTENT_ID = 'atomicx-live-stream-content';
const SEAT_GAP = 8;
// Below roughly two messages the list is no longer useful, so overlap is accepted instead.
const MIN_BARRAGE_HEIGHT = 80;

// Co-guest tiles draw the nickname at their bottom edge and empty tiles hold the
// apply-for-seat entry; cap the barrage list so it starts below the lowest tile it would otherwise cover.
function useBarrageSeatAvoidance(listRef: RefObject<HTMLElement | null>) {
  const { seatList, canvas } = useLiveSeatState();

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return undefined;
    }
    // A tile spanning the whole canvas is the fullscreen host, not a co-guest tile.
    const tileRegions = seatList
      .filter(seat => seat.region && seat.region.h > 0 && seat.region.h < canvas?.height)
      .map(seat => seat.region!);

    let frameId = 0;
    const update = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const stream = document.getElementById(STREAM_CONTENT_ID);
        if (!stream || !canvas?.width || tileRegions.length === 0) {
          list.style.removeProperty(BARRAGE_MAX_HEIGHT_CSS_VAR);
          return;
        }
        const streamRect = stream.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        // LiveView scales both axes by the canvas width.
        const scale = streamRect.width / canvas.width;
        const tileBottoms = tileRegions
          .filter((region) => {
            const left = streamRect.left + region.x * scale;
            const top = streamRect.top + region.y * scale;
            return left < listRect.right && top < listRect.bottom;
          })
          .map(region => streamRect.top + (region.y + region.h) * scale);
        if (tileBottoms.length === 0) {
          list.style.removeProperty(BARRAGE_MAX_HEIGHT_CSS_VAR);
          return;
        }
        const availableHeight = Math.floor(listRect.bottom - Math.max(...tileBottoms) - SEAT_GAP);
        list.style.setProperty(BARRAGE_MAX_HEIGHT_CSS_VAR, `${Math.max(MIN_BARRAGE_HEIGHT, availableHeight)}px`);
      });
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(list.parentElement || list);
    const stream = document.getElementById(STREAM_CONTENT_ID);
    if (stream) {
      resizeObserver.observe(stream);
    }
    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [listRef, seatList, canvas]);
}

export { useBarrageSeatAvoidance };
