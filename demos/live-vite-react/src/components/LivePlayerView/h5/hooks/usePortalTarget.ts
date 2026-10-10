import { createContext, useContext } from 'react';

interface PortalTarget {
  /** Node that popups portal into; `null` falls back to `document.body`. */
  container: HTMLElement | null;
  /** True inside the fullscreen frame, which is landscape even while orientation media queries report portrait. */
  isLandscapeFrame: boolean;
}

const PortalTargetContext = createContext<PortalTarget>({ container: null, isLandscapeFrame: false });

function usePortalTarget() {
  const { container, isLandscapeFrame } = useContext(PortalTargetContext);
  return { container: container ?? document.body, isLandscapeFrame };
}

export { PortalTargetContext, usePortalTarget };
export type { PortalTarget };
