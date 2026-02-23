import { Outlet, useRouter } from '@tanstack/react-router';
import { Navigation } from './Navigation';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useBackend } from '@/hooks/useActor';
import { useEffect } from 'react';

export default function RootLayout() {
  const { isAuthenticated } = useInternetIdentity();
  const { backend } = useBackend();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && backend) {
      backend.isCallerProfileComplete().then((isComplete) => {
        if (isComplete.Ok === false) {
          router.navigate({ to: '/profile' });
        }
      });
    }
  }, [isAuthenticated, backend, router]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pb-16">
        <Outlet />
      </main>
    </div>
  );
}
