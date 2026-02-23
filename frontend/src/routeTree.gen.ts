import { createRootRoute, createRoute } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import RootLayout from './components/RootLayout';
import TrackingPage from './pages/TrackingPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ProfilePage from './pages/ProfilePage';

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: TrackingPage,
});

const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  component: SessionsPage,
});

const sessionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$sessionId',
  component: SessionDetailPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  sessionsRoute,
  sessionDetailRoute,
  profileRoute,
]);
