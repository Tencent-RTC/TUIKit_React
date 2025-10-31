import { useState } from 'react';
import { useLoginState, useUIKit } from '@tencentcloud/chat-uikit-react';
import styles from './RoomPage.module.scss';

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
}

function RoomPage() {
  const { loginUserInfo } = useLoginState();
  const { t } = useUIKit();
  const [isInRoom, setIsInRoom] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants] = useState<Participant[]>([
    { id: '1', name: loginUserInfo?.userId || '我', isHost: true, isMuted: false, isVideoOn: true },
    { id: '2', name: '张三', isHost: false, isMuted: false, isVideoOn: true },
    { id: '3', name: '李四', isHost: false, isMuted: true, isVideoOn: false },
    { id: '4', name: '王五', isHost: false, isMuted: false, isVideoOn: true },
  ]);

  const joinRoom = () => {
    setIsInRoom(true);
  };

  const leaveRoom = () => {
    setIsInRoom(false);
    setIsScreenSharing(false);
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  if (isInRoom) {
    return (
      <div className={styles.roomPage}>
        <div className={styles.roomInterface}>
          <div className={styles.roomHeader}>
            <div className={styles.roomInfo}>
              <h2>{t('scene.room.inRoom.title')}</h2>
              <p>
                {participants.length}
                {' '}
                {t('scene.room.inRoom.participants')}
              </p>
            </div>
            <button className={styles.leaveBtn} onClick={leaveRoom}>
              {t('scene.room.inRoom.leaveButton')}
            </button>
          </div>

          <div className={styles.roomContent}>
            <div className={styles.mainArea}>
              {isScreenSharing
                ? (
                  <div className={styles.screenShare}>
                    <div className={styles.screenPlaceholder}>
                      <span>{t('scene.room.inRoom.screenSharing')}</span>
                      <p>
                        {t('scene.room.inRoom.sharingScreen')}
                        {loginUserInfo?.userId || '用户'}
                        {' '}
                        的屏幕
                      </p>
                    </div>
                  </div>
                )
                : (
                  <div className={styles.videoGrid}>
                    {participants.map(participant => (
                      <div key={participant.id} className={styles.videoTile}>
                        <div className={styles.videoContent}>
                          {participant.isVideoOn
                            ? (
                              <div className={styles.videoPlaceholder}>
                                📹
                                {' '}
                                {participant.name}
                              </div>
                            )
                            : (
                              <div className={styles.avatarPlaceholder}>
                                👤
                                {' '}
                                {participant.name}
                              </div>
                            )}
                        </div>
                        <div className={styles.participantInfo}>
                          <span className={styles.participantName}>
                            {participant.name}
                            {participant.isHost && t('scene.room.inRoom.host')}
                          </span>
                          <div className={styles.participantStatus}>
                            {participant.isMuted && <span className={styles.mutedIcon}>🔇</span>}
                            {!participant.isVideoOn && <span className={styles.videoOffIcon}>📹</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className={styles.sidebar}>
              <div className={styles.sidebarTabs}>
                <button className={`${styles.sidebarTab} ${styles.active}`}>
                  {t('scene.room.inRoom.tabs.participants')}
                </button>
                <button className={styles.sidebarTab}>
                  {t('scene.room.inRoom.tabs.chat')}
                </button>
                <button className={styles.sidebarTab}>
                  {t('scene.room.inRoom.tabs.whiteboard')}
                </button>
              </div>

              <div className={styles.participantsList}>
                {participants.map(participant => (
                  <div key={participant.id} className={styles.participantItem}>
                    <div className={styles.participantAvatar}>
                      👤
                    </div>
                    <div className={styles.participantDetails}>
                      <span className={styles.participantName}>
                        {participant.name}
                      </span>
                      {participant.isHost && (
                        <span className={styles.hostBadge}>{t('scene.room.inRoom.hostBadge')}</span>
                      )}
                    </div>
                    <div className={styles.participantControls}>
                      {participant.isMuted ? '🔇' : '🎤'}
                      {participant.isVideoOn ? '📹' : '📷'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.roomControls}>
            <button className={styles.controlBtn}>
              🎤
            </button>
            <button className={styles.controlBtn}>
              📹
            </button>
            <button
              className={`${styles.controlBtn} ${isScreenSharing ? styles.active : ''}`}
              onClick={toggleScreenShare}
            >
              🖥️
            </button>
            <button className={styles.controlBtn}>
              ✋
            </button>
            <button className={styles.controlBtn}>
              ⚙️
            </button>
            <button className={`${styles.controlBtn} ${styles.endCall}`} onClick={leaveRoom}>
              📞
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.roomPage}>
      <div className={styles.roomLobby}>
        <div className={styles.lobbyHeader}>
          <h2>{t('scene.room.title')}</h2>
          <p>{t('scene.room.subtitle')}</p>
        </div>

        <div className={styles.joinSection}>
          <div className={styles.joinCard}>
            <h3>{t('scene.room.quickJoin')}</h3>
            <p>{t('scene.room.quickJoinDescription')}</p>
            <button className={styles.joinBtn} onClick={joinRoom}>
              {t('scene.room.joinButton')}
            </button>
          </div>
        </div>

        <div className={styles.features}>
          <h3>{t('scene.room.features.title')}</h3>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>👥</span>
              <div>
                <h4>{t('scene.room.features.multiVideo.title')}</h4>
                <p>{t('scene.room.features.multiVideo.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🖥️</span>
              <div>
                <h4>{t('scene.room.features.screenShare.title')}</h4>
                <p>{t('scene.room.features.screenShare.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📝</span>
              <div>
                <h4>{t('scene.room.features.whiteboard.title')}</h4>
                <p>{t('scene.room.features.whiteboard.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>💬</span>
              <div>
                <h4>{t('scene.room.features.chat.title')}</h4>
                <p>{t('scene.room.features.chat.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🎥</span>
              <div>
                <h4>{t('scene.room.features.recording.title')}</h4>
                <p>{t('scene.room.features.recording.description')}</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🔒</span>
              <div>
                <h4>{t('scene.room.features.security.title')}</h4>
                <p>{t('scene.room.features.security.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
