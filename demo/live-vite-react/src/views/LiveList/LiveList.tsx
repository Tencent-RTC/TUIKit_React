import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LiveInfo, LiveList as LiveListView, useLoginState } from 'tuikit-atomicx-react';
import { MessageBox, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { LiveHeader } from '@/components/LiveHeader';
import styles from './LiveList.module.scss';

const DEFAULT_COLUMN_COUNT = 5;

const LiveList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUserInfo } = useLoginState();
  const { t } = useUIKit();

  const handleLiveRoomClick = (liveInfo: LiveInfo) => {
    if (loginUserInfo?.userId === liveInfo.liveOwner?.userId) {
      MessageBox.alert({
        title: t('live_list.warning'),
        content: t('live_list.unable_to_view_own_live'),
      });
      return;
    }

    if (liveInfo?.liveId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('liveId', liveInfo.liveId);
      navigate(`/live-player?${newParams.toString()}`);
    }
  };

  return (
    <div className={styles.liveList}>
      <div className={styles.liveList__header}>
        <LiveHeader />
      </div>
      <LiveListView columnCount={DEFAULT_COLUMN_COUNT} onLiveRoomClick={handleLiveRoomClick} />
    </div>
  );
};

export default LiveList;
