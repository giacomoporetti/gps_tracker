import { Outlet } from '@tanstack/react-router';
import { Navigation } from './Navigation';

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pb-16">
        <Outlet />
      </main>
    </div>
  );
}
