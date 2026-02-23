import { useState, useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import UserMarker from "./UserMarker";
import { Button } from "./ui/button";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";

// Helper to convert meters per second to knots
const msToKnots = (ms: number) => ms * 1.94384;

const MapController = () => {
  const { login, logout, user } = useInternetIdentity();
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [speed, setSpeed] = useState(0);
  const map = useMap();

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const newPosition = new L.LatLng(latitude, longitude);
        setPosition(newPosition);
        setSpeed(speed ? msToKnots(speed) : 0);

        // Center map on first position fix
        if (position === null) {
          map.flyTo(newPosition, 16); // Zoom in closer on first fix
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const handleRecenter = () => {
    if (position) {
      map.flyTo(position, 16);
    }
  };

  return (
    <>
      {position && <UserMarker position={position} speed={speed} />}

      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Coordinates and Speed Display */}
          <div className="text-center sm:text-left">
            <p className="font-mono text-lg">
              Lat: {position ? position.lat.toFixed(5) : "--"}
            </p>
            <p className="font-mono text-lg">
              Lon: {position ? position.lng.toFixed(5) : "--"}
            </p>
            <p className="font-bold text-2xl">{speed.toFixed(1)} kts</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={handleRecenter} className="h-16 w-16 rounded-full text-lg">
              Center
            </Button>
            {user ? (
              <Button onClick={logout} className="h-16 w-16 rounded-full text-lg">
                Logout
              </Button>
            ) : (
              <Button onClick={login} className="h-16 w-16 rounded-full text-lg">
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MapController;
