import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  IconLayoutTemplate,
  Toast,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import { useLiveListState, useLiveSeatState } from 'tuikit-atomicx-react';
import PusherControlButton from './PusherControlButton';
import { TUISeatLayoutTemplate } from './types';
import {
  Dynamic1v6Icon,
  DynamicGrid9Icon,
  Fixed1v6Icon,
  FixedGrid9Icon,
  HorizontalFloatIcon,
} from './icons';
import styles from './LivePusherControls.module.scss';

const GRID_LAST_SEAT_INDEXES = [7, 8];

export default function LayoutSwitch() {
  const { t } = useUIKit();
  const { currentLive, updateLiveInfo } = useLiveListState();
  const { seatList } = useLiveSeatState();
  const [visible, setVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
    currentLive?.layoutTemplate ?? null,
  );

  const portraitLayoutOptions = useMemo(() => [
    {
      id: 'PortraitDynamic_Grid9',
      icon: DynamicGrid9Icon,
      templateId: TUISeatLayoutTemplate.PortraitDynamic_Grid9,
      label: t('live_pusher.dynamic_grid9_layout'),
    },
    {
      id: 'PortraitFixed_1v6',
      icon: Fixed1v6Icon,
      templateId: TUISeatLayoutTemplate.PortraitFixed_1v6,
      label: t('live_pusher.fixed_1v6_layout'),
    },
    {
      id: 'PortraitFixed_Grid9',
      icon: FixedGrid9Icon,
      templateId: TUISeatLayoutTemplate.PortraitFixed_Grid9,
      label: t('live_pusher.fixed_grid9_layout'),
    },
    {
      id: 'PortraitDynamic_1v6',
      icon: Dynamic1v6Icon,
      templateId: TUISeatLayoutTemplate.PortraitDynamic_1v6,
      label: t('live_pusher.dynamic_1v6_layout'),
    },
  ], [t]);

  const horizontalLayoutOptions = useMemo(() => [
    {
      id: 'LandscapeDynamic_1v3',
      icon: HorizontalFloatIcon,
      templateId: TUISeatLayoutTemplate.LandscapeDynamic_1v3,
      label: t('live_pusher.landscape_template'),
    },
  ], [t]);

  const layoutOptions = useMemo(() => {
    const layoutTemplate = currentLive?.layoutTemplate;
    if (
      layoutTemplate
      && layoutTemplate >= TUISeatLayoutTemplate.LandscapeDynamic_1v3
      && layoutTemplate < TUISeatLayoutTemplate.PortraitDynamic_Grid9
    ) {
      return horizontalLayoutOptions;
    }
    return portraitLayoutOptions;
  }, [currentLive?.layoutTemplate, horizontalLayoutOptions, portraitLayoutOptions]);

  useEffect(() => {
    if (currentLive?.layoutTemplate) {
      setSelectedTemplate(currentLive.layoutTemplate);
    }
  }, [currentLive?.layoutTemplate]);

  const checkTemplateInGrid9SwitchEnable = (template: TUISeatLayoutTemplate) => {
    const isUserSeatedOnLastTwoSeats = seatList.some(
      seat => seat.userInfo?.userId && GRID_LAST_SEAT_INDEXES.includes(seat.index),
    );

    if (
      isUserSeatedOnLastTwoSeats
      && template !== TUISeatLayoutTemplate.PortraitFixed_Grid9
      && template !== TUISeatLayoutTemplate.PortraitDynamic_Grid9
    ) {
      return {
        enable: false,
        message: t('live_pusher.new_layout_cannot_display_all_users'),
      };
    }

    return { enable: true, message: '' };
  };

  const checkSwitchTemplateEnable = (template: TUISeatLayoutTemplate) => {
    switch (selectedTemplate) {
      case TUISeatLayoutTemplate.PortraitFixed_Grid9:
      case TUISeatLayoutTemplate.PortraitDynamic_Grid9:
        return checkTemplateInGrid9SwitchEnable(template);
      default:
        return { enable: true, message: '' };
    }
  };

  const selectTemplate = (template: TUISeatLayoutTemplate) => {
    const { enable, message } = checkSwitchTemplateEnable(template);
    if (!enable) {
      Toast.error({ message });
      return;
    }
    setSelectedTemplate(template);
  };

  const handleConfirm = async () => {
    if (!selectedTemplate || selectedTemplate === currentLive?.layoutTemplate) {
      setVisible(false);
      return;
    }

    try {
      await updateLiveInfo({ layoutTemplate: selectedTemplate });
      setVisible(false);
    } catch {
      Toast.error({ message: t('live_pusher.layout_switch_failed') });
    }
  };

  const handleCancel = () => {
    setSelectedTemplate(currentLive?.layoutTemplate ?? null);
    setVisible(false);
  };

  return (
    <>
      <PusherControlButton
        icon={<IconLayoutTemplate size="24" style={{ fill: 'none' }} />}
        label={t('live_pusher.layout_settings')}
        onClick={() => setVisible(true)}
      />
      <Dialog
        visible={visible}
        title={t('live_pusher.layout_settings')}
        className={styles['layout-dialog']}
        confirmText={t('live_pusher.confirm')}
        cancelText={t('live_pusher.cancel')}
        onClose={handleCancel}
        onCancel={handleCancel}
        onConfirm={() => void handleConfirm()}
        width={480}
      >
        <div className={styles['layout-panel']}>
          <div className={styles['layout-label']}>{t('live_pusher.audience_layout')}</div>
          <div className={styles['options-grid']}>
            {layoutOptions.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(styles['option-card'], {
                    [styles.active]: selectedTemplate === item.templateId,
                  })}
                  onClick={() => selectTemplate(item.templateId)}
                >
                  <div className={styles['option-info']}>
                    {IconComponent && <IconComponent className={styles['option-icon']} />}
                    <h4 className={styles['option-name']}>{item.label}</h4>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Dialog>
    </>
  );
}
