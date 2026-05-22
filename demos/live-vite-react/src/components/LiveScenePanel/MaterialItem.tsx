import { useEffect, useRef, useState } from 'react';
import {
  IconImageSquare,
  IconPhoto,
  IconScreenShare,
  IconVerticalMoreTwo,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import { TRTCMediaSourceType, TRTCVideoMirrorType } from '@tencentcloud/tuiroom-engine-js';
import classNames from 'classnames';
import type { MediaSource } from 'tuikit-atomicx-react';
import { useVideoMixerState } from 'tuikit-atomicx-react';
import MirrorOnIcon from './icons/MirrorOnIcon';
import MirrorOffIcon from './icons/MirrorOffIcon';
import styles from './LiveScenePanel.module.scss';

interface MaterialItemProps {
  material: MediaSource;
  onCameraSetting: (material: MediaSource) => void;
  onRename: (material: MediaSource) => void;
}

function getMaterialIcon(type: TRTCMediaSourceType) {
  const iconMap = {
    [TRTCMediaSourceType.kCamera]: IconPhoto,
    [TRTCMediaSourceType.kImage]: IconImageSquare,
    [TRTCMediaSourceType.kScreen]: IconScreenShare,
  };
  return iconMap[type] || IconPhoto;
}

export default function MaterialItem(props: MaterialItemProps) {
  const { material, onCameraSetting, onRename } = props;
  const { t } = useUIKit();
  const { activeMediaSource, updateMediaSource, removeMediaSource } = useVideoMixerState();
  const [showDropdown, setShowDropdown] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const IconComponent = getMaterialIcon(material.type);

  useEffect(() => () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
  }, []);

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = window.setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  };

  const toggleMirror = async () => {
    const currentMirror = material.layout?.mirror;
    const nextMirror =
      currentMirror === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
        ? TRTCVideoMirrorType.TRTCVideoMirrorType_Disable
        : TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;

    await updateMediaSource(material, {
      layout: {
        mirror: nextMirror,
      },
    });
  };

  const handleSelectMaterial = async () => {
    await updateMediaSource(material, { isSelected: true });
  };

  const handleDeleteMaterial = async () => {
    try {
      await removeMediaSource(material);
    } catch (error) {
      console.error('[LiveScenePanel] removeMediaSource failed:', error, material);
    } finally {
      setShowDropdown(false);
    }
  };

  return (
    <div
      className={classNames(styles['material-item'], {
        [styles.active]: activeMediaSource?.id === material.id,
        [styles['show-dropdown']]: showDropdown,
      })}
      onClick={() => void handleSelectMaterial()}
    >
      <div className={styles['material-icon']}>
        <IconComponent size="16" />
      </div>
      <div className={styles['material-info']}>
        <span className={styles['material-name']}>{material.name}</span>
      </div>
      <div className={styles['material-controls']}>
        <button
          type="button"
          className={styles['control-button']}
          onClick={(event) => {
            event.stopPropagation();
            void toggleMirror();
          }}
        >
          {material.layout?.mirror === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
            ? <MirrorOnIcon width={14} height={14} />
            : <MirrorOffIcon width={14} height={14} />}
        </button>
        <button
          type="button"
          className={styles['control-button']}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <IconVerticalMoreTwo size="14" />
        </button>
        {showDropdown && (
          <div
            className={styles['dropdown-menu']}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(event) => event.stopPropagation()}
          >
            {material.type === TRTCMediaSourceType.kCamera && (
              <button
                type="button"
                className={styles['dropdown-item']}
                onClick={() => {
                  setShowDropdown(false);
                  onCameraSetting(material);
                }}
              >
                <span>{t('Settings')}</span>
              </button>
            )}
            <button
              type="button"
              className={styles['dropdown-item']}
              onClick={() => {
                setShowDropdown(false);
                onRename(material);
              }}
            >
              <span>{t('Rename')}</span>
            </button>
            <button
              type="button"
              className={styles['dropdown-item']}
              onClick={() => void handleDeleteMaterial()}
            >
              <span>{t('Delete')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
