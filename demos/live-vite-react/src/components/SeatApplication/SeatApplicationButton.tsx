import React, { useEffect, useMemo } from 'react';
import { useUIKit } from '@tencentcloud/uikit-base-component-react';
import { DeviceSelectionType } from '../../utils/deviceGuidance';
import { useSeatApplication } from './useSeatApplication';
import ConnectionTypeDialog from './ConnectionTypeDialog';
import DeviceSelectionDialog from './DeviceSelectionDialog';
import DeviceOpenFailureGuidance from './DeviceOpenFailureGuidance';
import styles from './SeatApplication.module.scss';

// Audience-side entry button for seat application (co-guesting). React port
// of the Vue3 SeatApplicationButton: three lifecycle states drive the icon
// and label — apply / pending (cancel the request) / connected (leave seat).
const SeatApplicationButton: React.FC = () => {
  const { t } = useUIKit();
  const seat = useSeatApplication();

  // Register guest events while the button is mounted.
  useEffect(() => {
    seat.subscribeEvents();
    return () => seat.unsubscribeEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seatBtnState = useMemo<'apply' | 'pending' | 'connected'>(() => {
    if (seat.isUserOnSeat) {
      return 'connected';
    }
    if (seat.isApplyingSeat) {
      return 'pending';
    }
    return 'apply';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seat.isUserOnSeat, seat.isApplyingSeat]);

  const handleButtonClick = () => {
    if (seat.isUserOnSeat) {
      seat.openLeaveSeatDialog();
    } else if (seat.isApplyingSeat) {
      seat.handleCancelApplicationOnSeat();
    } else {
      void seat.handleApplyForSeat();
    }
  };

  return (
    <>
      <div
        className={styles.seatButton}
        onClick={handleButtonClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && handleButtonClick()}
      >
        <div className={`${styles.seatButtonInner} ${styles[`state-${seatBtnState}`] || ''}`}>
          {seatBtnState === 'apply' && (
            <svg className={styles.seatIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#1BCFCB" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#FE2C55" />
            </svg>
          )}
          {seatBtnState === 'pending' && (
            <svg className={styles.seatIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#1BCFCB" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#FE2C55" />
              <line x1="15" y1="13" x2="19" y2="17" stroke="#FE2C55" />
              <line x1="19" y1="13" x2="15" y2="17" stroke="#FE2C55" />
            </svg>
          )}
          {seatBtnState === 'connected' && (
            <svg className={styles.seatIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#1BCFCB" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#FE2C55" />
              <line x1="16" y1="8" x2="8" y2="16" stroke="#FE2C55" />
            </svg>
          )}
          <span className={styles.seatText}>{seat.applySeatBtnText}</span>
        </div>
      </div>

      <ConnectionTypeDialog
        visible={seat.connectionTypeDialogVisible}
        type={seat.requestConnectionType}
        onSelectType={seat.setRequestConnectionType}
        onConfirm={() => void seat.handleConnectionTypeConfirm()}
        onCancel={seat.handleConnectionTypeCancel}
      />
      <DeviceSelectionDialog
        visible={seat.deviceSelectionDialogVisible}
        type={seat.requestConnectionType}
        microphoneList={seat.microphoneList}
        cameraList={seat.cameraList}
        microphoneId={seat.selectedMicrophoneId}
        cameraId={seat.selectedCameraId}
        onSelectMicrophoneId={seat.setSelectedMicrophoneId}
        onSelectCameraId={seat.setSelectedCameraId}
        onConfirm={() => void seat.handleDeviceConfirm()}
        onCancel={seat.handleDeviceCancel}
      />
      <DeviceOpenFailureGuidance
        visible={seat.deviceOpenFailureGuidanceVisible}
        copy={seat.deviceOpenFailureGuidanceCopy}
        onDismiss={seat.closeDeviceOpenFailureGuidance}
      />
      {/* Cancel-application confirm dialog */}
      {seat.cancelApplicationDialogVisible && (
        <CancelApplicationDialog
          onConfirm={() => void seat.handleCancelApplicationConfirm()}
          onCancel={seat.handleCancelApplicationCancel}
        />
      )}
      {/* Leave-seat confirm dialog */}
      {seat.leaveSeatDialogVisible && (
        <LeaveSeatDialog
          onConfirm={() => void seat.confirmLeaveSeat()}
          onCancel={seat.closeLeaveSeatDialog}
        />
      )}
      {/* keep t referenced so the label stays reactive to language changes */}
      <span hidden>{t('seat_application.apply')}</span>
    </>
  );
};

// Small inline confirm dialogs (title + confirm/cancel), kept as local
// components so this feature's dialogs live in one file.
import { Dialog } from '@tencentcloud/uikit-base-component-react';

const CancelApplicationDialog: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  const { t } = useUIKit();
  return (
    <Dialog
      visible
      title={t('seat_application.cancel_apply_dialog_title')}
      confirmText={t('seat_application.confirm')}
      cancelText={t('seat_application.cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={onCancel}
    />
  );
};

const LeaveSeatDialog: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  const { t } = useUIKit();
  return (
    <Dialog
      visible
      title={t('seat_application.leave_seat_dialog_title')}
      confirmText={t('seat_application.confirm')}
      cancelText={t('seat_application.cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={onCancel}
    />
  );
};

export default SeatApplicationButton;
