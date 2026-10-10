import React from 'react';
import {
  Button,
  Dialog,
  IconCall1,
  IconVideoOpen,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import { DeviceSelectionType } from '../../utils/deviceGuidance';
import styles from './SeatApplication.module.scss';

interface ConnectionTypeDialogProps {
  visible: boolean;
  type: DeviceSelectionType;
  onSelectType: (type: DeviceSelectionType) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Chooser between video / audio co-broadcasting. React port of the Vue3
// LiveConnectionTypeDialog (two option cards + confirm footer).
const ConnectionTypeDialog: React.FC<ConnectionTypeDialogProps> = ({
  visible,
  type,
  onSelectType,
  onConfirm,
  onCancel,
}) => {
  const { t } = useUIKit();

  return (
    <Dialog
      visible={visible}
      title={t('seat_application.connection_type.title')}
      onClose={onCancel}
      width={420}
      footer={(
        <div className={styles.dialogFooter}>
          <Button onClick={onCancel}>{t('seat_application.cancel')}</Button>
          <Button type="primary" onClick={onConfirm}>
            {t('seat_application.confirm')}
          </Button>
        </div>
      )}
    >
      <div className={styles.optionsGrid}>
        <div
          className={`${styles.optionCard} ${type === DeviceSelectionType.Video ? styles.optionCardActive : ''}`}
          onClick={() => onSelectType(DeviceSelectionType.Video)}
        >
          <div className={styles.optionInfo}>
            <div className={styles.optionIcon}><IconVideoOpen size="24" /></div>
            <h4>{t('seat_application.connection_type.video')}</h4>
          </div>
        </div>
        <div
          className={`${styles.optionCard} ${type === DeviceSelectionType.Audio ? styles.optionCardActive : ''}`}
          onClick={() => onSelectType(DeviceSelectionType.Audio)}
        >
          <div className={styles.optionInfo}>
            <div className={styles.optionIcon}><IconCall1 size="24" /></div>
            <h4>{t('seat_application.connection_type.audio')}</h4>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ConnectionTypeDialog;
