import { useState } from 'react';
import { useUIKit, useLoginState } from '@tencentcloud/chat-uikit-react';
import { Toast } from '@tencentcloud/uikit-base-component-react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './LoginPage.module.scss';
import { genTestUserSig } from '@/debug';

/**
 * External links for privacy policy and user agreement
 */
const EXTERNAL_LINKS = {
  privacy: 'https://web.sdk.qcloud.com/document/Tencent-IM-Privacy-Protection-Guidelines.html',
  agreement: 'https://web.sdk.qcloud.com/document/Tencent-IM-User-Agreement.html',
} as const;

/**
 * LoginPage Component
 *
 * A login form for Tencent Cloud IM SDK authentication.
 * Collects SDKAppID, UserID, and SecretKey to generate userSig and login.
 *
 * @example
 * ```tsx
 * <Route path="/login/:sceneId" element={<LoginPage />} />
 * ```
 */
function LoginPage() {
  const navigate = useNavigate();
  const { sceneId } = useParams();
  const { login: chatLogin } = useLoginState();
  const { t } = useUIKit();

  // Independent state for each form field - React best practice
  const [sdkAppID, setSdkAppID] = useState('');
  const [userID, setUserID] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Validate form data before submission
   */
  const validateForm = (): boolean => {
    if (!agreed) {
      Toast({ message: t('page.login.github.agreeTermsError') });
      return false;
    }

    if (!sdkAppID || !userID || !secretKey) {
      Toast({ message: t('page.login.github.completeInfoError') });
      return false;
    }

    return true;
  };

  /**
   * Handle form submission and login process
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Generate userSig for authentication
      const userInfo = genTestUserSig({
        userID,
        SDKAppID: Number(sdkAppID),
        secretKey,
      });

      // Execute chat login
      await chatLogin({
        SDKAppID: userInfo.SDKAppID,
        userID: userInfo.userID,
        userSig: userInfo.userSig,
      });

      // Persist user info and navigate to target scene
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      navigate(`/stages/${sceneId}`, { replace: true });
    } catch {
      Toast({ message: t('page.login.github.loginFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.login}>
      <div className={styles.container}>
        {/* Header Section */}
        <header className={styles.header}>
          <div className={styles.brand}>
            {t('page.login.github.brand')}
          </div>
          <h1 className={styles.title}>
            {t('page.login.github.title')}
          </h1>
          <p className={styles.subtitle}>
            {t('page.login.github.subtitle')}
          </p>
        </header>

        {/* Login Form */}
        <form className={styles.form} onSubmit={handleLogin}>
          {/* SDK App ID Field */}
          <div className={styles.field}>
            <label htmlFor="sdkAppID" className={styles.label}>
              {t('page.login.github.sdkAppID')}
            </label>
            <input
              id="sdkAppID"
              type="number"
              value={sdkAppID}
              onChange={e => setSdkAppID(e.target.value)}
              placeholder={t('page.login.github.sdkAppIDPlaceholder')}
              className={styles.input}
              required
            />
          </div>

          {/* User ID Field */}
          <div className={styles.field}>
            <label htmlFor="userID" className={styles.label}>
              {t('page.login.github.userID')}
            </label>
            <input
              id="userID"
              type="text"
              value={userID}
              onChange={e => setUserID(e.target.value)}
              placeholder={t('page.login.github.userIDPlaceholder')}
              className={styles.input}
              required
            />
          </div>

          {/* Secret Key Field */}
          <div className={styles.field}>
            <label htmlFor="secretKey" className={styles.label}>
              {t('page.login.github.secretKey')}
            </label>
            <input
              id="secretKey"
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder={t('page.login.github.secretKeyPlaceholder')}
              className={styles.input}
              required
            />
          </div>

          {/* Terms Agreement Checkbox */}
          <div className={styles.agreement}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className={styles.checkbox}
                required
              />
              <span className={styles.checkmark} />
              <span className={styles.agreementText}>
                {t('page.login.github.agreeTerms')}
                <a
                  href={EXTERNAL_LINKS.privacy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {t('page.login.github.privacyPolicy')}
                </a>
                {t('page.login.github.and')}
                <a
                  href={EXTERNAL_LINKS.agreement}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {t('page.login.github.userAgreement')}
                </a>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!agreed || isLoading}
            className={styles.submitBtn}
          >
            {isLoading
              ? (
                <>
                  <span className={styles.spinner} />
                  {t('page.login.github.loggingIn')}
                </>
              )
              : (
                t('page.login.github.loginButton')
              )}
          </button>
        </form>

        {/* Back to Home Button */}
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/', { replace: true })}
        >
          {t('common.backToHome')}
        </button>
      </div>
    </div>
  );
}

export { LoginPage };
