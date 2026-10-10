import React, { useEffect, useState } from 'react';
import { Dialog, IconCoGuest, Toast, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { CoHostStatus, useCoGuestState, useCoHostState, useLiveListState } from 'tuikit-atomicx-react';
import CoGuestPanel from './CoGuestPanel';
import styles from './CoGuestButton.module.scss';

// Host-side entry for co-guesting: a bottom-bar button with an unread badge
// for pending applications, opening the management panel in a dialog.
// React port of the Vue3 CoGuestButton (the react package ships no
// CoGuestPanel component, so both live in this demo).
//
// Disabled while co-hosting with other hosts is active (mutual exclusion —
// same rule the Vue3 demo enforces; cross-room co-host / PK themselves are
// out of scope for this demo).
const CoGuestButton: React.FC = () => {
  const { t } = useUIKit();
  const { applicants } = useCoGuestState();
  const { currentLive } = useLiveListState();
  const { coHostStatus } = useCoHostState();
  const [panelVisible, setPanelVisible] = useState(false);

  const disabled = !currentLive?.liveId || coHostStatus !== CoHostStatus.Disconnected;

  useEffect(() => {
    if (disabled) {
      setPanelVisible(false);
    }
  }, [disabled]);

  const handleClick = () => {
    if (disabled) {
      const message = !currentLive?.liveId
        ? t('co_guest_button.disabled_before_live')
        : t('co_guest_button.disabled_while_co_hosting');
      Toast.warning({ message });
      return;
    }
    setPanelVisible(true);
  };

  return (
    <>
      <div
        className={`${styles.coGuestButton} ${disabled ? styles.disabled : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && handleClick()}
      >
        {applicants.length > 0 && (
          <span className={styles.unreadCount}>{applicants.length}</span>
        )}
        {/* IconCoGuest lives in the base component library (added there to
            stay aligned with the Vue3 base package, which ships the same
            icon). Size 24 matches the Vue3 `icon-size-24` mixin. */}
        <IconCoGuest size="24" className={styles.customIcon} />
        <span className={styles.customText}>{t('co_guest_button.label')}</span>
      </div>

      <Dialog
        visible={panelVisible}
        title={t('co_guest_button.label')}
        onClose={() => setPanelVisible(false)}
        // The panel manages its own actions (accept / reject / disconnect);
        // no dialog-level confirm/cancel buttons — aligned with Vue3's
        // empty footer slot.
        showConfirm={false}
        showCancel={false}
        width={520}
      >
        <CoGuestPanel className={styles.coGuestPanel} />
      </Dialog>
    </>
  );
};

export default CoGuestButton;
