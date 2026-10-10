import type React from 'react';
import classNames from 'classnames';
import { useUIKit } from '@tencentcloud/uikit-base-component-react';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import styles from './SeatApplication.module.scss';

interface ActionSheetItem {
  key: string;
  label: React.ReactNode;
  isDanger?: boolean;
  onClick: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  items: ActionSheetItem[];
  onCancel: () => void;
}

const ActionSheet: React.FC<ActionSheetProps> = ({ visible, items, onCancel }) => {
  const { t } = useUIKit();
  return (
    <BottomSheet visible={visible} zIndex={1100} className={styles['action-sheet']} onClose={onCancel}>
      {items.map(item => (
        <div
          key={item.key}
          className={classNames(styles['action-sheet-button'], { [styles['is-danger']]: item.isDanger })}
          onClick={item.onClick}
        >
          {item.label}
        </div>
      ))}
      <div className={classNames(styles['action-sheet-button'], styles['is-cancel'])} onClick={onCancel}>
        {t('live_player_view_h5.cancel')}
      </div>
    </BottomSheet>
  );
};

export { ActionSheet };
export type { ActionSheetItem };
