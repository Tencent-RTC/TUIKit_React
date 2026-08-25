import { useEffect, useRef, useState } from 'react';
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
  useChatContext,
} from '@tencentcloud/chat-uikit-react';
import { TUICallKit } from '@trtc/calls-uikit-react';
import cs from 'classnames';
import styles from './ChatPage.module.scss';
import { SideTab, PlaceholderEmpty, ChatHeader } from './components';
import type { TabKey } from './components';

// The conversation the GitHub demo opens by default.
// This prop is injected into <Chat> by publish-github.js, so the welcome
// message is only sent when the default conversation is actually opened.
const DEFAULT_OPEN_CONVERSATION_ID = 'C2Cadministrator';

function ChatPage() {
  const { t, theme } = useUIKit();
  const { activeConversation, sendMessage } = useChatContext();
  // Send the welcome message only once per app session
  const sendWelcomeMessageOnce = useRef(false);

  // Send the welcome message once when the default conversation opens;
  // switching conversations afterwards will not send it again.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        activeConversation?.conversationID === DEFAULT_OPEN_CONVERSATION_ID
        && !sendWelcomeMessageOnce.current
      ) {
        const welcomeText = [
          t('scene.chat.welcome.title'),
          '',
          t('scene.chat.welcome.guide'),
          `1. ${t('scene.chat.welcome.step1')}`,
          `2. ${t('scene.chat.welcome.step2')}`,
          `3. ${t('scene.chat.welcome.step3')}`,
        ].join('\n');
        sendMessage({
          type: 'textMessage',
          text: welcomeText,
        });
        sendWelcomeMessageOnce.current = true;
      }
    }, 1000);
    return () => clearTimeout(timer);
    // Only needs to run when the active conversation changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.conversationID]);
  const [activeTab, setActiveTab] = useState<TabKey>('conversation');
  const [isChatSettingShow, setChatSettingShow] = useState(false);
  const [isSearchInChatShow, setSearchInChatShow] = useState(false);

  useEffect(() => {
    setChatSettingShow(false);
    setSearchInChatShow(false);
  }, [activeConversation?.conversationID]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
  };

  return (
    <div className={cs(styles['chat-layout'], { dark: theme === 'dark' })}>
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

      {/* Chat Content Panel + Search Panel Container */}
      {activeTab === 'conversation' && (
        <div className={styles['chat-with-search']}>
          <Chat conversationID="C2Cadministrator"
            PlaceholderEmpty={<PlaceholderEmpty type="chat" />}
            className={styles['chat-content-panel']}
          >
            <ChatHeader
              onMenuClick={() => setChatSettingShow(!isChatSettingShow)}
              onSearchClick={() => setSearchInChatShow(!isSearchInChatShow)}
            />
            <MessageList enableReadReceipt />
            <MessageInput />
          </Chat>

          {/* Search in Chat Panel (side-by-side with chat, not overlapping) */}
          {isSearchInChatShow && (
            <div className={cs(styles['search-panel'], { [styles.dark]: theme === 'dark' })}>
              <div className={styles['search-panel__header']}>
                <span className={styles['search-panel__title']}>{t('scene.chat.drawer.search')}</span>
                <button
                  className={styles['icon-button']}
                  onClick={() => setSearchInChatShow(false)}
                >
                  ✕
                </button>
              </div>
              <Search variant={VariantType.EMBEDDED} />
            </div>
          )}

          {/* Chat Setting Sidebar (overlay on the entire chat-with-search area) */}
          {isChatSettingShow && (
            <div className={cs(styles['chat-sidebar'], { [styles.dark]: theme === 'dark' })}>
              <ChatSetting onClose={() => setChatSettingShow(false)} />
            </div>
          )}
        </div>
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
