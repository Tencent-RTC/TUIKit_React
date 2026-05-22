import { useEffect, useRef, useState } from 'react';
import {
  IconSpeakerOff,
  IconSpeakerOn,
  Slider,
} from '@tencentcloud/uikit-base-component-react';
import { useDeviceState } from 'tuikit-atomicx-react';
import styles from './LivePusherControls.module.scss';

const DEFAULT_VOLUME = 100;

export default function SpeakerVolumeSetting() {
  const {
    outputVolume,
    setOutputVolume,
  } = useDeviceState();
  const [speakerVolume, setSpeakerVolume] = useState(outputVolume);
  const [speakerIsOn, setSpeakerIsOn] = useState(true);
  const speakerVolumeBeforeMuteRef = useRef(outputVolume || DEFAULT_VOLUME);

  useEffect(() => {
    setSpeakerVolume(outputVolume);
  }, [outputVolume]);

  const switchSpeaker = async (open: boolean) => {
    setSpeakerIsOn(open);
    if (!open) {
      speakerVolumeBeforeMuteRef.current = speakerVolume || DEFAULT_VOLUME;
      setSpeakerVolume(0);
      await setOutputVolume(0);
      return;
    }

    const volumeToRestore = speakerVolumeBeforeMuteRef.current || DEFAULT_VOLUME;
    setSpeakerVolume(volumeToRestore);
    await setOutputVolume(volumeToRestore);
  };

  const handleSpeakerVolumeChange = async (value: number) => {
    setSpeakerVolume(value);
    if (value !== outputVolume) {
      await setOutputVolume(value);
    }
    if (value === 0 && speakerIsOn) {
      setSpeakerIsOn(false);
    }
    if (value > 0 && !speakerIsOn) {
      setSpeakerIsOn(true);
    }
  };

  return (
    <div className={styles['device-setting']}>
      <button
        type="button"
        className={styles['device-icon']}
        onClick={() => void switchSpeaker(!speakerIsOn)}
      >
        {speakerIsOn ? <IconSpeakerOn size="16" /> : <IconSpeakerOff size="16" />}
      </button>
      <Slider
        className={styles['device-slider']}
        min={0}
        max={100}
        value={speakerVolume}
        onChange={(value) => {
          if (value > 0) {
            speakerVolumeBeforeMuteRef.current = value;
          }
          void handleSpeakerVolumeChange(value);
        }}
      />
    </div>
  );
}
