import classNames from 'classnames';
import { BarrageList, BarrageInput } from 'tuikit-atomicx-react';
import styles from './ChatPanel.module.scss';

interface ChatPanelProps {
  title: string;
  subtitle?: string;
  isLive: boolean;
  emptyText: string;
  className?: string;
}

export function ChatPanel({
  title,
  subtitle,
  isLive,
  emptyText,
  className,
}: ChatPanelProps) {
  return (
    <div className={classNames(styles.chatPanel, className)}>
      <div className={styles.panelHeader}>
        <div>
          <h3>{title}</h3>
          {subtitle ? <span className={styles.panelSubTitle}>{subtitle}</span> : null}
        </div>
      </div>
      <div className={styles.chatBody}>
        {isLive ? (
          <BarrageList height="100%" style={{ backgroundColor: 'transparent' }} />
        ) : (
          <div className={styles.chatPlaceholder}>{emptyText}</div>
        )}
      </div>
      <div className={styles.chatInput}>
        <BarrageInput height="48px" disabled={!isLive} placeholder={isLive ? '' : emptyText} />
      </div>
    </div>
  );
}


