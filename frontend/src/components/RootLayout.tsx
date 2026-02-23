import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useEffect } from "react";
import { Toaster } from "./ui/toaster";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { user, backend } = useInternetIdentity();

  useEffect(() => {
    if (user && backend) {
      backend.getCallerUserProfile().then((profile) => {
        if (!profile.Ok) {
          window.location.href = "/profile";
        }
      });
    }
  }, [user, backend]);

  return (
    <>
      <main>
        <Outlet />
      </main>
      <Toaster />
    </>

  );
}
