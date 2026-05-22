import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TUIRoomEngine, { TUISeatMode } from '@tencentcloud/tuiroom-engine-js';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  IconArrowStrokeBack,
  IconCopy,
  IconEditor,
  IconLive,
  IconStopCircle,
  Input,
  MessageBox,
  Toast,
  useUIKit,
} from '@tencentcloud/uikit-base-component-react';
import {
  BarrageInput,
  BarrageList,
  LiveAudienceList,
  LiveListEvent,
  useDeviceState,
  useLiveAudienceState,
  useLiveListState,
  useLoginState,
  useRoomEngine,
} from 'tuikit-atomicx-react';
import { LiveHeader } from '@/components/LiveHeader';
import { LocalMixerPreview } from '@/components/LocalMixerPreview';
// NOTE: `LayoutSwitch` is intentionally NOT imported here. React 端目前不
// 支持连麦 / 连线，因此布局切换入口暂无业务场景，先从底部栏隐藏。
// 组件实现仍保留在 `@/components/LivePusherControls/LayoutSwitch.tsx`
// 以及对应的 `index.ts` 导出里，待后续支持连麦能力后，直接在下面的
// `main-center-bottom-tools` 里恢复 `<LayoutSwitch />` 即可。
import {
  MicVolumeSetting,
  OrientationSwitch,
  SettingButton,
  SpeakerVolumeSetting,
} from '@/components/LivePusherControls';
import { LiveScenePanel } from '@/components/LiveScenePanel';
import { STORAGE_KEYS } from '@/constants';
import { copyToClipboard, initRoomEngineLanguage } from '@/utils';
import styles from './LivePusher.module.scss';

