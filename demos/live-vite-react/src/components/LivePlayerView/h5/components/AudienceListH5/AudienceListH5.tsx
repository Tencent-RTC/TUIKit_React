import type React from 'react';
import { useUIKit } from '@tencentcloud/uikit-base-component-react';
import { Avatar, useLiveAudienceState } from 'tuikit-atomicx-react';
import styles from './AudienceListH5.module.scss';

const MAX_AUDIENCE_COUNT = 200;

const AudienceListH5: React.FC = () => {
  const { t } = useUIKit();
  const { audienceList, audienceCount } = useLiveAudienceState();

  return (
    <div className={styles['audience-list-h5']}>
      {audienceList.map(audience => (
        <div key={audience.userId} className={styles['audience-list-h5-item']}>
          <Avatar src={audience.avatarUrl} size={40} />
          <div className={styles['audience-list-h5-info']}>
            <span className={styles['audience-list-h5-name']}>{audience.userName || audience.userId}</span>
          </div>
        </div>
      ))}
      {audienceCount >= MAX_AUDIENCE_COUNT && (
        <div className={styles['audience-list-h5-limit']}>{t('live_player_view_h5.only_show_max_audience')}</div>
      )}
      {audienceList.length === 0 && (
        <div className={styles['audience-list-h5-empty']}>{t('live_player_view_h5.no_audience_yet')}</div>
      )}
    </div>
  );
};

export { AudienceListH5 };
