import type React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Button, MessageBox, useUIKit } from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginState, Avatar, useLiveListState } from 'tuikit-atomicx-react';
import { STORAGE_KEYS } from '@/constants';
import { safelyParse } from '@/utils';
import styles from './LiveHeader.module.scss';
import type { UserInfo } from '@/types';

interface LiveHeaderProps {
  loginButtonVisible?: boolean;
  className?: string;
}

const LiveHeader: React.FC<LiveHeaderProps> = ({ loginButtonVisible = true, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useUIKit();
  const { loginUserInfo, login, logout, status: loginStatus } = useLoginState();
  const { currentLive, endLive, leaveLive } = useLiveListState();
  const [loginLoading, setLoginLoading] = useState(false);
  // Track whether auto-login has already been attempted to prevent infinite loops
  // when the user is kicked offline (loginUserInfo gets cleared repeatedly).
  const hasAttemptedLoginRef = useRef(false);

  const handleLogin = useCallback(async () => {
    try {
      setLoginLoading(true);
      const storedData = sessionStorage.getItem(STORAGE_KEYS.USER_INFO) || '{}';
      const liveUserInfo = safelyParse(storedData) as UserInfo;
      await login({
        userID: liveUserInfo.userID,
        userSig: liveUserInfo.userSig,
        SDKAppID: Number(liveUserInfo.SDKAppID),
        testEnv: localStorage.getItem('tuikit-live-env') === 'TestEnv',
      });
    } catch (error) {
      console.error(error);
      // Clear stored credentials so ProtectedRoute won't redirect back here.
      sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
      navigate(`/login?from=${encodeURIComponent(location.pathname)}`);
    } finally {
      setLoginLoading(false);
    }
  }, [login, navigate, location.pathname]);

  const handleLogout = useCallback(() => {
    const proceedLogout = () => {
      logout();
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

  // When the user is kicked offline, loginStatus transitions from 'success'
  // to 'idle'. Set hasAttemptedLoginRef = true SYNCHRONOUSLY here (same
  // component, same effect batch) to prevent the auto-login effect below
  // from firing and creating a login→kick→login loop.
  // The actual dialog UI is handled by useGlobalEventDialogs() in ProtectedRoute.
  const wasLoggedInRef = useRef(false);
  useEffect(() => {
    if (loginStatus === 'success') {
      wasLoggedInRef.current = true;
    } else if (wasLoggedInRef.current && (loginStatus === 'idle' || loginStatus === 'error')) {
      wasLoggedInRef.current = false;
      hasAttemptedLoginRef.current = true;
    }
  }, [loginStatus]);

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

  useEffect(() => {
    if (loginUserInfo?.userId) {
      // Login succeeded — reset the flag so a future manual login can work.
      hasAttemptedLoginRef.current = false;
      return;
    }
    // Only auto-login once. If login was already attempted (and failed, or
    // the user was kicked offline), do not retry automatically to avoid an
    // infinite login→kicked→login loop.
    if (loginLoading || hasAttemptedLoginRef.current) {
      return;
    }
    hasAttemptedLoginRef.current = true;
    handleLogin();
  }, [loginUserInfo?.userId, loginLoading, handleLogin]);

  return (
    <div className={classNames(styles['live-header'], className)}>
      <div className={styles['live-header__left']} onClick={handleHomeClick}>
        <img className={styles['live-header__logo']} src="https://qcloudimg.tencent-cloud.cn/raw/f7f05bb4fd230ebc847e8412681dd587.png" alt="logo" />
        <div className={styles['live-header__title']}>LiveKit</div>
      </div>
      <div className={styles['live-header__right']}>
        {isLiveListPage && (
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
