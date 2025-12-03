import { useLoginState, Avatar, useUIKit } from '@tencentcloud/chat-uikit-react';
import { IconChat, IconUsergroup } from '@tencentcloud/uikit-base-component-react';
import cs from 'classnames';
import styles from './SideTab.module.scss';

export type TabKey = 'conversation' | 'contact';

interface SideTabProps {
  activeTab: TabKey;
  onChange?: (tab: TabKey) => void;
}

function SideTab({ activeTab, onChange }: SideTabProps) {
  const { loginUserInfo } = useLoginState();
  const { theme } = useUIKit();

  const isDark = theme === 'dark';

  const handleTabChange = (tab: TabKey) => {
    onChange?.(tab);
  };

  return (
    <div className={cs(styles['side-tab'], { [styles.dark]: isDark })}>
      {/* User Avatar */}
      <div className={styles['avatar-wrapper']}>
        <Avatar className={styles.avatar} src={loginUserInfo?.avatarUrl} />
        <div className={styles.tooltip}>
          <div className={styles['tooltip__name']}>{loginUserInfo?.userName}</div>
          <div className={styles['tooltip__id']}>ID: {loginUserInfo?.userId}</div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className={styles.tabs}>
        <div
          className={cs(styles['tab-item'], { [styles.active]: activeTab === 'conversation' })}
          onClick={() => handleTabChange('conversation')}
        >
          <IconChat size="24" />
        </div>
        <div
          className={cs(styles['tab-item'], { [styles.active]: activeTab === 'contact' })}
          onClick={() => handleTabChange('contact')}
        >
          <IconUsergroup size="24" />
        </div>
      </div>
    </div>
  );
}

export default SideTab;
