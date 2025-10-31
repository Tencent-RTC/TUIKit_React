import type React from 'react';
import { useUIKit } from '@tencentcloud/chat-uikit-react';
import cs from 'classnames';
import styles from './PlaceholderEmpty.module.scss';

interface PlaceholderEmptyProps {
  type?: 'chat' | 'contact';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const PlaceholderEmpty: React.FC<PlaceholderEmptyProps> = ({
  type = 'chat',
  title,
  description,
  icon,
}) => {
  const { t, theme } = useUIKit();
  const getDefaultContent = () => {
    switch (type) {
      case 'chat':
        return {
          title: title || t('scene.chat.placeholder.chat.title'),
          description: description || t('scene.chat.placeholder.chat.description'),
          icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="40" fill="url(#chatGradient)" fillOpacity="0.1" />
              <path d="M25 35C25 29.4772 29.4772 25 35 25H55C60.5228 25 65 29.4772 65 35V45C65 50.5228 60.5228 55 55 55H45L35 65V55H35C29.4772 55 25 50.5228 25 45V35Z" fill="url(#chatGradient)" />
              <circle cx="35" cy="40" r="3" fill="white" />
              <circle cx="45" cy="40" r="3" fill="white" />
              <circle cx="55" cy="40" r="3" fill="white" />
              <defs>
                <linearGradient id="chatGradient" x1="25" y1="25" x2="65" y2="65" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#646cff" />
                  <stop offset="1" stopColor="#4172ea" />
                </linearGradient>
              </defs>
            </svg>
          ),
        };
      case 'contact':
        return {
          title: title || t('scene.chat.placeholder.contact.title'),
          description: description || t('scene.chat.placeholder.contact.description'),
          icon: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="40" fill="url(#contactGradient)" fillOpacity="0.1" />
              <circle cx="40" cy="32" r="8" fill="url(#contactGradient)" />
              <path d="M25 55C25 48.3726 30.3726 43 37 43H43C49.6274 43 55 48.3726 55 55V57H25V55Z" fill="url(#contactGradient)" />
              <defs>
                <linearGradient id="contactGradient" x1="25" y1="25" x2="55" y2="55" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#646cff" />
                  <stop offset="1" stopColor="#4172ea" />
                </linearGradient>
              </defs>
            </svg>
          ),
        };
      default:
        return {
          title: title || '暂无内容',
          description: description || '当前没有可显示的内容',
          icon: null,
        };
    }
  };

  const content = getDefaultContent();

  return (
    <div className={cs(styles.placeholderEmpty, theme === 'dark' ? styles.dark : '')}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          {icon || content.icon}
        </div>
        <h3 className={styles.title}>{content.title}</h3>
        <p className={styles.description}>{content.description}</p>
        <div className={styles.decorativeElements}>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderEmpty;
