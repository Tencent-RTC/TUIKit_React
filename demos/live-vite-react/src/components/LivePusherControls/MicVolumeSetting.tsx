import { useEffect, useRef, useState } from 'react';
import {
  Slider,
  Toast,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import {
  DeviceError,
  DeviceStatus,
  useDeviceState,
  useLiveListState,
} from 'tuikit-atomicx-react';
import AudioIcon from './AudioIcon';
import styles from './LivePusherControls.module.scss';

const DEFAULT_VOLUME = 100;

export default function MicVolumeSetting() {
  const { t } = useUIKit();
  const {
    captureVolume,
    currentMicVolume,
    microphoneStatus,
    microphoneLastError,
    muteLocalAudio,
    unmuteLocalAudio,
    setCaptureVolume,
  } = useDeviceState();
  const { currentLive } = useLiveListState();
  const [microphoneVolume, setMicrophoneVolume] = useState(captureVolume);
  const microphoneVolumeBeforeMuteRef = useRef(captureVolume || DEFAULT_VOLUME);

  useEffect(() => {
    setMicrophoneVolume(captureVolume);
  }, [captureVolume]);

  useEffect(() => {
    if (currentLive?.liveId) {
      void setCaptureVolume(microphoneVolumeBeforeMuteRef.current);
      return;
    }
    microphoneVolumeBeforeMuteRef.current = microphoneVolume || DEFAULT_VOLUME;
    void setCaptureVolume(0);
  }, [currentLive?.liveId]);

  const handleMicrophoneVolumeChange = async (value: number) => {
    setMicrophoneVolume(value);
    if (value !== captureVolume) {
      await setCaptureVolume(value);
    }
    if (value === 0 && microphoneStatus === DeviceStatus.On) {
      await muteLocalAudio();
    }
    if (value > 0 && microphoneStatus === DeviceStatus.Off) {
      await unmuteLocalAudio();
    }
  };

  const showMicrophoneError = () => {
    switch (microphoneLastError) {
      case DeviceError.NoDeviceDetected:
        Toast.error({ message: t('live_pusher.no_device_detected') });
        break;
      case DeviceError.NoSystemPermission:
        Toast.error({ message: t('live_pusher.no_system_permission') });
        break;
      case DeviceError.NotSupportCapture:
        Toast.error({ message: t('live_pusher.not_support_capture') });
        break;
      default:
        break;
    }
  };

  const switchMicrophoneStatus = async () => {
    if (microphoneLastError !== DeviceError.NoError) {
      showMicrophoneError();
      return;
    }

    if (microphoneStatus === DeviceStatus.On) {
      microphoneVolumeBeforeMuteRef.current = microphoneVolume || DEFAULT_VOLUME;
      setMicrophoneVolume(0);
      await setCaptureVolume(0);
      await muteLocalAudio();
      return;
    }

    const volumeToRestore = microphoneVolumeBeforeMuteRef.current || DEFAULT_VOLUME;
    setMicrophoneVolume(volumeToRestore);
    await setCaptureVolume(volumeToRestore);
    await unmuteLocalAudio();
  };

  const isMuted = microphoneStatus === DeviceStatus.Off;

  return (
    <div className={styles['device-setting']}>
      <button
        type="button"
        className={styles['device-icon']}
        title={`${currentMicVolume}`}
        onClick={() => void switchMicrophoneStatus()}
      >
        <AudioIcon size={16} audioVolume={currentMicVolume} isMuted={isMuted} />
      </button>
      <Slider
        className={styles['device-slider']}
        min={0}
        max={100}
        value={microphoneVolume}
        onChange={(value) => {
          if (value > 0) {
            microphoneVolumeBeforeMuteRef.current = value;
          }
          void handleMicrophoneVolumeChange(value);
        }}
      />
    </div>
  );
}
