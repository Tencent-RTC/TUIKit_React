import type React from 'react';
import { useEffect, useState } from 'react';
import { Toast, useUIKit } from '@tencentcloud/uikit-base-component-react';
import { LiveSeatEvent, useLiveSeatState } from 'tuikit-atomicx-react';
import type { LivePlayerViewProps } from '../types';
import { LivePlayerH5 } from './LivePlayerH5';
import { WebRTCUnsupportedDialog } from './components/WebRTCUnsupportedDialog/WebRTCUnsupportedDialog';
import { checkWebRTCSupport } from './utils/webrtcSupport';

enum EntryCheckStatus {
  Checking = 'checking',
  Supported = 'supported',
  Unsupported = 'unsupported',
}

// Standalone H5 viewer: joins `liveId` on mount, leaves on unmount, and calls
// `onLeaveLive` whenever the viewer should return to the host page.
const LivePlayerViewH5: React.FC<LivePlayerViewProps> = ({ liveId, onLeaveLive }) => {
  const { t } = useUIKit();
  const { subscribeEvent, unsubscribeEvent } = useLiveSeatState();
  const [entryCheckStatus, setEntryCheckStatus] = useState(EntryCheckStatus.Checking);

  useEffect(() => {
    const handleMicrophoneClosedByAdmin = () => {
      Toast.info({ message: t('live_player_view_h5.microphone_disabled_by_host') });
    };
    const handleCameraClosedByAdmin = () => {
      Toast.info({ message: t('live_player_view_h5.camera_disabled_by_host') });
    };
    const handleMicrophoneOpenedByAdmin = () => {
      Toast.info({ message: t('live_player_view_h5.microphone_restored_by_host') });
    };
    const handleCameraOpenedByAdmin = () => {
      Toast.info({ message: t('live_player_view_h5.camera_restored_by_host') });
    };
    subscribeEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_CLOSED_BY_ADMIN, handleMicrophoneClosedByAdmin);
    subscribeEvent(LiveSeatEvent.ON_LOCAL_CAMERA_CLOSED_BY_ADMIN, handleCameraClosedByAdmin);
    subscribeEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_OPENED_BY_ADMIN, handleMicrophoneOpenedByAdmin);
    subscribeEvent(LiveSeatEvent.ON_LOCAL_CAMERA_OPENED_BY_ADMIN, handleCameraOpenedByAdmin);
    return () => {
      unsubscribeEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_CLOSED_BY_ADMIN, handleMicrophoneClosedByAdmin);
      unsubscribeEvent(LiveSeatEvent.ON_LOCAL_CAMERA_CLOSED_BY_ADMIN, handleCameraClosedByAdmin);
      unsubscribeEvent(LiveSeatEvent.ON_LOCAL_MICROPHONE_OPENED_BY_ADMIN, handleMicrophoneOpenedByAdmin);
      unsubscribeEvent(LiveSeatEvent.ON_LOCAL_CAMERA_OPENED_BY_ADMIN, handleCameraOpenedByAdmin);
    };
  }, [subscribeEvent, t, unsubscribeEvent]);

  // Mount the player only after the probe passes so unsupported browsers
  // never call joinLive.
  useEffect(() => {
    let cancelled = false;
    checkWebRTCSupport().then((capability) => {
      if (!cancelled) {
        setEntryCheckStatus(capability.canPullVideo ? EntryCheckStatus.Supported : EntryCheckStatus.Unsupported);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {entryCheckStatus === EntryCheckStatus.Supported && (
        <LivePlayerH5 liveId={liveId} onLeaveLive={onLeaveLive} />
      )}
      <WebRTCUnsupportedDialog
        visible={entryCheckStatus === EntryCheckStatus.Unsupported}
        onReturnToList={onLeaveLive}
      />
    </>
  );
};

export { LivePlayerViewH5 };
