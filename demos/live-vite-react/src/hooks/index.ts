import { addI18n } from '@/i18n';
import { enResource, zhResource } from './useGlobalEventDialogs/i18n';

// Register i18n resources at module load time (same pattern as component barrel files).
addI18n('en-US', { translation: enResource });
addI18n('zh-CN', { translation: zhResource });

export { useGlobalEventDialogs } from './useGlobalEventDialogs';
