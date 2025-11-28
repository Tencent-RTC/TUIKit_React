import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveMonitorState, LiveMonitorView, type MonitorLiveInfo } from 'tuikit-atomicx-react';
import {
  MessageBox,
  IconSpeakerOn,
  IconSpeakerOff,
  IconClose1 as IconClose,
  IconStopCircle,
  IconNotification,
  IconChevronDown,
  IconEmpty,
  useUIKit,
  Action,
  IconLoading,
} from '@tencentcloud/uikit-base-component-react';
import { defaultCoverUrl, defaultAvatarUrl } from '../../config';
import styles from './LiveList.module.scss';
import { usePaginationState } from '../../state/PaginationState';
import { useResponsiveGrid } from '../../hooks/useResponsiveGrid';

const setFullScreen = (element: HTMLElement) => {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) {
    (element as any).webkitRequestFullscreen();
  } else if ((element as any).msRequestFullscreen) {
    (element as any).msRequestFullscreen();
  }
};

const exitFullScreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    (document as any).webkitExitFullscreen();
  } else if ((document as any).msExitFullscreen) {
    (document as any).msExitFullscreen();
  }
};

const setDefaultAvatar = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const target = e.currentTarget as HTMLImageElement;
  if (target.src !== defaultAvatarUrl) {
    target.src = defaultAvatarUrl;
  }
};

const Avatar = ({ size, src }: { size: number; src: string }) => (
  <img
    src={src}
    alt='avatar'
    onError={setDefaultAvatar}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      objectFit: 'cover',
    }}
  />
);

interface LiveListProps {
  monitorLiveInfoList: MonitorLiveInfo[];
  className?: string;
}

const LiveList: React.FC<LiveListProps> = ({ monitorLiveInfoList, className }) => {
  const { isLoading, hasMoreData } = usePaginationState();
  const { t } = useUIKit();
  const { closeRoom, stopPlay, muteLiveAudio } = useLiveMonitorState();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { itemWidth, itemHeight, itemsPerRow } = useResponsiveGrid({
    itemsPerRow: 5,
    gap: 8,
    containerPadding: 16,
    aspectRatio: 372 / 398,
    containerRef,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const isFullscreenLiveIdRef = useRef<string>('');

  const handleCloseLive = useCallback(
    async (liveId: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        MessageBox.alert({
          title: `${t('Whether to forcibly disband the live')}: ${liveId}`,
          showClose: true,
          confirmText: t('Confirm'),
          cancelText: t('Cancel'),
          content: t('After being forcibly shut down, the live will be disbanded.'),
          callback: async (action?: Action) => {
            try {
              if (action === 'confirm') {
                await stopPlay(liveId);
                await closeRoom(liveId);
                if (isFullscreen) {
                  exitFullScreen();
                }
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          },
        });
      });
    },
    [stopPlay, closeRoom]
  );

  const handleClickDetails = useCallback((liveId: string) => {
    const element = document.getElementById(liveId);
    if (element) {
      setFullScreen(element);
      isFullscreenLiveIdRef.current = liveId;
    }
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      exitFullScreen();
    }
  }, []);

  const toggleMuteAudio = useCallback(
    async (liveId: string) => {
      const newMutedState = !isMuted;
      await muteLiveAudio(liveId, newMutedState);
      setIsMuted(newMutedState);
    },
    [isMuted, muteLiveAudio]
  );

  const onFullscreenChange = useCallback(async () => {
    if (document.fullscreenElement) {
      setIsFullscreen(true);
    } else {
      setIsFullscreen(false);
      if (!isMuted && isFullscreenLiveIdRef.current) {
        await muteLiveAudio(isFullscreenLiveIdRef.current, true);
        setIsMuted(true);
        isFullscreenLiveIdRef.current = '';
      }
    }
  }, [isMuted, muteLiveAudio]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [onFullscreenChange]);

  // Show loading state when fetching data or starting playback
  if (isLoading) {
    return (
      <div className={styles['live-list-empty']}>
        <IconLoading size='52' className={styles['icon-loading']} />
      </div>
    );
  }

  // Show empty state when there's no live data
  if (monitorLiveInfoList.length === 0 && !hasMoreData) {
    return (
      <div className={styles['live-list-empty']}>
        <IconEmpty size='126' />
        <span>{t('No Live right now')}</span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${styles['live-list-container']} ${className || ''}`}
      style={{
        gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
      }}
    >
      {monitorLiveInfoList.map(item => (
        <div 
          key={item.liveId} 
          className={styles['live-list-item']}
          style={{
            width: `${itemWidth}px`,
            height: `${itemHeight}px`,
          }}
        >
          <div className={styles['live-view-mask']} id={item.liveId}>
            <div
              className={`${styles['live-view-background']} ${item.coverUrl ? '' : styles['live-view-cover-background']}`}
              style={{
                backgroundImage: `url(${item.backgroundUrl || item.coverUrl || defaultCoverUrl})`,
              }}
            />
            <LiveMonitorView liveInfo={item} onClickCloseLive={handleCloseLive} />
            <div className={styles['live-id']}>{`${t('RoomId')}: ${item.liveId}`}</div>
            {!isFullscreen && (
              <div className={styles['display-details']} onClick={() => handleClickDetails(item.liveId)}>
                {t('Display details')}
              </div>
            )}
            {isFullscreen && (
              <IconClose className={styles['close-fullscreen']} size='32' onClick={handleCloseFullscreen} />
            )}
            {isFullscreen && (
              <div className={styles['toggle-audio-button']} onClick={() => toggleMuteAudio(item.liveId)}>
                {isMuted ? <IconSpeakerOff size='32' /> : <IconSpeakerOn size='32' />}
              </div>
            )}
          </div>
          <div className={styles['live-info']}>
            <div className={styles['live-name']}>{item.liveName}</div>
            <div className={styles['live-owner']}>
              <Avatar size={20} src={item.avatarUrl || defaultAvatarUrl} />
              <span className={styles['live-owner-name']}>{item.liveOwner}</span>
            </div>
          </div>
          <div className={styles['operate-button']}>
            <div className={`${styles['warn-button']} ${styles.button}`}>
              <IconNotification />
              <span className={styles['button-text']}>{t('Warning')}</span>
              <IconChevronDown />
            </div>
            <div className={`${styles['close-button']} ${styles.button}`} onClick={() => handleCloseLive(item.liveId)}>
              <IconStopCircle />
              <span className={styles['button-text']}>{t('Force Close')}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveList;
