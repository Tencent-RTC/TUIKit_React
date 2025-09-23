import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { useNavigate } from 'react-router-dom';
import { useLiveMonitorState, MonitorLiveInfo } from 'tuikit-atomicx-react';
import { ErrorCode } from '../types';
import { MessageBox, useUIKit } from '@tencentcloud/uikit-base-component-react';

export interface PaginationProps {
  onPageChange?: (page: number) => void;
}

export interface PaginationState {
  currentPage: number;
  hasMoreData: boolean;
  currentPageData: MonitorLiveInfo[];
}

export interface PaginationInnerState {
  pageSize: number;
}

export interface PaginationActions {
  setCurrentPage: (page: number) => void;
  setHasMoreData: (hasMore: boolean) => void;
  setCurrentPageData: (data: MonitorLiveInfo[]) => void;
  setPageSize: (size: number) => void;
  getCurrentPageData: () => MonitorLiveInfo[];
}

const paginationStore = createStore<PaginationState & PaginationInnerState & PaginationActions>()((set, get) => ({
  // State
  currentPage: 1,
  pageSize: 10,
  hasMoreData: true,
  currentPageData: [],

  // Actions
  setCurrentPage: (page: number) => {
    set({ currentPage: page });
  },

  setHasMoreData: (hasMore: boolean) => {
    set({ hasMoreData: hasMore });
  },

  setCurrentPageData: (data: MonitorLiveInfo[]) => {
    set({ currentPageData: data });
  },

  setPageSize: (size: number) => {
    set({ pageSize: size });
  },

  getCurrentPageData: () => {
    return get().currentPageData;
  },
}));

export function usePaginationState(options?: PaginationProps) {
  const { getLiveList, startPlay, stopPlay } = useLiveMonitorState();
  const navigate = useNavigate();
  const { t } = useUIKit();

  const currentPage = useStore(paginationStore, state => state.currentPage);
  const hasMoreData = useStore(paginationStore, state => state.hasMoreData);
  const currentPageData = useStore(paginationStore, state => state.currentPageData);
  const setCurrentPage = useStore(paginationStore, state => state.setCurrentPage);
  const setHasMoreData = useStore(paginationStore, state => state.setHasMoreData);
  const setCurrentPageData = useStore(paginationStore, state => state.setCurrentPageData);
  const setPageSize = useStore(paginationStore, state => state.setPageSize);
  const getCurrentPageData = useStore(paginationStore, state => state.getCurrentPageData);

  const goToPage = async (page: number) => {
    if (page < 1) return;
    if (page > currentPage && !hasMoreData) return;

    try {
      // Stop current page live streams
      currentPageData.forEach((item: MonitorLiveInfo) => {
        stopPlay(item.liveId);
      });

      // Load new page data - get fresh pageSize from store
      const currentPageSize = paginationStore.getState().pageSize;
      const newPageData = await getLiveList(page, currentPageSize);
      const hasMore = newPageData.length >= currentPageSize;

      let hasNavigatedToLogin = false;
      for (const item of newPageData) {
        startPlay(item.liveId, `live_monitor_view_${item.liveId}`).catch((error: any) => {
          // if (error === ErrorCode.LOGIN_TIMEOUT && !hasNavigatedToLogin) {
          if ((error === ErrorCode.LOGIN_TIMEOUT || error === ErrorCode.USER_SIG_ILLEGAL) && !hasNavigatedToLogin) {
            hasNavigatedToLogin = true;
            let content = '';
            if (error === ErrorCode.LOGIN_TIMEOUT) {
              content = t('Login timeout. Please click "Confirm" to log in again');
            } else if (error === ErrorCode.USER_SIG_ILLEGAL) {
              content = t('UserSig is illegal. Please click Confirm to log in again');
            }
            MessageBox.alert({
              title: t('Notification'),
              showClose: false,
              confirmText: t('Confirm'),
              content,
              callback: () => {
                localStorage.removeItem('tuiLiveMonitor-userInfo');
                navigate('/login');
              },
            });
          }
        });
      }

      // Update state
      setCurrentPage(page);
      setHasMoreData(hasMore);
      setCurrentPageData(newPageData);

      // Call page change callback
      options?.onPageChange?.(page);
    } catch (error) {
      console.error('Failed to load page:', error);
    }
  };

  return {
    currentPage,
    hasMoreData,
    currentPageData,
    goToPage,
    setPageSize,
    getCurrentPageData,
  };
}
