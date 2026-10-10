import type React from 'react';
import { useEffect, useState } from 'react';
import { IconArrowStrokeBack } from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import styles from './FullscreenOverlayH5.module.scss';

const CONTROLS_AUTO_HIDE_MS = 3000;

interface FullscreenOverlayH5Props {
  /** Bottom-right actions, shown and hidden together with the back button. */
  toolbar?: React.ReactNode;
  /** Bottom-left barrage area; stays visible while the controls are hidden. */
  barrage?: React.ReactNode;
  /** Receives the overlay node so page popups can portal into the fullscreen frame. */
  onContainerChange?: (container: HTMLDivElement | null) => void;
  onExit: () => void;
}

const FullscreenOverlayH5: React.FC<FullscreenOverlayH5Props> = ({ toolbar, barrage, onContainerChange, onExit }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [interactionCount, setInteractionCount] = useState(0);

  useEffect(() => {
    onContainerChange?.(container);
    return () => onContainerChange?.(null);
  }, [container, onContainerChange]);

  useEffect(() => {
    if (!controlsVisible) {
      return undefined;
    }
    const timerId = window.setTimeout(() => setControlsVisible(false), CONTROLS_AUTO_HIDE_MS);
    return () => window.clearTimeout(timerId);
  }, [controlsVisible, interactionCount]);

  // Native listener: popups portaled in here belong to another React tree, so only DOM events see them.
  useEffect(() => {
    if (!container) {
      return undefined;
    }
    const restartAutoHide = () => setInteractionCount(count => count + 1);
    container.addEventListener('pointerdown', restartAutoHide);
    return () => container.removeEventListener('pointerdown', restartAutoHide);
  }, [container]);

  const handleExit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onExit();
  };

  return (
    <div
      ref={setContainer}
      className={styles['fullscreen-overlay-h5']}
      onClick={() => setControlsVisible(visible => !visible)}
    >
      {barrage && <div className={styles['fullscreen-overlay-h5-barrage']}>{barrage}</div>}
      {/* Hidden with CSS only so toolbar buttons keep their state. */}
      <div className={classNames(styles['fullscreen-overlay-h5-controls'], { [styles['is-hidden']]: !controlsVisible })}>
        <div className={styles['fullscreen-overlay-h5-back']} onClick={handleExit}>
          <IconArrowStrokeBack size="20" />
        </div>
        {toolbar && (
          <div className={styles['fullscreen-overlay-h5-toolbar']} onClick={event => event.stopPropagation()}>
            {toolbar}
          </div>
        )}
      </div>
    </div>
  );
};

export { FullscreenOverlayH5 };
