import { useState } from 'react';
import { TUIVideoQuality } from '@tencentcloud/tuiroom-engine-js';
import {
  Dialog,
  Option,
  Select,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import { useDeviceState, useLiveListState, useVideoMixerState } from 'tuikit-atomicx-react';
import AudioSettingPanel from './AudioSettingPanel';
import styles from './LivePusherControls.module.scss';
import PusherControlButton from './PusherControlButton';
import SettingIcon from './SettingIcon';

export default function SettingButton() {
  const { t } = useUIKit();
  const { currentLive } = useLiveListState();
  const {
    publishVideoQuality,
    setPublishVideoQuality,
  } = useVideoMixerState();
  const {
    getMicrophoneList,
    getSpeakerList,
  } = useDeviceState();
  const [visible, setVisible] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const isCreatedLive = Boolean(currentLive?.liveId);
  const videoQualityList = [
    { label: t('live_pusher.high_definition'), value: TUIVideoQuality.kVideoQuality_720p },
    { label: t('live_pusher.super_definition'), value: TUIVideoQuality.kVideoQuality_1080p },
  ];

  const handleOpenSetting = async () => {
    setIsPreparing(true);
    try {
      await Promise.all([getMicrophoneList(), getSpeakerList()]);
    } catch (error) {
      console.warn('[SettingButton] prepare device data failed:', error);
    } finally {
      setIsPreparing(false);
      setVisible(true);
    }
  };

  return (
    <>
      <PusherControlButton
        disabled={isPreparing}
        icon={<SettingIcon />}
        label={t('live_pusher.setting')}
        onClick={() => void handleOpenSetting()}
      />
      <Dialog
        visible={visible}
        title={t('live_pusher.setting')}
        className={styles['setting-dialog']}
        showConfirm={false}
        showCancel={false}
        onClose={() => setVisible(false)}
        style={{ width: 400 }}
      >
        <div className={styles['setting-panel']}>
          <div className={styles.section}>
            <div className={styles['section-title']}>{t('live_pusher.video_profile')}</div>
            <div className={styles.row}>
              <span className={styles.label}>{t('live_pusher.resolution')}</span>
              <Select
                key={`resolution-${publishVideoQuality}-${videoQualityList.length}`}
                value={String(publishVideoQuality)}
                theme="dark"
                disabled={isCreatedLive}
                className={styles.select}
                onChange={value => setPublishVideoQuality(Number(value) as TUIVideoQuality)}
              >
                {videoQualityList.map(item => (
                  <Option key={item.value} value={String(item.value)} label={item.label} />
                ))}
              </Select>
            </div>
          </div>
          <div className={styles.divider} />
          <AudioSettingPanel />
        </div>
      </Dialog>
    </>
  );
}
