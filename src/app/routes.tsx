import { createBrowserRouter, Outlet, redirect } from 'react-router';
import { QuickLogProvider } from './components/QuickLogCapture';
import { Hub } from './pages/Hub';

function RoutedApp() {
  return (
    <QuickLogProvider>
      <Outlet />
    </QuickLogProvider>
  );
}

export const router = createBrowserRouter([
  {
    Component: RoutedApp,
    children: [
      {
        path: '/',
        Component: Hub,
      },
      {
        path: '/memories',
        lazy: async () => {
          const { Memories } = await import('./pages/Memories');
          return { Component: Memories };
        },
      },
      {
        path: '/actions',
        lazy: async () => {
          const { Actions } = await import('./pages/Actions');
          return { Component: Actions };
        },
      },
      {
        path: '/profile',
        lazy: async () => {
          const { Profile } = await import('./pages/Profile');
          return { Component: Profile };
        },
      },
      {
        path: '/island/body',
        loader: () => redirect('/memories?filter=body'),
      },
      {
        path: '/island/work',
        loader: () => redirect('/memories?filter=progress'),
      },
      {
        path: '/island/learning',
        loader: () => redirect('/memories?filter=progress'),
      },
      {
        path: '/island/relationships',
        loader: () => redirect('/memories?filter=connection'),
      },
      {
        path: '/island/curiosity',
        lazy: async () => {
          const { CuriosityIsland } = await import('./pages/islands/CuriosityIsland');
          return { Component: CuriosityIsland };
        },
      },
      {
        path: '/island/compassion',
        lazy: async () => {
          const { CompassionIsland } = await import('./pages/islands/CompassionIsland');
          return { Component: CompassionIsland };
        },
      },
      {
        path: '/onboarding',
        loader: () => redirect('/'),
      },
      {
        path: '/insights',
        loader: () => redirect('/memories?view=insights'),
      },
    ],
  },
]);
