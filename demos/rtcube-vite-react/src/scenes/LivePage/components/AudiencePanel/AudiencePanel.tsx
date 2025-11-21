import classNames from 'classnames';
import styles from './AudiencePanel.module.scss';

export interface AudienceInfo {
  id: string;
  name: string;
  badge?: string;
}

interface AudiencePanelProps {
  title: string;
  subtitle: string;
  audienceList: AudienceInfo[];
  emptyText: string;
  className?: string;
}

export function AudiencePanel({
  title,
  subtitle,
  audienceList,
  emptyText,
  className,
}: AudiencePanelProps) {
  return (
    <div className={classNames(styles.audiencePanel, className)}>
      <div className={styles.panelHeader}>
        <div>
          <h3>{title}</h3>
          <span className={styles.panelSubTitle}>{subtitle}</span>
        </div>
      </div>
      <div className={styles.audienceList}>
        {audienceList.length ? (
          audienceList.map(item => (
            <div key={item.id} className={styles.audienceItem}>
              <div className={styles.audienceAvatar}>{item.name.slice(0, 1)}</div>
              <div className={styles.audienceMeta}>
                <span className={styles.audienceName}>{item.name}</span>
                {item.badge ? (
                  <span className={styles.audienceBadge}>{item.badge}</span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.panelPlaceholder}>{emptyText}</div>
        )}
      </div>
    </div>
  );
}


