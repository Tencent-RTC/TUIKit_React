import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Option,
  Select,
  Slider,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import { useDeviceState } from 'tuikit-atomicx-react';
import styles from './LivePusherControls.module.scss';

const SPEAKER_TEST_URL = 'https://web.sdk.qcloud.com/trtc/electron/download/resources/media/TestSpeaker.mp3';
const VOLUME_BAR_TOTAL = 28;

export default function AudioSettingPanel() {
  const { t } = useUIKit();
  const {
    microphoneList,
    currentMicrophone,
    speakerList,
    currentSpeaker,
    captureVolume,
    currentMicVolume,
    testingMicVolume,
    isMicrophoneTesting,
    isSpeakerTesting,
    getMicrophoneList,
    getSpeakerList,
    setCurrentMicrophone,
    setCurrentSpeaker,
    startMicrophoneTest,
    stopMicrophoneTest,
    startSpeakerTest,
    stopSpeakerTest,
    setCaptureVolume,
  } = useDeviceState();
  const [captureVolumeValue, setCaptureVolumeValue] = useState(captureVolume);
  const [isMicrophoneTestPending, setIsMicrophoneTestPending] = useState(false);
  const [isSpeakerTestPending, setIsSpeakerTestPending] = useState(false);

  useEffect(() => {
    void getMicrophoneList();
    void getSpeakerList();
  }, [getMicrophoneList, getSpeakerList]);

  useEffect(() => {
    setCaptureVolumeValue(captureVolume);
  }, [captureVolume]);

  useEffect(() => () => {
    if (isMicrophoneTesting) {
      void stopMicrophoneTest();
    }
    if (isSpeakerTesting) {
      void stopSpeakerTest();
    }
  }, [isMicrophoneTesting, isSpeakerTesting, stopMicrophoneTest, stopSpeakerTest]);

  const volumeNum = useMemo(() => {
    const volume = isMicrophoneTesting ? testingMicVolume : currentMicVolume;
    return (volume * VOLUME_BAR_TOTAL) / 100;
  }, [currentMicVolume, isMicrophoneTesting, testingMicVolume]);

  // Align with Vue implementation: since the mic test button is visible here,
  // the input-level bar should only animate while the user is actively testing
  // the microphone. Otherwise opening the settings dialog can randomly surface
  // the global mic volume that keeps updating from the live SDK.
  const showInputVolume = isMicrophoneTesting;

  const handleMicrophoneTest = async () => {
    if (isMicrophoneTestPending) {
      return;
    }
    setIsMicrophoneTestPending(true);
    try {
      if (isMicrophoneTesting) {
        await stopMicrophoneTest();
        return;
      }
      if (isSpeakerTesting) {
        await stopSpeakerTest();
      }
      await startMicrophoneTest({ interval: 200 });
    } finally {
      setIsMicrophoneTestPending(false);
    }
  };

  const handleSpeakerTest = async () => {
    if (isSpeakerTestPending) {
      return;
    }
    setIsSpeakerTestPending(true);
    try {
      if (isSpeakerTesting) {
        await stopSpeakerTest();
        return;
      }
      if (isMicrophoneTesting) {
        await stopMicrophoneTest();
      }
      await startSpeakerTest({ filePath: SPEAKER_TEST_URL });
    } finally {
      setIsSpeakerTestPending(false);
    }
  };

  const microphoneOptions = useMemo(() => {
    if (!currentMicrophone?.deviceId || microphoneList.some(item => item.deviceId === currentMicrophone.deviceId)) {
      return microphoneList;
    }
    return [currentMicrophone, ...microphoneList];
  }, [currentMicrophone, microphoneList]);

  const speakerOptions = useMemo(() => {
    if (!currentSpeaker?.deviceId || speakerList.some(item => item.deviceId === currentSpeaker.deviceId)) {
      return speakerList;
    }
    return [currentSpeaker, ...speakerList];
  }, [currentSpeaker, speakerList]);

  const currentMicrophoneId = currentMicrophone?.deviceId || '';
  const currentSpeakerId = currentSpeaker?.deviceId || '';
  const microphoneSignature = microphoneOptions.map(item => `${item.deviceId}:${item.deviceName}`).join('|');
  const speakerSignature = speakerOptions.map(item => `${item.deviceId}:${item.deviceName}`).join('|');

  return (
    <div className={styles['audio-setting-tab']}>
      <div className={styles['item-setting']}>
        <span className={styles.title}>{t('live_pusher.microphone')}</span>
        <div className={styles.flex}>
          <Select
            key={`microphone-${currentMicrophoneId}-${microphoneSignature}`}
            value={currentMicrophoneId}
            placeholder={t('live_pusher.select_microphone')}
            theme="dark"
            className={styles.select}
            onChange={(value) => void setCurrentMicrophone({ deviceId: String(value) })}
          >
            {microphoneOptions.map(item => (
              <Option key={item.deviceId} value={item.deviceId} label={item.deviceName} />
            ))}
          </Select>
          <Button type="default" disabled={isMicrophoneTestPending} onClick={() => void handleMicrophoneTest()}>
            {isMicrophoneTesting ? t('live_pusher.stop_test') : t('live_pusher.test')}
          </Button>
        </div>
      </div>

      <div className={styles['item-setting']}>
        <span className={styles.title}>{t('live_pusher.input_level')}</span>
        <div className={styles['mic-bar-container']}>
          {Array.from({ length: VOLUME_BAR_TOTAL }).map((_, index) => (
            <div
              key={index}
              className={classNames(styles['mic-bar'], {
                [styles.active]: showInputVolume && volumeNum > index,
              })}
            />
          ))}
        </div>
      </div>

      <div className={styles['item-setting']}>
        <span className={styles.title}>{t('live_pusher.input_volume')}</span>
        <div className={styles.flex}>
          <Slider
            className={styles['custom-slider']}
            min={0}
            max={100}
            value={captureVolumeValue}
            onChange={(value) => {
              setCaptureVolumeValue(value);
              void setCaptureVolume(value);
            }}
          />
          <span className={styles['volume-value']}>{captureVolume}</span>
        </div>
      </div>

      <div className={styles['item-setting']}>
        <span className={styles.title}>{t('live_pusher.speaker')}</span>
        <div className={styles.flex}>
          <Select
            key={`speaker-${currentSpeakerId}-${speakerSignature}`}
            value={currentSpeakerId}
            placeholder={t('live_pusher.select_speaker')}
            theme="dark"
            className={styles.select}
            disabled
            onChange={(value) => void setCurrentSpeaker({ deviceId: String(value) })}
          >
            {speakerOptions.map(item => (
              <Option key={item.deviceId} value={item.deviceId} label={item.deviceName} />
            ))}
          </Select>
          <Button type="default" disabled={isSpeakerTestPending} onClick={() => void handleSpeakerTest()}>
            {isSpeakerTesting ? t('live_pusher.stop_test') : t('live_pusher.test')}
          </Button>
        </div>
      </div>
    </div>
  );
}
