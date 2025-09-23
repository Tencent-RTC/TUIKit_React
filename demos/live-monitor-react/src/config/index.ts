import { getBasicInfo } from './basic-info-config';

const sdkAppId = 0; // Enter your sdkAppId
const secretKey = ''; // Enter your secretKey
const defaultCoverUrl = 'https://qcloudimg.tencent-cloud.cn/raw/ff817ad3ce6ec736aed959e2f105d6d5.jpg' // Enter your default cover image URL
const defaultAvatarUrl = 'https://qcloudimg.tencent-cloud.cn/raw/7e7e51d4692c95e965538d7f65e0faf1.jpg' // Enter your default avatar image URL

const createBasicAccount = (userId?: string) => {
  return getBasicInfo(userId || `live_${Math.ceil(Math.random() * 10000000)}`, sdkAppId, secretKey);
};

export { sdkAppId, secretKey, createBasicAccount, defaultCoverUrl, defaultAvatarUrl };
