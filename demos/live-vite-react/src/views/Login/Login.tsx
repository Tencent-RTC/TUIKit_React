import type React from 'react';
import { useState } from 'react';
import { Toast as TUIToast, Button, ToastType, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SDKAppID, genTestUserSig } from '@/config/basic-info-config';
import { STORAGE_KEYS } from '@/constants';
import styles from './Login.module.scss';
import type { UserInfo } from '@/types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState('');
  const { t } = useUIKit();

  const handleLogin = () => {
    if (!SDKAppID) {
      TUIToast({
        type: ToastType.ERROR,
        message: t('live_login.please_config_SDKAppID'),
      });
      return;
    }

    if (!userId.trim()) {
      TUIToast({
        type: ToastType.ERROR,
        message: t('live_login.please_enter_your_User_ID'),
      });
      return;
    }

    const userInfo: UserInfo = {
      SDKAppID,
      userID: userId.trim(),
      userSig: genTestUserSig(userId.trim()),
    };

    sessionStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    const from = searchParams.get('from') || '/';
    navigate(from, { replace: true });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className={styles.login}>
      <div className={styles.login__form}>
        <div className={styles.login__inputGroup}>
          <input
            type="text"
            placeholder={t('live_login.enter_your_User_ID')}
            value={userId}
            onChange={e => setUserId(e.target.value)}
            autoFocus
            onKeyPress={handleKeyPress}
            className={styles.login__input}
          />
          <Button
            onClick={handleLogin}
            disabled={!userId.trim()}
          >
            {t('live_login.login')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
