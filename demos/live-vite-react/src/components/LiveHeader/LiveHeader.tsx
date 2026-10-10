import type React from 'react';
import { useCallback } from 'react';
import { Button, MessageBox, useUIKit } from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginState, Avatar, useLiveListState } from 'tuikit-atomicx-react';
import { STORAGE_KEYS } from '@/constants';
import { useAutoLogin } from '@/hooks';
import { markLogoutIntent } from '@/utils';
import { isMobile } from '@/utils/environment';
import styles from './LiveHeader.module.scss';

interface LiveHeaderProps {
  loginButtonVisible?: boolean;
  className?: string;
}

const LiveHeader: React.FC<LiveHeaderProps> = ({ loginButtonVisible = true, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useUIKit();
  const { loginUserInfo, logout } = useLoginState();
  const { currentLive, endLive, leaveLive } = useLiveListState();
  const { loginLoading, handleLogin } = useAutoLogin();

  const handleLogout = useCallback(() => {
    const proceedLogout = async () => {
      // Announce intent BEFORE calling logout(). The SDK synchronously
      // pushes loginStatus from 'success' to 'idle' inside logout(),
      // which fires the login-status watcher in `useGlobalEventDialogs`.
      // Without the intent flag that watcher can't tell "user clicked
      // 退出" apart from "SDK kicked the account offline" and shows
      // the 「账号在其他设备登录」dialog on every manual logout.
      // Marking the intent first lets the watcher consume + suppress
      // its own dialog for this transition only. See utils/logoutIntent.
      markLogoutIntent();
      await logout();
      sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
      navigate(`/login?from=${encodeURIComponent(location.pathname)}`);
    };

    if (!currentLive?.liveId) {
      proceedLogout();
      return;
    }

    MessageBox.alert({
      title: t('live_header.logout_confirm_title'),
      content: t('live_header.logout_confirm_content'),
      cancelText: t('live_header.cancel'),
      confirmText: t('live_header.confirm'),
      showClose: false,
      modal: true,
      callback: async (action) => {
        if (action !== 'confirm') {
          return;
        }
        try {
          await endLive();
          proceedLogout();
        } catch (error) {
          MessageBox.alert({
            content: t('live_header.end_live_failed'),
            confirmText: t('live_header.confirm'),
            showClose: false,
            modal: true,
          });
        }
      },
    });
  }, [currentLive?.liveId, endLive, logout, navigate, location.pathname, t]);

  const handleHomeClick = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const hasVConsole = searchParams.get('vConsole') === 'true';
    const query = hasVConsole ? '?vConsole=true' : '';
    navigate(`/live-list${query}`);
  }, [navigate, location.search]);

  const handleGotoPusher = useCallback(async () => {
    sessionStorage.setItem(STORAGE_KEYS.START_LIVE_CLICK_AT, String(Date.now()));

    const isAudienceLive
      = Boolean(currentLive?.liveId)
        && currentLive?.liveOwner?.userId
        && loginUserInfo?.userId
        && currentLive.liveOwner.userId !== loginUserInfo.userId;

    if (isAudienceLive) {
      try {
        await leaveLive();
      } catch (error) {
        console.warn('Failed to leave audience live before entering pusher:', error);
      }
    }
    navigate('/live-pusher');
  }, [currentLive?.liveId, currentLive?.liveOwner?.userId, leaveLive, loginUserInfo?.userId, navigate]);

  const isLiveListPage = location.pathname === '/live-list' || location.pathname === '/';

  return (
    <div className={classNames(styles['live-header'], className)}>
      <div className={styles['live-header__left']} onClick={handleHomeClick}>
        <img className={styles['live-header__logo']} src="https://qcloudimg.tencent-cloud.cn/raw/f7f05bb4fd230ebc847e8412681dd587.png" alt="logo" />
        <div className={styles['live-header__title']}>LiveKit</div>
      </div>
      <div className={styles['live-header__right']}>
        {isLiveListPage && !isMobile && (
          <Button
            type="primary"
            className={styles['live-header__start-live-button']}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleGotoPusher();
            }}
          >
            {t('live_header.start_live')}
          </Button>
        )}
        <Avatar src={loginUserInfo?.avatarUrl} size={24} />
        <div className={styles['live-header__name']}>
          {loginUserInfo?.userName || loginUserInfo?.userId}
        </div>
        {loginButtonVisible && (
          <div>
            {!loginUserInfo
              ? (
                <Button loading={loginLoading} onClick={handleLogin}>
                  {loginLoading ? t('live_header.login_loading') : t('live_header.login')}
                </Button>
              )
              : (
                <Button className={styles['live-header__logout-button']} onClick={handleLogout}>{t('live_header.logout')}</Button>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveHeader;
