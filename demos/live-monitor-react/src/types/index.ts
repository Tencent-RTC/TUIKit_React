export type BasicUserInfo = {
  sdkAppId: number,
  userId: string,
  userSig: string,
  userName: string,
  avatarUrl: string,
}

export enum ErrorCode {
  LOGIN_TIMEOUT = -70001,
  USER_SIG_ILLEGAL = -70003,
}