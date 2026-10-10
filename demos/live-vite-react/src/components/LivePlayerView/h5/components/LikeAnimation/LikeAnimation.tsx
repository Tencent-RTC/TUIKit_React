import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import styles from './LikeAnimation.module.scss';

const TOTAL_DURATION_MS = 3000;
const SCALE_DURATION_MS = 500;
const PATH_START_MS = 500;
const PATH_DURATION_MS = 2500;
const STAGGER_INTERVAL_MS = 100;
const MAX_HEARTS_PER_PLAY = 10;
const HEART_SIZE = 36;
const DEFAULT_START_X = 160;
const DEFAULT_START_Y = 330;
const LIKE_COLORS = ['#FF3B30', '#AF52DE', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#8E8E93', '#32ADE6', '#A2845E'];
const HEART_PATH = 'M 44 72 C 18 50, 8 38, 8 28 C 8 16, 18 8, 30 8 C 38 8, 43 13, 44 16 C 45 13, 50 8, 58 8 C 70 8, 80 16, 80 28 C 80 38, 70 50, 44 72 Z';
const SVG_NS = 'http://www.w3.org/2000/svg';

interface Heart {
  element: HTMLDivElement;
  startTime: number;
  // Two chained quadratic bezier segments: p0 -> p2 (control p1), p2 -> p4 (control p3).
  points: number[];
}

interface LikeAnimationHandle {
  playLikeAnimation: (count?: number) => void;
}

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function quadraticBezier(progress: number, start: number, control: number, end: number) {
  const rest = 1 - progress;
  return rest * rest * start + 2 * rest * progress * control + progress * progress * end;
}

function createHeartElement(color: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = styles['like-heart'];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(HEART_SIZE));
  svg.setAttribute('height', String(HEART_SIZE));
  svg.setAttribute('viewBox', '0 0 88 88');
  const fill = document.createElementNS(SVG_NS, 'path');
  fill.setAttribute('d', HEART_PATH);
  fill.setAttribute('fill', color);
  fill.setAttribute('fill-opacity', '0.5');
  const outline = document.createElementNS(SVG_NS, 'path');
  outline.setAttribute('d', HEART_PATH);
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', 'white');
  outline.setAttribute('stroke-width', '2.5');
  outline.setAttribute('stroke-linejoin', 'round');
  svg.append(fill, outline);
  wrapper.append(svg);
  return wrapper;
}

// Hearts are created and moved imperatively inside one rAF loop so a burst of
// likes never triggers React re-renders.
const LikeAnimation = forwardRef<LikeAnimationHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heartsRef = useRef<Heart[]>([]);
  const frameIdRef = useRef<number | null>(null);
  const staggerTimersRef = useRef<number[]>([]);

  const renderFrame = useCallback(() => {
    const now = performance.now();
    heartsRef.current = heartsRef.current.filter((heart) => {
      const elapsed = now - heart.startTime;
      if (elapsed >= TOTAL_DURATION_MS) {
        heart.element.remove();
        return false;
      }
      const life = elapsed / TOTAL_DURATION_MS;
      const scaleInEnd = SCALE_DURATION_MS / TOTAL_DURATION_MS;
      let scale = 1;
      if (life < scaleInEnd) {
        scale = life / scaleInEnd;
      } else if (life >= 0.7) {
        scale = 1 - (0.4 * (life - 0.7)) / 0.3;
      }
      const opacity = life < 0.6 ? 1 : 1 - (life - 0.6) / 0.4;

      const [x0, y0, x1, y1, x2, y2, x3, y3, x4, y4] = heart.points;
      let x = x0;
      let y = y0;
      if (elapsed >= PATH_START_MS) {
        const pathProgress = Math.min((elapsed - PATH_START_MS) / PATH_DURATION_MS, 1);
        if (pathProgress <= 0.5) {
          x = quadraticBezier(pathProgress * 2, x0, x1, x2);
          y = quadraticBezier(pathProgress * 2, y0, y1, y2);
        } else {
          x = quadraticBezier((pathProgress - 0.5) * 2, x2, x3, x4);
          y = quadraticBezier((pathProgress - 0.5) * 2, y2, y3, y4);
        }
      }
      const { style } = heart.element;
      style.transform = `translate3d(${x - HEART_SIZE / 2}px, ${y - HEART_SIZE / 2}px, 0) scale(${scale})`;
      style.opacity = String(opacity);
      return true;
    });

    frameIdRef.current = heartsRef.current.length > 0 ? requestAnimationFrame(renderFrame) : null;
  }, []);

  const spawnHeart = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const x0 = DEFAULT_START_X + randomInRange(-20, 20);
    const y0 = DEFAULT_START_Y;
    const y1 = y0 - randomInRange(40, 80);
    const y2 = y1 - randomInRange(30, 60);
    const y3 = y2 - randomInRange(40, 80);
    const y4 = y3 - randomInRange(40, 80);
    const element = createHeartElement(LIKE_COLORS[Math.floor(Math.random() * LIKE_COLORS.length)]);
    element.style.transform = `translate3d(${x0 - HEART_SIZE / 2}px, ${y0 - HEART_SIZE / 2}px, 0) scale(0)`;
    container.append(element);
    heartsRef.current.push({
      element,
      startTime: performance.now(),
      points: [
        x0, y0,
        x0 + randomInRange(-25, 25), y1,
        x0 + randomInRange(-20, 20), y2,
        x0 + randomInRange(-30, 30), y3,
        x0 + randomInRange(-25, 25), y4,
      ],
    });
    if (frameIdRef.current === null) {
      frameIdRef.current = requestAnimationFrame(renderFrame);
    }
  }, [renderFrame]);

  useImperativeHandle(ref, () => ({
    playLikeAnimation: (count = 1) => {
      const heartCount = Math.min(count, MAX_HEARTS_PER_PLAY);
      for (let index = 0; index < heartCount; index += 1) {
        if (index === 0) {
          spawnHeart();
        } else {
          staggerTimersRef.current.push(window.setTimeout(spawnHeart, index * STAGGER_INTERVAL_MS));
        }
      }
    },
  }), [spawnHeart]);

  useEffect(() => () => {
    staggerTimersRef.current.forEach(timerId => window.clearTimeout(timerId));
    staggerTimersRef.current = [];
    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }
    heartsRef.current.forEach(heart => heart.element.remove());
    heartsRef.current = [];
  }, []);

  return <div ref={containerRef} className={styles['like-animation']} />;
});

LikeAnimation.displayName = 'LikeAnimation';

export { LikeAnimation };
export type { LikeAnimationHandle };
