import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { IconEmote, useUIKit } from '@tencentcloud/uikit-base-component-react';
import classNames from 'classnames';
import { BarrageInput } from 'tuikit-atomicx-react';
import styles from './BarrageInputH5.module.scss';

interface BarrageInputH5Props {
  width: string;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

// `overflow: visible` lets the built-in send button sit outside the pill.
const EDITOR_CONTAINER_STYLE: React.CSSProperties = {
  height: '36px',
  minHeight: '36px',
  padding: '2px 12px',
  borderRadius: '100px',
  borderWidth: '1px',
  alignItems: 'center',
  overflow: 'visible',
};

const EMOJI_POPUP_SELECTOR = '.uikit-emojiPicker__popupReset';

// BarrageInput keeps its draft internal, so read emptiness from the editor DOM.
const hasEditorContent = (root: HTMLElement) => {
  const editor = root.querySelector('.ProseMirror');
  return !!editor && (editor.textContent?.trim() !== '' || editor.querySelector('img') !== null);
};

const BarrageInputH5: React.FC<BarrageInputH5Props> = ({
  width,
  disabled = false,
  placeholder,
  onFocus,
  onBlur,
}) => {
  const { t } = useUIKit();
  // Mount the editor lazily so the first tap both mounts and focuses it,
  // which keeps the soft keyboard inside the user gesture.
  const [editorVisible, setEditorVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const isFocusedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!editorVisible || !root) {
      return undefined;
    }
    const observer = new MutationObserver(() => setHasContent(hasEditorContent(root)));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [editorVisible, disabled]);

  const handleFocus = () => {
    if (isFocusedRef.current) {
      return;
    }
    isFocusedRef.current = true;
    setIsFocused(true);
    onFocus?.();
  };

  const endFocus = () => {
    if (!isFocusedRef.current) {
      return;
    }
    isFocusedRef.current = false;
    setIsFocused(false);
    onBlur?.();
  };

  // Opening the emoji picker moves focus into its popup; keep the focused UI like Vue does.
  const handleBlur = () => {
    window.setTimeout(() => {
      if (document.activeElement?.closest(EMOJI_POPUP_SELECTOR)) {
        return;
      }
      endFocus();
    }, 0);
  };

  // The editor autofocuses before BarrageInput subscribes to its focus event,
  // so the first focus is reported here instead.
  const handlePlaceholderClick = () => {
    if (disabled) {
      return;
    }
    setEditorVisible(true);
    handleFocus();
  };

  const dismissKeyboard = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    (document.activeElement as HTMLElement | null)?.blur();
    endFocus();
  };

  if (!editorVisible || disabled) {
    return (
      <div
        className={styles['barrage-input-h5-placeholder']}
        style={{ width }}
        onClick={handlePlaceholderClick}
      >
        <IconEmote className={styles['barrage-input-h5-placeholder-emoji']} size="24" />
        <span>{placeholder || t('barrage_input.saySomething')}</span>
      </div>
    );
  }

  const isSendButtonVisible = isFocused || hasContent;
  const isSendButtonEvent = (event: React.SyntheticEvent) => (event.target as HTMLElement).closest('button') !== null;

  // Keeping focus on press stops the blur from unmounting the send button before its click fires.
  const handleMouseDown = (event: React.MouseEvent) => {
    if (isSendButtonEvent(event)) {
      event.preventDefault();
    }
  };

  const handleClickCapture = (event: React.MouseEvent) => {
    if (isSendButtonEvent(event)) {
      window.setTimeout(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        endFocus();
      }, 0);
    }
  };

  return (
    <div
      ref={rootRef}
      className={classNames(styles['barrage-input-h5'], { [styles['has-send-button']]: isSendButtonVisible })}
      onMouseDown={handleMouseDown}
      onClickCapture={handleClickCapture}
    >
      {isFocused && (
        <div
          className={styles['barrage-input-h5-mask']}
          onTouchStart={dismissKeyboard}
          onClick={dismissKeyboard}
        />
      )}
      <BarrageInput
        className={styles['barrage-input-h5-editor']}
        width={width}
        minHeight="36px"
        maxHeight="36px"
        containerStyle={EDITOR_CONTAINER_STYLE}
        placeholder={placeholder}
        autoFocus
        showSendButton={isSendButtonVisible}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
};

export { BarrageInputH5 };
