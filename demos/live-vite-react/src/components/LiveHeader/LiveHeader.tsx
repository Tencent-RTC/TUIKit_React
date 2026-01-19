import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { Button, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useLoginState, Avatar } from 'tuikit-atomicx-react';
import { STORAGE_KEYS } from '@/constants';
import { safelyParse } from '@/utils';
import { UserInfo } from '@/types';
import styles from './LiveHeader.module.scss';

interface LiveHeaderProps {
  loginButtonVisible?: boolean;
  className?: string;
}

const LiveHeader: React.FC<LiveHeaderProps> = ({ loginButtonVisible = true, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useUIKit();
  const { loginUserInfo, login, logout } = useLoginState();
  const [loginLoading, setLoginLoading] = useState(false);

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
      navigate(`/login?from=${encodeURIComponent(location.pathname)}`);
    } finally {
      setLoginLoading(false);
    }
  }, [login, navigate, location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
    navigate(`/login?from=${encodeURIComponent(location.pathname)}`);
  }, [logout, navigate, location.pathname]);

  const handleHomeClick = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const hasVConsole = searchParams.get('vConsole') === 'true';
    const query = hasVConsole ? '?vConsole=true' : '';
    navigate(`/live-list${query}`);
  }, [navigate, location.search]);

  useEffect(() => {
    // Prevent duplicate login requests
    if (loginUserInfo?.userId || loginLoading) {
      return;
    }
    handleLogin();
  }, [loginUserInfo?.userId, loginLoading, handleLogin]);

  return (
    <div className={classNames(styles.liveHeader, className)}>
      <div className={styles.liveHeader__left} onClick={handleHomeClick}>
        <img className={styles.liveHeader__logo} src='https://qcloudimg.tencent-cloud.cn/raw/f7f05bb4fd230ebc847e8412681dd587.png' alt='logo' />
        <div className={styles.liveHeader__title}>LiveKit</div>
      </div>
      <div className={styles.liveHeader__right}>
        <Avatar src={loginUserInfo?.avatarUrl} size={24} />
        <div className={styles.liveHeader__name}>
          {loginUserInfo?.userName || loginUserInfo?.userId}
        </div>
        {loginButtonVisible && (
          <div>
            {!loginUserInfo ? (
              <Button loading={loginLoading} onClick={handleLogin}>
                {loginLoading ? t('live_header.login_loading') : t('live_header.login')}
              </Button>
            ) : (
              <Button onClick={handleLogout}>{t('live_header.logout')}</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveHeader;