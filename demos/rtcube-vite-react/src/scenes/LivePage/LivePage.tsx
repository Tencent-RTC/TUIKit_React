import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIKit } from '@tencentcloud/chat-uikit-react';
import { Toast, Button, IconLoading } from '@tencentcloud/uikit-base-component-react';
import {
  useLiveListState,
  useRoomEngine,
  useLoginState,
  LoginStatus,
  LiveView,
  LiveGift
} from 'tuikit-atomicx-react';
import { AudiencePanel } from './components/AudiencePanel/AudiencePanel';
import { ChatPanel } from './components/ChatPanel/ChatPanel';
import styles from './LivePage.module.scss';

const audienceMockList = [
  { id: 'viewer-1', name: 'Nightbot', badge: 'MOD' },
  { id: 'viewer-2', name: 'Sperkfun4', badge: 'VIP' },
  { id: 'viewer-3', name: 'Johntraz', badge: '' },
  { id: 'viewer-4', name: 'Ghost_Beretita', badge: 'SUB' },
  { id: 'viewer-5', name: 'EliDaposs', badge: '' },
  { id: 'viewer-6', name: 'Spectral_0', badge: 'VIP' },
];

function LivePage() {
  const [searchParams] = useSearchParams();
  const { status } = useLoginState();
  const { t } = useUIKit();
  const { currentLive, joinLive, leaveLive } = useLiveListState();
  const roomEngine = useRoomEngine();
  const liveIdFromQuery = searchParams.get('liveId')?.trim() ?? '';
  const [roomId, setRoomId] = useState(liveIdFromQuery);
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  useEffect(() => {
    setRoomId(liveIdFromQuery);
  }, [liveIdFromQuery]);

  const handleJoinLive = async () => {
    if (status !== LoginStatus.SUCCESS) {
      console.warn('[LivePage] please login before joining live');
      return;
    }
    if (!roomId) {
      console.warn('[LivePage] room id is required');
      return;
    }
    if (!roomEngine.instance) {
      console.warn('[LivePage] room engine not ready');
      return;
    }

    try {
      setIsJoinLoading(true);
      await joinLive({ liveId: roomId.trim() });
      console.log('[LivePage] joinLive success', roomId.trim());
      Toast.success({ message: t('scene.live.joinLiveSuccess') });
    } catch (error) {
      Toast.error({ message: `${t('scene.live.joinLiveFailed')}. error: ${error}` });
    } finally {
      setIsJoinLoading(false);
    }
  };

  const handleLeaveLive = async () => {
    if (!roomEngine.instance) {
      return;
    }
    try {
      await leaveLive();
      Toast.success({ message: t('scene.live.leaveLiveSuccess') });
    } catch (error) {
      Toast.error({ message: `${t('scene.live.leaveLiveFailed')}. error: ${error}` });
    }
  };

  const showLive = Boolean(currentLive?.liveId);
  const audienceCount = currentLive?.currentViewerCount ?? audienceMockList.length;
  const audienceList = useMemo(() => audienceMockList, []);

  const hostName =
    currentLive?.liveOwner.userName || currentLive?.liveOwner.userId || t('scene.live.hostLabel');
  const hostAvatar = currentLive?.liveOwner.avatarUrl;

  return (
    <div className={styles.LivePage}>
      <div className={styles.LivePage__header}>
        <div className={styles.LivePage__brand}>
          <span>LiveSuite</span>
          <div className={styles.LivePage__brandTagline}>{t('scene.live.title')}</div>
        </div>
        <div className={styles.LivePage__controls}>
          <input
            className={styles.LivePage__roomInput}
            value={roomId}
            onChange={event => setRoomId(event.target.value)}
            placeholder={t('scene.live.roomPlaceholder')}
          />
          <Button
            className={styles.LivePage__buttonPrimary}
            onClick={handleJoinLive}
            disabled={isJoinLoading || Boolean(currentLive?.liveId)}
            type="primary"
            loading={isJoinLoading}
          >
            {t('scene.live.joinLive')}
          </Button>
          <Button
            className={styles.LivePage__buttonGhost}
            onClick={handleLeaveLive}
            disabled={!currentLive?.liveId}
            type="text"
          >
            {t('scene.live.leaveLive')}
          </Button>
        </div>
      </div>

      <main className={styles.LivePage__main}>
        <div className={styles.LivePage__content}>
          <div className={styles.LivePage__stageHeader}>
            <div className={styles.LivePage__stageAvatar}>
              {hostAvatar ? <img src={hostAvatar} alt={hostName} /> : hostName?.charAt(0) ?? 'H'}
            </div>
            <div className={styles.LivePage__stageHost}>
              <span className={styles.LivePage__stageHostName}>{hostName}</span>
              <span className={styles.LivePage__stageHostMeta}>
                {showLive ? `${t('scene.live.roomIdLabel')}: ${currentLive?.liveId ?? ''}` : t('scene.live.noLive')}
              </span>
            </div>
          </div>
          <div className={styles.LivePage__stageBody}>
            <div className={styles.LivePage__stageCanvas}>
              {showLive ? (
                <div className={styles.LivePage__stageContent}>
                  <LiveView />
                </div>
              ) : (
                <div className={styles.LivePage__stagePlaceholder}>{t('scene.live.noLive')}</div>
              )}
              {isJoinLoading && (
                <div className={styles.LivePage__loadingOverlay}>
                  <IconLoading className={styles.LivePage__loadingIcon} />
                  <span>{t('scene.live.joinLiveLoading')}</span>
                </div>
              )}
            </div>
            {currentLive?.liveId && (
              <div className={styles.LivePage__gift}>
                <LiveGift />
              </div>
            )}
          </div>
        </div>

        <aside className={styles.LivePage__sidebar}>
          <AudiencePanel
            className={`${styles.LivePage__audiencePanelWrapper}`}
            title={t('scene.live.audienceTitle')}
            subtitle={t('scene.live.audienceSubtitle', { count: audienceCount })}
            audienceList={audienceList}
            emptyText={t('scene.live.audiencePlaceholder')}
          />
          <ChatPanel
            className={styles.LivePage__chatPanelWrapper}
            title={t('scene.live.barrageTitle')}
            isLive={showLive}
            emptyText={t('barrage_list.empty')}
          />
        </aside>
      </main>
    </div>
  );
}

export default LivePage;
