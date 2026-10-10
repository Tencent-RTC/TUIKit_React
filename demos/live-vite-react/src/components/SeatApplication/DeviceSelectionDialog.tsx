import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TRTCCloud } from '@tencentcloud/tuiroom-engine-js';
import type { TUIDeviceInfo } from '@tencentcloud/tuiroom-engine-js';
import {
  Button,
  Dialog,
  IconLoading,
  Option,
  Select,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import {
  CameraPreviewFailure,
  DeviceSelectionType,
  type DevicePermissionState,
  getCameraPreviewGuidanceKeys,
  getCameraPreviewUnavailableGuidanceKeys,
  getDeviceEmptyFieldGuidance,
  getDeviceEmptyGuidanceKeys,
  getDeviceSelectionRequirementKey,
} from '../../utils/deviceGuidance';
import styles from './SeatApplication.module.scss';

interface DeviceSelectionDialogProps {
  visible: boolean;
  type: DeviceSelectionType;
  microphoneList: TUIDeviceInfo[];
  cameraList: TUIDeviceInfo[];
  microphoneId: string;
  cameraId: string;
  onSelectMicrophoneId: (id: string) => void;
  onSelectCameraId: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Device picker for PC seat application, with a live camera preview for the
// video type. React port of the Vue3 LiveDeviceSelectionDialog.
const DeviceSelectionDialog: React.FC<DeviceSelectionDialogProps> = ({
  visible,
  type,
  microphoneList,
  cameraList,
  microphoneId,
  cameraId,
  onSelectMicrophoneId,
  onSelectCameraId,
  onConfirm,
  onCancel,
}) => {
  const { t } = useUIKit();

  const [microphonePermission, setMicrophonePermission] = useState<DevicePermissionState>('unsupported');
  const [cameraPermission, setCameraPermission] = useState<DevicePermissionState>('unsupported');
  const [isCameraTesting, setIsCameraTesting] = useState(false);
  const [isCameraTestLoading, setIsCameraTestLoading] = useState(false);
  const [cameraPreviewFailure, setCameraPreviewFailure] = useState<CameraPreviewFailure>(CameraPreviewFailure.None);

  // One preview TRTCCloud instance for the dialog's lifetime; created lazily
  // so importing this module never instantiates the engine standalone.
  const previewTRTCCloudRef = useRef<TRTCCloud | null>(null);
  const previewIdRef = useRef(`live-device-preview-${Math.random().toString(36).substring(2, 15)}`);
  const emptyGuidance = useMemo(() => getDeviceEmptyGuidanceKeys(), []);

  const deviceEmptyGuidance = useMemo(() => getDeviceEmptyFieldGuidance({
    type,
    microphoneCount: microphoneList.length,
    cameraCount: cameraList.length,
    microphonePermission,
    cameraPermission,
  }), [type, microphoneList.length, cameraList.length, microphonePermission, cameraPermission]);

  const deviceSelectionRequirementKey = useMemo(() => getDeviceSelectionRequirementKey({
    type,
    microphoneCount: microphoneList.length,
    cameraCount: cameraList.length,
  }), [type, microphoneList.length, cameraList.length]);

  const cameraPreviewGuidance = useMemo(
    () => getCameraPreviewGuidanceKeys(cameraPreviewFailure),
    [cameraPreviewFailure],
  );
  const cameraPreviewUnavailableGuidance = useMemo(() => (
    visible && type === DeviceSelectionType.Video && !cameraId && !isCameraTestLoading
      ? getCameraPreviewUnavailableGuidanceKeys()
      : null
  ), [visible, type, cameraId, isCameraTestLoading]);

  const canConfirm = useMemo(() => {
    if (type === DeviceSelectionType.Video) {
      return !!(microphoneId && cameraId && microphoneList.length && cameraList.length);
    }
    return !!(microphoneId && microphoneList.length);
  }, [type, microphoneId, cameraId, microphoneList.length, cameraList.length]);

  useEffect(() => {
    if (visible) {
      previewTRTCCloudRef.current = previewTRTCCloudRef.current ?? new TRTCCloud();
    }
  }, [visible]);

  const startCameraPreview = React.useCallback(async (id: string) => {
    const cloud = previewTRTCCloudRef.current;
    if (!cloud) {
      return;
    }
    setIsCameraTestLoading(true);
    setIsCameraTesting(false);
    setCameraPreviewFailure(CameraPreviewFailure.None);
    try {
      await cloud.setCurrentCameraDevice(id);
      const previewElement = document.getElementById(previewIdRef.current);
      if (!previewElement) {
        throw new Error('Camera preview element not found');
      }
      await cloud.startCameraDeviceTest(previewElement);
      setIsCameraTesting(true);
    } catch (error) {
      console.error('Failed to start camera preview:', error);
      setCameraPreviewFailure(CameraPreviewFailure.Preview);
    } finally {
      setIsCameraTestLoading(false);
    }
  }, []);

  // Start / stop the preview with dialog visibility and camera selection.
  useEffect(() => {
    const cloud = previewTRTCCloudRef.current;
    if (visible && type === DeviceSelectionType.Video && cameraId) {
      void startCameraPreview(cameraId);
    } else if (!visible && type === DeviceSelectionType.Video && cloud) {
      try {
        void cloud.stopCameraDeviceTest();
        setIsCameraTesting(false);
        setCameraPreviewFailure(CameraPreviewFailure.None);
      } catch (error) {
        console.error('Failed to stop camera preview:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, type, cameraId]);

  // Query persistent permission states while the dialog is open.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const query = async (name: 'camera' | 'microphone'): Promise<DevicePermissionState> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const permissions: any = typeof navigator === 'undefined' ? null : navigator.permissions;
      if (!permissions?.query) {
        return 'unsupported';
      }
      try {
        const status = await permissions.query({ name });
        return status.state;
      } catch {
        return 'unsupported';
      }
    };
    void (async () => {
      const [nextMicrophonePermission, nextCameraPermission] = await Promise.all([
        query('microphone'),
        type === DeviceSelectionType.Video ? query('camera') : Promise.resolve<DevicePermissionState>('unsupported'),
      ]);
      if (!visible) {
        return;
      }
      setMicrophonePermission(nextMicrophonePermission);
      setCameraPermission(nextCameraPermission);
    })();
  }, [visible, type]);

  // Keep the selection valid when the camera list changes.
  useEffect(() => {
    if (!visible || type !== DeviceSelectionType.Video) {
      return;
    }
    if (cameraList.length === 0) {
      if (cameraId) {
        onSelectCameraId('');
      }
      return;
    }
    const currentCameraExists = cameraList.some(item => item.deviceId === cameraId);
    if (!currentCameraExists && cameraList[0]?.deviceId) {
      onSelectCameraId(cameraList[0].deviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraList]);

  // Release the preview engine on unmount.
  useEffect(() => {
    return () => {
      const cloud = previewTRTCCloudRef.current;
      if (cloud) {
        try {
          void cloud.stopCameraDeviceTest();
          cloud.destroy();
        } catch (error) {
          console.error('Failed to cleanup camera preview:', error);
        }
        previewTRTCCloudRef.current = null;
      }
    };
  }, []);

  const handleCameraChange = async (newVal: string) => {
    if (type === DeviceSelectionType.Video && previewTRTCCloudRef.current) {
      try {
        await previewTRTCCloudRef.current.setCurrentCameraDevice(newVal);
      } catch (error) {
        console.error('Failed to switch camera:', error);
        setIsCameraTesting(false);
        setCameraPreviewFailure(CameraPreviewFailure.Switch);
      }
    }
  };

  return (
    <Dialog
      visible={visible}
      title={t('seat_application.device_selection.title')}
      onClose={onCancel}
      width={type === DeviceSelectionType.Video ? 600 : 500}
      footer={(
        <div className={styles.deviceDialogFooter}>
          {deviceSelectionRequirementKey && (
            <p className={styles.deviceRequirement}>
              {t(deviceSelectionRequirementKey)}
            </p>
          )}
          <div className={styles.deviceFooterActions}>
            <Button onClick={onCancel}>{t('seat_application.cancel')}</Button>
            <Button type="primary" disabled={!canConfirm} onClick={onConfirm}>
              {t('seat_application.confirm')}
            </Button>
          </div>
        </div>
      )}
    >
      <div className={styles.deviceSelection}>
        {type === DeviceSelectionType.Video && (
          <>
            <div className={styles.videoPreviewContainer}>
              <div id={previewIdRef.current} className={styles.videoPreview} />
              <div className={styles.attentionInfo}>
                {cameraPreviewGuidance && (
                  <span className={styles.cameraPreviewFailure}>
                    <strong>{t(cameraPreviewGuidance.titleKey)}</strong>
                    <span>{t(cameraPreviewGuidance.descKey)}</span>
                  </span>
                )}
                {cameraPreviewUnavailableGuidance && (
                  <span className={styles.cameraPreviewFailure}>
                    <strong>{t(cameraPreviewUnavailableGuidance.titleKey)}</strong>
                    <span>{t(cameraPreviewUnavailableGuidance.descKey)}</span>
                  </span>
                )}
                {!cameraPreviewGuidance && !cameraPreviewUnavailableGuidance && !isCameraTesting && !isCameraTestLoading && (
                  <span className={styles.offCameraInfo}>
                    {t('seat_application.device_selection.off_camera')}
                  </span>
                )}
                {isCameraTestLoading && <IconLoading size="36" className={styles.loading} />}
              </div>
            </div>
            <div className={styles.deviceItem}>
              <span className={styles.deviceLabel}>{t('seat_application.device_selection.camera')}</span>
              <Select
                className={styles.deviceSelect}
                value={cameraId}
                placeholder=""
                disabled={cameraList.length === 0}
                onChange={(value) => {
                  const id = String(value ?? '');
                  onSelectCameraId(id);
                  void handleCameraChange(id);
                }}
              >
                {cameraList.map(item => (
                  <Option key={item.deviceId} value={item.deviceId} label={item.deviceName} />
                ))}
              </Select>
              {cameraList.length === 0 && (
                <div className={styles.deviceEmptyTip}>
                  {t('seat_application.device_selection.no_camera')}
                </div>
              )}
              {deviceEmptyGuidance.showCamera && (
                <p className={styles.deviceEmptyDesc}>{t(emptyGuidance.descKey)}</p>
              )}
            </div>
          </>
        )}
        <div className={styles.deviceItem}>
          <span className={styles.deviceLabel}>{t('seat_application.device_selection.microphone')}</span>
          <Select
            className={styles.deviceSelect}
            value={microphoneId}
            placeholder=""
            disabled={microphoneList.length === 0}
            onChange={value => onSelectMicrophoneId(String(value ?? ''))}
          >
            {microphoneList.map(item => (
              <Option key={item.deviceId} value={item.deviceId} label={item.deviceName} />
            ))}
          </Select>
          {microphoneList.length === 0 && (
            <div className={styles.deviceEmptyTip}>
              {t('seat_application.device_selection.no_microphone')}
            </div>
          )}
          {deviceEmptyGuidance.showMicrophone && (
            <p className={styles.deviceEmptyDesc}>{t(emptyGuidance.descKey)}</p>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default DeviceSelectionDialog;
