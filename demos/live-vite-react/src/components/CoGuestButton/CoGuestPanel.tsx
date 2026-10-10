import React, { useState } from 'react';
import { Toast, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { Avatar, useCoGuestState, useLiveSeatState, useLoginState } from 'tuikit-atomicx-react';
import styles from './CoGuestButton.module.scss';

// Host-side management panel: pending applications (accept / reject) and
// current seats (disconnect == kick off seat). React port of the Vue3
// package component `CoGuestPanel.vue` (two tabs).
const CoGuestPanel: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useUIKit();
  const { loginUserInfo } = useLoginState();
  const { connected, applicants, acceptApplication, rejectApplication } = useCoGuestState();
  const { kickUserOutOfSeat } = useLiveSeatState();
  const [activeTab, setActiveTab] = useState<'applications' | 'invitations'>('applications');
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  const handleAccept = async (userId: string) => {
    try {
      setIsProcessing(prev => ({ ...prev, [userId]: true }));
      await acceptApplication({ userId });
    } catch (error) {
      console.error('[CoGuestPanel] handleAccept error', error);
      Toast.error({ message: t('co_guest_panel.accept_failed') });
    } finally {
      setIsProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setIsProcessing(prev => ({ ...prev, [userId]: true }));
      await rejectApplication({ userId });
    } catch (error) {
      console.error('[CoGuestPanel] handleReject error', error);
      Toast.error({ message: t('co_guest_panel.reject_failed') });
    } finally {
      setIsProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDisconnect = async (userId: string) => {
    try {
      setIsProcessing(prev => ({ ...prev, [userId]: true }));
      await kickUserOutOfSeat({ userId });
    } catch (error) {
      console.error('[CoGuestPanel] handleDisconnect error', error);
      Toast.error({ message: t('co_guest_panel.disconnect_failed') });
    } finally {
      setIsProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className={`${styles.panelContent} ${className || ''}`}>
      <div className={styles.panelHeader}>
        <div className={styles.tabs}>
          <span
            className={`${styles.tabItem} ${activeTab === 'applications' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            {t('co_guest_panel.tab_applications')}
          </span>
          <span
            className={`${styles.tabItem} ${activeTab === 'invitations' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('invitations')}
          >
            {t('co_guest_panel.tab_management')}
          </span>
        </div>
      </div>
      <div className={styles.panelBody}>
        {activeTab === 'applications' && (
          <div className={styles.applicationsContent}>
            {applicants.length > 0 ? (
              <div className={styles.userListContainer}>
                <div className={styles.userList}>
                  {applicants.map(user => (
                    <div key={user.userId} className={styles.userItem}>
                      <div className={styles.userItemLeft}>
                        <Avatar src={user.avatarUrl} size={40} />
                      </div>
                      <div className={styles.userItemRight}>
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{user.userName || user.userId}</span>
                        </div>
                        <div className={styles.userActions}>
                          <button
                            className={styles.actionButton}
                            disabled={isProcessing[user.userId]}
                            onClick={() => void handleAccept(user.userId)}
                          >
                            {t('co_guest_panel.accept')}
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                            disabled={isProcessing[user.userId]}
                            onClick={() => void handleReject(user.userId)}
                          >
                            {t('co_guest_panel.reject')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span>{t('co_guest_panel.no_applications')}</span>
              </div>
            )}
          </div>
        )}
        {activeTab === 'invitations' && (
          <div className={styles.invitationsContent}>
            <div className={styles.userListContainer}>
              <div className={styles.userListTitle}>
                <span className={styles.userListTitleText}>{t('co_guest_panel.current_seat')}</span>
                <span className={styles.userListTitleCount}>
                  {`(${connected.length})`}
                </span>
              </div>
              <div className={styles.userList}>
                {connected.map(user => (
                  <div key={user.userId} className={styles.userItem}>
                    <div className={styles.userItemLeft}>
                      <Avatar src={user.avatarUrl} size={40} />
                    </div>
                    <div className={styles.userItemRight}>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.userName || user.userId}</span>
                        {user.userId === loginUserInfo?.userId && (
                          <span className={styles.isMe}>{`(${t('co_guest_panel.me')})`}</span>
                        )}
                      </div>
                      {user.userId !== loginUserInfo?.userId && (
                        <div className={styles.userActions}>
                          <button
                            className={`${styles.actionButton} ${styles.actionButtonGray}`}
                            disabled={isProcessing[user.userId]}
                            onClick={() => void handleDisconnect(user.userId)}
                          >
                            {t('co_guest_panel.disconnect')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {connected.length === 0 && (
                  <div className={styles.emptyState}>
                    <span>{t('co_guest_panel.seat_empty')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoGuestPanel;
