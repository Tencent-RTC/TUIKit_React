import type { ReactNode } from 'react';

export enum TUISeatLayoutTemplate {
  LandscapeDynamic_1v3 = 200,
  PortraitDynamic_Grid9 = 600,
  PortraitDynamic_1v6 = 601,
  PortraitFixed_Grid9 = 800,
  PortraitFixed_1v6 = 801,
  PortraitFixed_6v6 = 802,
}

export type PusherControlButtonProps = {
  /**
   * Hard-disable the button: applies the disabled style AND prevents
   * the click handler from firing (sets `disabled` on the underlying
   * <button>).
   */
  disabled?: boolean;
  /**
   * Soft-disable the button: applies the disabled style but the click
   * handler still fires. Mirrors Vue3's `:class="{ disabled: ... }"`
   * pattern - used by OrientationSwitch where we want the button to
   * look disabled during a live session yet still respond to clicks
   * so we can surface a "cannot switch during live streaming" toast.
   */
  dimmed?: boolean;
  badge?: number;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};
