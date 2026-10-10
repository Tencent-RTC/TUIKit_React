import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Button, IconCameraSwitch, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useDeviceState } from 'tuikit-atomicx-react';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import styles from './SeatApplication.module.scss';

enum PreviewFailure {
  None = 'none',
  Preview = 'preview',
  Switch = 'switch',
}

const PREVIEW_VIEW_ID = 'live-player-h5-video-adjust-preview';
// Start the preview after the sheet's slide-in transition.
const SHEET_TRANSITION_MS = 300;

interface VideoAdjustSheetProps {
  visible: boolean;
  onApply: () => void;
  onClose: () => void;
}

const VideoAdjustSheet: React.FC<VideoAdjustSheetProps> = ({ visible, onApply, onClose }) => {
  const { t } = useUIKit();
  const { startCameraTest, stopCameraTest, switchCamera, isFrontCamera } = useDeviceState();
  const [isLoading, setIsLoading] = useState(false);
  const [previewFailure, setPreviewFailure] = useState(PreviewFailure.None);
  // Bumped on every open/close so stale async results are ignored.
  const operationVersionRef = useRef(0);

  const startPreview = async () => {
    operationVersionRef.current += 1;
    const version = operationVersionRef.current;
    setIsLoading(true);
    try {
      await startCameraTest({ view: PREVIEW_VIEW_ID });
      if (version === operationVersionRef.current) {
        setPreviewFailure(PreviewFailure.None);
      }
    } catch (error) {
      console.warn('[VideoAdjustSheet] Failed to start camera preview:', error);
      if (version === operationVersionRef.current) {
        setPreviewFailure(PreviewFailure.Preview);
      }
    } finally {
      if (version === operationVersionRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    setIsLoading(true);
    const timerId = window.setTimeout(() => {
      startPreview();
    }, SHEET_TRANSITION_MS);
    return () => {
      window.clearTimeout(timerId);
      operationVersionRef.current += 1;
      setIsLoading(false);
      setPreviewFailure(PreviewFailure.None);
      stopCameraTest().catch((error: unknown) => {
        console.warn('[VideoAdjustSheet] Failed to stop camera preview:', error);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleFlipCamera = async () => {
    if (isLoading) {
      return;
    }
    operationVersionRef.current += 1;
    const version = operationVersionRef.current;
    setIsLoading(true);
    try {
      await switchCamera({ isFrontCamera: !isFrontCamera });
      if (version === operationVersionRef.current && previewFailure !== PreviewFailure.Preview) {
        setPreviewFailure(PreviewFailure.None);
      }
    } catch (error) {
      console.warn('[VideoAdjustSheet] Failed to switch camera:', error);
      if (version === operationVersionRef.current) {
        setPreviewFailure(PreviewFailure.Switch);
      }
    } finally {
      if (version === operationVersionRef.current) {
        setIsLoading(false);
      }
    }
  };

  const isSwitchFailure = previewFailure === PreviewFailure.Switch;

  return (
    <BottomSheet visible={visible} height="min(718px, 80%)" zIndex={1200} onClose={onClose}>
      <div className={styles['video-adjust']}>
        <div className={styles['video-adjust-title']}>{t('live_player_view_h5.adjust_video')}</div>
        <div className={classNames(styles['video-adjust-preview'], { [styles['is-loading']]: isLoading })}>
          <div id={PREVIEW_VIEW_ID} className={styles['video-adjust-preview-view']} />
          {previewFailure !== PreviewFailure.None && (
            <div className={styles['video-adjust-preview-guidance']}>
              <strong>
                {t(isSwitchFailure ? 'live_player_view_h5.unable_to_switch_camera' : 'live_player_view_h5.unable_to_preview_camera')}
              </strong>
              <span>
                {t(isSwitchFailure ? 'live_player_view_h5.switch_camera_failed_tip' : 'live_player_view_h5.preview_camera_failed_tip')}
              </span>
              <Button
                type="primary"
                size="small"
                disabled={isLoading}
                onClick={() => {
                  startPreview();
                }}
              >
                {t('live_player_view_h5.retry_preview')}
              </Button>
            </div>
          )}
        </div>
        <div
          className={classNames(styles['video-adjust-control'], { [styles['is-disabled']]: isLoading })}
          onClick={() => {
            handleFlipCamera();
          }}
        >
          <IconCameraSwitch size="24" />
          <span>{t('live_player_view_h5.flip')}</span>
        </div>
        <div className={styles['video-adjust-footer']}>
          <Button className={styles['video-adjust-apply']} type="primary" onClick={onApply}>
            {t('live_player_view_h5.apply_co_guest')}
          </Button>
          <div className={styles['video-adjust-tip']}>{t('live_player_view_h5.effects_apply_after_connection')}</div>
        </div>
      </div>
    </BottomSheet>
  );
};

export { VideoAdjustSheet };
