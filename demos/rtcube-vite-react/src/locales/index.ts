import { i18next } from '@tencentcloud/uikit-base-component-react';
import { resource as enResource } from './en-US';
import { resourse as zhResource } from './zh-CN';

export const addI18n = (lng: string, resource: any, deep = true, overwrite = false) => {
  i18next.addResourceBundle(lng, 'translation', resource.translation, deep, overwrite);
};

export const i18nInit = () => {
  addI18n('en-US', { translation: enResource });
  addI18n('zh-CN', { translation: zhResource });
};
