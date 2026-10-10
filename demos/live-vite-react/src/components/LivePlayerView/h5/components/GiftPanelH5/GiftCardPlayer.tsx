import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useUIKit } from '@tencentcloud/uikit-base-component-react';
import { LiveGiftEvents, useLiveGiftState, useLoginState } from 'tuikit-atomicx-react';
import type { Gift } from 'tuikit-atomicx-react';
import styles from './GiftPanelH5.module.scss';

const DISPLAY_DURATION_MS = 1500;
const MAX_DISPLAY_COUNT = 3;
// Same sender + same gift within this window folds into one growing card.
const COMBO_WINDOW_MS = 2000;
const DEFAULT_AVATAR_URL = 'https://qcloudimg.tencent-cloud.cn/raw/7e7e51d4692c95e965538d7f65e0faf1.jpg';

interface GiftCard {
  id: string;
  gift: Gift;
  lastUpdatedAt: number;
}

const GiftCardPlayer: React.FC = () => {
  const { t } = useUIKit();
  const { subscribeEvent, unsubscribeEvent } = useLiveGiftState();
  const { loginUserInfo } = useLoginState();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const timersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = timersRef.current;

    const removeCard = (id: string) => {
      window.clearTimeout(timers.get(id));
      timers.delete(id);
      setCards(previous => previous.filter(card => card.id !== id));
    };

    const scheduleHide = (id: string) => {
      window.clearTimeout(timers.get(id));
      timers.set(id, window.setTimeout(() => removeCard(id), DISPLAY_DURATION_MS));
    };

    const handleReceiveGift = (gift: Gift) => {
      const now = Date.now();
      setCards((previous) => {
        const combo = previous.find(card => card.gift.sender.userId === gift.sender.userId
          && card.gift.giftInfo.giftID === gift.giftInfo.giftID
          && now - card.lastUpdatedAt <= COMBO_WINDOW_MS);
        if (combo) {
          scheduleHide(combo.id);
          return previous.map(card => (card.id === combo.id
            ? {
              ...card,
              gift: { ...card.gift, giftCount: card.gift.giftCount + (gift.giftCount || 1) },
              lastUpdatedAt: now,
            }
            : card));
        }
        const id = `${gift.sender.userId}-${gift.giftInfo.giftID}-${now}`;
        scheduleHide(id);
        const next = [...previous, { id, gift, lastUpdatedAt: now }];
        if (next.length > MAX_DISPLAY_COUNT) {
          const [oldest] = next;
          window.clearTimeout(timers.get(oldest.id));
          timers.delete(oldest.id);
          return next.slice(1);
        }
        return next;
      });
    };

    subscribeEvent(LiveGiftEvents.ON_RECEIVE_GIFT_MESSAGE, handleReceiveGift);
    return () => {
      unsubscribeEvent(LiveGiftEvents.ON_RECEIVE_GIFT_MESSAGE, handleReceiveGift);
      timers.forEach(timerId => window.clearTimeout(timerId));
      timers.clear();
    };
  }, [subscribeEvent, unsubscribeEvent]);

  return (
    <div className={styles['gift-card-list']}>
      {cards.map(({ id, gift }) => {
        const isSelf = gift.sender.userId === loginUserInfo?.userId;
        const senderName = isSelf ? t('live_player_view_h5.me') : (gift.sender.userName || gift.sender.userId);
        return (
          <div key={id} className={styles['gift-card']}>
            <div className={styles['gift-card-capsule']}>
              <img className={styles['gift-card-avatar']} src={gift.sender.avatarUrl || DEFAULT_AVATAR_URL} alt="" />
              <div className={styles['gift-card-info']}>
                <div className={styles['gift-card-name']}>{senderName}</div>
                <div className={styles['gift-card-action']}>
                  {`${t('live_player_view_h5.send')} ${gift.giftInfo.name}`}
                </div>
              </div>
              <img className={styles['gift-card-icon']} src={gift.giftInfo.iconUrl} alt={gift.giftInfo.name} />
            </div>
            {gift.giftCount > 1 && (
              <span key={gift.giftCount} className={styles['gift-card-combo']}>
                <span className={styles['gift-card-combo-x']}>×</span>
                <span className={styles['gift-card-combo-count']}>{gift.giftCount}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { GiftCardPlayer };
