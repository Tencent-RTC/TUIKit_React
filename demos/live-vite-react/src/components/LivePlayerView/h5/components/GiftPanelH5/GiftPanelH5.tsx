import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { Toast, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { useLiveGiftState, useLiveListState } from 'tuikit-atomicx-react';
import { usePortalTarget } from '../../hooks/usePortalTarget';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import { IconGift } from '../Icons';
import { GiftCardPlayer } from './GiftCardPlayer';
import styles from './GiftPanelH5.module.scss';

interface GiftButtonProps {
  onClick: () => void;
}

const GiftButton: React.FC<GiftButtonProps> = ({ onClick }) => (
  <div className={styles['gift-button']} onClick={onClick}>
    <IconGift size={20} />
  </div>
);

interface GiftPanelH5Props {
  visible: boolean;
  onClose: () => void;
}

// Gift sheet and received-gift cards. Render once per page: the entry button is separate so it can
// appear in several toolbars without duplicating gift subscriptions.
const GiftPanelH5: React.FC<GiftPanelH5Props> = ({ visible, onClose }) => {
  const { t } = useUIKit();
  const { giftInfoList, getGiftList, sendGift } = useLiveGiftState();
  const { currentLive } = useLiveListState();
  const { container } = usePortalTarget();
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [selectedGiftId, setSelectedGiftId] = useState('');

  useEffect(() => {
    if (currentLive?.liveId) {
      getGiftList().catch((error: Error) => {
        console.warn('[GiftPanelH5] Failed to get gift list:', error?.message);
      });
    }
  }, [currentLive?.liveId, getGiftList]);

  const activeCategory = useMemo(
    () => giftInfoList.find(category => category.categoryID === activeCategoryId) || giftInfoList[0],
    [activeCategoryId, giftInfoList],
  );

  const closeSheet = () => {
    onClose();
    setSelectedGiftId('');
  };

  // First tap selects a gift, the second tap on the same gift sends it.
  const handleGiftClick = async (giftId: string) => {
    if (selectedGiftId !== giftId) {
      setSelectedGiftId(giftId);
      return;
    }
    try {
      await sendGift({ giftId, count: 1 });
    } catch (error) {
      console.error('[GiftPanelH5] Failed to send gift:', error);
      Toast.error({ message: t('live_player_view_h5.send_gift_failed') });
    } finally {
      setSelectedGiftId('');
    }
  };

  return (
    <>
      {createPortal(
        <div className={styles['gift-card-player-overlay']}>
          <GiftCardPlayer />
        </div>,
        container,
      )}
      <BottomSheet visible={visible} height="50%" sideInLandscape onClose={closeSheet}>
        <div className={styles['gift-sheet']}>
          <div className={styles['gift-sheet-tabs']}>
            {giftInfoList.map(category => (
              <div
                key={category.categoryID}
                className={classNames(styles['gift-sheet-tab'], {
                  [styles['is-active']]: category.categoryID === activeCategory?.categoryID,
                })}
                onClick={() => {
                  setActiveCategoryId(category.categoryID);
                  setSelectedGiftId('');
                }}
              >
                {category.name}
              </div>
            ))}
          </div>
          <div className={styles['gift-sheet-grid']}>
            {activeCategory?.giftList.map((gift) => {
              const isSelected = selectedGiftId === gift.giftID;
              return (
                <div
                  key={gift.giftID}
                  className={styles['gift-item']}
                  onClick={() => {
                    handleGiftClick(gift.giftID);
                  }}
                >
                  <div className={classNames(styles['gift-item-card'], { [styles['is-selected']]: isSelected })}>
                    <div className={styles['gift-item-icon']}>
                      <img src={gift.iconUrl} alt={gift.name} draggable={false} />
                    </div>
                    <span className={styles['gift-item-name']}>
                      {isSelected ? t('live_player_view_h5.send') : gift.name}
                    </span>
                  </div>
                  <span className={styles['gift-item-price']}>{gift.coins}</span>
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export { GiftButton, GiftPanelH5 };
