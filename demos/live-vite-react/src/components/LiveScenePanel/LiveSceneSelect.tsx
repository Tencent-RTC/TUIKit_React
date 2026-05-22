import { useEffect, useRef, useState } from 'react';
import { Button, IconAddCircle, IconFileImage, IconPhoto, IconScreenShare, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { TRTCMediaSourceType } from '@tencentcloud/tuiroom-engine-js';
import classNames from 'classnames';
import styles from './LiveScenePanel.module.scss';

interface LiveSceneSelectProps {
  displayMode: 'panel' | 'button';
  onAddMaterial: (type: TRTCMediaSourceType) => void;
}

const MATERIALS = [
  { icon: IconPhoto, titleKey: 'Add Camera', type: TRTCMediaSourceType.kCamera },
  { icon: IconScreenShare, titleKey: 'Add Screen Share', type: TRTCMediaSourceType.kScreen },
  { icon: IconFileImage, titleKey: 'Add Image', type: TRTCMediaSourceType.kImage },
];

export default function LiveSceneSelect(props: LiveSceneSelectProps) {
  const { displayMode, onAddMaterial } = props;
  const { t } = useUIKit();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

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
    setIsDropdownVisible(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = window.setTimeout(() => {
      setIsDropdownVisible(false);
    }, 200);
  };

  const handleAddMaterial = (type: TRTCMediaSourceType) => {
    onAddMaterial(type);
    if (displayMode === 'button') {
      setIsDropdownVisible(false);
    }
  };

  if (displayMode === 'panel') {
    return (
      <div className={styles['live-scene-placeholder']}>
        <div className={styles['live-scene-placeholder-content']}>
          <span>{t('We support you to add rich sources')}</span>
          <div className={styles['add-material-list-panel']}>
            {MATERIALS.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.titleKey}
                  type="default"
                  block
                  className={styles['add-material-item']}
                  onClick={() => handleAddMaterial(item.type)}
                >
                  <IconComponent size="16" />
                  <span>{t(item.titleKey)}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Button mode mirrors the Vue implementation: a plain div trigger with a
  // floating dropdown. Using <Button> here used to add UIKit-specific padding
  // and pushed the visible button down from the panel's top edge.
  return (
    <div
      className={styles['live-scene-button']}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles['add-material-button']}>
        <IconAddCircle size="16" />
        <span>{t('Add')}</span>
      </div>
      {isDropdownVisible && (
        <div className={styles['add-material-list']}>
          {MATERIALS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.titleKey}
                type="button"
                className={classNames(styles['add-material-item'], styles['add-material-item-compact'])}
                onClick={() => handleAddMaterial(item.type)}
              >
                <IconComponent size="16" />
                <span>{t(item.titleKey)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
