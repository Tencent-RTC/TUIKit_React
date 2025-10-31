import { createHashRouter, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { StagesPage } from '../pages/StagesPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login/:sceneId',
    element: <LoginPage />,
  },
  {
    path: '/stages/:sceneId',
    element: <StagesPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
