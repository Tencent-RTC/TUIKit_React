import { useEffect, useState } from 'react';
import {
  ConversationList,
  Chat,
  MessageList,
  MessageInput,
  ChatSetting,
  Search,
  VariantType,
  ContactList,
  ContactInfo,
  useUIKit,
} from '@tencentcloud/chat-uikit-react';
import { Drawer } from '@tencentcloud/uikit-base-component-react';
import { TUICallKit } from '@trtc/calls-uikit-react';
import cs from 'classnames';
import styles from './ChatPage.module.scss';
import { TabList, PlaceholderEmpty, ChatHeader } from './components';
import type { TabKey } from './components';

function ChatPage() {
  const { t } = useUIKit();
  const [activeTab, setActiveTab] = useState<TabKey>('conversation');
  const [isChatSettingOpen, setChatSettingOpen] = useState(false);
  const [isChatSearchOpen, setChatSearchOpen] = useState(false);

  useEffect(() => {
    if (isChatSearchOpen) {
      setChatSettingOpen(false);
    }
  }, [isChatSearchOpen]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
  };

  return (
    <div className={styles.ChatPage}>
      <TUICallKit
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999,
        }}
      />
      <TabList
        activeTab={activeTab}
        onActiveTabChange={handleTabChange}
        onChange={handleTabChange}
      />
      {activeTab === 'conversation' && (
        <ConversationList className={cs(styles.conversationList, styles.sidebar)} enableSearch={false} enableCreate={false} />
      )}
      {activeTab === 'contact' && (
        <ContactList className={cs(styles.contactList, styles.sidebar)} />
      )}
      <div className={styles.mainContent}>
        {activeTab === 'conversation' && (
          <Chat PlaceholderEmpty={<PlaceholderEmpty type="chat" />}>
            <ChatHeader
              onMenuClick={() => setChatSettingOpen(!isChatSettingOpen)}
              onSearchClick={() => setChatSearchOpen(!isChatSearchOpen)}
            />
            <MessageList />
            <MessageInput />
          </Chat>
        )}
        {activeTab === 'contact' && (
          <ContactInfo
            PlaceholderEmpty={<PlaceholderEmpty type="contact" />}
            onSendMessage={() => setActiveTab('conversation')}
            onEnterGroup={() => setActiveTab('conversation')}
          />
        )}
      </div>

      <Drawer
        title={t('scene.chat.drawer.settings')}
        modelValue={isChatSettingOpen}
        onClose={() => setChatSettingOpen(false)}
        appendTo="body"
        size={400}
      >
        <ChatSetting />
      </Drawer>
      <Drawer
        title={t('scene.chat.drawer.search')}
        modelValue={isChatSearchOpen}
        onClose={() => setChatSearchOpen(false)}
        appendTo="body"
      >
        <Search style={{ minWidth: '300px' }} variant={VariantType.EMBEDDED} />
      </Drawer>
    </div>
  );
}

export default ChatPage;
