import { addI18n } from '../../i18n';
import { enResource, zhResource } from './i18n';

addI18n('en-US', enResource);
addI18n('zh-CN', zhResource);

export { default as CoGuestButton } from './CoGuestButton';
export { default as CoGuestPanel } from './CoGuestPanel';
