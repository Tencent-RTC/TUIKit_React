import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconArrowStrokeBack } from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import { usePortalTarget } from '../../hooks/usePortalTarget';
import styles from './BottomSheet.module.scss';

const TRANSITION_MS = 300;

interface BottomSheetProps {
  visible: boolean;
  title?: React.ReactNode;
  /** Show a back arrow in the header that closes the sheet. */
  showBack?: boolean;
  /** CSS height of the panel, e.g. `auto`, `50%`, `240px`. */
  height?: string;
  zIndex?: number;
  closeOnMaskClick?: boolean;
  /** Slide in from the right instead of the bottom while in landscape. */
  sideInLandscape?: boolean;
  className?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  title,
  showBack = false,
  height = 'auto',
  zIndex = 1000,
  closeOnMaskClick = true,
  sideInLandscape = false,
  className,
  onClose,
  children,
}) => {
  const { container, isLandscapeFrame } = usePortalTarget();
  // Keep the panel mounted during the leave transition.
  const [mounted, setMounted] = useState(visible);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const frameId = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(frameId);
    }
    setActive(false);
    const timerId = window.setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => window.clearTimeout(timerId);
  }, [visible]);

  if (!mounted) {
    return null;
  }

  const handleMaskClick = () => {
    if (closeOnMaskClick) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className={classNames(styles['bottom-sheet-mask'], { [styles['is-active']]: active })}
      style={{ zIndex }}
      onClick={handleMaskClick}
    >
      <div
        className={classNames(
          styles['bottom-sheet-panel'],
          {
            [styles['is-side-in-landscape']]: sideInLandscape,
            [styles['is-side-in-landscape-frame']]: sideInLandscape && isLandscapeFrame,
          },
          className,
        )}
        style={{ height }}
        onClick={event => event.stopPropagation()}
      >
        {showBack && (
          <div className={styles['bottom-sheet-header']}>
            <div className={styles['bottom-sheet-back']} onClick={onClose}>
              <IconArrowStrokeBack size="16" />
            </div>
            <div className={styles['bottom-sheet-header-title']}>{title}</div>
          </div>
        )}
        {!showBack && title && <div className={styles['bottom-sheet-title']}>{title}</div>}
        <div className={styles['bottom-sheet-body']}>{children}</div>
      </div>
    </div>,
    container,
  );
};

export { BottomSheet };
export type { BottomSheetProps };
