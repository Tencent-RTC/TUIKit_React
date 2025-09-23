import React, { useLayoutEffect } from 'react';
import { useLiveMonitorState } from 'tuikit-atomicx-react';
import { createBasicAccount } from '../../config';
import { Header } from '../../components/Header';
import { LiveList } from '../../components/LiveList';
import { Pagination } from '../../components/Pagination';
import styles from './LiveMonitorConfig.module.scss';
import OperateTab from '../../components/OperateTab';

const LiveMonitorConfig: React.FC = () => {
  const { init, monitorLiveInfoList } = useLiveMonitorState();

  useLayoutEffect(() => {
    const account = createBasicAccount();
    if (account) {
      init({
        baseUrl: 'http://localhost:9000/api',
        account: {
          sdkAppId: account.sdkAppId,
          userId: account.userId,
          password: account.userSig,
        },
      });
    }
  }, [init]);

  return (
    <div className={styles['live-monitor']}>
      <Header className={styles['live-monitor-header']} />
      <div className={styles['live-monitor-content']}>
        <OperateTab className={styles['operate-tab']} />
        <LiveList monitorLiveInfoList={monitorLiveInfoList} className={styles['live-list']} />
        <Pagination className={styles['live-pagination']} pageSize={10} />
      </div>
    </div>
  );
};

export default LiveMonitorConfig;
