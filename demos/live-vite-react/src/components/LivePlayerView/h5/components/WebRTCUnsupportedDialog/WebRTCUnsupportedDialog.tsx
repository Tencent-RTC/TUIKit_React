import type React from 'react';
import { Dialog, IconToastWarning, useUIKit } from '@tencentcloud/uikit-base-component-react';
import styles from './WebRTCUnsupportedDialog.module.scss';

const BROWSER_SUPPORT_DOC_URL = {
  mainland: 'https://cloud.tencent.com/document/product/647/17249#.E6.94.AF.E6.8C.81.E7.9A.84.E5.B9.B3.E5.8F.B0',
  international: 'https://trtc.io/document/59733',
};

interface WebRTCUnsupportedDialogProps {
  visible: boolean;
  onReturnToList: () => void;
}

const WebRTCUnsupportedDialog: React.FC<WebRTCUnsupportedDialogProps> = ({ visible, onReturnToList }) => {
  const { t, language } = useUIKit();

  const openCompatibleBrowsers = (event: React.MouseEvent) => {
    event.preventDefault();
    const url = language === 'zh-CN' ? BROWSER_SUPPORT_DOC_URL.mainland : BROWSER_SUPPORT_DOC_URL.international;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      visible={visible}
      width="88%"
      center
      title={(
        <div className={styles['webrtc-unsupported-title']}>
          <IconToastWarning size="20" />
          <span>{t('live_player_view_h5.unable_to_watch_live')}</span>
        </div>
      )}
      confirmText={t('live_player_view_h5.confirm')}
      cancelText={t('live_player_view_h5.cancel')}
      onConfirm={onReturnToList}
      onCancel={onReturnToList}
      onClose={onReturnToList}
    >
      <div className={styles['webrtc-unsupported-body']}>
        <div className={styles['webrtc-unsupported-desc']}>
          {t('live_player_view_h5.browser_cannot_watch_live')}
        </div>
        <a className={styles['webrtc-unsupported-link']} href="#" onClick={openCompatibleBrowsers}>
          {t('live_player_view_h5.view_compatible_browsers')}
        </a>
        <div className={styles['webrtc-unsupported-footnote']}>
          {t('live_player_view_h5.confirm_to_return_live_list')}
        </div>
      </div>
    </Dialog>
  );
};

export { WebRTCUnsupportedDialog };
