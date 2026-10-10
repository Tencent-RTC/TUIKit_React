export const resource = {
  translation: {
    // button label (three states)
    'seat_application.apply': 'Apply for co-broadcasting',
    'seat_application.cancel_apply': 'Cancel application',
    'seat_application.leave_seat': 'End Link',
    // connection type dialog
    'seat_application.connection_type.title': 'Choose co-broadcasting method',
    'seat_application.connection_type.video': 'Apply for video co-broadcasting',
    'seat_application.connection_type.audio': 'Apply for audio co-broadcasting',
    // device selection dialog
    'seat_application.device_selection.title': 'Select audio and video devices',
    'seat_application.device_selection.microphone': 'Microphone',
    'seat_application.device_selection.camera': 'Camera',
    'seat_application.device_selection.no_microphone': 'No microphone device available',
    'seat_application.device_selection.no_camera': 'No camera device available',
    'seat_application.device_selection.off_camera': 'Off Camera',
    'seat_application.device_selection.empty_guidance_desc': 'Check the device is connected and allowed in the browser or system settings, then close this dialog and apply again, or refresh the page.',
    'seat_application.device_selection.requirement_both': 'Select an available camera and microphone to continue.',
    'seat_application.device_selection.requirement_camera': 'Select an available camera to continue.',
    'seat_application.device_selection.requirement_microphone': 'Select an available microphone to continue.',
    // camera preview guidance
    'seat_application.camera_preview.failed_title': 'Unable to preview camera',
    'seat_application.camera_preview.preview_failed_desc': 'Check camera permission and make sure no other app is using the camera, then try previewing again.',
    'seat_application.camera_preview.switch_failed_desc': 'Check camera permission or device status, then try previewing again.',
    'seat_application.camera_preview.unavailable_title': 'Unable to open camera',
    'seat_application.camera_preview.unavailable_desc': 'Check camera permission, close any app using the camera, then close this dialog and apply again, or refresh the page.',
    // device open failure guidance
    'seat_application.device_open_failure.title': 'Unable to join co-broadcasting',
    'seat_application.device_open_failure.permission_denied_desc': 'Camera or microphone permission is not available. You have been removed from the seat.',
    'seat_application.device_open_failure.unknown_desc': 'Camera or microphone could not be opened. You have been removed from the seat.',
    'seat_application.i_understand': 'I understand',
    // toasts
    'seat_application.toast.request_sent': "The request has been sent. Please wait for the streamer's response or cancel the request.",
    'seat_application.toast.already_on_seat': 'You are already on the seat',
    'seat_application.toast.not_on_seat': 'You are not yet on the seat',
    'seat_application.toast.not_applied': 'You have not yet applied for seat',
    'seat_application.toast.apply_success': 'GuestApplySeat Success',
    'seat_application.toast.apply_rejected': 'GuestApplySeat Rejected',
    'seat_application.toast.no_response': 'GuestApplySeat No Response',
    'seat_application.toast.timeout': 'GuestApplySeat Timeout',
    'seat_application.toast.already_seated': 'GuestApplySeat Already Seated',
    'seat_application.toast.kicked_off_seat': 'Kicked out of seat by room owner',
    'seat_application.toast.apply_failed': 'Failed to apply for seat',
    'seat_application.toast.cancel_apply_failed': 'Failed to cancel application for seat',
    'seat_application.toast.leave_failed': 'Failed to leave seat',
    // dialogs
    'seat_application.confirm': 'Confirm',
    'seat_application.cancel': 'Cancel',
    'seat_application.cancel_apply_dialog_title': 'Cancel application for link mic',
    'seat_application.leave_seat_dialog_title': 'End Link',
    // webrtc capability
    'seat_application.webrtc_unsupported': 'Browser audio/video capability is incomplete, the latest Chrome is recommended.',
  },
};
