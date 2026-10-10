import { getPlatform } from '@tencentcloud/universal-api';

// Must stay identical to tuikit-atomicx-react's internal `isMobile`, which
// drives LiveView's mobile layout branch.
export const isMobile = getPlatform() === 'h5';
