import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLoginState } from 'tuikit-atomicx-react';
import { STORAGE_KEYS } from '@/constants';
import { safelyParse } from '@/utils';
import type { UserInfo } from '@/types';

/**
 * Logs in once with the credentials stored by the login page, so a refreshed
 * page can reconnect. Mount it in exactly one component per page.
 */
export function useAutoLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUserInfo, login, status: loginStatus } = useLoginState();
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
      navigate(`/login?from=${encodeURIComponent(location.pathname + location.search)}`);
    } finally {
      setLoginLoading(false);
    }
  }, [login, navigate, location.pathname, location.search]);

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

  return { loginLoading, handleLogin };
}
