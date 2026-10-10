export const resource = {
  translation: {
    // button label (three states)
    'seat_application.apply': '申请连线',
    'seat_application.cancel_apply': '取消申请',
    'seat_application.leave_seat': '断开连线',
    // connection type dialog
    'seat_application.connection_type.title': '选择连麦方式',
    'seat_application.connection_type.video': '申请视频连麦',
    'seat_application.connection_type.audio': '申请语音连麦',
    // device selection dialog
    'seat_application.device_selection.title': '设备选择',
    'seat_application.device_selection.microphone': '麦克风',
    'seat_application.device_selection.camera': '摄像头',
    'seat_application.device_selection.no_microphone': '未检测到麦克风设备',
    'seat_application.device_selection.no_camera': '未检测到摄像头设备',
    'seat_application.device_selection.off_camera': '摄像头已关闭',
    'seat_application.device_selection.empty_guidance_desc': '请检查设备是否已连接，并在浏览器或系统设置中允许使用后，关闭弹窗重新申请，或刷新页面后再试。',
    'seat_application.device_selection.requirement_both': '请先选择可用的摄像头和麦克风后再确认。',
    'seat_application.device_selection.requirement_camera': '请先选择可用的摄像头后再确认。',
    'seat_application.device_selection.requirement_microphone': '请先选择可用的麦克风后再确认。',
    // camera preview guidance
    'seat_application.camera_preview.failed_title': '无法预览摄像头',
    'seat_application.camera_preview.preview_failed_desc': '请检查浏览器摄像头权限，并确认摄像头未被其他应用占用后，再重新预览。',
    'seat_application.camera_preview.switch_failed_desc': '请检查摄像头权限或设备状态后，再重新预览。',
    'seat_application.camera_preview.unavailable_title': '无法打开摄像头',
    'seat_application.camera_preview.unavailable_desc': '请检查浏览器摄像头权限，关闭正在占用摄像头的应用后，关闭弹窗重新申请，或刷新页面后再试。',
    // device open failure guidance
    'seat_application.device_open_failure.title': '未能加入连麦',
    'seat_application.device_open_failure.permission_denied_desc': '摄像头或麦克风权限不可用，已为您下麦。',
    'seat_application.device_open_failure.unknown_desc': '摄像头或麦克风未能开启，已为您下麦。',
    'seat_application.i_understand': '知道了',
    // toasts
    'seat_application.toast.request_sent': '申请已发送，请等待主播响应或取消申请。',
    'seat_application.toast.already_on_seat': '您已在麦上',
    'seat_application.toast.not_on_seat': '您还未上麦',
    'seat_application.toast.not_applied': '您还未申请连麦',
    'seat_application.toast.apply_success': '连麦成功',
    'seat_application.toast.apply_rejected': '上麦申请被拒绝',
    'seat_application.toast.no_response': '上麦申请未应答',
    'seat_application.toast.timeout': '上麦申请超时',
    'seat_application.toast.already_seated': '您已在麦上',
    'seat_application.toast.kicked_off_seat': '被主持人踢下麦位',
    'seat_application.toast.apply_failed': '申请连麦失败',
    'seat_application.toast.cancel_apply_failed': '取消连麦申请失败',
    'seat_application.toast.leave_failed': '断开连麦失败',
    // dialogs
    'seat_application.confirm': '确认',
    'seat_application.cancel': '取消',
    'seat_application.cancel_apply_dialog_title': '取消连麦申请',
    'seat_application.leave_seat_dialog_title': '结束连麦',
    // webrtc capability
    'seat_application.webrtc_unsupported': '浏览器音视频能力不完整，建议使用最新版 Chrome。',
  },
};
