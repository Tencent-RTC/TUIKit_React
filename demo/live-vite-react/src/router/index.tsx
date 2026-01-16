import { useEffect } from 'react';
import { createHashRouter, useLocation, useNavigate } from 'react-router-dom';
import { STORAGE_KEYS } from '@/constants';
import { Login } from '@/views/Login';
import { LiveList } from '@/views/LiveList';
import { LivePlayer } from '@/views/LivePlayer';

const ProtectedRoute = ({ children }: { children: React.ReactNode; }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userInfo = sessionStorage.getItem(STORAGE_KEYS.USER_INFO);
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get('from');

    // 1. Not logged in + Not on the login page → Jump to the login page
    if (!userInfo && location.pathname !== '/login') {
      navigate(`/login?from=${encodeURIComponent(location.pathname + location.search)}`);
    }
    // 2. Logged in + On the login page → Jump back to the target page or default page
    if (userInfo && location.pathname === '/login') {
      const decodedFrom = from ? decodeURIComponent(from) : '';
      // Prevent circular redirect: if target page is login page, use default page instead
      const targetPage = decodedFrom && decodedFrom !== '/login' ? decodedFrom : '/live-list';
      navigate(targetPage);
    }
  }, [location.pathname, navigate, location.search]);

  return <>{children}</>;
};

const routes = [
  {
    path: '/',
    element: <LiveList />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/live-list',
    element: <LiveList />,
  },
  {
    path: '/live-player',
    element: <LivePlayer />,
  }
];

export const router = createHashRouter(
  routes.map(route => ({
    ...route,
    element: <ProtectedRoute>{route.element}</ProtectedRoute>,
  }))
);
