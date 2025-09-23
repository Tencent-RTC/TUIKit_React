import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLogoInEnglish, IconChevronDown, IconLogout, useUIKit } from '@tencentcloud/uikit-base-component-react';
import styles from './Header.module.scss';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const { t } = useUIKit();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const handleLogout = () => {
    localStorage.removeItem('tuiLiveMonitor-userInfo');
    navigate('/login');
  };
  const handleToggle = () => setIsOpen(prev => !prev);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  return (
    <div className={`${styles['header-container']} ${className || ''}`}>
      <div className={styles['logo-info']}>
        <IconLogoInEnglish className={styles.logo} />
        <span className={styles.title}>LiveKit</span>
        <span>{t('Monitor')}</span>
      </div>
      <div className={styles['login-info']} ref={menuRef}>
        <span className={styles['user-name']}>986644389</span>
        <IconChevronDown className={styles['dropdown-menu']} onClick={handleToggle} />
        {isOpen && (
          <div className={styles['dropdown']}>
            <div className={styles['dropdown-item']} onClick={handleLogout}>
              <span>{t('Logout')}</span>
              <IconLogout />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
