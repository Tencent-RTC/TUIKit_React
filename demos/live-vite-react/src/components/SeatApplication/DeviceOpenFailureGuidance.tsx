import React from 'react';
import {
  Button,
  Dialog,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';

interface DeviceOpenFailureGuidanceProps {
  visible: boolean;
  copy: { titleKey: string; descKey: string };
  onDismiss: () => void;
}

// Shown when a device fails to open after the host accepted the application.
// The user has already been removed from the seat; this explains why.
const DeviceOpenFailureGuidance: React.FC<DeviceOpenFailureGuidanceProps> = ({
  visible,
  copy,
  onDismiss,
}) => {
  const { t } = useUIKit();
  return (
    <Dialog
      visible={visible}
      title={t(copy.titleKey)}
      onClose={onDismiss}
      footer={(
        <Button type="primary" onClick={onDismiss}>
          {t('seat_application.i_understand')}
        </Button>
      )}
    >
      <p className="seat-application-guidance-desc">{t(copy.descKey)}</p>
    </Dialog>
  );
};

export default DeviceOpenFailureGuidance;
