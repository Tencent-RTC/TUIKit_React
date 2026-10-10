import { addI18n } from '@/i18n';
import { isMobile } from '@/utils/environment';
import { enResource as h5EnResource, zhResource as h5ZhResource } from './h5/i18n';
import { LivePlayerViewH5 } from './h5/LivePlayerViewH5';
import { enResource as pcEnResource, zhResource as pcZhResource } from './pc/i18n';
import { LivePlayerViewPC } from './pc/LivePlayerViewPC';

addI18n('en-US', { translation: pcEnResource });
addI18n('zh-CN', { translation: pcZhResource });
addI18n('en-US', { translation: h5EnResource });
addI18n('zh-CN', { translation: h5ZhResource });

const LivePlayerView = isMobile ? LivePlayerViewH5 : LivePlayerViewPC;

export { LivePlayerView };
export type { LivePlayerViewProps } from './types';
