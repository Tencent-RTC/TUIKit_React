import { useEffect, useLayoutEffect, useState } from 'react';
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
  useConversationListState,
} from '@tencentcloud/chat-uikit-react';
import { TUICallKit } from '@trtc/calls-uikit-react';
import cs from 'classnames';
import styles from './ChatPage.module.scss';
import { SideTab, PlaceholderEmpty, ChatHeader } from './components';
import type { TabKey } from './components';

function ChatPage() {
  const { t, theme } = useUIKit();
  const { activeConversation, setActiveConversation } = useConversationListState();
  const [activeTab, setActiveTab] = useState<TabKey>('conversation');
  const [isChatSettingShow, setChatSettingShow] = useState(false);
  const [isSearchInChatShow, setSearchInChatShow] = useState(false);

  useLayoutEffect(() => {
    // default open a c2c conversation, you can change it.
    const peerUserID = 'administrator';
    setActiveConversation(`C2C${peerUserID}`);
  }, []);

  useEffect(() => {
    setChatSettingShow(false);
    setSearchInChatShow(false);
  }, [activeConversation?.conversationID]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
  };

  return (
    <div className={cs(styles['chat-layout'], { 'dark': theme === 'dark' })}>
      <TUICallKit className={styles['call-kit']} />

      {/* SideTab Navigation */}
      <SideTab activeTab={activeTab} onChange={handleTabChange} />

      {/* Conversation/Contact List Panel */}
      <div className={styles['conversation-list-panel']}>
        {activeTab === 'conversation' && (
          <ConversationList />
        )}
        {activeTab === 'contact' && <ContactList />}
      </div>

      {/* Chat Content Panel */}
      {activeTab === 'conversation' && (
        <Chat
          PlaceholderEmpty={<PlaceholderEmpty type="chat" />}
          className={styles['chat-content-panel']}
        >
          <ChatHeader
            onMenuClick={() => setChatSettingShow(!isChatSettingShow)}
            onSearchClick={() => setSearchInChatShow(!isSearchInChatShow)}
          />
          <MessageList />
          <MessageInput />

          {/* Chat Setting Sidebar */}
          {isChatSettingShow && (
            <div className={cs(styles['chat-sidebar'], { [styles.dark]: theme === 'dark' })}>
              <div className={styles['chat-sidebar__header']}>
                <span className={styles['chat-sidebar__title']}>{t('scene.chat.drawer.settings')}</span>
                <button
                  className={styles['icon-button']}
                  onClick={() => setChatSettingShow(false)}
                >
                  ✕
                </button>
              </div>
              <ChatSetting />
            </div>
          )}

          {/* Search in Chat Sidebar */}
          {isSearchInChatShow && (
            <div className={cs(styles['chat-sidebar'], { [styles.dark]: theme === 'dark' })}>
              <div className={styles['chat-sidebar__header']}>
                <span className={styles['chat-sidebar__title']}>{t('scene.chat.drawer.search')}</span>
                <button
                  className={styles['icon-button']}
                  onClick={() => setSearchInChatShow(false)}
                >
                  ✕
                </button>
              </div>
              <Search style={{ minWidth: '300px' }} variant={VariantType.EMBEDDED} />
            </div>
          )}
        </Chat>
      )}

      {/* Contact Detail Panel */}
      {activeTab === 'contact' && (
        <ContactInfo
          PlaceholderEmpty={<PlaceholderEmpty type="contact" />}
          className={styles['contact-detail-panel']}
          onSendMessage={() => setActiveTab('conversation')}
          onEnterGroup={() => setActiveTab('conversation')}
        />
      )}
    </div>
  );
}

export default ChatPage;
