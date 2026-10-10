import { addI18n } from '../../i18n';
import { enResource, zhResource } from './i18n';

addI18n('en-US', enResource);
addI18n('zh-CN', zhResource);

export { default as SeatApplicationButton } from './SeatApplicationButton';
export { useSeatApplication } from './useSeatApplication';
