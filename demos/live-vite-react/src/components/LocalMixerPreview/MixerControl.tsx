import { useMemo } from 'react';
import {
  IconArrowStrokeDown,
  IconArrowStrokeUpward,
  IconDelete,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import {
  TRTCVideoMirrorType,
  TRTCVideoRotation,
} from '@tencentcloud/tuiroom-engine-js';
import classNames from 'classnames';
import type { MediaSource } from 'tuikit-atomicx-react';
import { useVideoMixerState } from 'tuikit-atomicx-react';
import MirrorOnIcon from '../LiveScenePanel/icons/MirrorOnIcon';
import MirrorOffIcon from '../LiveScenePanel/icons/MirrorOffIcon';
import RotationIcon from './icons/RotationIcon';
import styles from './LocalMixerPreview.module.scss';

type MixerControlProps = {
  activeMediaSource: MediaSource;
};

function getRotationValues() {
  const rotationEnum = TRTCVideoRotation as any;
  return {
    rotation0: rotationEnum.TRTCVideoRotation0 ?? rotationEnum.TRTCVideoRotation_0,
    rotation90: rotationEnum.TRTCVideoRotation90 ?? rotationEnum.TRTCVideoRotation_90,
    rotation180: rotationEnum.TRTCVideoRotation180 ?? rotationEnum.TRTCVideoRotation_180,
    rotation270: rotationEnum.TRTCVideoRotation270 ?? rotationEnum.TRTCVideoRotation_270,
  };
}

export default function MixerControl(props: MixerControlProps) {
  const { activeMediaSource } = props;
  const { t } = useUIKit();
  const {
    mediaSourceList,
    updateMediaSource,
    removeMediaSource,
  } = useVideoMixerState();

  const orderedMediaSourceList = useMemo(
    () => [...mediaSourceList].sort((item1, item2) => (item1.layout?.zOrder || 0) - (item2.layout?.zOrder || 0)),
    [mediaSourceList],
  );

  const activeIndex = orderedMediaSourceList.findIndex(item => item.id === activeMediaSource.id);
  const isBottomLayer = activeIndex <= 0;
  const isTopLayer = activeIndex === orderedMediaSourceList.length - 1;

  const toggleMirror = async () => {
    const currentMirror = activeMediaSource.layout?.mirror;
    const nextMirror = currentMirror === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
      ? TRTCVideoMirrorType.TRTCVideoMirrorType_Disable
      : TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;

    await updateMediaSource(activeMediaSource, {
      layout: {
        mirror: nextMirror,
      },
    });
  };

  const rotate = async () => {
    const {
      rotation0,
      rotation90,
      rotation180,
      rotation270,
    } = getRotationValues();
    const currentRotation = activeMediaSource.layout?.rotation ?? rotation0;
    const nextRotationMap = {
      [rotation0]: rotation90,
      [rotation90]: rotation180,
      [rotation180]: rotation270,
      [rotation270]: rotation0,
    };

    await updateMediaSource(activeMediaSource, {
      layout: {
        rotation: nextRotationMap[currentRotation] ?? rotation90,
      },
    });
  };

  const moveLayer = async (direction: 'up' | 'down') => {
    if ((direction === 'up' && isTopLayer) || (direction === 'down' && isBottomLayer)) {
      return;
    }

    const nextMediaSource = orderedMediaSourceList[direction === 'up' ? activeIndex + 1 : activeIndex - 1];
    if (!nextMediaSource) {
      return;
    }

    const activeZOrder = activeMediaSource.layout?.zOrder || 0;
    const nextZOrder = nextMediaSource.layout?.zOrder || 0;
    await updateMediaSource(activeMediaSource, { layout: { zOrder: direction === 'up' ? 999 : 0 } });
    await updateMediaSource(nextMediaSource, { layout: { zOrder: activeZOrder } });
    await updateMediaSource(activeMediaSource, { layout: { zOrder: nextZOrder } });
  };

  const isMirrorEnabled
    = activeMediaSource.layout?.mirror === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;

  const controlList = [
    {
      name: 'mirror',
      label: t('live_pusher.mirror'),
      icon: isMirrorEnabled
        ? <MirrorOnIcon width={18} height={18} />
        : <MirrorOffIcon width={18} height={18} />,
      onClick: toggleMirror,
    },
    {
      name: 'rotate',
      label: t('live_pusher.rotate'),
      icon: <RotationIcon width={18} height={18} />,
      onClick: rotate,
    },
    {
      name: 'move-up',
      label: t('live_pusher.move_up'),
      icon: <IconArrowStrokeUpward size="18" />,
      disabled: isTopLayer,
      onClick: () => moveLayer('up'),
    },
    {
      name: 'move-down',
      label: t('live_pusher.move_down'),
      icon: <IconArrowStrokeDown size="18" />,
      disabled: isBottomLayer,
      onClick: () => moveLayer('down'),
    },
    {
      name: 'delete',
      label: t('live_pusher.delete'),
      icon: <IconDelete size="18" />,
      danger: true,
      onClick: () => removeMediaSource(activeMediaSource),
    },
  ];

  return (
    <div
      className={styles['mixer-control']}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {controlList.map(item => (
        <button
          key={item.name}
          type="button"
          className={classNames(styles['mixer-control-item'], {
            [styles.disable]: item.disabled,
            [styles.danger]: item.danger,
          })}
          disabled={item.disabled}
          onClick={() => void item.onClick()}
        >
          <span className={styles['mixer-control-item-icon']}>{item.icon}</span>
          <span className={styles['mixer-control-item-name']}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
