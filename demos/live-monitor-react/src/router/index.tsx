import { lazy } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';

const LiveMonitor = lazy(() => import('../views/LiveMonitor'));

const routes = [
  {
    path: '/',
    element: <LiveMonitor />,
  },
  {
    path: '/*',
    element: <Navigate to='/' replace />,
  },
];

export const router = createHashRouter(routes);
export default router;
