import { useCallback } from 'react';
import {
  ChatHeader as DefaultChatHeader,
  useConversationListState,
} from '@tencentcloud/chat-uikit-react';
import {
  IconSearch,
  IconChevronLeft,
  IconBulletpoint,
} from '@tencentcloud/uikit-base-component-react';
import classes from './ChatHeader.module.scss';

interface ChatHeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

function ChatHeaderLeft() {
  const { setActiveConversation } = useConversationListState();

  const closeChat = useCallback(() => {
    setActiveConversation('');
  }, [setActiveConversation]);

  return (
    <button className={classes['chat-header__button']} onClick={closeChat}>
      <IconChevronLeft size="20px" className={classes['chat-header__icon']} />
    </button>
  );
}

function ChatHeaderRight(props: ChatHeaderProps) {
  return (
    <div className={classes['chat-header__right']}>
      <button className={classes['chat-header__button']} onClick={props.onSearchClick}>
        <IconSearch size="20px" className={classes['chat-header__icon']} />
      </button>
      <button className={classes['chat-header__button']} onClick={props.onMenuClick}>
        <IconBulletpoint size="20px" className={classes['chat-header__icon']} />
      </button>
    </div>
  );
}

function ChatHeader(props: ChatHeaderProps) {
  return (
    <DefaultChatHeader
      ChatHeaderLeft={<ChatHeaderLeft />}
      ChatHeaderRight={(
        <ChatHeaderRight
          onMenuClick={props.onMenuClick}
          onSearchClick={props.onSearchClick}
        />
      )}
      enableCall
    />
  );
}

export {
  ChatHeader,
};
