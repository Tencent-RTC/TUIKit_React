import type React from 'react';
import classNames from 'classnames';
import { IconCallVoice, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { IconCoGuest } from '../Icons';
import type { SeatApplication } from '../../hooks/useSeatApplication';
import { ActionSheet } from './ActionSheet';
import type { ActionSheetItem } from './ActionSheet';
import { ConnectionTypeSheet, DeviceOpenFailureSheet, PermissionPrimerSheet } from './SeatApplicationSheets';
import { VideoAdjustSheet } from './VideoAdjustSheet';
import styles from './SeatApplication.module.scss';

interface SeatApplicationProps {
  seatApplication: SeatApplication;
}

// Co-guest entry button; may appear in several toolbars.
const SeatApplicationButton: React.FC<SeatApplicationProps> = ({ seatApplication }) => {
  const { isApplyingSeat, isUserOnSeat } = seatApplication;

  const handleButtonClick = () => {
    if (isUserOnSeat) {
      seatApplication.openSeatControlSheet();
    } else if (isApplyingSeat) {
      seatApplication.openCancelApplicationSheet();
    } else {
      seatApplication.handleApplyForSeat();
    }
  };

  return (
    <div
      className={classNames(styles['seat-application-button'], {
        [styles['is-applying']]: isApplyingSeat,
        [styles['is-on-seat']]: isUserOnSeat,
      })}
      onClick={handleButtonClick}
    >
      {isUserOnSeat ? <IconCallVoice size="20" /> : <IconCoGuest size={20} />}
    </div>
  );
};

// Every sheet of the viewer co-guest flow. Render once per page.
const SeatApplicationPanel: React.FC<SeatApplicationProps> = ({ seatApplication }) => {
  const { t } = useUIKit();
  const {
    requestConnectionType,
    connectionTypeSheetVisible,
    connectionTypeAudioOnly,
    videoAdjustVisible,
    permissionPrimerVisible,
    permissionPrimerMode,
    cancelApplicationSheetVisible,
    seatControlSheetVisible,
    deviceOpenFailureReason,
  } = seatApplication;

  const seatControlItems: ActionSheetItem[] = [
    {
      key: 'leave-seat',
      label: t('live_player_view_h5.end_link'),
      isDanger: true,
      onClick: () => {
        seatApplication.confirmLeaveSeat();
      },
    },
  ];

  return (
    <>
      <ConnectionTypeSheet
        visible={connectionTypeSheetVisible}
        audioOnly={connectionTypeAudioOnly}
        onSelect={(type) => {
          seatApplication.confirmConnectionType(type);
        }}
        onOpenVideoAdjust={seatApplication.openVideoAdjust}
        onClose={seatApplication.closeConnectionTypeSheet}
      />
      <PermissionPrimerSheet
        visible={permissionPrimerVisible}
        mode={permissionPrimerMode}
        type={requestConnectionType}
        onConfirm={seatApplication.handlePermissionPrimerConfirm}
        onCancel={seatApplication.handlePermissionPrimerCancel}
      />
      <VideoAdjustSheet
        visible={videoAdjustVisible}
        onApply={seatApplication.handleVideoAdjustApply}
        onClose={seatApplication.closeVideoAdjust}
      />
      <DeviceOpenFailureSheet
        reason={deviceOpenFailureReason}
        onClose={seatApplication.closeDeviceOpenFailure}
      />
      <ActionSheet
        visible={cancelApplicationSheetVisible}
        items={[{
          key: 'cancel-application',
          label: t('live_player_view_h5.cancel_application'),
          isDanger: true,
          onClick: () => {
            seatApplication.confirmCancelApplication();
          },
        }]}
        onCancel={seatApplication.closeCancelApplicationSheet}
      />
      <ActionSheet
        visible={seatControlSheetVisible}
        items={seatControlItems}
        onCancel={seatApplication.closeSeatControlSheet}
      />
    </>
  );
};

export { SeatApplicationButton, SeatApplicationPanel };
