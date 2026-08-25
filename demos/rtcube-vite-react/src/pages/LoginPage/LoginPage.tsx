import { useUIKit } from '@tencentcloud/chat-uikit-react';
import { Toast } from '@tencentcloud/uikit-base-component-react';
import { Login } from '@tencentcloud/uikit-base-widget-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoginState } from 'tuikit-atomicx-react';
import styles from './LoginPage.module.scss';

function LoginPage() {
  const navigate = useNavigate();
  const { sceneId } = useParams();
  const { login } = useLoginState();
  const { t } = useUIKit();

  const handleLoginCallback = (userInfo: any) => {
    const { SDKAppID, userID, userSig } = userInfo;
    return login({
      SDKAppID,
      userID,
      userSig,
    }).then(() => {
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      const targetPath = `/stages/${sceneId || 'chat'}`;
      navigate(targetPath, { replace: true });
    }).catch(() => {
      Toast({
        message: t('page.login.internal.loginFailed'),
      });
    });
  };

  return (
    <div className={styles.login}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1 className={styles.loginTitle}>{t('page.login.internal.title')}</h1>
          <p className={styles.loginSubtitle}>
            {t('page.login.internal.subtitle')}
          </p>
        </div>
        <div className={styles.loginWrapper}>
          <Login SDKAppID={1400187352} onLoginCallback={handleLoginCallback} />
        </div>
      </div>
    </div>
  );
}

export {
  LoginPage,
};
