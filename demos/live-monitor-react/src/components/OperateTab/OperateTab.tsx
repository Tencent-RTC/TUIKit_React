import React from 'react';
import { Button, IconRefresh, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { usePaginationState } from '../../state/PaginationState';
import styles from './OperateTab.module.scss';

interface OperateTabProps {
  className?: string;
}
const OperateTab: React.FC<OperateTabProps> = ({ className }) => {
  const { t } = useUIKit();
  const { goToPage, currentPage } = usePaginationState();
  return (
    <div className={`${styles['operate-tab']} ${className || ''}`}>
      <span>{t('All Live Rooms')}</span>
      <Button
        icon={<IconRefresh />}
        onClick={() => {
          goToPage(currentPage);
        }}
      >
        {t('Refresh')}
      </Button>
    </div>
  );
};

export default OperateTab;
