// Seat layout templates relevant to seat-application policy. Ported from
// the Vue3 demo (`TUILiveKit/types/LivePusher.ts`) — only the template the
// apply flow branches on is needed here.
export enum TUISeatLayoutTemplate {
  LandscapeDynamic_1v3 = 200,
  LandscapeDynamic_1v1 = 400,
  PortraitDynamic_Grid9 = 600,
  PortraitDynamic_1v6 = 601,
  PortraitFixed_Grid9 = 800,
  PortraitFixed_1v6 = 801,
  PortraitFixed_6v6 = 802,
}
