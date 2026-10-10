import type React from 'react';
import classNames from 'classnames';
import { Button, IconCall1, IconCallVoice, IconVideoOpen, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import { IconAdjust } from '../Icons';
import { ConnectionType } from '../../utils/mediaPermission';
import { getDeviceOpenFailureDescriptionKey } from '../../utils/deviceOpenFailure';
import type { DeviceOpenFailureReason } from '../../utils/deviceOpenFailure';
import { PermissionPrimerMode } from '../../hooks/useSeatApplication';
import styles from './SeatApplication.module.scss';

interface ConnectionTypeSheetProps {
  visible: boolean;
  audioOnly: boolean;
  onSelect: (type: ConnectionType) => void;
  onOpenVideoAdjust: () => void;
  onClose: () => void;
}

const ConnectionTypeSheet: React.FC<ConnectionTypeSheetProps> = ({
  visible,
  audioOnly,
  onSelect,
  onOpenVideoAdjust,
  onClose,
}) => {
  const { t } = useUIKit();
  return (
    <BottomSheet visible={visible} zIndex={1100} onClose={onClose}>
      <div className={styles['connection-type-sheet']}>
        <div className={styles['connection-type-header']}>
          <div className={styles['connection-type-title']}>{t('live_player_view_h5.choose_connection_type')}</div>
          <div className={styles['connection-type-subtitle']}>
            {t('live_player_view_h5.choose_connection_type_tip')}
          </div>
        </div>
        {!audioOnly && (
          <div className={styles['connection-type-option']} onClick={() => onSelect(ConnectionType.Video)}>
            <IconVideoOpen size="20" />
            <span className={styles['connection-type-option-text']}>{t('live_player_view_h5.apply_video_co_guest')}</span>
            <div
              className={styles['connection-type-option-adjust']}
              onClick={(event) => {
                event.stopPropagation();
                onOpenVideoAdjust();
              }}
            >
              <IconAdjust size={20} />
            </div>
          </div>
        )}
        <div className={styles['connection-type-option']} onClick={() => onSelect(ConnectionType.Audio)}>
          <IconCall1 size="20" />
          <span className={styles['connection-type-option-text']}>{t('live_player_view_h5.apply_audio_co_guest')}</span>
        </div>
      </div>
    </BottomSheet>
  );
};

interface PermissionPrimerSheetProps {
  visible: boolean;
  mode: PermissionPrimerMode;
  type: ConnectionType;
  onConfirm: () => void;
  onCancel: () => void;
}

const PermissionPrimerSheet: React.FC<PermissionPrimerSheetProps> = ({ visible, mode, type, onConfirm, onCancel }) => {
  const { t } = useUIKit();
  const needsCamera = type === ConnectionType.Video;
  const isBlocked = mode === PermissionPrimerMode.Blocked;

  let titleKey = needsCamera
    ? 'live_player_view_h5.allow_camera_and_microphone'
    : 'live_player_view_h5.allow_microphone';
  let descriptionKey = needsCamera
    ? 'live_player_view_h5.primer_camera_and_microphone_tip'
    : 'live_player_view_h5.primer_microphone_tip';
  if (isBlocked) {
    titleKey = needsCamera
      ? 'live_player_view_h5.camera_and_microphone_blocked'
      : 'live_player_view_h5.microphone_blocked';
    descriptionKey = 'live_player_view_h5.permission_blocked_tip';
  }

  return (
    <BottomSheet visible={visible} zIndex={1150} closeOnMaskClick={!isBlocked} onClose={onCancel}>
      <div className={styles['permission-primer']}>
        <div className={classNames(styles['permission-primer-icons'], { [styles['is-dual']]: needsCamera })}>
          <IconCallVoice size={needsCamera ? '24' : '32'} />
          {needsCamera && <IconVideoOpen size="24" />}
        </div>
        <div className={styles['permission-primer-title']}>{t(titleKey)}</div>
        <div className={styles['permission-primer-desc']}>{t(descriptionKey)}</div>
        {/* The confirm handler must start getUserMedia synchronously inside this tap. */}
        <div className={classNames(styles['permission-primer-button'], styles['is-primary'])} onClick={onConfirm}>
          {t(isBlocked ? 'live_player_view_h5.enabled_retry' : 'live_player_view_h5.continue')}
        </div>
        <div className={styles['permission-primer-button']} onClick={onCancel}>
          {t('live_player_view_h5.cancel')}
        </div>
      </div>
    </BottomSheet>
  );
};

interface DeviceOpenFailureSheetProps {
  reason: DeviceOpenFailureReason | null;
  onClose: () => void;
}

const DeviceOpenFailureSheet: React.FC<DeviceOpenFailureSheetProps> = ({ reason, onClose }) => {
  const { t } = useUIKit();
  return (
    <BottomSheet
      visible={reason !== null}
      title={t('live_player_view_h5.unable_to_join_co_guest')}
      zIndex={1100}
      onClose={onClose}
    >
      <div className={styles['device-open-failure']}>
        <p className={styles['device-open-failure-desc']}>
          {reason !== null && t(getDeviceOpenFailureDescriptionKey(reason))}
        </p>
        <Button type="primary" onClick={onClose}>{t('live_player_view_h5.i_understand')}</Button>
      </div>
    </BottomSheet>
  );
};

export { ConnectionTypeSheet, PermissionPrimerSheet, DeviceOpenFailureSheet };
