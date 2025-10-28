import React, { useState } from 'react';
import { useLoginState, useUIKit } from '@tencentcloud/chat-uikit-react';
import styles from './CallPage.module.scss';

function CallPage() {
  const { loginUserInfo } = useLoginState();
  const { t } = useUIKit();
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIsInCall(true);
  };

  const endCall = () => {
    setIsInCall(false);
  };

  if (isInCall) {
    return (
      <div className={styles.callPage}>
        <div className={styles.callInterface}>
          <div className={styles.callHeader}>
            <h2>
              {callType === 'video' ? t('scene.call.inCall.video') : t('scene.call.inCall.audio')}
              {t('scene.call.inCall.ongoing')}
            </h2>
            <p>
              {t('scene.call.inCall.with')}
              {loginUserInfo?.userId || '用户'}
              {' '}
              的通话
            </p>
          </div>

          <div className={styles.callContent}>
            {callType === 'video'
              ? (
                <div className={styles.videoContainer}>
                  <div className={styles.remoteVideo}>
                    <div className={styles.videoPlaceholder}>
                      <span>{t('scene.call.inCall.remoteVideo')}</span>
                    </div>
                  </div>
                  <div className={styles.localVideo}>
                    <div className={styles.videoPlaceholder}>
                      <span>{t('scene.call.inCall.localVideo')}</span>
                    </div>
                  </div>
                </div>
              )
              : (
                <div className={styles.audioContainer}>
                  <div className={styles.audioAvatar}>
                    <span>🎤</span>
                  </div>
                  <p>{t('scene.call.inCall.audioOngoing')}</p>
                </div>
              )}
          </div>

          <div className={styles.callControls}>
            <button className={styles.controlBtn} onClick={() => setCallType(callType === 'video' ? 'audio' : 'video')}>
              {callType === 'video' ? '📹' : '🎥'}
            </button>
            <button className={styles.controlBtn}>
              🎤
            </button>
            <button className={`${styles.controlBtn} ${styles.endCall}`} onClick={endCall}>
              📞
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.callPage}>
      <div className={styles.callLobby}>
        <div className={styles.lobbyHeader}>
          <h2>{t('scene.call.title')}</h2>
          <p>{t('scene.call.subtitle')}</p>
        </div>

        <div className={styles.callOptions}>
          <div className={styles.callOption} onClick={() => startCall('audio')}>
            <div className={styles.optionIcon}>🎤</div>
            <h3>{t('scene.call.audio.title')}</h3>
            <p>{t('scene.call.audio.description')}</p>
            <button className={styles.startBtn}>{t('scene.call.audio.button')}</button>
          </div>

          <div className={styles.callOption} onClick={() => startCall('video')}>
            <div className={styles.optionIcon}>📹</div>
            <h3>{t('scene.call.video.title')}</h3>
            <p>{t('scene.call.video.description')}</p>
            <button className={styles.startBtn}>{t('scene.call.video.button')}</button>
          </div>
        </div>

        <div className={styles.features}>
          <h3>{t('scene.call.features.title')}</h3>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🔊</span>
              <div>
                <h4>{t('scene.call.features.hd.title')}</h4>
                <p>{t('scene.call.features.hd.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📱</span>
              <div>
                <h4>{t('scene.call.features.multiplatform.title')}</h4>
                <p>{t('scene.call.features.multiplatform.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🛡️</span>
              <div>
                <h4>{t('scene.call.features.security.title')}</h4>
                <p>{t('scene.call.features.security.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⚡</span>
              <div>
                <h4>{t('scene.call.features.lowLatency.title')}</h4>
                <p>{t('scene.call.features.lowLatency.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallPage;