const LivePusher: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useUIKit();
  const roomEngine = useRoomEngine();
  const { loginUserInfo } = useLoginState();
  const { audienceCount } = useLiveAudienceState();
  const {
    openLocalMicrophone,
  } = useDeviceState();
  const {
    currentLive,
    startLive,
    joinLive,
    endLive,
    leaveLive,
    subscribeEvent,
    unsubscribeEvent,
  } = useLiveListState();

  const [loading, setLoading] = useState(false);
  const [draftLiveName, setDraftLiveName] = useState('');
  const [isLiveNameDialogVisible, setIsLiveNameDialogVisible] = useState(false);
  const [editingLiveName, setEditingLiveName] = useState('');
  const hasPromptedRestoreRef = useRef(false);

  const isHostOfCurrentLive = useMemo(() => {
    if (!currentLive?.liveId || !loginUserInfo?.userId) {
      return false;
    }
    return currentLive.liveOwner?.userId === loginUserInfo.userId;
  }, [currentLive?.liveId, currentLive?.liveOwner?.userId, loginUserInfo?.userId]);

  const isInLive = useMemo(() => Boolean(currentLive?.liveId && isHostOfCurrentLive), [currentLive?.liveId, isHostOfCurrentLive]);

  const liveId = useMemo(
    () => `live_${loginUserInfo?.userId || ''}`,
    [loginUserInfo?.userId],
  );

  const liveName = useMemo(() => {
    if (draftLiveName.trim()) {
      return draftLiveName.trim();
    }
    if (currentLive?.liveName) {
      return currentLive.liveName;
    }
    return loginUserInfo?.userName || loginUserInfo?.userId || '';
  }, [currentLive?.liveName, draftLiveName, loginUserInfo?.userId, loginUserInfo?.userName]);

  const openMicAndStartPublish = useCallback(async () => {
    // Only the local microphone is opened here. Publishing the mixed video
    // stream is driven exclusively by LocalMixerPreview, which watches
    // currentLive.liveId and calls startPublish/stopPublish through a
    // serialized task chain. Calling startPublish() here as well caused
    // re-entrant publishes that left the mixer plugin in a half-started
    // state, so only the first media source (typically the camera) was
    // ever delivered to remote viewers and any source added afterwards
    // failed with "OPERATION_ABORT: updatePlugin abort: not started".
    await openLocalMicrophone();
  }, [openLocalMicrophone]);

  const doJoinAndOpenMic = useCallback(async (targetLiveId: string) => {
    await initRoomEngineLanguage(language);
    await joinLive({ liveId: targetLiveId });
    await openMicAndStartPublish();
  }, [joinLive, language, openMicAndStartPublish]);

  const handleStartLive = useCallback(async () => {
    if (loading) {
      return;
    }
    if (!loginUserInfo?.userId || !liveId || !liveName) {
      Toast.info({ message: t('live_pusher.login_required') });
      return;
    }

    setLoading(true);
    try {
      await initRoomEngineLanguage(language);
      const seatLayoutTemplateId = currentLive?.layoutTemplate || 0;
      await startLive({
        liveId,
        liveName,
        notice: '',
        isMessageDisableForAllUser: false,
        isGiftEnabled: true,
        isLikeEnabled: true,
        isPublicVisible: true,
        isSeatEnabled: true,
        keepOwnerOnSeat: seatLayoutTemplateId ? undefined : true,
        seatLayoutTemplateId,
        maxSeatCount: seatLayoutTemplateId ? undefined : 6,
        seatMode: TUISeatMode.kApplyToTake,
        coverUrl: '',
        backgroundUrl: '',
        categoryList: [],
        activityStatus: 1,
      });
      // After startLive() the room exists on the server side but the
      // host has not entered it yet. Without joinLive(), the
      // mediaSourceManager.startPublish() call that LocalMixerPreview
      // kicks off as soon as currentLive.liveId flips on has nowhere
      // to actually push the mixVideoTrack - the audience side ends
      // up falling back to the raw camera track and never reflects
      // any subsequent mix edits. Mirror Vue3's flow and join our
      // own room before opening the mic so the publish pipeline
      // reaches the room.
      await joinLive({ liveId });
      await openMicAndStartPublish();
    } catch (error: any) {
      const ownerRoomExists =
        typeof error?.message === 'string'
        && error.message.includes('this room already exists, and you are the owner');

      if (ownerRoomExists) {
        await doJoinAndOpenMic(liveId);
      } else {
        MessageBox.alert({
          title: t('live_pusher.start_live_failed_title'),
          content: t('live_pusher.start_live_failed_content'),
          confirmText: t('live_pusher.confirm'),
          showClose: false,
          modal: true,
        });
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [currentLive?.layoutTemplate, doJoinAndOpenMic, joinLive, language, liveId, liveName, loading, loginUserInfo?.userId, openMicAndStartPublish, startLive, t]);

  const handleEndLive = useCallback(async () => {
    if (loading || !isInLive) {
      return;
    }
    setLoading(true);
    try {
      await endLive();
    } catch (error) {
      MessageBox.alert({
        title: t('live_pusher.end_live_failed_title'),
        content: t('live_pusher.end_live_failed_content'),
        confirmText: t('live_pusher.confirm'),
        showClose: false,
        modal: true,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [endLive, isInLive, loading, t]);

  const showEndLiveDialog = useCallback(() => {
    if (loading || !isInLive) {
      return;
    }
    MessageBox.alert({
      title: t('live_pusher.end_live_title'),
      content: t('live_pusher.leave_confirm_content'),
      cancelText: t('live_pusher.cancel'),
      confirmText: t('live_pusher.end_live_button'),
      showClose: false,
      modal: true,
      callback: (action) => {
        if (action !== 'confirm') {
          return;
        }
        void handleEndLive();
      },
    });
  }, [handleEndLive, isInLive, loading, t]);

  const handleLeave = useCallback(() => {
    if (!isInLive) {
      navigate('/live-list');
      return;
    }
    showEndLiveDialog();
  }, [isInLive, navigate, showEndLiveDialog]);

  const handleEditLiveName = useCallback(() => {
    setEditingLiveName(liveName);
    setIsLiveNameDialogVisible(true);
  }, [liveName]);

  // Copy the current live's room id to the clipboard. Only meaningful while
  // the host is in-live (the icon is hidden otherwise so this guard is just
  // defensive against races between click and live-end events).
  const handleCopyLiveId = useCallback(async () => {
    const roomId = currentLive?.liveId;
    if (!roomId) {
      Toast.error({ message: t('live_pusher.copy_failed') });
      return;
    }
    try {
      await copyToClipboard(roomId);
      Toast.success({ message: t('live_pusher.copy_success') });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[LivePusher] copy live id failed:', error);
      Toast.error({ message: t('live_pusher.copy_failed') });
    }
  }, [currentLive?.liveId, t]);

  const handleCloseLiveNameDialog = useCallback(() => {
    setIsLiveNameDialogVisible(false);
    setEditingLiveName('');
  }, []);

  const handleConfirmLiveName = useCallback(async () => {
    if (loading) {
      return;
    }

    const nextName = editingLiveName.trim();
    if (!nextName) {
      Toast.info({ message: t('live_pusher.live_name_input_placeholder') });
      return;
    }

    if (isInLive && currentLive?.liveId) {
      try {
        setLoading(true);
        await roomEngine.instance?.getLiveListManager()?.setLiveInfo({
          roomId: currentLive.liveId,
          name: nextName,
        });
      } catch (error) {
        Toast.error({ message: t('live_pusher.update_live_name_failed') });
        return;
      } finally {
        setLoading(false);
      }
    }

    setDraftLiveName(nextName);
    handleCloseLiveNameDialog();
  }, [currentLive?.liveId, editingLiveName, handleCloseLiveNameDialog, isInLive, loading, roomEngine.instance, t]);

  // Mirror Vue3 `watch(currentLive.liveId)` semantics: only persist the
  // live id when a fresh one appears, and only clear storage when an
  // existing one transitions to empty (i.e. the user actually ended the
  // live). Unconditionally writing / clearing on every effect run would
  // wipe the cached id during the component's initial mount - which
  // happens *before* the restore prompt effect gets to read it - and
  // the "resume live" dialog would never be offered after a refresh.
  const prevStoredLiveIdRef = useRef<string>('');
  useEffect(() => {
    const prev = prevStoredLiveIdRef.current;
    const next = currentLive?.liveId && isHostOfCurrentLive ? currentLive.liveId : '';
    if (prev === next) {
      return;
    }
    prevStoredLiveIdRef.current = next;
    if (next) {
      sessionStorage.setItem(STORAGE_KEYS.LIVE_ID, next);
    } else if (prev) {
      // Only clear storage when we really went from "live" to "not live".
      // On the initial mount (prev === '' && next === '') we leave any
      // cached id in place so the restore effect below can read it.
      sessionStorage.removeItem(STORAGE_KEYS.LIVE_ID);
    }
  }, [currentLive?.liveId, isHostOfCurrentLive]);

  useEffect(() => {
    if (!loginUserInfo?.userId || hasPromptedRestoreRef.current) {
      return;
    }
    hasPromptedRestoreRef.current = true;

    const cachedLiveId = sessionStorage.getItem(STORAGE_KEYS.LIVE_ID);
    if (!cachedLiveId) {
      return;
    }
    if (cachedLiveId !== liveId) {
      sessionStorage.removeItem(STORAGE_KEYS.LIVE_ID);
      return;
    }

    MessageBox.alert({
      title: t('live_pusher.restore_title'),
      content: t('live_pusher.restore_content'),
      cancelText: t('live_pusher.cancel'),
      confirmText: t('live_pusher.confirm'),
      showClose: false,
      modal: true,
      callback: async (action) => {
        if (action !== 'confirm') {
          sessionStorage.removeItem(STORAGE_KEYS.LIVE_ID);
          return;
        }
        try {
          await doJoinAndOpenMic(cachedLiveId);
        } catch {
          sessionStorage.removeItem(STORAGE_KEYS.LIVE_ID);
          MessageBox.alert({
            title: t('live_pusher.restore_failed_title'),
            content: t('live_pusher.restore_failed_content'),
            confirmText: t('live_pusher.confirm'),
            showClose: false,
            modal: true,
          });
        }
      },
    });
  }, [doJoinAndOpenMic, liveId, loginUserInfo?.userId, t]);

  useEffect(() => {
    if (!currentLive?.liveId || !loginUserInfo?.userId) {
      return;
    }
    if (currentLive.liveOwner?.userId === loginUserInfo.userId) {
      return;
    }
    leaveLive().catch(() => undefined);
  }, [currentLive?.liveId, currentLive?.liveOwner?.userId, leaveLive, loginUserInfo?.userId]);

  useEffect(() => {
    const handleLiveEnded = () => {
      Toast.warning({ message: t('live_pusher.live_closed') });
    };
    subscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);
    return () => {
      unsubscribeEvent(LiveListEvent.ON_LIVE_ENDED, handleLiveEnded);
    };
  }, [subscribeEvent, t, unsubscribeEvent]);

  useEffect(() => {
    TUIRoomEngine.once('ready', () => {
      TUIRoomEngine.callExperimentalAPI(JSON.stringify({
        api: 'enableMultiPlaybackQuality',
        params: {
          enable: true,
        },
      }));
    });
  }, []);

  return (
    <div className={styles['live-pusher-page']}>
      <LiveHeader className={styles['live-pusher-page__header']} />

      <div className={styles['live-pusher-main']}>
        <section className={styles['main-left']}>
          <div className={styles['main-left-top']}>
            <div className={styles['card-title']}>
              <IconArrowStrokeBack size="20" className={styles['icon-back']} onClick={handleLeave} />
              <span className={styles['title-text']}>{t('live_pusher.video_source')}</span>
            </div>
            <LiveScenePanel />
          </div>
        </section>

        <section className={styles['main-center']}>
          <div className={styles['main-center-top']}>
            <div className={styles['main-center-top-left']}>
              <span className={styles['live-name']}>{liveName}</span>
              {/*
                Allow editing the live name both before and during a live.
                When in-live, `handleConfirmLiveName` pushes the rename to
                the server via `liveListManager.setLiveInfo({ name })`;
                pre-live it just updates the local draft used by
                `handleStartLive`. Aligned with the standard Vue3 demo
                (`web-vite-vue3/.../LivePusherView.vue`), which exposes the
                edit entry uninterruptedly while the user is logged in.
              */}
              <IconEditor
                size="16"
                className={styles['copy-icon']}
                style={{ fill: 'none' }}
                onClick={handleEditLiveName}
              />
              {/*
                Copy room id (== currentLive.liveId) — only meaningful
                while the live is in progress, so we hide it pre-live.
                The label "复制 room id" is rendered as a hover tooltip via
                the icon's title attribute so the toolbar stays compact.
              */}
              {isInLive && (
                <IconCopy
                  size="16"
                  className={styles['copy-icon']}
                  onClick={handleCopyLiveId}
                />
              )}
            </div>
            <span className={styles['main-center-top-right']}>{audienceCount} {t('live_pusher.people_watching')}</span>
          </div>

          <div className={styles['main-center-center']}>
            <LocalMixerPreview />
          </div>

          <div className={styles['main-center-bottom']}>
            <div className={styles['main-center-bottom-content']}>
              <div className={styles['main-center-bottom-left']}>
                <MicVolumeSetting />
                <SpeakerVolumeSetting />
                <div className={styles['main-center-bottom-tools']}>
                  <OrientationSwitch />
                  {/*
                    LayoutSwitch 暂时隐藏：React 端目前不支持连麦/连线，
                    放出布局切换入口没有对应的实际功能。组件实现仍保留，
                    待后续支持连麦能力后直接恢复 <LayoutSwitch /> 即可。
                  */}
                  <SettingButton />
                </div>
              </div>

              <div className={styles['main-center-bottom-right']}>
                {!isInLive ? (
                  <Button
                    type="primary"
                    loading={loading}
                    icon={<IconLive size="16" />}
                    onClick={handleStartLive}
                  >
                    {t('live_pusher.start_live_button')}
                  </Button>
                ) : (
                  <Button
                    color="red"
                    type="primary"
                    loading={loading}
                    icon={<IconStopCircle size="16" />}
                    onClick={showEndLiveDialog}
                  >
                    {t('live_pusher.end_live_button')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={styles['main-right']}>
          <div className={styles['main-right-top']}>
            <div className={styles['card-title']}>
              <span className={styles['title-text']}>{t('live_pusher.audience_list_title')}</span>
              <span className={styles['title-count']}>({audienceCount})</span>
            </div>
            <div className={styles['main-right-top-list']}>
              <LiveAudienceList height="100%" className={styles['pusher-audience-list']} />
            </div>
          </div>

          <div className={styles['main-right-bottom']}>
            <div className={styles['card-title']}>
              <span className={styles['title-text']}>{t('live_pusher.message_list_title')}</span>
            </div>
            <div className={styles['message-list-container']}>
              <BarrageList className={styles['pusher-barrage-list']} />
            </div>
            <div className={styles['message-input-container']}>
              <BarrageInput
                className={styles['pusher-barrage-input']}
                height="56px"
                disabled={!isInLive}
                placeholder={isInLive ? undefined : t('live_pusher.live_not_started')}
              />
            </div>
          </div>
        </section>
      </div>

      <Dialog
        visible={isLiveNameDialogVisible}
        title={t('live_pusher.live_setting_title')}
        confirmText={t('live_pusher.confirm')}
        cancelText={t('live_pusher.cancel')}
        confirmDisabled={!editingLiveName.trim() || loading}
        onConfirm={() => void handleConfirmLiveName()}
        onCancel={handleCloseLiveNameDialog}
        onClose={handleCloseLiveNameDialog}
        width={480}
      >
        <div className={styles['live-name-dialog-content']}>
          <div className={styles['live-name-dialog-item']}>
            <span className={styles['live-name-dialog-label']}>
              {t('live_pusher.live_name_label')}
            </span>
            <Input
              className={styles['live-name-dialog-input']}
              value={editingLiveName}
              placeholder={t('live_pusher.live_name_input_placeholder')}
              maxLength={100}
              autoFocus
              spellcheck={false}
              onChange={(event) => setEditingLiveName(event.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default LivePusher;
