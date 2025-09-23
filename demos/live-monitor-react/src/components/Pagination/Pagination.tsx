import React, { useEffect, useRef } from 'react';
import {
  useUIKit,
  Button,
  IconHome,
  IconChevronLeft,
  IconChevronRight,
} from '@tencentcloud/uikit-base-component-react';
import styles from './Pagination.module.scss';
import { usePaginationState } from '../../state/PaginationState';

interface PaginationProps {
  pageSize?: number;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({ pageSize = 10, className }) => {
  const { t } = useUIKit();
  const { currentPage, hasMoreData, goToPage, setPageSize } = usePaginationState();
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setPageSize(pageSize);
    goToPage(1);
  }, []);

  return (
    <span className={`${styles['live-pagination']} ${className || ''}`}>
      <Button
        icon={<IconChevronLeft />}
        className={`${styles.button} ${currentPage <= 1 ? styles.disabled : ''}`}
        onClick={() => goToPage(currentPage - 1)}
      >
        {t('Last Page')}
      </Button>
      <Button
        icon={<IconHome />}
        className={`${styles.button} ${currentPage === 1 ? styles.disabled : ''}`}
        onClick={() => goToPage(1)}
      >
        {t('First Page')}
      </Button>
      <Button
        icon={<IconChevronRight />}
        iconPosition='end'
        className={`${styles.button} ${!hasMoreData ? styles.disabled : ''}`}
        onClick={() => goToPage(currentPage + 1)}
      >
        {t('Next Page')}
      </Button>
    </span>
  );
};

export default Pagination;
