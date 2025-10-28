import { useUIKit } from '@tencentcloud/chat-uikit-react';
import cs from 'classnames';
import styles from './TabList.module.scss';

export type TabKey = 'conversation' | 'contact';

interface TabListProps {
  activeTab: TabKey;
  labels?: Partial<Record<TabKey, string>>;
  onActiveTabChange?: (tab: TabKey) => void;
  onChange?: (tab: TabKey) => void;
}

function TabList({
  activeTab,
  labels,
  onActiveTabChange,
  onChange,
}: TabListProps) {
  const { t, theme } = useUIKit();
  const resolvedLabels = {
    conversation: labels?.conversation ?? t('scene.chat.tab.conversation'),
    contact: labels?.contact ?? t('scene.chat.tab.contact'),
  };

  const onClick = (tab: TabKey) => {
    onActiveTabChange?.(tab);
    onChange?.(tab);
  };

  return (
    <div
      className={styles.tabNavigation}
      role="tablist"
    >
      <button
        className={cs(
          styles.tabButton,
          activeTab === 'conversation' ? styles.active : '',
          theme === 'dark' ? styles.dark : '',
        )}
        role="tab"
        onClick={() => onClick('conversation')}
      >
        {resolvedLabels.conversation}
      </button>
      <button
        className={cs(
          styles.tabButton,
          activeTab === 'contact' ? styles.active : '',
          theme === 'dark' ? styles.dark : '',
        )}
        role="tab"
        onClick={() => onClick('contact')}
      >
        {resolvedLabels.contact}
      </button>
    </div>
  );
}

export default TabList;
